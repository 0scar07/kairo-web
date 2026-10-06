import { useCallback, useEffect, useRef, useState } from "react";
import { MATCH_PAGE_FIRST, MATCH_PAGE_MORE, getAccount, getLive, getMastery, getMatchIds, getMatches, getRankHistory, getRanked, getSummoner } from "../../api/lol";
import { useAsync } from "../../lib/hooks";

const settle = p => p.then(data => ({ data }), error => ({ error }));

/**
 * Perfil de LoL (misma lógica que loadProfile en la app): primero la cuenta Riot y luego, en paralelo, invocador,
 * rango, historial de LP, maestría y partida en vivo. Solo la cuenta y el invocador son obligatorios.
 */
export function useProfile(region, gameName, tagLine) {
  return useAsync(async force => {
    const { data: account } = await getAccount(gameName, tagLine, region, force);
    const [summoner, ranked, history, mastery, live] = await Promise.all([
      getSummoner(account.puuid, region, force),
      settle(getRanked(account.puuid, region, force)),
      settle(getRankHistory(account.puuid, region, force)),
      settle(getMastery(account.puuid, region, force)),
      settle(getLive(account.puuid, region, force)),
    ]);
    return {
      account,
      summoner: summoner.data,
      updatedAt: summoner.at,
      ranked: ranked.data || [],
      rankedError: ranked.error || null,
      history: history.data || null,
      mastery: mastery.data || null,
      masteryError: mastery.error || null,
      live: live.data || null,
    };
  }, [region, gameName, tagLine]);
}

/**
 * Historial de partidas por cola. Se manda ?queue= al backend y, además, se filtra en local por queueId:
 * si el backend aún no soporta el parámetro devuelve todas las colas y aquí quedan solo las pedidas.
 * Cada cola guarda su propia lista para que cambiar de filtro y volver sea instantáneo.
 */
export function useMatches(puuid, region, queue, refreshKey) {
  const lists = useRef(new Map());   // clave de cola -> { matches, nextStart, hasMore, failed }
  const [state, setState] = useState({ matches: [], hasMore: false, loading: true, loadingMore: false, error: null, failed: 0 });
  const run = useRef(0);
  const key = queue ?? "all";

  // Cambiar de jugador o pulsar Actualizar borra lo guardado
  useEffect(() => { lists.current.clear(); }, [puuid, region, refreshKey]);

  const loadPage = useCallback(async (start, count, force) => {
    const ids = await getMatchIds(puuid, region, { start, count, queue, force });
    const { matches, failed } = ids.length ? await getMatches(ids, region) : { matches: [], failed: 0 };
    return {
      matches: queue ? matches.filter(m => m.queueId === queue) : matches,
      nextStart: start + ids.length,   // cuenta los IDs recibidos, no las partidas cargadas (como la app)
      hasMore: ids.length === count,
      failed,
    };
  }, [puuid, region, queue]);

  useEffect(() => {
    if (!puuid) return;
    const id = ++run.current;
    const saved = lists.current.get(key);
    if (saved) { setState({ ...saved, loading: false, loadingMore: false, error: null }); return; }
    setState({ matches: [], hasMore: false, loading: true, loadingMore: false, error: null, failed: 0 });
    loadPage(0, MATCH_PAGE_FIRST, refreshKey > 0).then(
      page => {
        if (id !== run.current) return;
        lists.current.set(key, page);
        setState({ ...page, loading: false, loadingMore: false, error: null });
      },
      error => { if (id === run.current) setState(s => ({ ...s, loading: false, error })); },
    );
  }, [puuid, region, key, loadPage, refreshKey]);

  const loadMore = useCallback(async () => {
    const current = lists.current.get(key);
    if (!current || !current.hasMore) return;
    const id = run.current;
    setState(s => ({ ...s, loadingMore: true, error: null }));
    try {
      const page = await loadPage(current.nextStart, MATCH_PAGE_MORE, false);
      if (id !== run.current) return;
      const seen = new Set(current.matches.map(m => m.id));
      const merged = {
        matches: [...current.matches, ...page.matches.filter(m => !seen.has(m.id))],
        nextStart: page.nextStart,
        hasMore: page.hasMore,
        failed: current.failed + page.failed,
      };
      lists.current.set(key, merged);
      setState({ ...merged, loading: false, loadingMore: false, error: null });
    } catch (error) {
      if (id === run.current) setState(s => ({ ...s, loadingMore: false, error }));
    }
  }, [key, loadPage]);

  return { ...state, loadMore };
}

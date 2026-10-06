"""
Genera el arte del póster de League of Legends de la portada (public/games/lol-bg.webp y lol-char.webp).

  python scripts/poster-art.py Lux --x 0.58 --top 0.30

Requiere: pip install "rembg[cpu]" pillow  (la primera vez rembg descarga su modelo, ~170 MB)

Cómo funciona el efecto "pop-out":
  - Fondo: recorte 3:4 del splash desde `top` (fracción del alto) hasta abajo. La tarjeta lo muestra recortado.
  - Personaje: el MISMO recorte horizontal pero desde arriba del todo, sin fondo (rembg). Se dibuja alineado abajo
    con la tarjeta y a la misma escala, así que encaja exacto con el fondo y lo que queda por encima de `top`
    (cabeza, arma…) sobresale del borde superior.
  - Imprime charHeight (alto del personaje en % del alto de la tarjeta) para copiarlo en src/pages/home/posterArt.js.

El splash sale de Data Dragon, permitido para proyectos de fans por la política «Legal Jibber Jabber» de Riot Games.
"""
import argparse
import io
import os
import urllib.request

from PIL import Image
from rembg import new_session, remove

OUT_W, OUT_H = 360, 480          # 2x de la tarjeta (180 x 240)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "public", "games")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("champion", help="id de Data Dragon, p. ej. Lux, MonkeyKing")
    ap.add_argument("--skin", type=int, default=0)
    ap.add_argument("--x", type=float, default=0.5, help="centro horizontal del recorte (0-1)")
    ap.add_argument("--top", type=float, default=0.3, help="dónde empieza el fondo (0-1 del alto del splash)")
    ap.add_argument("--head", type=float, default=0.0, help="dónde empieza el personaje (0-1); 0 = desde arriba")
    # El modelo por defecto de rembg (BiRefNet) pide mucha memoria; isnet-general-use es liviano y va bien con ilustraciones
    ap.add_argument("--model", default="isnet-general-use")
    # Margen a cada lado (fracción del ancho de la tarjeta) para que el pelo o el arma que sobresalen por arriba no
    # queden cortados en línea recta en los bordes laterales
    ap.add_argument("--side", type=float, default=0.14)
    args = ap.parse_args()

    url = f"https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{args.champion}_{args.skin}.jpg"
    splash = Image.open(io.BytesIO(urllib.request.urlopen(url).read())).convert("RGB")
    W, H = splash.size

    # Recorte 3:4 del fondo: alto = desde `top` hasta abajo
    top = round(H * args.top)
    bg_h = H - top
    bg_w = round(bg_h * 3 / 4)
    x0 = min(max(round(W * args.x - bg_w / 2), 0), W - bg_w)
    bg = splash.crop((x0, top, x0 + bg_w, H)).resize((OUT_W, OUT_H), Image.LANCZOS)

    # Personaje: la misma franja más un margen a cada lado, desde `head`, sin fondo
    head = round(H * args.head)
    side = round(bg_w * args.side)
    cx0, cx1 = max(x0 - side, 0), min(x0 + bg_w + side, W)
    cut = remove(splash.crop((cx0, head, cx1, H)), session=new_session(args.model))
    scale = OUT_W / bg_w
    left_px, right_px = round((x0 - cx0) * scale), round((cx1 - x0 - bg_w) * scale)
    char = cut.resize((OUT_W + left_px + right_px, round((H - head) * scale)), Image.LANCZOS)
    # En la parte que sobresale de la tarjeta no hay fondo detrás: se quita la bruma semitransparente que deja rembg
    # (rayos de luz, humo) para que el borde del personaje quede limpio
    pop = char.height - OUT_H
    r, g, b, a = char.split()
    if pop > 0:
        top_alpha = a.crop((0, 0, char.width, pop)).point(lambda v: 0 if v < 110 else min(255, int(v * 1.15)))
        a.paste(top_alpha, (0, 0))
    # Dentro de la tarjeta, los márgenes laterales se vacían: ahí el personaje no debe salirse por los costados
    if left_px:
        a.paste(0, (0, max(pop, 0), left_px, char.height))
    if right_px:
        a.paste(0, (char.width - right_px, max(pop, 0), char.width, char.height))
    char = Image.merge("RGBA", (r, g, b, a))
    # Se recorta lo transparente de arriba para no cargar píxeles vacíos (sigue alineado abajo)
    bbox = char.getbbox()
    if bbox:
        char = char.crop((0, bbox[1], char.width, char.height))

    os.makedirs(OUT_DIR, exist_ok=True)
    bg.save(os.path.join(OUT_DIR, "lol-bg.webp"), "WEBP", quality=80, method=6)
    char.save(os.path.join(OUT_DIR, "lol-char.webp"), "WEBP", quality=82, method=6)
    char_height = round(char.height / OUT_H * 100, 1)
    print(f"lol-bg.webp {bg.size}  lol-char.webp {char.size}  charHeight={char_height}"
          f"  charLeft={round(left_px / OUT_W * 100, 1)}  charRight={round(right_px / OUT_W * 100, 1)}")


if __name__ == "__main__":
    main()

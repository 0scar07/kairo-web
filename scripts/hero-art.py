"""
Genera los personajes del hero animado de cada juego (public/hero/<juego>/<personaje>.webp), sin fondo y a 440 px de
alto. Cada hero usa solo 2 personajes de su juego y ninguno repite a los de los pósters.

  python scripts/hero-art.py              # todos los juegos
  python scripts/hero-art.py lol tft      # solo algunos

Fuentes (solo arte con permiso para proyectos de fans):
  - lol y tft: Data Dragon (política «Legal Jibber Jabber» de Riot Games). Traen fondo: se recortan con rembg.
  - brawlstars, clashroyale y clashofclans: Fan Kit oficial de Supercell (fankit.supercell.com), ya sin fondo.
  - fortnite, apex, dota2 y pubg: sin fuente permitida todavía; su hero es solo el logotipo animado.
Requiere: pip install "rembg[cpu]" pillow
"""
import io
import os
import sys
import urllib.request

from PIL import Image

OUT_H = 440   # alto final (2x de lo que se ve en pantalla)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "public", "hero")
DD = "https://ddragon.leagueoflegends.com/cdn"
FK = "https://media.ffycdn.net/eu/supercell"

# juego: { personaje: (url, ¿quitar fondo con rembg?) }
CAST = {
    "lol": {
        "zoe": (f"{DD}/img/champion/splash/Zoe_0.jpg", True),
        "seraphine": (f"{DD}/img/champion/splash/Seraphine_0.jpg", True),
    },
    "tft": {
        "poro": (f"{DD}/16.19.1/img/tft-tactician/Tooltip_Poro_Base_Classic_Tier1.png", True),
        "chibijinx": (f"{DD}/16.19.1/img/tft-tactician/Tooltip_ChibiJinx_Base_Classic_Tier1.png", True),
    },
    "brawlstars": {
        "poco": (f"{FK}/Y6qUHCReooNfqZBB4EkJ.png?width=900", False),     # poco_DJ
        "shelly": (f"{FK}/1mNWVnYBXmbvZehdnMLY.png?width=900", False),   # shelly_cyber_shelly_happy_407
    },
    "clashroyale": {
        "archer": (f"{FK}/ZGuYuMREXUey55D2GAxL.png?width=900", False),     # Archer_Evolution_Pose02
        "musketeer": (f"{FK}/6j6f8BjRXrjUqZmoGPHW.png?width=900", False),  # Musketeer_Pose02_4K_nofx
    },
    "clashofclans": {
        "wizard": (f"{FK}/ZZyWfYh7cNRg1z5nP1k2.png?width=900", False),       # Wizard_01
        "archerqueen": (f"{FK}/mUr9WNYiTdeado73Cezu.png?width=900", False),  # AcherQueen_02
    },
}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "kairo-web/hero-art"})
    return Image.open(io.BytesIO(urllib.request.urlopen(req).read()))


def keep_main_figure(im):
    """Deja solo la figura principal: borra los restos sueltos que deja rembg (objetos del fondo, chispas). Se
    conservan las piezas grandes (al menos 20 % de la mayor), por ejemplo un arma separada del cuerpo."""
    import numpy as np
    from scipy import ndimage
    alpha = np.array(im.getchannel("A"))
    labels, n = ndimage.label(alpha > 40)
    if n <= 1:
        return im
    sizes = ndimage.sum(np.ones_like(alpha), labels, index=range(1, n + 1))
    keep = [i + 1 for i, size in enumerate(sizes) if size >= sizes.max() * 0.2]
    out = im.copy()
    out.putalpha(Image.fromarray(np.where(np.isin(labels, keep), alpha, 0).astype("uint8")))
    return out


def main(games):
    session = None
    for game in games:
        os.makedirs(os.path.join(OUT_DIR, game), exist_ok=True)
        for name, (url, cut) in CAST[game].items():
            im = fetch(url).convert("RGBA")
            if cut:
                from rembg import new_session, remove
                # El modelo por defecto de rembg pide demasiada memoria; isnet-general-use va bien con ilustraciones
                session = session or new_session("isnet-general-use")
                im = remove(im.convert("RGB"), session=session)
                # Sin bruma semitransparente (rayos, humo): el personaje va sobre el fondo oscuro de la portada
                r, g, b, a = im.split()
                a = a.point(lambda v: 0 if v < 110 else min(255, int(v * 1.12)))
                im = keep_main_figure(Image.merge("RGBA", (r, g, b, a)))
            im = im.crop(im.getbbox())
            im = im.resize((round(im.width * OUT_H / im.height), OUT_H), Image.LANCZOS)
            path = os.path.join(OUT_DIR, game, f"{name}.webp")
            im.save(path, "WEBP", quality=82, method=6)
            print(f"{game}/{name}.webp {im.size} {os.path.getsize(path) // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1:] or list(CAST))

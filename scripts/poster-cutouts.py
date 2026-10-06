"""
Genera los personajes de los pósters de TFT, Brawl Stars, Clash Royale y Clash of Clans (public/games/*-char.webp)
y el fondo de TFT (tft-bg.webp).

  python scripts/poster-cutouts.py

Fuentes (solo arte con permiso para proyectos de fans):
  - TFT: Data Dragon de Riot (política «Legal Jibber Jabber»). Pengu viene con fondo: se recorta con rembg.
  - Supercell: Fan Kit oficial (fankit.supercell.com), bajo la Fan Content Policy de Supercell. Los renders ya vienen
    sin fondo (PNG con transparencia).
Requiere: pip install "rembg[cpu]" pillow  (rembg solo para Pengu)
"""
import io
import os
import urllib.request

from PIL import Image

DD = "https://ddragon.leagueoflegends.com/cdn/16.19.1/img"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "public", "games")
CARD_W = 180   # ancho de la tarjeta en CSS; las imágenes se guardan a 2x

# juego: (url, ancho del personaje en % del ancho de la tarjeta, ¿quitar fondo con rembg?)
CHARS = {
    "tft": (f"{DD}/tft-tactician/Tooltip_PenguKnight_Classic_Tier3.png", 130, True),
    "brawlstars": ("https://media.ffycdn.net/eu/supercell/Qr4YEqrymKMhCTPgCn1X.png?width=800", 100, False),     # leon_graffiti
    "clashroyale": ("https://media.ffycdn.net/eu/supercell/L2ALfxdeLifZSAuLALL8.png?width=800", 125, False),    # Knight_Hero_Pose02_4K_FX
    "clashofclans": ("https://media.ffycdn.net/eu/supercell/nJcZPxLHsD5Q3fTktewv.png?width=800", 108, False),   # Barbarian_04
}
TFT_ARENA = f"{DD}/tft-arena/1011.png"   # Arena del 6.º aniversario de Pengu


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "kairo-web/poster-cutouts"})
    return Image.open(io.BytesIO(urllib.request.urlopen(req).read()))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    session = None
    for game, (url, width_pct, cut) in CHARS.items():
        im = fetch(url).convert("RGBA")
        if cut:
            from rembg import new_session, remove
            session = session or new_session("isnet-general-use")
            im = remove(im, session=session)
            # Sin bruma semitransparente alrededor del recorte
            r, g, b, a = im.split()
            a = a.point(lambda v: 0 if v < 100 else min(255, int(v * 1.1)))
            im = Image.merge("RGBA", (r, g, b, a))
        bbox = im.getbbox()
        im = im.crop(bbox)
        target_w = round(CARD_W * 2 * width_pct / 100)
        im = im.resize((target_w, round(im.height * target_w / im.width)), Image.LANCZOS)
        path = os.path.join(OUT_DIR, f"{game}-char.webp")
        im.save(path, "WEBP", quality=82, method=6)
        print(f"{game}-char.webp {im.size} {os.path.getsize(path) // 1024} KB  (charWidth={width_pct})")

    # Fondo de TFT: recorte 3:4 centrado de la arena
    arena = fetch(TFT_ARENA).convert("RGB")
    w, h = arena.size
    cw = round(h * 3 / 4)
    x0 = (w - cw) // 2
    bg = arena.crop((x0, 0, x0 + cw, h)).resize((360, 480), Image.LANCZOS)
    bg.save(os.path.join(OUT_DIR, "tft-bg.webp"), "WEBP", quality=80, method=6)
    print("tft-bg.webp", bg.size)


if __name__ == "__main__":
    main()

"""
Genera los campeones del hero de la portada (public/hero/<campeón>.webp): el cuerpo entero, sin fondo.

  python scripts/hero-art.py Lux

Fuente: splash de Data Dragon (política «Legal Jibber Jabber» de Riot Games), recortado con rembg.
Requiere: pip install "rembg[cpu]" pillow
"""
import io
import os
import sys
import urllib.request

from PIL import Image
from rembg import new_session, remove

OUT_H = 440   # alto final (2x de lo que se ve en pantalla)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "public", "hero")


def main(champions):
    os.makedirs(OUT_DIR, exist_ok=True)
    session = new_session("isnet-general-use")   # el modelo por defecto de rembg pide demasiada memoria
    for champ in champions:
        url = f"https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{champ}_0.jpg"
        splash = Image.open(io.BytesIO(urllib.request.urlopen(url).read())).convert("RGB")
        cut = remove(splash, session=session)
        # Sin bruma semitransparente (rayos, humo): el personaje va sobre el fondo oscuro de la portada
        r, g, b, a = cut.split()
        a = a.point(lambda v: 0 if v < 110 else min(255, int(v * 1.12)))
        cut = Image.merge("RGBA", (r, g, b, a)).crop(a.getbbox())
        cut = cut.resize((round(cut.width * OUT_H / cut.height), OUT_H), Image.LANCZOS)
        path = os.path.join(OUT_DIR, f"{champ.lower()}.webp")
        cut.save(path, "WEBP", quality=82, method=6)
        print(f"{champ.lower()}.webp {cut.size} {os.path.getsize(path) // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1:] or ["Lux"])

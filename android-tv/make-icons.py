#!/usr/bin/env python3
"""TatoCine · android-tv/make-icons.py
Iconos de la app Android a partir de icons/icon-512.png: ícono del lanzador (mipmap, todas las densidades) y BANNER de Google TV / Android TV
(320×180 en xhdpi, obligatorio para que la app aparezca en la fila de apps del televisor): fondo negro, logo y el nombre «TatoCine».
Uso: python3 -I android-tv/make-icons.py <raíz del proyecto> <carpeta res de salida>"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

root, out = sys.argv[1], sys.argv[2]
logo = Image.open(os.path.join(root, "icons", "icon-512.png")).convert("RGBA")
for name, px in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
    d = os.path.join(out, "mipmap-" + name); os.makedirs(d, exist_ok=True)
    logo.resize((px, px), Image.LANCZOS).save(os.path.join(d, "ic_launcher.png"), optimize=True)

def banner(w, h, path):
    b = Image.new("RGB", (w, h), (0, 0, 0))
    s = int(h * 0.62); lg = logo.resize((s, s), Image.LANCZOS)
    x = int(w * 0.07); b.paste(lg, (x, (h - s) // 2), lg)
    font = None
    for f in ("/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if os.path.exists(f): font = ImageFont.truetype(f, int(h * 0.2)); break
    dr = ImageDraw.Draw(b)
    tx = x + s + int(w * 0.05)
    dr.text((tx, h // 2), "TatoCine", fill=(255, 255, 255), font=font, anchor="lm" if font else None)
    os.makedirs(os.path.dirname(path), exist_ok=True); b.save(path, optimize=True)

banner(320, 180, os.path.join(out, "drawable-xhdpi", "banner.png"))
banner(640, 360, os.path.join(out, "drawable-xxxhdpi", "banner.png"))

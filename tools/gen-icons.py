#!/usr/bin/env python3
"""
TatoCine · tools/gen-icons.py
Genera TODOS los iconos de la app (favicons 16/32/48, Apple Touch 180, PWA 48–512, maskable 192/512) a partir de icons/inspiration.jpeg.
El original NO se publica ni se modifica. Requiere Pillow:  python3 tools/gen-icons.py
  · «any»: el sujeto ocupa ~76 % del lienzo.   · favicons pequeños: ~90 % (a 16 px hay que ver algo).
  · «maskable»: el sujeto queda dentro de la zona segura (círculo central del 80 % → sujeto ≤ 58 %), así ningún recorte del sistema lo corta.
El fondo es el del propio dibujo (sin transparencia accidental).
"""
from PIL import Image, ImageChops
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "icons", "inspiration.jpeg")
OUT = os.path.join(ROOT, "icons")
im = Image.open(SRC).convert("RGB")
bg = im.getpixel((6, 6))                                              # color de fondo del dibujo
diff = ImageChops.difference(im, Image.new("RGB", im.size, bg)).convert("L").point(lambda v: 255 if v > 28 else 0)
box = diff.getbbox()
if not box: sys.exit("No se encontró el sujeto en inspiration.jpeg")
subject = im.crop(box)
w, h = subject.size
side = max(w, h)
square = Image.new("RGB", (side, side), bg); square.paste(subject, ((side - w) // 2, (side - h) // 2))   # sujeto centrado en un cuadrado
def make(size, fill):
    canvas = Image.new("RGB", (size, size), bg)
    s = max(1, round(size * fill))
    art = square.resize((s, s), Image.LANCZOS)
    canvas.paste(art, ((size - s) // 2, (size - s) // 2))
    return canvas
jobs = {
    "favicon-16.png": (16, .90), "favicon-32.png": (32, .90), "icon-48.png": (48, .86), "icon-72.png": (72, .80), "icon-96.png": (96, .78),
    "icon-128.png": (128, .76), "icon-144.png": (144, .76), "icon-152.png": (152, .76), "icon-192.png": (192, .76), "icon-256.png": (256, .76),
    "icon-384.png": (384, .76), "icon-512.png": (512, .76), "apple-touch-icon.png": (180, .76),
    "maskable-192.png": (192, .58), "maskable-512.png": (512, .58),
}
for name, (size, fill) in jobs.items():
    img = make(size, fill)
    if size >= 128: img = img.quantize(colors=160, method=Image.MEDIANCUT, dither=Image.NONE)      # paleta de 160 colores: mismo aspecto, ~3 veces menos peso
    img.save(os.path.join(OUT, name), "PNG", optimize=True)
    print("%-22s %4d px  %6d bytes" % (name, size, os.path.getsize(os.path.join(OUT, name))))

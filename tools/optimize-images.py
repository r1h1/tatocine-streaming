#!/usr/bin/env python3
"""TatoCine · tools/optimize-images.py
Reduce el peso de los PNG de icons/ (cuantización a 256 colores con tramado) SOLO si la imagen casi no cambia (diferencia media por canal <= 2.5 de 255)
y el ahorro es de al menos 15 %. Vuelve a ejecutarse sin riesgo (si ya está optimizada, no cambia nada). Los reproductores de terceros no pasan por aquí.
Uso: python3 tools/optimize-images.py"""
import io, os, sys
from PIL import Image, ImageChops, ImageStat
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
saved = 0
for dp, _, files in os.walk(ROOT):
    for f in sorted(files):
        if not f.lower().endswith(".png"): continue
        p = os.path.join(dp, f); orig = os.path.getsize(p)
        if orig < 6000: continue
        im = Image.open(p); im.load(); rgba = im.convert("RGBA")
        q = rgba.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
        buf = io.BytesIO(); q.save(buf, "PNG", optimize=True); n = len(buf.getvalue())
        diff = ImageStat.Stat(ImageChops.difference(rgba, q.convert("RGBA"))).mean
        d = max(diff)
        if n <= orig * 0.85 and d <= 2.5:
            open(p, "wb").write(buf.getvalue()); saved += orig - n
            print("optimizado %-34s %6d -> %6d B (dif. %.2f)" % (os.path.relpath(p, ROOT), orig, n, d))
        else:
            print("sin cambios %-34s %6d B (opt. %d B, dif. %.2f)" % (os.path.relpath(p, ROOT), orig, n, d))
print("ahorro total: %d KB" % (saved // 1024))

#!/usr/bin/env python3
"""
TatoCine · tools/build.py — empaquetado de producción (sin dependencias, solo Python 3).

Lee index.html (única fuente de verdad del orden de carga), concatena los <link rel="stylesheet"> y los
<script src> locales en dist/assets/app.<hash>.css|js y genera dist/index.html con una sola petición de
cada tipo. Copia sw.js, manifest.webmanifest, icons/ y LICENSE. No minifica (gzip/brotli del hosting
ya recortan ~80 %) para que el código siga siendo legible y depurable.

Uso:  python3 tools/build.py        →  despliega la carpeta dist/ por HTTPS
"""
import hashlib, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
LINK = re.compile(r'[ \t]*<link rel="stylesheet" href="(css/[^"]+)" />\n?')
SCRIPT = re.compile(r'[ \t]*<script src="(js/[^"]+)"></script>\n?')


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


def bundle(paths, joiner):
    return joiner.join("/* ==== %s ==== */\n%s" % (p, read(p).rstrip()) for p in paths) + "\n"


def main():
    html = read("index.html")
    css_files = LINK.findall(html)
    js_files = SCRIPT.findall(html)
    if not css_files or not js_files:
        sys.exit("No se encontraron css/ ni js/ en index.html")
    css = bundle(css_files, "\n")
    js = bundle(js_files, "\n;\n")      # ';' evita que una pieza sin punto y coma se una con la siguiente
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(os.path.join(DIST, "assets"))
    names = {}
    for ext, text in (("css", css), ("js", js)):
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:10]
        names[ext] = "assets/app.%s.%s" % (digest, ext)
        with open(os.path.join(DIST, names[ext]), "w", encoding="utf-8") as f:
            f.write(text)
    first_link, first_script = LINK.search(html), SCRIPT.search(html)
    out = LINK.sub("", html)
    out = SCRIPT.sub("", out)
    out = out.replace("</head>", '  <link rel="stylesheet" href="%s" />\n</head>' % names["css"], 1)
    out = out.replace("</body>", '  <script src="%s"></script>\n</body>' % names["js"], 1)
    with open(os.path.join(DIST, "index.html"), "w", encoding="utf-8") as f:
        f.write(out)
    for item in ("sw.js", "manifest.webmanifest", "LICENSE"):
        shutil.copy2(os.path.join(ROOT, item), os.path.join(DIST, item))
    shutil.copytree(os.path.join(ROOT, "icons"), os.path.join(DIST, "icons"))
    print("dist/ listo: %d CSS + %d JS -> %s, %s (%.0f KB + %.0f KB)" % (
        len(css_files), len(js_files), names["css"], names["js"], len(css) / 1024, len(js) / 1024))


if __name__ == "__main__":
    main()

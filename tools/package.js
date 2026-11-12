#!/usr/bin/env node
/**
 * TatoCine · tools/package.js
 * Construye el artefacto de PRODUCCIÓN (carpeta dist/site y ZIP) a partir del código fuente, que no se toca:
 *   1. Comprueba que stamp.js y gen-headers.js estén al día (si no, se niega a empaquetar).
 *   2. Copia SOLO lo que la app necesita (sin .git, tests, docs, tools, node_modules, README, imagen fuente de iconos…).
 *   3. CSS: respaldos para Chromium viejo (tools/css-legacy.js) + minificado.   JS: minificado (esbuild; no renombra variables globales).
 *      HTML y JSON: espacios y comentarios fuera. Librerías de terceros (js/vendor) y sw.js de forma segura.
 *   4. Recalcula los ?v=<hash> de index.html y la VERSION del Service Worker con el contenido FINAL (lo que realmente se publica).
 *   5. ZIP con compresión máxima y una verificación final del contenido.
 * Si esbuild no está instalado (cd tools && npm install) o se usa --no-minify, empaqueta igual pero sin minificar.
 *   node tools/package.js                  → dist/site + dist/tatocine-<versión>.zip
 *   node tools/package.js --out ~/Desktop  → además deja una copia del ZIP en esa carpeta
 */
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), zlib = require("node:zlib");
const { spawnSync, execFileSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist"), SITE = path.join(DIST, "site");
let es = null; if (!process.argv.includes("--no-minify")) { try { es = require("./node_modules/esbuild"); } catch (e) { console.warn("! esbuild no está instalado: se empaqueta sin minificar (cd tools && npm install)"); } }
const { legacyCss } = require("./css-legacy.js");
const sha = (buf, n) => crypto.createHash("sha1").update(buf).digest("hex").slice(0, n || 8);

// 1) comprobaciones previas
for (const [name, script] of [["stamp", "stamp.js"], ["gen-headers", "gen-headers.js"]]) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), "--check"], { encoding: "utf8" });
  if (r.status !== 0) { console.error("✗ " + name + " desactualizado:\n" + (r.stderr || r.stdout) + "Ejecuta: node tools/gen-headers.js && node tools/stamp.js"); process.exit(1); }
}

// 2) copia limpia
fs.rmSync(SITE, { recursive: true, force: true }); fs.mkdirSync(SITE, { recursive: true });
const ROOT_FILES = ["index.html", "offline.html", "404.html", "500.html", "manifest.webmanifest", "config.js", "sw.js", "build.json", "_headers", "netlify.toml", "vercel.json", "robots.txt", "sitemap.xml", "llms.txt", "llm.txt", "LICENSE"];
const DIRS = ["css", "js", "icons"], SKIP = new Set(["icons/inspiration.jpeg"]);
function copy(rel) { const from = path.join(ROOT, rel), to = path.join(SITE, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
function walk(dir) { return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((f) => { const rel = dir + "/" + f.name; return f.isDirectory() ? walk(rel) : [rel]; }); }
ROOT_FILES.forEach((f) => { if (fs.existsSync(path.join(ROOT, f))) copy(f); });
DIRS.forEach((d) => walk(d).filter((r) => !SKIP.has(r) && !/\.(map|md)$/.test(r)).forEach(copy));
const all = (dir, ext) => walk(dir).filter((r) => r.endsWith(ext) && fs.existsSync(path.join(SITE, r)));
const rd = (rel) => fs.readFileSync(path.join(SITE, rel), "utf8"), wr = (rel, s) => fs.writeFileSync(path.join(SITE, rel), s);
const before = { html: 0, css: 0, js: 0 }, after = { html: 0, css: 0, js: 0 };
const sizeOf = (rels, key, dst) => rels.forEach((r) => { dst[key] += Buffer.byteLength(rd(r)); });

// 3) CSS y JS
const cssFiles = all("css", ".css"), jsFiles = all("js", ".js").filter((r) => !r.startsWith("js/vendor/"));
sizeOf(cssFiles, "css", before); sizeOf(jsFiles.concat(["sw.js"]), "js", before);
cssFiles.forEach((r) => { let c = legacyCss(rd(r)); if (es) c = es.transformSync(c, { loader: "css", minify: true, target: "chrome68", legalComments: "none" }).code; wr(r, c); });
const minJs = (code) => (es ? es.transformSync(code, { loader: "js", minify: true, target: "chrome68", legalComments: "none" }).code : code);
jsFiles.forEach((r) => wr(r, minJs(rd(r))));

const hashOf = (rel) => sha(fs.readFileSync(path.join(SITE, rel)));
// Las librerías del QR (se cargan al usarlas) llevan su ?v=hash; se hace ANTES de agrupar porque qr-transfer.js entra en un paquete.
wr("js/features/qr-transfer.js", rd("js/features/qr-transfer.js").replace(/"(js\/vendor\/[A-Za-z0-9_.-]+\.js)(?:\?v=[0-9a-f]+)?"/g, (m, f) => '"' + f + "?v=" + hashOf(f) + '"'));

// 3b) AGRUPACIÓN: los 21 CSS pasan a 1 (css/app.css) con el MISMO orden de index.html (no hay semántica que cambie: es solo la cascada).
const bundleInfo = { css: 0, js: 0, from: 0 };
if (!process.argv.includes("--no-bundle")) {
  const vm = require("node:vm");
  let idx = rd("index.html");
  const cssRe = /<link rel="stylesheet" href="(css\/[^"?]+)(?:\?v=[0-9a-f]+)?"[^>]*>\s*/g, cssTags = [...idx.matchAll(cssRe)];
  if (cssTags.length > 1) {
    wr("css/app.css", cssTags.map((m) => rd(m[1])).join("\n"));
    cssTags.forEach((m) => fs.unlinkSync(path.join(SITE, m[1])));
    let first = true; idx = idx.replace(cssRe, () => (first ? ((first = false), '<link rel="stylesheet" href="css/app.css" />\n') : ""));
    bundleInfo.css = 1; bundleInfo.from += cssTags.length;
  }
  // JS: NO se agrupa por defecto. Concatenar scripts clásicos cambia la semántica: JavaScript «eleva» todas las funciones declaradas al inicio del paquete, así que comprobaciones
  // como `typeof i18nAdd === "function"` (command-palette.js corre antes que i18n.js) pasan a ser verdaderas antes de tiempo y rompen el arranque. Se probó y falló; con
  // archivos separados (HTTP/2 + caché inmutable + Service Worker) el coste real es mínimo. --bundle-js solo para experimentar.
  const jsRe = /<script\b([^>]*)\bsrc="([^"?]+)(?:\?v=[0-9a-f]+)?"([^>]*)><\/script>\s*/g;
  const tags = [...idx.matchAll(jsRe)].map((m) => ({ full: m[0], src: m[2], defer: /\bdefer\b/.test(m[1] + m[3]) }));
  const groups = []; let cur = null;
  for (const t of (process.argv.includes("--bundle-js") ? tags : [])) {
    const bundleable = t.defer && /^js\/(?!vendor\/)/.test(t.src);
    if (bundleable) { if (!cur) groups.push((cur = [])); cur.push(t); } else if (t.defer) cur = null;      // un defer que no se agrupa corta el grupo; los scripts síncronos no
  }
  groups.forEach((g, n) => {
    const name = "js/app-" + (n + 1) + ".js", code = g.map((t) => rd(t.src)).join("\n;\n");
    try { new vm.Script(code, { filename: name }); } catch (e) { console.error("✗ El paquete " + name + " no compila (¿un const/let repetido entre archivos?): " + e.message); process.exit(1); }
    wr(name, code);
    g.forEach((t) => fs.unlinkSync(path.join(SITE, t.src)));
    idx = idx.replace(g[0].full, '<script defer src="' + name + '"></script>\n'); g.slice(1).forEach((t) => { idx = idx.replace(t.full, ""); });
    bundleInfo.js++; bundleInfo.from += g.length;
  });
  wr("index.html", idx);
}
const siteList = (dir) => fs.readdirSync(path.join(SITE, dir), { withFileTypes: true }).flatMap((f) => { const rel = dir + "/" + f.name; return f.isDirectory() ? siteList(rel) : [rel]; });

// HTML y JSON
function htmlMin(h) {
  const keep = [];
  h = h.replace(/<(script|style|pre|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => {
    if (/^<script[^>]*application\/ld\+json/i.test(m)) m = m.replace(/(<script[^>]*>)([\s\S]*?)(<\/script>)/i, (x, a, j, c) => { try { return a + JSON.stringify(JSON.parse(j)) + c; } catch (e) { return x; } });
    else if (/^<style/i.test(m) && es) m = m.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/i, (x, a, c, z) => a + es.transformSync(legacyCss(c), { loader: "css", minify: true, target: "chrome68" }).code + z);
    keep.push(m); return "\u0000K" + (keep.length - 1) + "\u0000";
  });
  h = h.replace(/<!--[\s\S]*?-->/g, "").replace(/style="([^"]*)"/g, (m, s) => 'style="' + s.replace(/\s+/g, " ").trim() + '"');
  h = h.replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{2,}/g, "\n").trim() + "\n";
  return h.replace(/\u0000K(\d+)\u0000/g, (m, i) => keep[+i]);
}
const htmlFiles = ["index.html", "offline.html", "404.html", "500.html"];
sizeOf(htmlFiles, "html", before);
htmlFiles.forEach((r) => wr(r, htmlMin(rd(r))));
wr("manifest.webmanifest", JSON.stringify(JSON.parse(rd("manifest.webmanifest"))));
wr("vercel.json", JSON.stringify(JSON.parse(rd("vercel.json"))));

// 4) versiones con el contenido FINAL
wr("index.html", rd("index.html").replace(/((?:href|src)=")((?:css|js)\/[^"?]+)(?:\?v=[0-9a-f]+)?(")/g, (m, a, f, c) => a + f + "?v=" + hashOf(f) + c));
const vh = crypto.createHash("sha1");
siteList("css").concat(siteList("js"), siteList("icons"), ROOT_FILES.filter((f) => f !== "sw.js" && f !== "build.json" && fs.existsSync(path.join(SITE, f)))).sort().forEach((r) => { vh.update(r + "\0" + hashOf(r) + "\0"); });
const VERSION = "5.6-" + vh.digest("hex").slice(0, 8);
let swSrc = rd("sw.js"); if (!/^const VERSION = ".*";$/m.test(swSrc)) { console.error("✗ sw.js no tiene la línea const VERSION"); process.exit(1); }
wr("sw.js", minJs(swSrc.replace(/^const VERSION = ".*";$/m, 'const VERSION = "' + VERSION + '";')));
wr("build.json", JSON.stringify({ version: VERSION }) + "\n");
htmlFiles.forEach((r) => { after.html += Buffer.byteLength(rd(r)); }); siteList("css").forEach((r) => { after.css += fs.statSync(path.join(SITE, r)).size; }); siteList("js").filter((r) => !r.startsWith("js/vendor/")).forEach((r) => { after.js += fs.statSync(path.join(SITE, r)).size; }); after.js += Buffer.byteLength(rd("sw.js"));

// 5) ZIP y verificación
const out = path.join(DIST, "tatocine-" + VERSION + ".zip");
fs.mkdirSync(DIST, { recursive: true }); fs.readdirSync(DIST).filter((f) => /^tatocine-.*\.zip$/.test(f)).forEach((f) => fs.unlinkSync(path.join(DIST, f)));
const z = spawnSync("zip", ["-9", "-X", "-r", "-q", out, "."], { cwd: SITE, stdio: "inherit" });
if (z.error || z.status !== 0) { console.error("✗ No se pudo crear el ZIP (¿está instalado `zip`?)"); process.exit(1); }
const list = execFileSync("unzip", ["-Z1", out], { encoding: "utf8" }).trim().split("\n");
const bad = list.filter((f) => /(^|\/)(\.git|tests|node_modules|docs|tools|dist)(\/|$)|\.env|\.map$|\.md$|inspiration/.test(f));
if (bad.length) { console.error("✗ El ZIP incluye archivos de desarrollo: " + bad.slice(0, 5).join(", ")); process.exit(1); }
for (const need of ["index.html", "sw.js", "config.js", "manifest.webmanifest", "_headers", "netlify.toml", "vercel.json", "build.json", "LICENSE"]) if (!list.includes(need)) { console.error("✗ Falta " + need + " en el ZIP"); process.exit(1); }
const br = (k) => Math.round((k) / 1024) + " KB";
const brotliTotal = (rels) => rels.reduce((n, r) => n + zlib.brotliCompressSync(fs.readFileSync(path.join(SITE, r))).length, 0);
console.log("✓ " + path.relative(ROOT, out) + "  (" + list.length + " archivos, " + br(fs.statSync(out).size) + ")  ·  versión " + VERSION + (es ? "" : "  ·  SIN minificar"));
console.log("  Agrupación: " + bundleInfo.from + " archivos CSS/JS → " + (bundleInfo.css + bundleInfo.js) + " paquetes (" + (bundleInfo.css ? "css/app.css + " : "") + bundleInfo.js + " JS)");
console.log("  HTML " + br(before.html) + " → " + br(after.html) + " · CSS " + br(before.css) + " → " + br(after.css) + " · JS " + br(before.js) + " → " + br(after.js) + "  (sin comprimir; en la red va con brotli: " + br(brotliTotal(htmlFiles.concat(siteList("css"), siteList("js").filter((r) => !r.startsWith("js/vendor/")), ["sw.js"]))) + " en total)");
const outIdx = process.argv.indexOf("--out");
if (outIdx > -1 && process.argv[outIdx + 1]) {
  const dir = process.argv[outIdx + 1].replace(/^~(?=\/|$)/, require("node:os").homedir());
  fs.mkdirSync(dir, { recursive: true }); fs.copyFileSync(out, path.join(dir, path.basename(out)));
  console.log("✓ copia en " + path.join(dir, path.basename(out)));
}

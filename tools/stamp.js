#!/usr/bin/env node
/**
 * TatoCine · tools/stamp.js
 * Deja la app lista para cachear de verdad:
 *   1. Pone `?v=<hash del contenido>` a cada CSS/JS de index.html (y a las librerías del QR que carga qr-transfer.js). Cada archivo tiene SU hash: lo que no
 *      cambia entre despliegues sigue en la caché del navegador y de la CDN (cabecera inmutable de 1 año, ver tools/gen-headers.js).
 *   2. Calcula la VERSIÓN del Service Worker del contenido de toda la app y la escribe en sw.js y build.json.
 * Ejecútalo SIEMPRE antes de subir/empaquetar (tools/package.js lo comprueba y se niega a empaquetar si falta).
 *   node tools/stamp.js          → actualiza index.html, qr-transfer.js, sw.js y build.json
 *   node tools/stamp.js --check  → solo comprueba (tests/sw-stamp.test.js)
 */
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".git", "tests", "docs", "tools", "dist", ".vscode"]);
const INCLUDE_ROOT = new Set(["index.html", "offline.html", "404.html", "500.html", "manifest.webmanifest", "config.js", "robots.txt", "sitemap.xml", "_headers", "netlify.toml", "vercel.json"]);
const read = (r) => fs.readFileSync(path.join(ROOT, r));
const sha = (buf, n) => crypto.createHash("sha1").update(buf).digest("hex").slice(0, n || 8);
function walk(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
/** Versiona con ?v=hash las rutas css/ y js/ de un HTML. `hash(ruta)` devuelve el hash del archivo. */
function versionHtml(html, hash) {
  return html.replace(/((?:href|src)=")((?:css|js)\/[^"?]+)(?:\?v=[0-9a-f]+)?(")/g, (m, a, file, c) => { try { return a + file + "?v=" + hash(file) + c; } catch (e) { return m; } });
}
/** Versiona las librerías del QR cargadas por script («js/vendor/x.js» dentro de qr-transfer.js). */
function versionVendorLiterals(js, hash) {
  return js.replace(/"(js\/vendor\/[A-Za-z0-9_.-]+\.js)(?:\?v=[0-9a-f]+)?"/g, (m, file) => '"' + file + "?v=" + hash(file) + '"');
}
function plan() {
  const qr = versionVendorLiterals(read("js/features/qr-transfer.js").toString("utf8"), (f) => sha(read(f)));
  const content = (r) => (r === "js/features/qr-transfer.js" ? Buffer.from(qr) : read(r));
  const hash = (f) => sha(content(f));
  const index = versionHtml(read("index.html").toString("utf8"), hash);
  const files = walk(ROOT, []).map((p) => path.relative(ROOT, p).split(path.sep).join("/")).filter((r) => {
    if (r === "sw.js") return true;
    if (r === "icons/inspiration.jpeg") return false;                      // fuente de los iconos: no se publica
    if (!r.includes("/")) return INCLUDE_ROOT.has(r);
    return /^(css|js|icons)\//.test(r);
  }).sort();
  const h = crypto.createHash("sha1");
  for (const r of files) {
    let data = r === "index.html" ? Buffer.from(index) : content(r);
    if (r === "sw.js") data = Buffer.from(data.toString("utf8").replace(/^const VERSION = ".*";$/m, "const VERSION = \"\";"));   // la línea de versión no cuenta
    h.update(r + "\0"); h.update(data); h.update("\0");
  }
  return { version: "5.6-" + h.digest("hex").slice(0, 8), index, qr };
}
module.exports = { plan, versionHtml, versionVendorLiterals, sha, compute: () => plan().version };
if (require.main === module) {
  const swPath = path.join(ROOT, "sw.js"), sw = fs.readFileSync(swPath, "utf8"), want = plan();
  const cur = (/^const VERSION = "(.*)";$/m.exec(sw) || [])[1];
  const diskIndex = read("index.html").toString("utf8"), diskQr = read("js/features/qr-transfer.js").toString("utf8");
  if (process.argv.includes("--check")) {
    const bad = [];
    if (diskIndex !== want.index) bad.push("index.html no tiene los ?v= al día");
    if (diskQr !== want.qr) bad.push("qr-transfer.js no tiene el ?v= de las librerías al día");
    if (cur !== want.version) bad.push("sw.js tiene VERSION " + cur + " y el contenido pide " + want.version);
    if (bad.length) { console.error("✗ " + bad.join("; ") + ". Ejecuta: node tools/stamp.js"); process.exit(1); }
    console.log("✓ versiones al día (" + cur + ")"); process.exit(0);
  }
  if (diskQr !== want.qr) fs.writeFileSync(path.join(ROOT, "js/features/qr-transfer.js"), want.qr);
  const after = plan();                                                     // el hash de qr-transfer cambió: se recalcula todo
  if (diskIndex !== after.index) fs.writeFileSync(path.join(ROOT, "index.html"), after.index);
  const final = plan();
  fs.writeFileSync(path.join(ROOT, "build.json"), JSON.stringify({ version: final.version }) + "\n");
  if (cur === final.version) { console.log("ya estaba al día: " + cur); process.exit(0); }
  fs.writeFileSync(swPath, sw.replace(/^const VERSION = ".*";$/m, 'const VERSION = "' + final.version + '";'));
  console.log("versión: " + cur + " → " + final.version);
}

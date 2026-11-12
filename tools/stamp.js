#!/usr/bin/env node
/**
 * TatoCine · tools/stamp.js
 * Calcula la VERSIÓN del Service Worker a partir del CONTENIDO de la app (index.html, CSS, JS, páginas de error, manifiesto, iconos y sw.js)
 * y la escribe en sw.js. El Service Worker sirve CSS/JS desde su caché versionada (sin pedirlos a la red en cada apertura), por eso la
 * versión debe cambiar cada vez que cambie algo: ejecuta esto ANTES de subir/empaquetar.
 *
 *   node tools/stamp.js          → actualiza sw.js
 *   node tools/stamp.js --check  → solo comprueba (sale con error si sw.js está desactualizado; lo usa tests/sw-stamp.test.js)
 */
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".git", "tests", "docs", "tools", "dist", ".vscode"]);
const INCLUDE_ROOT = new Set(["index.html", "offline.html", "404.html", "500.html", "manifest.webmanifest", "config.js", "robots.txt", "sitemap.xml"]);
function walk(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
function compute() {
  const files = walk(ROOT, []).map((p) => path.relative(ROOT, p).split(path.sep).join("/")).filter((r) => {
    if (r === "sw.js") return true;
    if (r === "icons/inspiration.jpeg") return false;                    // fuente de los iconos: no se publica
    if (!r.includes("/")) return INCLUDE_ROOT.has(r);
    return /^(css|js|icons)\//.test(r);
  }).sort();
  const h = crypto.createHash("sha1");
  for (const r of files) {
    let data = fs.readFileSync(path.join(ROOT, r));
    if (r === "sw.js") data = Buffer.from(data.toString("utf8").replace(/^const VERSION = ".*";$/m, "const VERSION = \"\";"));   // la propia línea de versión no cuenta
    h.update(r + "\0"); h.update(data); h.update("\0");
  }
  return "5.6-" + h.digest("hex").slice(0, 8);
}
module.exports = { compute };
if (require.main === module) {
  const swPath = path.join(ROOT, "sw.js"), sw = fs.readFileSync(swPath, "utf8"), want = compute();
  const cur = (/^const VERSION = "(.*)";$/m.exec(sw) || [])[1];
  if (process.argv.includes("--check")) {
    if (cur !== want) { console.error("✗ sw.js tiene VERSION " + cur + " pero el contenido pide " + want + ". Ejecuta: node tools/stamp.js"); process.exit(1); }
    console.log("✓ sw.js está al día (" + cur + ")"); process.exit(0);
  }
  // build.json: permite comprobar que los cuatro despliegues son réplicas idénticas (curl <dominio>/build.json). No entra en el cálculo de la versión.
  fs.writeFileSync(path.join(ROOT, "build.json"), JSON.stringify({ version: want }) + "\n");
  if (cur === want) { console.log("sw.js ya estaba al día: " + cur); process.exit(0); }
  fs.writeFileSync(swPath, sw.replace(/^const VERSION = ".*";$/m, 'const VERSION = "' + want + '";'));
  console.log("sw.js: " + cur + " → " + want);
}

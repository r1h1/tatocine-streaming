/**
 * Iconos de la app (palomera): todos los que piden el manifiesto, index.html y sw.js existen, están en icons/palomera/ (URLs nuevas: los iconos se sirven con caché
 * «immutable» de 1 año, así que con la URL vieja un teléfono seguía mostrando el icono anterior del «play») y miden lo que declaran. Ejecutar: node tests/icons.test.js
 */
const fs = require("node:fs"), path = require("node:path");
const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const bad = [];
function pngSize(f) { const b = fs.readFileSync(path.join(ROOT, f)); return b.toString("ascii", 1, 4) === "PNG" ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; }
const man = JSON.parse(read("manifest.webmanifest"));
const refs = [];
(man.icons || []).forEach((i) => refs.push([i.src, i.sizes]));
(man.shortcuts || []).forEach((s) => (s.icons || []).forEach((i) => refs.push([i.src, i.sizes])));
(read("index.html").match(/<link[^>]+rel="(?:apple-touch-icon|icon)"[^>]*>/g) || []).forEach((l) => refs.push([(l.match(/href="([^"]+)"/) || [])[1], (l.match(/sizes="([^"]+)"/) || [])[1]]));
(read("sw.js").match(/"icons\/[^"]+\.png"/g) || []).forEach((s) => refs.push([s.slice(1, -1), null]));
refs.forEach(([src, sizes]) => {
  if (!src || /^icons\/(icon|maskable|favicon)-\d+\.png$|^icons\/apple-touch-icon\.png$/.test(src)) return bad.push("icono con la URL vieja (caché del icono anterior): " + src);
  if (!/^icons\/(palomera\/|splash\.jpg)/.test(src)) return bad.push("icono fuera de icons/palomera/: " + src);
  if (!fs.existsSync(path.join(ROOT, src))) return bad.push("no existe: " + src);
  const s = /\.png$/.test(src) && pngSize(src);
  if (s && s[0] !== s[1]) bad.push("no es cuadrado: " + src + " " + s.join("×"));
  if (s && sizes && sizes !== s[0] + "x" + s[1]) bad.push(src + " declara " + sizes + " pero mide " + s.join("×"));
});
if (/os\.path\.join\(root, "icons", "icon-512\.png"\)/.test(read("android-tv/make-icons.py"))) bad.push("la APK toma el icono de la ruta vieja");
if (bad.length) { console.error("✗ iconos:\n  " + bad.join("\n  ")); process.exit(1); }
console.log("✓ iconos: " + refs.length + " referencias, todas en icons/palomera/ y con el tamaño declarado");

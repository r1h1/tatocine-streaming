/** Ningún emoji en la interfaz: `node tests/emoji.test.js` (revisa index.html, js/ y css/ salvo js/vendor/). */
const fs = require("node:fs"), path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const re = /\p{Emoji_Presentation}|️/u;
const files = ["index.html"];
(function walk(d) { for (const f of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = path.join(d, f.name); if (f.isDirectory()) { if (f.name !== "vendor") walk(rel); } else if (/\.(js|css|html)$/.test(f.name)) files.push(rel); } })("js");
fs.readdirSync(path.join(ROOT, "css")).forEach((f) => files.push(path.join("css", f)));
const bad = [];
for (const f of files) fs.readFileSync(path.join(ROOT, f), "utf8").split("\n").forEach((l, i) => { const m = l.match(re); if (m) bad.push(f + ":" + (i + 1) + " " + m[0]); });
if (bad.length) { console.error("✗ emojis encontrados:\n" + bad.join("\n")); process.exit(1); }
console.log("✓ sin emojis en " + files.length + " archivos");

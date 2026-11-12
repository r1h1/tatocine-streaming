/**
 * Compatibilidad: TatoCine apunta a navegadores de 2022 en adelante (Chrome/Edge/Firefox ≥ 100, Safari ≥ 15.4; ver .browserslistrc).
 * Esta prueba (a) comprueba que TODOS los .js se analizan como script clásico moderno y (b) rechaza APIs de JavaScript y
 * funciones de CSS que aún no existían en 2022 (se usarían sin avisar y romperían en navegadores algo viejos).
 * Ejecutar: node tests/compat.test.js
 */
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
function walk(dir, ext, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "tests", "docs", "tools", "dist"].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, ext, out); else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}
const bad = [];
const JS_TOO_NEW = [[/\.toSorted\(|\.toReversed\(|\.toSpliced\(/, "Array.prototype.toSorted/toReversed/toSpliced (2023)"], [/Object\.groupBy|Map\.groupBy/, "groupBy (2024)"], [/Promise\.withResolvers/, "Promise.withResolvers (2024)"], [/Array\.fromAsync/, "Array.fromAsync (2024)"], [/\.isWellFormed\(|\.toWellFormed\(/, "String.isWellFormed (2023)"], [/\.(union|intersection|difference)\(new Set/, "Set methods (2024)"]];
const CSS_TOO_NEW = [[/:has\(/, ":has() (Firefox 121, 2023)"], [/@container\b/, "container queries (2023)"], [/text-wrap\s*:/, "text-wrap (2023)"], [/color-mix\(/, "color-mix (2023)"], [/@starting-style/, "@starting-style (2024)"], [/field-sizing/, "field-sizing (2024)"], [/view-transition/, "view transitions (2023)"], [/@scope\b/, "@scope (2024)"]];
/* Suelo de compatibilidad Chromium 68 (LG webOS 5 / 2020): sin transpilar, el JS no debe usar sintaxis ni APIs posteriores sin detección de la función.
 * Hoy el código cumple; esta prueba evita que se rompa sin avisar. Se permite una línea con «// compat:ok» (p. ej. si se detecta antes la función). */
const JS_C68 = [[/[A-Za-z_\])]\?\.[A-Za-z_\[(]/, "optional chaining (Chromium 80)"], [/\?\?(?!=)/, "nullish coalescing (Chromium 80)"], [/\?\?=|\|\|=|&&=/, "asignación lógica (Chromium 85)"], [/\.replaceAll\(/, "replaceAll (Chromium 85)"],
  [/Object\.fromEntries/, "Object.fromEntries (Chromium 73)"], [/\.flatMap\(|\.flat\(/, "flat/flatMap (Chromium 69)"], [/Promise\.allSettled/, "Promise.allSettled (Chromium 76)"], [/(?<!clients)\.matchAll\(/, "String.matchAll (Chromium 73)"],
  [/structuredClone|\.randomUUID\(|\.replaceChildren\(|\.hasOwn\(|findLast\(|AbortSignal\.timeout/, "API de Chromium 90+"]];
for (const file of walk(ROOT, ".js")) {
  if (file.includes(path.join("js", "vendor")) || path.basename(file) === "config.js") continue;
  const src = fs.readFileSync(file, "utf8"), rel = path.relative(ROOT, file);
  try { new vm.Script(src, { filename: rel }); } catch (e) { bad.push(rel + ": no se puede analizar (" + e.message + ")"); }
  for (const [re, why] of JS_TOO_NEW) if (re.test(src)) bad.push(rel + ": usa " + why);
  src.split("\n").forEach((line, n) => { const code = line.replace(/\/\/.*$/, "").replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""'); if (/compat:ok/.test(line)) return; for (const [re, why] of JS_C68) if (re.test(code)) bad.push(rel + ":" + (n + 1) + ": usa " + why + " (piso Chromium 68)"); });
}
for (const file of walk(path.join(ROOT, "css"), ".css")) {
  const src = fs.readFileSync(file, "utf8"), rel = path.relative(ROOT, file);
  for (const [re, why] of CSS_TOO_NEW) if (re.test(src)) bad.push(rel + ": usa " + why);
}
if (bad.length) { console.error("✗ compatibilidad:\n  " + bad.join("\n  ")); process.exit(1); }
console.log("✓ compatibilidad 2022+: todos los .js se analizan y no hay APIs ni CSS posteriores a 2022");

/** tools/css-legacy.js: respaldos para Chromium viejo, en el mismo sitio de la cascada. */
const { legacyCss } = require("../tools/css-legacy.js");
let bad = [];
function t(name, input, expectIncludes, expectExcludes) {
  const out = legacyCss(input);
  for (const e of expectIncludes || []) if (!out.includes(e)) bad.push(name + ": falta «" + e + "» en: " + out);
  for (const e of expectExcludes || []) if (out.includes(e)) bad.push(name + ": sobra «" + e + "» en: " + out);
}
t("inset", ".a{position:fixed;inset:0;z-index:1}", ["top:0;right:0;bottom:0;left:0;z-index:1"], ["inset"]);
t("inset 2 valores", ".a{inset:10px 5px}", ["top:10px;right:5px;bottom:10px;left:5px"]);
t("clamp", ".a{font-size:clamp(26px,6vw,38px)}", ["font-size:6vw;font-size:clamp(26px,6vw,38px)"]);
t("min", ".a{width:min(560px,100%)}", ["width:560px;width:min(560px,100%)"]);
t("env", ".a{padding-top:calc(70px + env(safe-area-inset-top))}", ["padding-top:calc(70px + 0px);padding-top:calc(70px + env(safe-area-inset-top))"]);
t("env+max", ".a{padding-top:max(14px,env(safe-area-inset-top))}", ["padding-top:14px;padding-top:max(14px,env(safe-area-inset-top))"]);
t("is", ":is(.a,.b) .c{color:red}", [".a .c,.b .c{color:red}"], [":is("]);
t("focus-visible", ".x:focus-visible{outline:2px solid}", [".x:focus-visible{outline:2px solid}", "html.no-focus-visible .x:focus{outline:2px solid}"]);
t("gap fila", ".r{display:flex;gap:8px}", ["html.no-flex-gap .r>*+*{margin-left:8px}"]);
t("gap columna", ".r{display:flex;flex-direction:column;gap:12px}", ["html.no-flex-gap .r>*+*{margin-top:12px}"]);
t("gap wrap", ".r{display:flex;flex-wrap:wrap;gap:6px 10px}", ["html.no-flex-gap .r>*{margin-right:10px;margin-bottom:6px}"]);
t("grid sin gap legacy", ".g{display:grid;gap:8px}", [".g{display:grid;gap:8px}"], ["no-flex-gap"]);
t("media", "@media (max-width:600px){.a{inset:0}}", ["@media (max-width:600px){.a{top:0;right:0;bottom:0;left:0}}"]);
t("data uri con ;", ".a{background:url(\"data:image/svg+xml;utf8,<svg/>\") no-repeat;padding:min(1px,2px)}", ["data:image/svg+xml;utf8,<svg/>", "padding:1px"]);
t("var intacta", ".a{width:var(--w);margin:0 auto}", [".a{width:var(--w);margin:0 auto}"]);
if (bad.length) { console.error("✗ css-legacy:\n  " + bad.join("\n  ")); process.exit(1); }
console.log("✓ css-legacy: respaldos correctos (inset, min/max/clamp, env, :is, :focus-visible, gap)");

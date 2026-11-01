/**
 * TatoCine · js/ui/command-palette.js
 * Paleta de comandos (Ctrl/Cmd + K): escribe y salta a cualquier pantalla o acción sin usar el ratón.
 * Búsqueda tolerante (sin tildes, por palabras). Flechas para moverse, Enter para ejecutar, Esc para cerrar.
 * Otras funciones se añaden con registerCommand({ id, es, en, keys, adult, run }).
 */
var cmdList = [], cmdOpen = false, cmdSel = 0, cmdShown = [];
function registerCommand(c) { cmdList = cmdList.filter(function (x) { return x.id !== c.id; }); cmdList.push(c); }
function cmdNorm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function cmdFilter(q) {
  var tokens = cmdNorm(q).split(/\s+/).filter(Boolean), kid = isKidProfile();
  return cmdList.filter(function (c) { return !(kid && c.adult); }).map(function (c) {
    var hay = cmdNorm(c.es + " " + c.en + " " + (c.keys || "")), score = 0;
    for (var i = 0; i < tokens.length; i++) { var at = hay.indexOf(tokens[i]); if (at < 0) return null; score += at === 0 ? 0 : 1; }
    return { c: c, score: score };
  }).filter(Boolean).sort(function (a, b) { return a.score - b.score; }).map(function (x) { return x.c; });
}
function cmdRender() {
  var q = $("tc-cmd-input").value;
  cmdShown = cmdFilter(q).slice(0, 9);
  if (cmdSel >= cmdShown.length) cmdSel = 0;
  $("tc-cmd-list").innerHTML = cmdShown.length ? cmdShown.map(function (c, i) {
    return '<li id="tc-cmd-' + i + '" role="option" aria-selected="' + (i === cmdSel) + '" class="cmd-item' + (i === cmdSel ? " sel" : "") + '" data-i="' + i + '">' + escapeHTML(L(c.es, c.en)) + "</li>";
  }).join("") : '<li class="cmd-empty">' + L("Nada coincide. Prueba con «favoritos» o «ajustes».", "Nothing matches. Try “favorites” or “settings”.") + "</li>";
  $("tc-cmd-input").setAttribute("aria-activedescendant", cmdShown.length ? "tc-cmd-" + cmdSel : "");
}
function openCommandPalette() {
  if (cmdOpen) return;
  cmdOpen = true;
  openOverlay("tc-cmd-overlay");
  $("tc-cmd-input").value = "";
  cmdSel = 0;
  cmdRender();
  setTimeout(function () { $("tc-cmd-input").focus(); }, 40);
}
function closeCommandPalette() { cmdOpen = false; closeOverlay("tc-cmd-overlay"); }
function cmdRun(i) {
  var c = cmdShown[i];
  if (!c) return;
  closeCommandPalette();
  setTimeout(function () { try { c.run(); } catch (e) { } }, 60);
}
(function bindPalette() {
  var input = $("tc-cmd-input"), list = $("tc-cmd-list");
  if (!input || !list) return;
  input.addEventListener("input", function () { cmdSel = 0; cmdRender(); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); cmdSel = (cmdSel + 1) % Math.max(1, cmdShown.length); cmdRender(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); cmdSel = (cmdSel - 1 + cmdShown.length) % Math.max(1, cmdShown.length); cmdRender(); }
    else if (e.key === "Enter") { e.preventDefault(); cmdRun(cmdSel); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeCommandPalette(); }
  });
  list.addEventListener("click", function (e) { var li = e.target.closest(".cmd-item"); if (li) cmdRun(Number(li.getAttribute("data-i"))); });
  $("tc-cmd-overlay").addEventListener("click", function (e) { if (e.target === this) closeCommandPalette(); });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); cmdOpen ? closeCommandPalette() : openCommandPalette(); }
  });
  var go = function (v) { return function () { switchView(v); }; };
  [["home", "Ir a Inicio", "Go to Home", "inicio home principal"], ["movies", "Ir a Películas", "Go to Movies", "peliculas cine"], ["series", "Ir a Series", "Go to Series", "series capitulos"],
    ["anime", "Ir a Anime", "Go to Anime", "anime japon"], ["list", "Ir a Mi cine", "Go to My Cinema", "mi cine favoritos listas guardados"]].forEach(function (x) {
    registerCommand({ id: "go-" + x[0], es: x[1], en: x[2], keys: x[3], adult: true, run: go(x[0]) });
  });
  registerCommand({ id: "go-kids", es: "Ir a Niños", en: "Go to Kids", keys: "ninos infantil", run: go("kids") });
  registerCommand({ id: "search", es: "Buscar películas y series", en: "Search movies and shows", keys: "buscar search encontrar", run: function () { window.scrollTo(0, 0); $searchInput.focus(); } });
  registerCommand({ id: "wizard", es: "¿Qué ver hoy? (asistente)", en: "What to watch today? (assistant)", keys: "recomendar asistente que ver", run: function () { openWizard(); } });
  registerCommand({ id: "settings", es: "Abrir Ajustes", en: "Open Settings", keys: "ajustes configuracion settings", run: function () { showSettings(); } });
  registerCommand({ id: "stats", es: "Ver mis estadísticas", en: "View my statistics", keys: "estadisticas stats tiempo", adult: true, run: function () { openStats(); } });
  registerCommand({ id: "week", es: "Resumen semanal", en: "Weekly summary", keys: "resumen semanal padres uso", adult: true, run: function () { openWeeklySummary(); } });
  registerCommand({ id: "profiles", es: "Cambiar de perfil", en: "Switch profile", keys: "perfil usuario cambiar", run: function () { showProfiles(); } });
  registerCommand({ id: "fullscreen", es: "Pantalla completa", en: "Full screen", keys: "pantalla completa fullscreen", run: function () { toggleAppFullscreen(); } });
  registerCommand({ id: "hc", es: "Alternar alto contraste", en: "Toggle high contrast", keys: "contraste accesibilidad", run: function () { toggleHighContrast(); } });
  registerCommand({ id: "bigger", es: "Texto más grande", en: "Larger text", keys: "texto grande accesibilidad zoom", run: function () { changeTextScale(1); } });
  registerCommand({ id: "smaller", es: "Texto más pequeño", en: "Smaller text", keys: "texto pequeno accesibilidad zoom", run: function () { changeTextScale(-1); } });
  registerCommand({ id: "rm", es: "Alternar reducir movimiento", en: "Toggle reduce motion", keys: "movimiento animaciones accesibilidad", run: function () { toggleReduceMotion(); } });
  registerCommand({ id: "backup", es: "Copia de seguridad (exportar)", en: "Backup (export)", keys: "copia seguridad exportar backup", run: function () { exportProfileData(); } });
  registerCommand({ id: "qr-show", es: "Mostrar QR para otro dispositivo", en: "Show QR for another device", keys: "qr pasar dispositivo", run: function () { openQrShow(); } });
  registerCommand({ id: "qr-scan", es: "Escanear un QR", en: "Scan a QR", keys: "qr escanear importar", run: function () { openQrScan(); } });
  if (typeof i18nAdd === "function") i18nAdd({ "Paleta de comandos": "Command palette", "Escribe un comando…": "Type a command…" });
})();

registerAction("retry", function () { switchView(currentView, false); });
registerAction("go-home", function () { switchView("home"); });
registerAction("go-movies", function () { switchView("movies"); });

/**
 * TatoCine · js/ui/accessibility-prefs.js
 * Preferencias de accesibilidad por dispositivo (Ajustes → Accesibilidad, también en la paleta Ctrl+K):
 *   - Tamaño del texto: 100 / 115 / 130 % (A− / A+).
 *   - Alto contraste: bordes y textos más marcados, foco grueso y sin transparencias.
 *   - Reducir movimiento: sin animaciones ni rotación automática de la portada (además del ajuste del sistema).
 *   - Anuncios para lectores de pantalla al cambiar de pestaña («Mostrando Películas»).
 * Se guarda en `tatoA11yV1` (sin datos personales) y se aplica antes de pintar para evitar saltos.
 */
var A11Y_KEY = "tatoA11yV1", A11Y_SCALES = [100, 115, 130];
var a11yPrefs = (function () {
  var p = readLocalJSON(A11Y_KEY, {});
  if (!p || typeof p !== "object" || Array.isArray(p)) p = {};
  return { scale: A11Y_SCALES.includes(p.scale) ? p.scale : (typeof IS_TV !== "undefined" && IS_TV ? 115 : 100), hc: p.hc === true, rm: p.rm === true };
})();
/** Pantallas grandes (≥ 1200 px CSS: escritorio, laptop y TV): el texto se veía demasiado grande. 87,5 % ≈ 2 px menos en el texto normal (16 → 14, 14 → 12,3).
 *  Teléfonos y tabletas sin cambios. Se recalcula al cambiar el tamaño de la ventana. */
var A11Y_BIG_MQ = null;
function a11yBigFactor() {
  try {
    if (!A11Y_BIG_MQ && window.matchMedia) {
      A11Y_BIG_MQ = window.matchMedia("(min-width: 1200px)");
      var re = function () { applyA11yPrefs(); };
      if (A11Y_BIG_MQ.addEventListener) A11Y_BIG_MQ.addEventListener("change", re); else if (A11Y_BIG_MQ.addListener) A11Y_BIG_MQ.addListener(re);
    }
    return A11Y_BIG_MQ && A11Y_BIG_MQ.matches ? 87.5 : 100;
  } catch (e) { return 100; }
}
function applyA11yPrefs() {
  var b = document.body;
  b.classList.toggle("hc", a11yPrefs.hc);
  b.classList.toggle("rm", a11yPrefs.rm);
  var ts = Math.round(a11yPrefs.scale * a11yBigFactor()) / 10000;
  document.documentElement.style.setProperty("--ts", String(ts));                         // multiplica todos los font-size (css: calc(Npx * var(--ts)))
  document.documentElement.style.setProperty("--ts-hero", String(Math.round(ts * 9400) / 10000));   // portada en pantallas grandes: ~1 px menos (css/21-fluidez.css)
  document.documentElement.style.setProperty("--ts-hero-web", String(Math.round(ts * 10500) / 10000));   // portada en la WEB (no TV), pantallas grandes: ~1,5 px más que antes
  document.documentElement.style.setProperty("--ts-head", String(Math.round(ts * 11525) / 10000));  // encabezado en la web (no TV) en pantallas grandes: ~2 px más (13 → 15 px)
  var lbl = $("a11y-scale-label"), hc = $("a11y-hc-btn"), rm = $("a11y-rm-btn");
  if (lbl) lbl.textContent = a11yPrefs.scale + " %";
  if (hc) { hc.setAttribute("aria-pressed", String(a11yPrefs.hc)); hc.classList.toggle("on", a11yPrefs.hc); }
  if (rm) { rm.setAttribute("aria-pressed", String(a11yPrefs.rm)); rm.classList.toggle("on", a11yPrefs.rm); }
}
function saveA11yPrefs() { safeStorageSet(A11Y_KEY, JSON.stringify(a11yPrefs)); applyA11yPrefs(); }
function changeTextScale(dir) {
  var i = A11Y_SCALES.indexOf(a11yPrefs.scale) + dir;
  if (i < 0 || i >= A11Y_SCALES.length) { announce(i < 0 ? L("Ya está en el tamaño mínimo", "Already at the smallest size") : L("Ya está en el tamaño máximo", "Already at the largest size")); return; }
  a11yPrefs.scale = A11Y_SCALES[i];
  saveA11yPrefs();
  announce(L("Tamaño del texto: " + a11yPrefs.scale + " %", "Text size: " + a11yPrefs.scale + "%"));
}
function toggleHighContrast() { a11yPrefs.hc = !a11yPrefs.hc; saveA11yPrefs(); announce(a11yPrefs.hc ? L("Alto contraste activado", "High contrast on") : L("Alto contraste desactivado", "High contrast off")); }
function toggleReduceMotion() { a11yPrefs.rm = !a11yPrefs.rm; saveA11yPrefs(); announce(a11yPrefs.rm ? L("Movimiento reducido activado", "Reduced motion on") : L("Movimiento reducido desactivado", "Reduced motion off")); }

/* ---- Región «en vivo» para lectores de pantalla ---- */
var announceEl = null;
function announce(msg) {
  if (!announceEl) {
    announceEl = document.createElement("div");
    announceEl.id = "a11y-live";
    announceEl.className = "sr-only";
    announceEl.setAttribute("role", "status");
    announceEl.setAttribute("aria-live", "polite");
    document.body.appendChild(announceEl);
  }
  announceEl.textContent = "";
  setTimeout(function () { announceEl.textContent = msg; }, 60);
  showToast(msg);
}
var VIEW_NAMES = { home: ["Inicio", "Home"], movies: ["Películas", "Movies"], series: ["Series", "Series"], anime: ["Anime", "Anime"], kids: ["Niños", "Kids"], list: ["Mi cine", "My Cinema"] };
decorate("switchView", function (original) {
  return function (v, r) {
    var out = original(v, r), n = VIEW_NAMES[currentView];
    if (n && announceEl) { announceEl.textContent = ""; setTimeout(function () { announceEl.textContent = L("Mostrando " + n[0], "Showing " + n[1]); }, 80); }
    return out;
  };
});
(function initA11yPrefs() {
  applyA11yPrefs();
  // El elemento «en vivo» existe desde el principio (los lectores de pantalla lo detectan mejor si ya está en la página).
  if (!announceEl) { announceEl = document.createElement("div"); announceEl.id = "a11y-live"; announceEl.className = "sr-only"; announceEl.setAttribute("role", "status"); announceEl.setAttribute("aria-live", "polite"); document.body.appendChild(announceEl); }
  if (typeof i18nAdd === "function") i18nAdd({ "Accesibilidad": "Accessibility", "Texto, contraste y movimiento": "Text, contrast and motion", "Alto contraste": "High contrast", "Reducir movimiento": "Reduce motion", "Texto": "Text" });
})();

/**
 * TatoCine · js/ui/gestures.js
 * Gestos y atajos de mando, una sola capa para todos los dispositivos:
 *   - Táctil (móvil/tableta): deslizar la portada cambia de título; deslizar hacia abajo cierra ventanas
 *     (cuando están arriba del todo); deslizar desde el borde izquierdo cierra la ventana superior.
 *   - Mando de TV: canal +/- cambia el título de la portada; Atrás y flechas ya los maneja tv-navigation.js.
 *   - Escritorio: arrastrar con el ratón sobre la portada también cambia de título.
 * Los listeners son pasivos y el umbral evita confundir un gesto con el desplazamiento normal.
 */
var GESTURE = { minDistance: 70, edge: 24, closeDistance: 110, axisRatio: 1.6 };

function gestureHeroStep(dir) {
  if (!heroMoviesList || heroMoviesList.length < 2 || heroSectionIsEmpty()) return;
  currentHeroIndex = (currentHeroIndex + dir + heroMoviesList.length) % heroMoviesList.length;
  setHero(heroMoviesList[currentHeroIndex]);
}

/** Ventanas que se cierran deslizando hacia abajo: id → [zona con scroll, función de cierre]. */
var SHEETS = {
  "details-modal": [".details-scroll", function () { closeDetails(); }],
  "settings-modal": [".modal-body", function () { closeSettings(); }],
  "stats-modal": [".modal-body", function () { closeStats(); }],
  "filters-modal": [".modal-body", function () { closeFilters(); }],
  "actor-modal": [".actor-scroll", function () { closeActor(); }],
  "tc-wizard-overlay": [".tc-profile-create-dialog", function () { closeWizard(); }],
  "tc-qr-overlay": [".tc-profile-create-dialog", function () { closeQr(); }],
  "tc-fav-overlay": [".tc-profile-create-dialog", function () { closeFavPicker(); }],
  "tc-list-overlay": [".tc-profile-create-dialog", function () { closeListModal(); }]
};

(function bindGestures() {
  var start = null;
  function point(e) { var t = (e.changedTouches && e.changedTouches[0]) || e; return { x: t.clientX, y: t.clientY }; }
  function sheetAt(target) {
    for (var id in SHEETS) {
      var el = $(id);
      if (el && el.classList.contains("open") && el.contains(target)) return { el: el, scroller: el.querySelector(SHEETS[id][0]), close: SHEETS[id][1] };
    }
    return null;
  }
  function onStart(e) {
    var p = point(e), t = e.target;
    if (t.closest && t.closest("input, select, textarea, .details-cast, .row-scroll, .ep-seasons, iframe")) { start = null; return; }
    var sheet = sheetAt(t);
    start = { x: p.x, y: p.y, hero: !!(t.closest && t.closest("#hero-section") && !t.closest(".search-wrap, button, a")), sheet: sheet, atTop: !sheet || !sheet.scroller || sheet.scroller.scrollTop <= 0, edge: p.x <= GESTURE.edge };
  }
  function onEnd(e) {
    if (!start) return;
    var p = point(e), dx = p.x - start.x, dy = p.y - start.y, ax = Math.abs(dx), ay = Math.abs(dy), s = start;
    start = null;
    if (s.edge && dx > GESTURE.closeDistance && ax > ay * GESTURE.axisRatio) {           // desde el borde: cierra la ventana superior
      var layer = typeof topLayer === "function" ? topLayer() : null;
      if (layer && layer.id !== "player-modal" && layer.id !== "tc-profile-overlay") document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return;
    }
    if (s.sheet && s.atTop && dy > GESTURE.closeDistance && ay > ax * GESTURE.axisRatio) { s.sheet.close(); return; }   // hacia abajo: cierra
    if (s.hero && !s.sheet && ax > GESTURE.minDistance && ax > ay * GESTURE.axisRatio) gestureHeroStep(dx < 0 ? 1 : -1);  // portada
  }
  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchend", onEnd, { passive: true });
  var hero = $("hero-section");
  if (hero) {                                                                     // ratón: arrastrar la portada
    hero.addEventListener("mousedown", onStart);
    hero.addEventListener("mouseup", onEnd);
  }
  // Mando de TV: canal +/- cambia el título de la portada (códigos habituales de Tizen, webOS y Android TV)
  window.addEventListener("keydown", function (e) {
    if (isTypingTarget(document.activeElement) || (typeof topLayer === "function" && topLayer())) return;
    if (e.key === "ChannelUp" || e.keyCode === 427 || e.keyCode === 33 && IS_TV) gestureHeroStep(1);
    else if (e.key === "ChannelDown" || e.keyCode === 428 || e.keyCode === 34 && IS_TV) gestureHeroStep(-1);
  });
})();

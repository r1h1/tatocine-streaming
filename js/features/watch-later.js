/**
 * TatoCine · js/features/watch-later.js
 * «Ver más tarde»: lista aparte de Favoritos para lo que quieres ver pronto (por perfil, máx. 200).
 * Botón en la ficha del título, sección en Favoritos y comando en la paleta (Ctrl+K). Con «Deshacer» al quitar.
 * Datos: `tatoLater` = [{ id, type, title, bg, rating, year, addedAt }] (validados al leer y al importar).
 */
var LATER_KEY = "tatoLater", LATER_MAX = 200;
var laterList = (function () {
  var raw = readLocalJSON(profileStorageKey(LATER_KEY), []), out = [];
  (Array.isArray(raw) ? raw : []).slice(0, LATER_MAX).forEach(function (x) {
    var m = bkMedia(x);
    if (m) { m.rating = bkNum(x && x.rating, 0, 10, 0); m.year = bkYear(x && x.year); m.addedAt = bkNum(x && x.addedAt, 0, 4102444800000, 0); out.push(m); }
  });
  return out;
})();
function saveLater() { return safeStorageSet(profileStorageKey(LATER_KEY), JSON.stringify(laterList)); }
function isLater(m) { return !!m && laterList.some(function (x) { return x.id === m.id && x.type === m.type; }); }
function toggleLater(media) {
  if (!media || !media.id || !media.type) return;
  var i = laterList.findIndex(function (x) { return x.id === media.id && x.type === media.type; });
  if (i > -1) {
    var rec = laterList.splice(i, 1)[0];
    saveLater();
    showToastAction(L("Quitado de Ver más tarde", "Removed from Watch later"), L("Deshacer", "Undo"), function () { if (!isLater(rec)) { laterList.splice(Math.min(i, laterList.length), 0, rec); saveLater(); refreshLaterUI(); undoRestored(); } });
  } else {
    if (laterList.length >= LATER_MAX) { showToast(L("Tu lista Ver más tarde está llena (200)", "Your Watch later list is full (200)")); return; }
    laterList.unshift({ id: media.id, type: media.type, title: bkText(media.title, 120) || "Sin título", bg: bkBg(media.bg), rating: bkNum(Number(media.rating), 0, 10, 0), year: bkYear(String(media.year || "")), addedAt: Date.now() });
    saveLater();
    showToast(L("Guardado en Ver más tarde", "Saved to Watch later"));
  }
  refreshLaterUI();
}
function refreshLaterUI() {
  var b = $("details-later-btn");
  if (b && detailsMedia) {
    var on = isLater(detailsMedia);
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
    b.querySelector("span").textContent = on ? L("En Ver más tarde", "In Watch later") : L("Ver más tarde", "Watch later");
  }
  if (currentView === "list") renderFavoritesView();
}
decorate("renderUserActions", function (original) {
  return function () {
    var r = original.apply(this, arguments), box = $("details-user-actions");
    if (box && detailsMedia && !$("details-later-btn")) {
      var on = isLater(detailsMedia);
      box.insertAdjacentHTML("beforeend", '<button type="button" id="details-later-btn" class="ua-btn' + (on ? " active" : "") + '" data-act="later-toggle" aria-pressed="' + on + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>' + (on ? L("En Ver más tarde", "In Watch later") : L("Ver más tarde", "Watch later")) + "</span></button>");
    }
    return r;
  };
});
registerAction("later-toggle", function () { toggleLater(detailsMedia); });
registerAction("go-later", function () { switchView("list"); setFavFilter("later"); });
/** Sección «Ver más tarde» dentro de Favoritos. */
function laterSection() {
  var head = '<div class="row-header"><h2 class="row-title">' + L("Ver más tarde", "Watch later") + ' <span class="fav-count">' + laterList.length + "</span></h2></div>";
  if (!laterList.length) return '<section class="fav-section">' + head + emptyStateHTML("later", L("Nada guardado para después", "Nothing saved for later"), L("En la ficha de cualquier título pulsa «Ver más tarde» para dejarlo en esta lista.", "On any title's page tap “Watch later” to keep it in this list."), L("Explorar películas", "Explore movies"), "go-movies") + "</section>";
  return '<section class="fav-section">' + head + '<div class="grid-container">' + laterList.map(getCardHTML).join("") + "</div></section>";
}
registerCommand({ id: "later", es: "Ver más tarde", en: "Watch later", keys: "mas tarde pendientes lista", adult: false, run: function () { switchView(isKidProfile() ? "kids" : "list"); if (!isKidProfile()) setFavFilter("later"); } });
if (typeof i18nAdd === "function") i18nAdd({ "Ver más tarde": "Watch later", "En Ver más tarde": "In Watch later", "Calendario": "Calendar" });

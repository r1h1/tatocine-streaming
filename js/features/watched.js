/**
 * TatoCine · js/features/watched.js
 * «Ya vistas» y valoraciones personales (me gusta / no me gusta) por perfil. Alimenta las recomendaciones:
 *   - me gusta suma peso a sus géneros y aporta un título de referencia.
 *   - no me gusta resta peso a sus géneros y oculta el título de las recomendaciones.
 * Los títulos finalizados en el reproductor se marcan solos como vistos (autoMarkWatched).
 */
var WATCHED_KEY = "tatoWatched";
var watchedMap = readLocalJSON(profileStorageKey(WATCHED_KEY), {});
if (!watchedMap || typeof watchedMap !== "object" || Array.isArray(watchedMap)) watchedMap = {};

function watchedKey(m) { return m.type + ":" + m.id; }
function saveWatched() { return safeStorageSet(profileStorageKey(WATCHED_KEY), JSON.stringify(watchedMap)); }

/** Visto sin marcarlo a mano: terminado, o (película) con 40 min o más de reproducción. */
function autoWatchedItem(it) { return (it.done || 0) > 0 || (it.type === "movie" && (it.secs || 0) >= 2400); }
function isWatched(m) {
  var r = watchedMap[watchedKey(m)];
  if (r && r.w !== undefined) return !!r.w;          // una decisión manual (vista / no vista) manda
  var it = analyticsItem(m.type, m.id);
  return !!(it && autoWatchedItem(it));
}
function userRating(m) { var r = watchedMap[watchedKey(m)]; return r ? r.ur || 0 : 0; }

/** Registro mínimo y compacto (se guarda en el dispositivo): id, tipo, título, imagen, fecha, valoración y géneros. */
function touchWatched(m, genres) {
  var k = watchedKey(m);
  var r = watchedMap[k] || { id: m.id, type: m.type };
  r.title = m.title || r.title || "";
  r.bg = m.bg || r.bg || "";
  r.ts = Date.now();
  if (genres && genres.length) r.g = genres.slice(0, 6);
  watchedMap[k] = r;
  return r;
}
function cleanupWatched(m) {
  var k = watchedKey(m), r = watchedMap[k], it = analyticsItem(m.type, m.id);
  var finished = !!(it && it.done > 0);              // «no vista» explícita solo se conserva si el título figura como finalizado
  if (r && !r.ur && (r.w ? false : !finished)) delete watchedMap[k];
}
function setWatched(m, on, genres) {
  var r = touchWatched(m, genres);
  r.w = !!on;
  cleanupWatched(m);
  saveWatched();
}
/** Alterna me gusta (1) o no me gusta (-1); al valorar, el título pasa a «visto». */
function setUserRating(m, value, genres) {
  var r = touchWatched(m, genres);
  r.ur = r.ur === value ? 0 : value;
  if (r.ur) r.w = true;
  cleanupWatched(m);
  saveWatched();
}
function autoMarkWatched(analyticsEntry) {
  var k = watchedKey(analyticsEntry);
  if (watchedMap[k] && watchedMap[k].w) return;
  var r = touchWatched(analyticsEntry, analyticsEntry.genreIds);
  r.w = true;
  saveWatched();
}

/** Lista para la sección «Vistas»: registros manuales + títulos finalizados, del más reciente al más antiguo. */
function watchedList() {
  var out = {}, list = [];
  Object.keys(watchedMap).forEach(function (k) { if (watchedMap[k].w) out[k] = watchedMap[k]; });
  (localAnalytics.items || []).filter(autoWatchedItem).forEach(function (it) {
    var k = watchedKey(it);
    if (!out[k] && !(watchedMap[k] && watchedMap[k].w === false)) out[k] = { id: it.id, type: it.type, title: it.title, bg: it.bg || "", ts: it.lastPlayedAt || 0 };
  });
  Object.keys(out).forEach(function (k) { list.push(out[k]); });
  return list.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
}

/** Señales de gusto adicionales (ver getTasteProfile en analytics.js). */
function tasteExtras() {
  var extras = [];
  Object.keys(watchedMap).forEach(function (k) {
    var r = watchedMap[k];
    if (r.ur && r.g && r.g.length) extras.push({ genres: r.g, weight: r.ur > 0 ? 1.2 : -0.8 });
  });
  return extras;
}
/** Títulos con me gusta más recientes, usados como referencia de recomendaciones. */
function likedSeeds() {
  return Object.keys(watchedMap).map(function (k) { return watchedMap[k]; })
    .filter(function (r) { return r.ur > 0; })
    .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); })
    .slice(0, 2)
    .map(function (r) { return { type: r.type, id: r.id, title: r.title }; });
}

/** Sección «Vistas» dentro de Favoritos. */
function watchedSection() {
  var items = watchedList();
  var head = '<div class="row-header"><h2 class="row-title">Ya vistas <span class="fav-count">' + items.length + "</span></h2></div>";
  if (!items.length) return '<section class="fav-section">' + head + '<p class="fav-empty">' + L("Aún no hay títulos vistos. Se agregan solos al terminar un título, o márcalos desde su ficha.", "No watched titles yet. They are added automatically when you finish one, or mark them from their page.") + "</p></section>";
  return '<section class="fav-section">' + head + '<div class="grid-container">' + items.map(getCardHTML).join("") + "</div></section>";
}

// ---- Botones de la ficha: «Marcar como vista» y me gusta / no me gusta ----
var USER_ACTION_ICONS = {
  check: '<path d="M20 6L9 17l-5-5"/>',
  up: '<path d="M7 11v9H3v-9h4zM7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/>',
  down: '<path d="M17 13V4h4v9h-4zM17 13l-4 8a2 2 0 0 1-2-2v-4H5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.2 4H17"/>'
};
function userActionButton(act, label, active, pathKey, textLabel) {
  return '<button type="button" class="ua-btn' + (textLabel ? "" : " ua-icon") + (active ? " active" : "") + '" data-ua="' + act + '" aria-pressed="' + active +
    '" aria-label="' + label + '" title="' + label + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    USER_ACTION_ICONS[pathKey] + "</svg>" + (textLabel ? "<span>" + textLabel + "</span>" : "") + "</button>";
}
function renderUserActions() {
  var box = $("details-user-actions");
  if (!box || !detailsMedia) return;
  var watched = isWatched(detailsMedia), rating = userRating(detailsMedia);
  box.innerHTML =
    userActionButton("watched", watched ? L("Quitar de vistas", "Remove from watched") : L("Marcar como vista", "Mark as watched"), watched, "check", watched ? L("Vista", "Watched") : L("Marcar como vista", "Mark as watched")) +
    userActionButton("up", L("Me gusta", "I like it"), rating > 0, "up") +
    userActionButton("down", L("No me gusta", "I don't like it"), rating < 0, "down");
}
(function bindUserActions() {
  var box = $("details-user-actions");
  if (!box) return;
  box.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ua]");
    if (!b || !detailsMedia) return;
    var act = b.getAttribute("data-ua"), genres = typeof detailsGenres !== "undefined" ? detailsGenres : [];
    if (act === "watched") setWatched(detailsMedia, !isWatched(detailsMedia), genres);
    else setUserRating(detailsMedia, act === "up" ? 1 : -1, genres);
    renderUserActions();
    showToast(act === "watched" ? (isWatched(detailsMedia) ? L("Marcada como vista", "Marked as watched") : L("Quitada de vistas", "Removed from watched"))
      : (userRating(detailsMedia) ? L("Valoración guardada", "Rating saved") : L("Valoración quitada", "Rating removed")));
  });
  if (typeof i18nAdd === "function") i18nAdd({ "Ya vistas": "Already watched" });
})();

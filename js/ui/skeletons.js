/**
 * TatoCine · js/ui/skeletons.js
 * Marcadores de carga (skeletons) reutilizables: una sola fuente para filas, tarjetas, listas de episodios y resultados.
 * Son bloques con un pulso suave de opacidad (barato para GPU y desactivado con «reducir movimiento» y modo ligero).
 */
function skeletonCards(n) { var h = ""; for (var i = 0; i < n; i++) h += '<div class="skeleton-card"></div>'; return h; }
function skeletonRow(n) {
  return '<div class="row skeleton-row" aria-hidden="true"><div class="row-header"><span class="skel skel-title"></span></div><div class="row-scroll">' + skeletonCards(n || 5) + "</div></div>";
}
function skeletonRows(rows, cards) { var h = ""; for (var i = 0; i < (rows || 3); i++) h += skeletonRow(cards); return h; }
function skeletonEpisodes(n) {
  var h = '<div class="ep-skeletons" aria-hidden="true">';
  for (var i = 0; i < (n || 4); i++) h += '<div class="ep-item ep-skel"><div class="ep-thumb skel"></div><div class="ep-info"><span class="skel skel-line"></span><span class="skel skel-line short"></span></div></div>';
  return h + "</div>";
}
function skeletonResults(n) {
  var h = '<div class="wiz-results" aria-hidden="true">';
  for (var i = 0; i < (n || 3); i++) h += '<div class="wiz-result wiz-skel"><div class="skel skel-thumb"></div><div class="wiz-info"><span class="skel skel-line"></span><span class="skel skel-line short"></span><span class="skel skel-line"></span></div></div>';
  return h + "</div>";
}
/** La portada muestra un esqueleto hasta que llega el primer título. */
function setHeroLoading(on) { if ($heroSection) $heroSection.classList.toggle("hero-loading", !!on); }

/** Pantallas vacías con ilustración y una acción (data-act, ver core/actions.js). */
var EMPTY_ICONS = {
  offline: '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/><path d="M3 3l18 18"/>',
  none: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8.5 8.5l5 5M13.5 8.5l-5 5"/>',
  favorites: '<path d="M12 21s-7-4.6-9.3-9A5.3 5.3 0 0 1 12 6.6 5.3 5.3 0 0 1 21.3 12C19 16.4 12 21 12 21z"/>',
  later: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
};
function emptyStateHTML(kind, title, text, actLabel, act) {
  return '<div class="empty-state empty-' + kind + '"><div class="empty-art" aria-hidden="true"><svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + (EMPTY_ICONS[kind] || EMPTY_ICONS.none) + "</svg></div><h2>" + title + "</h2>" + (text ? "<p>" + text + "</p>" : "") +
    (actLabel ? '<button type="button" class="genre-chip chip-primary" data-act="' + act + '">' + actLabel + "</button>" : "") + "</div>";
}
function apiProblem() {
  var e = window.tcLastApiError || {}, st = e.status;
  if (navigator.onLine === false) return [L("Sin conexión a internet", "No internet connection"), L("Revisa tu conexión y vuelve a intentarlo.", "Check your connection and try again.")];
  if (st === 401 || st === 403) return [L("Clave del catálogo no válida", "Invalid catalog key"), L("La clave de TMDB no es válida o no tiene permiso (error " + st + "). Si eres el dueño, revisa config.js.", "The TMDB key is invalid or not allowed (error " + st + "). If you own the site, check config.js.")];
  if (st === 404) return [L("No se encontró lo que buscabas", "Not found"), L("El catálogo no tiene ese contenido (error 404).", "The catalog doesn't have that content (error 404).")];
  if (st === 429) return [L("Demasiadas solicitudes", "Too many requests"), L("El catálogo pide esperar un momento (error 429). Inténtalo en un minuto.", "The catalog asks you to wait a moment (error 429). Try again in a minute.")];
  if (st >= 500) return [L("El catálogo tiene problemas", "The catalog is having problems"), L("TMDB no responde bien ahora (error " + st + "). No es tu dispositivo; reintenta en unos minutos.", "TMDB isn't responding well right now (error " + st + "). It isn't your device; retry in a few minutes.")];
  if (e.timeout) return [L("El catálogo tarda demasiado", "The catalog is taking too long"), L("La conexión es lenta o inestable. Inténtalo de nuevo.", "The connection is slow or unstable. Try again.")];
  return [L("Sin conexión con el catálogo", "Can't reach the catalog"), L("Revisa tu internet e inténtalo de nuevo.", "Check your connection and try again.")];
}
function emptyOffline() { var pr = apiProblem(); return emptyStateHTML("offline", pr[0], pr[1], L("Reintentar", "Retry"), "retry"); }
/** Una fila que no pudo cargar muestra su título y «Reintentar» solo para ella (el resto de la página sigue igual). */
function renderRowError(title, retry) {
  var row = document.createElement("div");
  row.className = "row catalog-row row-error";
  var pr = apiProblem();
  row.innerHTML = '<div class="row-header"><h2 class="row-title">' + escapeHTML(title) + '</h2></div><div class="row-error-box" role="status"><span>' + escapeHTML(pr[0]) + '</span><button type="button" class="genre-chip">' + escapeHTML(L("Reintentar", "Retry")) + '</button></div>';
  var btn = row.querySelector("button");
  btn.addEventListener("click", function () {
    btn.disabled = true; btn.textContent = L("Cargando…", "Loading…");
    Promise.resolve().then(retry).then(function (ok) { if (ok !== false && row.parentNode) row.parentNode.removeChild(row); else { btn.disabled = false; btn.textContent = L("Reintentar", "Retry"); } }).catch(function () { btn.disabled = false; btn.textContent = L("Reintentar", "Retry"); });
  });
  if ($rowsContainer) $rowsContainer.appendChild(row);
  return row;
}
function emptyNone() { return emptyStateHTML("none", L("Sin resultados", "No results"), L("Prueba con otros filtros o palabras.", "Try other filters or words."), L("Volver al inicio", "Back to home"), "go-home"); }

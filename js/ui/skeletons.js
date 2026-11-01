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
function emptyOffline() { return emptyStateHTML("offline", L("Sin conexión con el catálogo", "Can't reach the catalog"), L("Revisa tu internet e inténtalo de nuevo.", "Check your connection and try again."), L("Reintentar", "Retry"), "retry"); }
function emptyNone() { return emptyStateHTML("none", L("Sin resultados", "No results"), L("Prueba con otros filtros o palabras.", "Try other filters or words."), L("Volver al inicio", "Back to home"), "go-home"); }

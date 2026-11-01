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

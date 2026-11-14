/**
 * TatoCine · js/ui/update-modal.js
 * Ventana de ACTUALIZACIÓN OBLIGATORIA (reemplaza al aviso pequeño). Sale cuando el Service Worker ya descargó una versión nueva: «¡Actualización disponible!», «Cambios:» con los
 * 5 más importantes y un único botón «Actualizar ahora». No tiene ✕, no se cierra con Esc, ni tocando fuera, ni con Tab: así todos terminan en la versión nueva.
 * Cada versión nueva: actualiza TC_RELEASE_NOTES (5 cambios que valgan la pena mencionar). Si el botón no logra activar la versión nueva en 8 s, recarga la página.
 */
var TC_RELEASE_NOTES = {
  es: [
    "Mi cine renovado: resumen, filtro por tipo, orden y «Continuar viendo» con barra de avance.",
    "Menú con el mismo diseño que Ajustes: Perfiles, Ajustes y Legal a un toque.",
    "App sin animaciones, más fluida, y pantalla de carga sin destellos ni tirones negros.",
    "Imágenes más livianas (WebP) con carga perezosa completa: gasta menos datos.",
    "Dos servidores más en español latino (ESP4 y ESP5), tráiler de 20 segundos y compatibilidad con TV, Apple TV e isla dinámica."
  ],
  en: [
    "Redesigned My Cinema: summary, type filter, sorting and a Continue Watching row with progress bars.",
    "Menu with the same design as Settings: Profiles, Settings and Legal one tap away.",
    "No animations for a smoother app, and a loading screen without flashes or black jumps.",
    "Lighter images (WebP) with full lazy loading: uses less data.",
    "Two more Latin-American Spanish servers (ESP4 and ESP5), a 20-second trailer and support for TVs, Apple TV and the Dynamic Island."
  ]
};
var tcUpdateApply = null, tcUpdateOpen = false;
function tcShowUpdate(apply) {
  var o = document.getElementById("tc-update-overlay"); if (!o) { if (typeof apply === "function") apply(); return; }
  tcUpdateApply = typeof apply === "function" ? apply : function () { location.reload(); };
  if (tcUpdateOpen) return;
  tcUpdateOpen = true;
  var notes = (typeof UI_EN !== "undefined" && UI_EN ? TC_RELEASE_NOTES.en : TC_RELEASE_NOTES.es).slice(0, 5);
  var list = document.getElementById("tc-update-list"); list.textContent = "";
  notes.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; list.appendChild(li); });
  document.getElementById("tc-update-title").textContent = L("¡Actualización disponible!", "Update available!");
  o.querySelector(".tc-update-sub").textContent = L("Cambios:", "Changes:");
  var go = document.getElementById("tc-update-go"); go.textContent = L("Actualizar ahora", "Update now"); go.disabled = false;
  o.classList.add("open"); o.setAttribute("aria-hidden", "false");
  try { document.body.style.overflow = "hidden"; } catch (e) { }
  setTimeout(function () { go.focus(); }, 60);
}
// Nada cierra esta ventana: Esc y Tab se quedan en el botón (capturados antes que cualquier otro manejador de teclado).
document.addEventListener("keydown", function (e) {
  if (!tcUpdateOpen) return;
  if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); e.stopImmediatePropagation(); var g = document.getElementById("tc-update-go"); if (g) g.focus(); }
}, true);
document.addEventListener("click", function (e) {                                  // tocar fuera de la tarjeta no hace nada
  var o = document.getElementById("tc-update-overlay");
  if (tcUpdateOpen && o && e.target === o) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
registerAction("update-now", function () {
  var go = document.getElementById("tc-update-go"); if (go.disabled) return;
  go.disabled = true; go.textContent = L("Actualizando…", "Updating…");
  try { tcUpdateApply(); } catch (e) { location.reload(); }
  setTimeout(function () { location.reload(); }, 8000);                            // seguro: si la versión nueva no tomó el control, se recarga igual
});

/**
 * TatoCine · js/boot.js
 * Se ejecuta en la cabecera, ANTES de pintar nada (por eso es un archivo propio y síncrono, no un script en línea).
 */
/* Antes de pintar nada: si toca elegir perfil, la página queda oculta y el selector aparece primero. */
(function () {
  var root = document.documentElement, skip = false;
  try { skip = sessionStorage.getItem("tatoSkipPickerOnce") === "1"; sessionStorage.removeItem("tatoSkipPickerOnce"); } catch (e) { }
  window.__tcSkipPicker = skip;
  if (!skip) { root.classList.add("tc-picker-boot"); setTimeout(function () { root.classList.remove("tc-picker-boot"); }, 8000); }
})();

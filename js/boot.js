/**
 * TatoCine · js/boot.js
 * Se ejecuta en la cabecera, ANTES de pintar nada (por eso es un archivo propio y síncrono, no un script en línea).
 * El selector de perfiles se muestra al abrir TatoCine en una pestaña/sesión nueva; mientras sigas en esa pestaña (recargar con
 * Ctrl+R, F5…) se conserva el perfil elegido —y su PIN ya validado— y NO se vuelve a pedir. Si hace falta elegir perfil, la página
 * queda oculta y el selector aparece primero, sin parpadeo de la portada.
 */
(function () {
  try { history.scrollRestoration = "manual"; } catch (e) { }      // recargar o volver a la página NO restaura el scroll de abajo: siempre se empieza arriba
  var root = document.documentElement, selected = "", active = "";
  try { selected = sessionStorage.getItem("tatoProfileSelectedForSessionV1") || ""; active = localStorage.getItem("tatoActiveProfileV1") || ""; } catch (e) { }
  var needsPicker = !selected || selected !== active;
  window.__tcSkipPicker = !needsPicker;
  if (needsPicker) { root.classList.add("tc-picker-boot"); setTimeout(function () { root.classList.remove("tc-picker-boot"); }, 8000); }
})();

/**
 * TatoCine · js/ui/menu-drawer.js
 * Menú hamburguesa como panel lateral: cierra al tocar el velo, al deslizar el panel hacia la izquierda, y bloquea el scroll de la página mientras está abierto.
 * «Cambiar de perfil» y «Ajustes» del panel usan las mismas funciones que la barra superior. Esc ya lo cierra (js/core/events.js).
 */
(function () {
  var menu = document.getElementById("mobile-menu"); if (!menu) return;
  var panel = menu.querySelector(".mm-panel"), sx = null, sy = null;
  function close() { if (menu.classList.contains("open")) toggleMenu(); }
  menu.addEventListener("click", function (e) { if (e.target === menu) close(); });             // tocar el velo
  if (panel) {
    panel.addEventListener("touchstart", function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    panel.addEventListener("touchend", function (e) {                                            // deslizar hacia la izquierda
      if (sx === null) return; var t = e.changedTouches[0], dx = t.clientX - sx, dy = Math.abs(t.clientY - sy); sx = null;
      if (dx < -60 && dy < 50) close();
    }, { passive: true });
  }
  if (window.MutationObserver) new MutationObserver(function () { document.documentElement.classList.toggle("menu-lock", menu.classList.contains("open")); }).observe(menu, { attributes: true, attributeFilter: ["class"] });
  registerAction("menu-profiles", function () { close(); showProfiles(); });
  registerAction("menu-settings", function () { close(); showSettings(); });
})();

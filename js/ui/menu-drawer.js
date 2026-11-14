/**
 * TatoCine · js/ui/menu-drawer.js
 * Menú hamburguesa (ventana a pantalla completa con la misma interfaz que Ajustes): bloquea el scroll de la página mientras está abierto y da las acciones de
 * «Cambiar de perfil» y «Ajustes» (las mismas funciones que la barra superior). Esc lo cierra (js/core/events.js).
 */
(function () {
  var menu = document.getElementById("mobile-menu"); if (!menu) return;
  function close() { if (menu.classList.contains("open")) toggleMenu(); }
  if (window.MutationObserver) new MutationObserver(function () { document.documentElement.classList.toggle("menu-lock", menu.classList.contains("open")); }).observe(menu, { attributes: true, attributeFilter: ["class"] });
  registerAction("menu-profiles", function () { close(); showProfiles(); });
  registerAction("menu-settings", function () { close(); showSettings(); });
})();

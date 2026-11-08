/**
 * TatoCine · js/ui/scroll-lock.js
 * Mientras haya una ventana abierta (Ajustes, ficha, estadísticas, diálogos…), la página de fondo NO se desplaza:
 * el gesto o la rueda mueven solo el contenido de la ventana. Se hace con una clase en <html> (no toca `body.style.overflow`,
 * que usan otras capas) y se reevalúa al abrir o cerrar cualquier ventana.
 */
(function scrollLock() {
  var SEL = ".modal.open, .tc-profile-create-overlay.open, .tc-kid-lock.open, #tc-profile-overlay.open";
  function update() { document.documentElement.classList.toggle("modal-lock", !!document.querySelector(SEL)); }
  if (!window.MutationObserver) return;
  new MutationObserver(update).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
  update();
})();

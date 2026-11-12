/**
 * TatoCine · js/ui/scroll-lock.js
 * 1) Mientras haya una ventana abierta (Ajustes, ficha, estadísticas, diálogos…), la página de fondo NO se desplaza: el gesto o la rueda
 *    mueven solo el contenido de la ventana. Se hace con una clase en <html> (no toca `body.style.overflow`, que usan otras capas).
 * 2) TODA pantalla y TODA ventana empieza desde arriba: al cambiar de vista o buscar la página vuelve al principio (sin animación), al
 *    abrir cualquier ventana su contenido se coloca arriba (aunque se cerrara a mitad de scroll), y al recargar no se restaura el scroll.
 */
(function scrollLock() {
  var SEL = ".modal.open, .tc-profile-create-overlay.open, .tc-kid-lock.open, .tc-welcome.open, #tc-profile-overlay.open";
  var SCROLLERS = ".modal-content, .settings-content, .details-content, .actor-content, .modal-body, .tc-profile-create-dialog, .pf-dialog, .stats-wrap, .tc-profile-panel";
  var open = typeof WeakSet === "function" ? new WeakSet() : null;
  function top(el) { try { if (el.scrollTop) el.scrollTop = 0; } catch (e) { } }
  function resetScroll(modal) { top(modal); var list = modal.querySelectorAll(SCROLLERS); for (var i = 0; i < list.length; i++) top(list[i]); }
  function update() {
    var now = document.querySelectorAll(SEL);
    document.documentElement.classList.toggle("modal-lock", now.length > 0);
    if (!open) return;
    for (var i = 0; i < now.length; i++) if (!open.has(now[i])) resetScroll(now[i]);          // se acaba de abrir: contenido desde arriba
    open = new WeakSet(Array.prototype.slice.call(now));
  }
  if (window.MutationObserver) {
    new MutationObserver(update).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
    update();
  }
  /** Página al principio, sin animación aunque el CSS tenga scroll suave. */
  window.tcScrollTop = function () { try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); } };
  if (typeof decorate === "function") {
    ["switchView", "performSearch"].forEach(function (name) { try { decorate(name, function (original) { return function () { window.tcScrollTop(); return original.apply(this, arguments); }; }); } catch (e) { } });
  }
  window.tcScrollTop();
})();

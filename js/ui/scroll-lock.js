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
  var lockY = null, pickerWasOpen = false;
  // Al ENTRAR a un perfil (se cierra el selector) la portada empieza SIEMPRE arriba del todo. En iPhone Pro Max y teléfonos igual de
  // altos, Safari/PWA ajusta la vista durante la carga y se guardaba esa posición: al entrar, la cabecera quedaba a la mitad y había
  // que deslizar hacia abajo. Se repite tras dos cuadros y a los 350 ms por si iOS mueve la vista al terminar de pintar.
  function topAfterPicker() {
    window.tcScrollTop();
    try { requestAnimationFrame(function () { requestAnimationFrame(function () { window.tcScrollTop(); }); }); } catch (e) { }
    setTimeout(function () { if (!document.documentElement.classList.contains("modal-lock")) window.tcScrollTop(); }, 350);
  }
  function update() {
    var now = document.querySelectorAll(SEL);
    var locked = now.length > 0, was = document.documentElement.classList.contains("modal-lock");
    var pickerOpen = !!document.querySelector("#tc-profile-overlay.open");
    if (pickerWasOpen && !pickerOpen) { pickerWasOpen = false; lockY = null; document.documentElement.classList.toggle("modal-lock", locked); topAfterPicker(); if (!open) return; open = new WeakSet(Array.prototype.slice.call(now)); return; }
    pickerWasOpen = pickerOpen;
    if (locked && !was) lockY = window.pageYOffset || 0;                                    // la portada queda donde estaba al abrir una ventana…
    document.documentElement.classList.toggle("modal-lock", locked);
    if (!locked && was && lockY !== null) {                                                  // …y al cerrarla vuelve EXACTAMENTE ahí (aunque el gesto la haya movido)
      var y = lockY; lockY = null;
      if (Math.abs((window.pageYOffset || 0) - y) > 2) { try { window.scrollTo({ top: y, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); } }
    }
    if (!open) return;
    for (var i = 0; i < now.length; i++) if (!open.has(now[i])) resetScroll(now[i]);          // se acaba de abrir: contenido desde arriba
    open = new WeakSet(Array.prototype.slice.call(now));
  }
  if (window.MutationObserver) {
    new MutationObserver(update).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
    update();
  }
  // 3) Navegador de televisiones Samsung (Tizen) y LG (webOS): el control mueve un puntero y, al llegar al borde, el navegador desplaza la
  //    PÁGINA, no la ventana abierta. Con una ficha abierta (serie: temporadas y capítulos) no se podía bajar. Aquí la página puede
  //    desplazarse mientras haya una ventana abierta y cada movimiento se pasa al contenido de la ventana; la página de fondo no se mueve.
  //    (En la app de Google TV no hace falta: ahí el control usa las flechas y ya funciona.)
  var TVWEB = /Tizen|SMART-TV|Web0S|WebOS|NetCast/i.test(navigator.userAgent);
  if (TVWEB) {
    document.documentElement.classList.add("tc-tvweb");
    var base = null, fwd = false;
    var scrollerOf = function (layer) {
      if (!layer) return null;
      var list = layer.querySelectorAll("*");
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (el.scrollHeight > el.clientHeight + 20) { var oy = getComputedStyle(el).overflowY; if (oy === "auto" || oy === "scroll") return el; }
      }
      return null;
    };
    var topOpen = function () { var all = document.querySelectorAll(SEL); return all.length ? all[all.length - 1] : null; };
    var arm = function () {                                                                // deja espacio arriba y abajo para que el navegador pueda desplazar
      var H = window.innerHeight || 720;
      if ((window.pageYOffset || 0) < H) { fwd = true; window.scrollTo(0, H); fwd = false; }
      base = window.pageYOffset || 0;
    };
    new MutationObserver(function () {
      var locked = document.documentElement.classList.contains("modal-lock");
      if (locked && base === null) arm(); else if (!locked) base = null;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("scroll", function () {
      if (fwd || base === null || !document.documentElement.classList.contains("modal-lock")) return;
      var dy = (window.pageYOffset || 0) - base; if (!dy) return;
      var sc = scrollerOf(topOpen());
      if (sc) sc.scrollTop += dy;
      fwd = true; window.scrollTo(0, base); fwd = false;
    }, { passive: true });
  }
  /** Página al principio, sin animación aunque el CSS tenga scroll suave. */
  window.tcScrollTop = function () { lockY = null; try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); } };
  if (typeof decorate === "function") {
    ["switchView", "performSearch"].forEach(function (name) { try { decorate(name, function (original) { return function () { window.tcScrollTop(); return original.apply(this, arguments); }; }); } catch (e) { } });
  }
  window.tcScrollTop();
})();

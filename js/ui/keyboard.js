/**
 * TatoCine · js/ui/keyboard.js
 * Teclado: atajos, desplazamiento de carruseles y pantalla completa de la app.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function isTypingTarget(el) {
      if (!el) return false;
      var tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el.isContentEditable;
    }
    // Carrusel que se mueve con las flechas: el más cercano al centro de la pantalla (o el del detalle si está abierto).
    function pickKeyboardScroller() {
      var blocking = ["tc-pin-overlay", "tc-profile-create-overlay", "tc-profile-overlay"];
      for (var i = 0; i < blocking.length; i++) {
        if (document.getElementById(blocking[i]).classList.contains("open")) return null;
      }
      if ($modal.classList.contains("open") || $settingsModal.classList.contains("open") || $filtersModal.classList.contains("open") ||
        $actorModal.classList.contains("open") || $disclaimerModal.classList.contains("open") || $("mobile-menu").classList.contains("open")) return null;
      var scope = $detailsModal.classList.contains("open") ? $detailsModal : document;
      var selector = $detailsModal.classList.contains("open") ? ".details-cast" : ".row-scroll";
      var best = null, bestDist = Infinity, mid = window.innerHeight / 2;
      scope.querySelectorAll(selector).forEach(function (el) {
        if (el.scrollWidth <= el.clientWidth + 4) return;
        var r = el.getBoundingClientRect();
        if (r.height === 0 || r.bottom < 0 || r.top > window.innerHeight) return;
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = el; }
      });
      return best;
    }
    // ---- Pantalla completa de toda la aplicación ----
    function appFullscreenSupported() {
      var el = document.documentElement;
      var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
      return !standalone && !!(el.requestFullscreen || el.webkitRequestFullscreen);
    }
    function isAppFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
    function updateAppFullscreenButton() {
      var btn = $("app-fullscreen-btn");
      if (!btn) return;
      var on = isAppFullscreen();
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.title = on ? "Salir de pantalla completa" : "Pantalla completa";
      btn.setAttribute("aria-label", btn.title);
    }
    function toggleAppFullscreen() {
      if (!appFullscreenSupported() && !isAppFullscreen()) {
        showToast("La pantalla completa no está disponible en este dispositivo");
        return;
      }
      var el = document.documentElement;
      try {
        if (isAppFullscreen()) {
          var exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) { var p = exit.call(document); if (p && p.catch) p.catch(function () { }); }
        } else {
          var req = el.requestFullscreen || el.webkitRequestFullscreen;
          var r = req.call(el);
          if (r && r.catch) r.catch(function () { showToast("El navegador no permitió la pantalla completa"); });
        }
      } catch (err) { showToast("El navegador no permitió la pantalla completa"); }
    }
    (function initAppFullscreen() {
      var btn = $("app-fullscreen-btn");
      if (btn && appFullscreenSupported()) btn.hidden = false;
      document.addEventListener("fullscreenchange", updateAppFullscreenButton);
      document.addEventListener("webkitfullscreenchange", updateAppFullscreenButton);
    })();

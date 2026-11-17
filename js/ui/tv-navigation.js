/**
 * TatoCine · js/ui/tv-navigation.js
 * Navegación espacial con mando de TV y teclado, botón Atrás y protección básica del código.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Teclado, mando de TV y protección básica del código ----
    var FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';
    var LAYER_IDS = ["tc-pin-overlay", "tc-install-overlay", "tc-wizard-overlay", "tc-fav-overlay", "tc-list-overlay", "tc-profile-create-overlay", "stats-modal", "tc-profile-overlay", "actor-modal", "filters-modal", "settings-modal", "details-modal", "disclaimer-modal", "mobile-menu", "player-modal", "tc-update-overlay", "tc-welcome", "tc-reset-overlay", "tc-adult-warn", "tc-qr-overlay", "tc-cmd-overlay", "legal-modal", "tc-adult-lock"];
    /** La capa visible más alta (por z-index), sea la que sea: bienvenida, actualización, aviso legal, selector, cualquier ventana o diálogo. Con el mando, el foco
     *  solo se mueve dentro de ella (antes la bienvenida y la actualización no estaban en la lista y las flechas movían el foco a la página de atrás). */
    function topLayer() {
      var best = null, bz = -Infinity;
      document.querySelectorAll(".modal.open, .tc-profile-create-overlay.open, .tc-kid-lock.open, .tc-welcome.open, #tc-profile-overlay.open").forEach(function (el) {
        var cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") return;
        var z = parseInt(cs.zIndex, 10); if (isNaN(z)) z = 0;
        if (z >= bz) { bz = z; best = el; }
      });
      return best;
    }
    function closeV4Overlay() {
      if ($("tc-fav-overlay").classList.contains("open")) { closeFavPicker(); return true; }
      if ($("tc-list-overlay").classList.contains("open")) { closeListModal(); return true; }
      if ($("stats-modal").classList.contains("open")) { closeStats(); return true; }
      if ($("tc-wizard-overlay").classList.contains("open")) { closeWizard(); return true; }
      if ($("tc-install-overlay").classList.contains("open")) { closeInstallHelp(); return true; }
      return false;
    }
    function visibleFocusables(scope) {
      var out = [];
      scope.querySelectorAll(FOCUSABLE).forEach(function (el) {
        if (el.classList.contains("row-nav") || el.classList.contains("cast-nav") || el.classList.contains("share-card-btn") || el.classList.contains("save-btn") || el.classList.contains("continue-remove-btn") || el.getAttribute("tabindex") === "-1") return;
        var r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.bottom < -1500 || r.top > window.innerHeight + 1500) return;
        if (el.closest("[hidden]") || getComputedStyle(el).visibility === "hidden") return;
        out.push({ el: el, r: r });
      });
      return out;
    }
    /** Campo de texto de una línea (buscador, nombre de perfil, PIN…) */
    function isTvTextInput(el) {
      return !!el && el.tagName === "INPUT" && /^(text|search|tel|number|password|email|url|)$/.test(el.type || "");
    }
    // TV: al llegar con las flechas a un campo de texto NO se abre el teclado de la pantalla (antes salía solo y tapaba media app); se abre al pulsar OK.
    // Si el foco llega por un toque o un clic (teléfono o ratón), el teclado sale como siempre.
    if (IS_TV) {
      var lastPointer = 0;
      var tvKbAllowed = null;                                                            // campo en el que se pulsó OK: ahí sí sale el teclado
      /** OK sobre el campo: lo vuelve editable y abre el teclado de la TV (en la APK, Android lo muestra con TatoNative; el WebView no lo abre solo con focus()). */
      window.tvOpenKeyboard = function (el) {
        if (el.getAttribute("data-tv-im") !== "1") return;                             // ya abierto (keydown y keyup llegan los dos)
        el.readOnly = false; el.removeAttribute("data-tv-im");
        el.blur(); tvKbAllowed = el; el.focus();                                          // tvKbAllowed DESPUÉS del blur (el focusout lo limpia) y antes del focus (el focusin no vuelve a bloquearlo)
        try { if (window.TatoNative && TatoNative.showKeyboard) TatoNative.showKeyboard(); } catch (err) { }
      };
      // En el WebView de Android, con el campo en solo lectura el OK a veces llega solo como keyup
      window.addEventListener("keyup", function (e) {
        var el = document.activeElement;
        if (e.key === "Enter" && isTvTextInput(el) && el.getAttribute("data-tv-im") === "1") { e.preventDefault(); tvOpenKeyboard(el); }
      }, true);
      document.addEventListener("pointerdown", function () { lastPointer = Date.now(); }, true);
      document.addEventListener("focusin", function (e) {
        var el = e.target;
        if (isTvTextInput(el) && el !== tvKbAllowed && Date.now() - lastPointer > 800 && !el.readOnly) { el.readOnly = true; el.setAttribute("data-tv-im", "1"); }   // solo lectura: sin teclado y OK sí llega a la página (con inputmode=none el WebView se lo comía)
      }, true);
      document.addEventListener("focusout", function (e) {
        var el = e.target;
        if (el === tvKbAllowed && document.hasFocus()) tvKbAllowed = null;
        if (el && el.getAttribute && el.getAttribute("data-tv-im") === "1") { el.readOnly = false; el.removeAttribute("data-tv-im"); }
      }, true);
    }
    function spatialMove(key) {
      var layer = topLayer();
      if (layer && layer.id === "player-modal") return false;
      var scope = layer || document;
      var ae = document.activeElement;
      if (!ae || ae === document.body || !scope.contains(ae)) {
        var start = (!layer && $heroPlayBtn && !$heroPlayBtn.disabled && $heroPlayBtn.offsetParent) ? $heroPlayBtn : (visibleFocusables(scope)[0] || {}).el;
        if (start) { start.focus(); return true; }
        return false;
      }
      var cur = ae.getBoundingClientRect(), cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2, best = null, bestScore = Infinity;
      visibleFocusables(scope).forEach(function (c) {
        if (c.el === ae) return;
        var x = c.r.left + c.r.width / 2, y = c.r.top + c.r.height / 2, dx = x - cx, dy = y - cy, score;
        if (key === "ArrowRight" && dx > 4) score = dx + 2.5 * Math.abs(dy);
        else if (key === "ArrowLeft" && dx < -4) score = -dx + 2.5 * Math.abs(dy);
        else if (key === "ArrowDown" && dy > 4) score = dy + 2.5 * Math.abs(dx);
        else if (key === "ArrowUp" && dy < -4) score = -dy + 2.5 * Math.abs(dx);
        else return;
        if (score < bestScore) { bestScore = score; best = c.el; }
      });
      if (!best) return false;
      best.focus({ preventScroll: true });
      try { best.scrollIntoView({ block: "center", inline: "center", behavior: "auto" }); } catch (e) { best.scrollIntoView(); }
      return true;
    }
    window.addEventListener("keydown", function (e) {
      // Protección básica: sin F12, inspector ni ver código (no aplica en localhost para poder desarrollar).
      if (!IS_LOCAL_DEV) {
        var k = String(e.key || "").toLowerCase();
        var ctrl = e.ctrlKey || e.metaKey;
        if (e.key === "F12" || (ctrl && e.shiftKey && k.length === 1 && "ijcke".includes(k)) || (ctrl && !e.shiftKey && k === "u") || (e.metaKey && e.altKey && k.length === 1 && "ijcu".includes(k))) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
      }
      // Escape / botón Atrás del mando
      if (e.key === "Escape" || e.key === "BrowserBack" || e.key === "GoBack" || e.keyCode === 461 || e.keyCode === 10009) {
        if (closeV4Overlay()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
        if (e.key !== "Escape") {
          e.preventDefault();
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          return;
        }
      }
      var ae = document.activeElement;
      // Enter / Espacio sobre tarjetas enfocadas
      if ((e.key === "Enter" || e.key === " ") && ae && ae.tagName === "DIV" && /(^|\s)(card|similar-card|cast-item|ep-item|suggest-item|list-card)(\s|$)/.test(ae.className)) {
        e.preventDefault();
        ae.click();
        return;
      }
      // TV: un campo de texto (buscador) ya no atrapa el foco. ↑ ↓ siempre salen; ← → salen desde el borde del texto. OK abre el teclado de la TV.
      if (IS_TV && isTvTextInput(ae) && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (e.key === "Enter" && ae.getAttribute("data-tv-im") === "1") { e.preventDefault(); e.stopImmediatePropagation(); tvOpenKeyboard(ae); return; }
        var len = (ae.value || "").length, s0 = ae.selectionStart, s1 = ae.selectionEnd, edge = s0 == null;
        var leave = e.key === "ArrowUp" || e.key === "ArrowDown" || (e.key === "ArrowLeft" && (edge || (s0 === 0 && s1 === 0))) || (e.key === "ArrowRight" && (edge || (s0 === len && s1 === len)));
        if (leave) {
          if (spatialMove(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); }
          return;
        }
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (isTypingTarget(ae) || (document.body.classList.contains("cp-active") && !document.body.classList.contains("cp-details"))) return;     // «Decidir en pareja» usa ← → para responder
        var kb = false;
        try { kb = !!ae && ae !== document.body && ae.matches(":focus-visible"); } catch (err) { }
        var tvIdle = (!ae || ae === document.body) && (IS_TV ? (e.key === "ArrowDown" || e.key === "ArrowUp") : (e.key === "ArrowLeft" || e.key === "ArrowRight"));   // en escritorio, ← → sin foco empiezan a recorrer las filas
        if (kb || tvIdle) {
          if (spatialMove(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); }
        }
      }
    }, true);
    if (!IS_LOCAL_DEV) {
      document.addEventListener("contextmenu", function (e) { if (!isTypingTarget(e.target)) e.preventDefault(); });
    }

/** Mando de juegos (Gamepad API): cruceta = flechas, A = aceptar, B = atrás. Solo se activa cuando se conecta un mando. */
(function gamepadNav() {
  var timer = 0, last = {};
  function press(name, fn) { return function (down) { if (down && !last[name]) fn(); last[name] = down; }; }
  var map = { 12: press("up", function () { spatialMove("ArrowUp"); }), 13: press("down", function () { spatialMove("ArrowDown"); }), 14: press("left", function () { spatialMove("ArrowLeft"); }), 15: press("right", function () { spatialMove("ArrowRight"); }),
    0: press("a", function () { var ae = document.activeElement; if (ae && ae !== document.body) ae.click(); }), 1: press("b", function () { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); }) };
  function poll() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [], p = pads && Array.prototype.find.call(pads, function (x) { return x && x.connected; });
    if (!p) { timer = 0; return; }
    Object.keys(map).forEach(function (b) { map[b](!!(p.buttons[b] && p.buttons[b].pressed)); });
    timer = requestAnimationFrame(poll);
  }
  window.addEventListener("gamepadconnected", function () { document.body.classList.add("tv-mode"); if (!timer) timer = requestAnimationFrame(poll); });
})();

/** Botón ATRÁS del mando en la app de Android TV (GoogleTvTatoCine.apk) y en navegadores de TV: cierra lo que esté abierto (como Esc); si no hay nada abierto y no se
 *  está en Inicio, vuelve a Inicio; en Inicio desplazado, vuelve arriba. Devuelve false solo si ya no hay nada que hacer (la app nativa entonces ofrece salir).
 *  La actualización obligatoria y el aviso legal sin aceptar «se tragan» el Atrás (no se pueden saltar). */
window.tcHandleBack = function () {
  try {
    var layer = topLayer(), menu = document.getElementById("mobile-menu");
    if (layer && layer.id === "tc-update-overlay") return true;
    if (layer && layer.id === "tc-profile-overlay" && typeof profilePickerRequired !== "undefined" && profilePickerRequired) return false;   // selector al abrir: Atrás = salir de la app (como Netflix)
    if (layer && layer.id === "disclaimer-modal" && layer.classList.contains("is-pending")) return true;
    if (layer || (menu && menu.classList.contains("open"))) { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return true; }
    if (typeof currentView !== "undefined" && currentView !== "home" && typeof switchView === "function") { switchView("home"); return true; }
    if ((window.pageYOffset || 0) > 80) { if (window.tcScrollTop) window.tcScrollTop(); var hp = document.getElementById("hero-play-btn"); if (hp && hp.offsetParent) hp.focus({ preventScroll: true }); return true; }
  } catch (e) { }
  return false;
};

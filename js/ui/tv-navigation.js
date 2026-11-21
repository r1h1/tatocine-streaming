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
    var HAS_CHECK_VISIBILITY = typeof Element !== "undefined" && typeof Element.prototype.checkVisibility === "function";
    /** Candidatos para las flechas. Se descartan primero por posición (barato): también los que quedan muy a la derecha en las filas de tarjetas; el estilo
     *  solo se consulta en los cercanos, con checkVisibility() donde existe (medido en la TV: 19 → 16 ms por pulsación y ~⅓ menos candidatos). */
    function visibleFocusables(scope) {
      var out = [], H = window.innerHeight, W = window.innerWidth;
      scope.querySelectorAll(FOCUSABLE).forEach(function (el) {
        var c = el.classList;
        if (c.contains("row-nav") || c.contains("cast-nav") || c.contains("share-card-btn") || c.contains("save-btn") || c.contains("continue-remove-btn") || el.getAttribute("tabindex") === "-1") return;
        var r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.bottom < -1500 || r.top > H + 1500 || r.right < -W || r.left > 2 * W) return;
        if (HAS_CHECK_VISIBILITY ? !el.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true }) : (el.closest("[hidden]") || getComputedStyle(el).visibility === "hidden")) return;
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
        try { if (window.TatoNative && TatoNative.showKeyboard) TatoNative.showKeyboard(window.__tcNT || ""); } catch (err) { }
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
      // Ficha del título: su contenido llega después de abrirla (TMDB) y el foco caía en lo único que había, el enlace «Aviso legal» del final (fuera de la
      // pantalla): OK parecía no hacer nada. En TV el foco espera al botón «Ver» (o «Reanudar») y se pone ahí.
      (function detailsFocus() {
        var dm = document.getElementById("details-modal"), was = false, timer = 0;
        if (!dm) return;
        new MutationObserver(function () {
          var open = dm.classList.contains("open");
          if (open && !was) {
            var tries = 0;
            clearInterval(timer);
            timer = setInterval(function () {
              var b = document.getElementById("details-play-btn"), a = document.activeElement;
              if (!dm.classList.contains("open") || ++tries > 40) { clearInterval(timer); return; }
              var moved = a && dm.contains(a) && a !== b && !a.classList.contains("tc-legal-link") && !a.classList.contains("details-close") && a.getAttribute("data-tv-auto") !== "1";
              if (moved && tries > 1) { clearInterval(timer); return; }               // el usuario ya se movió: no se le roba el foco
              if (b && !b.disabled && b.offsetParent && b.getBoundingClientRect().height > 0) {
                clearInterval(timer);
                b.focus({ preventScroll: true });
                try { b.scrollIntoView({ block: "center" }); } catch (err) { }
              }
            }, 75);
          }
          was = open;
        }).observe(dm, { attributes: true, attributeFilter: ["class"] });
      })();
      // Reproductor (APK de Google TV): el vídeo es un iframe de otro sitio y el mando no puede entrar en él. Mientras #player-modal está abierto, Android dibuja un
      // PUNTERO virtual (flechas = mover, OK = pulsar, Atrás = cerrar); al cerrarse desaparece. Empieza en el centro del vídeo.
      (function playerPointer() {
        var pm = document.getElementById("player-modal"), on = false, back = null;
        if (!pm || !window.TatoNative || !TatoNative.setPointer) return;
        function send(open) {
          var fx = 0.62, fy = 0.4, f = open && (pm.querySelector("#player-view iframe") || document.getElementById("player-view"));
          if (f) { var r = f.getBoundingClientRect(); if (r.width > 10 && r.height > 10) { fx = (r.left + r.width / 2) / window.innerWidth; fy = (r.top + r.height / 2) / window.innerHeight; } }
          try { TatoNative.setPointer(window.__tcNT || "", open, fx, fy); } catch (err) { }
          document.documentElement.classList.toggle("tc-pointer", !!open);           // con el puntero, el aro de foco de un botón del reproductor confundía (CSS lo oculta)
          if (open && pm.contains(document.activeElement)) document.activeElement.blur();
        }
        function sync() {
          var open = pm.classList.contains("open");
          if (open === on) return;
          on = open;
          if (open) {
            back = document.activeElement !== document.body ? document.activeElement : null;   // botón desde el que se abrió (Ver, Reanudar, un episodio…)
            setTimeout(function () { if (on) send(true); }, 120);                 // tras pintar el reproductor (para centrar el puntero en el vídeo)
          } else {
            send(false);
            setTimeout(function () {                                                // al cerrar, el mando vuelve a ese botón (antes quedaba el foco perdido)
              var a = document.activeElement;
              if (a && a !== document.body && !pm.contains(a)) return;
              // Candidatos en orden: el botón desde el que se abrió, «Ver» de la portada y el primer botón visible. Se prueba hasta que uno acepte el foco
              // (la portada rota mientras se ve el vídeo: si el título nuevo es «Próximamente», su «Ver» está desactivado y no lo acepta).
              var l = topLayer(), cands = [back];
              if (!l) cands.push($heroPlayBtn);
              visibleFocusables(l || document).forEach(function (c) { if (!c.el.closest(".search-wrap") && c.r.top > window.innerHeight * 0.12 && c.r.bottom <= window.innerHeight) cands.push(c.el); });
              for (var i = 0; i < cands.length; i++) {
                var t = cands[i];
                if (!t || !document.contains(t) || t.disabled || !t.offsetParent || pm.contains(t)) continue;
                t.focus({ preventScroll: true });
                if (document.activeElement === t) break;
              }
            }, 200);
          }
        }
        new MutationObserver(sync).observe(pm, { attributes: true, attributeFilter: ["class"] });
        sync();
      })();
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
      // Distancia entre BORDES (no entre centros): lo que se superpone en el otro eje cuenta como «justo encima/al lado». Antes, desde «Ver», ↑ saltaba al menú
      // porque el centro del buscador (muy ancho) quedaba lejos a la derecha; ahora va al buscador, que está encima.
      var cur = ae.getBoundingClientRect(), cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2, best = null, bestScore = Infinity;
      var horiz = key === "ArrowLeft" || key === "ArrowRight";
      visibleFocusables(scope).forEach(function (c) {
        if (c.el === ae || c.el.contains(ae) || ae.contains(c.el)) return;
        var r = c.r, x = r.left + r.width / 2, y = r.top + r.height / 2, prim;
        if (key === "ArrowRight") { if (x <= cx + 4) return; prim = r.left - cur.right; }
        else if (key === "ArrowLeft") { if (x >= cx - 4) return; prim = cur.left - r.right; }
        else if (key === "ArrowDown") { if (y <= cy + 4) return; prim = r.top - cur.bottom; }
        else if (key === "ArrowUp") { if (y >= cy - 4) return; prim = cur.top - r.bottom; }
        else return;
        var gap = horiz ? Math.max(0, Math.max(r.top, cur.top) - Math.min(r.bottom, cur.bottom))      // separación en el eje perpendicular (0 = se superponen)
                        : Math.max(0, Math.max(r.left, cur.left) - Math.min(r.right, cur.right));
        var off = horiz ? Math.abs(y - cy) : Math.abs(x - cx);                                         // desempate: el más alineado
        var score = Math.max(prim, 0) + 3 * gap + 0.08 * off;
        if (score < bestScore) { bestScore = score; best = c.el; }
      });
      // Al subir al menú superior, el foco va a la sección en la que estás (p. ej. «Inicio»), no a la que quede más cerca
      if (key === "ArrowUp" && best && best.classList.contains("nav-item") && !ae.classList.contains("nav-item")) {
        var act = best.parentNode && best.parentNode.querySelector(".nav-item.active");
        if (act && act.offsetParent) best = act;
      }
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
      // TV: listas del buscador (sugerencias y búsquedas recientes): ↑ ↓ recorren solo la lista (↑ desde la primera vuelve al buscador; ↓ en la última se queda,
      // porque la lista tapa la portada) y «Borrar» se alcanza con → (antes ↑ desde la primera caía en «Borrar» y un OK borraba el historial).
      var pnl = IS_TV && ae && ae.closest ? ae.closest("#recent-searches.open, #search-suggest.open") : null;
      if (pnl && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) >= 0 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        var items = Array.prototype.slice.call(pnl.querySelectorAll(".recent-item, .suggest-item")), idx = items.indexOf(ae), clr = pnl.querySelector("[data-clear]"), to = null;
        if (e.key === "ArrowDown") {
          to = idx < 0 ? items[0] : items[idx + 1];
          if (!to) {                                                                          // ↓ en la última: se cierra la lista y se baja a la portada («Ver» o el primer botón activo)
            pnl.classList.remove("open");
            to = document.querySelector(".hero-actions .hero-btn:not([disabled])") || ae;
          }
        }
        else if (e.key === "ArrowUp") to = idx > 0 ? items[idx - 1] : $searchInput;
        else if (e.key === "ArrowRight") to = idx >= 0 && clr ? clr : ae;
        else to = idx < 0 ? items[0] : ae;
        e.preventDefault(); e.stopImmediatePropagation();
        if (to && to !== ae) to.focus({ preventScroll: true });
        return;
      }
      // TV: un campo de texto (buscador) ya no atrapa el foco. ↑ ↓ siempre salen; ← → salen desde el borde del texto. OK abre el teclado de la TV.
      if (IS_TV && isTvTextInput(ae) && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (e.key === "Enter" && ae.getAttribute("data-tv-im") === "1") { e.preventDefault(); e.stopImmediatePropagation(); tvOpenKeyboard(ae); return; }
        if (e.key === "ArrowDown" && ae.id === "search-input") {                          // ↓ desde el buscador: directo a la primera sugerencia o búsqueda reciente (no a «Borrar»)
          var first = document.querySelector("#search-suggest.open .suggest-item, #recent-searches.open .recent-item");
          if (first && first.offsetParent) { e.preventDefault(); e.stopImmediatePropagation(); first.focus({ preventScroll: true }); return; }
        }
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
    var sp = document.getElementById("search-suggest"), rs = document.getElementById("recent-searches");
    if (!layer && rs && rs.classList.contains("open") && rs.contains(document.activeElement)) { rs.classList.remove("open"); window.__tcNoRecentOnce = true; var si0 = document.getElementById("search-input"); if (si0) si0.focus({ preventScroll: true }); return true; }
    if (!layer && sp && sp.classList.contains("open")) { if (typeof hideSuggestions === "function") hideSuggestions(); var si = document.getElementById("search-input"); if (si) si.focus({ preventScroll: true }); return true; }
    if (layer || (menu && menu.classList.contains("open"))) { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return true; }
    if (typeof currentView !== "undefined" && currentView !== "home" && typeof switchView === "function") { switchView("home"); return true; }
    if ((window.pageYOffset || 0) > 80) { if (window.tcScrollTop) window.tcScrollTop(); var hp = document.getElementById("hero-play-btn"); if (hp && hp.offsetParent) hp.focus({ preventScroll: true }); return true; }
  } catch (e) { }
  return false;
};

/**
 * TatoCine · js/core/fold.js
 * Teléfonos y tabletas plegables (Samsung Galaxy Z Fold/Flip, Pixel Fold, Surface Duo y futuros plegables de cualquier marca): detecta los segmentos de pantalla y la postura
 * y lo expone como clases en <html> para que el CSS (css/20-modales.css, sección «Plegables») evite la bisagra:
 *   · fold-h  → dos paneles lado a lado (bisagra vertical, modo libro): los diálogos y el reproductor se quedan en un panel.
 *   · fold-v  → dos paneles uno sobre otro (bisagra horizontal, modo «Flex»/portátil): el vídeo va arriba y los controles abajo.
 *   · posture-folded → el dispositivo informa que está medio plegado.
 * En un plegable que muestra una sola pantalla continua (el interior de un Galaxy Fold, por ejemplo) no hace falta nada: el diseño ya es fluido de 280 px a TV 4K.
 * Se actualiza al plegar/desplegar sin recargar. Sin soporte del navegador no hace nada (ninguna clase).
 */
(function foldSupport() {
  if (!window.matchMedia) return;
  var q = { "fold-h": "(horizontal-viewport-segments: 2)", "fold-v": "(vertical-viewport-segments: 2)", "posture-folded": "(device-posture: folded)" }, list = [];
  function apply() { var h = document.documentElement; Object.keys(q).forEach(function (k) { var m; try { m = window.matchMedia(q[k]); } catch (e) { return; } h.classList.toggle(k, !!m.matches); }); }
  Object.keys(q).forEach(function (k) { try { var m = window.matchMedia(q[k]); list.push(m); if (m.addEventListener) m.addEventListener("change", apply); else if (m.addListener) m.addListener(apply); } catch (e) { } });
  apply();
  window.addEventListener("resize", function () { apply(); layoutPlayer(); });
  /** Mide una variable env() en píxeles. */
  function envPx(name) { var d = document.createElement("div"); d.style.cssText = "position:fixed;visibility:hidden;width:env(" + name + ",0px)"; document.body.appendChild(d); var w = parseFloat(getComputedStyle(d).width) || 0; d.remove(); return w; }
  /** Modo Flex: el contenedor de vídeo termina justo en la bisagra y el resto de controles empieza debajo de ella. */
  function layoutPlayer() {
    var c = document.querySelector("#player-modal .player-container"), h = document.documentElement; if (!c) return;
    if (!h.classList.contains("fold-v") || !document.getElementById("player-modal").classList.contains("open")) { c.style.removeProperty("height"); c.style.removeProperty("max-height"); c.style.removeProperty("margin-bottom"); return; }
    var topEnd = envPx("viewport-segment-bottom 0 0"), nextStart = envPx("viewport-segment-top 0 1"), top = c.getBoundingClientRect().top - (parseFloat(c.style.marginTop) || 0);
    if (!topEnd || !nextStart) return;
    c.style.maxHeight = "none"; c.style.height = Math.max(160, Math.round(topEnd - top - 8)) + "px"; c.style.marginBottom = Math.round(nextStart - topEnd + 8) + "px";
  }
  var pm = document.getElementById("player-modal");
  if (pm && window.MutationObserver) new MutationObserver(function () { setTimeout(layoutPlayer, 60); }).observe(pm, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("orientationchange", function () { setTimeout(function () { apply(); layoutPlayer(); }, 250); });
})();

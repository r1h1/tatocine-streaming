/**
 * TatoCine · js/core/refresh-rate.js
 * Detecta la frecuencia REAL con la que el navegador pinta (30, 60, 90, 120, 144 Hz…) midiendo requestAnimationFrame y adapta la app:
 *   · window.TC_HZ y <html data-hz="120"> (clases hz-high ≥ 90 Hz, hz-low < 45 Hz) para que el CSS/JS pueda ajustarse.
 *   · hz-low (pantalla a 30 Hz o ahorro de batería): se quitan desenfoques y sombras grandes (css/21-fluidez.css) para no ir a tirones.
 * Qué NO hace: no «fuerza» 120 Hz. La cadencia la fijan el navegador y la pantalla (Android/iOS suben solos cuando hay movimiento y el
 * ahorro de batería lo permite). Aquí solo se evita lo que lo impide (trabajo pesado en cada fotograma) y se adapta a lo que haya.
 * Se mide con la pestaña visible y en reposo, sin bloquear nada (≈ 0,5 s de fotogramas), y se repite al volver a la pestaña o cambiar de pantalla.
 */
(function refreshRate() {
  var RATES = [24, 30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240], lastAt = 0, busy = false;
  function snap(hz) { var best = RATES[0]; RATES.forEach(function (r) { if (Math.abs(r - hz) < Math.abs(best - hz)) best = r; }); return best; }
  function apply(hz) {
    window.TC_HZ = hz;
    var h = document.documentElement;
    h.setAttribute("data-hz", String(hz));
    h.classList.toggle("hz-high", hz >= 90);
    h.classList.toggle("hz-low", hz < 45);
    h.style.setProperty("--frame-ms", (1000 / hz).toFixed(2) + "ms");
  }
  function measure() {
    if (busy || document.hidden || typeof requestAnimationFrame !== "function") return;
    if (Date.now() - lastAt < 30000) return;                                   // como mucho una medición cada 30 s
    busy = true;
    var deltas = [], last = 0, n = 0;
    function frame(ts) {
      if (document.hidden) { busy = false; return; }                          // pestaña oculta: la medición no vale
      if (last) deltas.push(ts - last);
      last = ts;
      if (++n < 36) return requestAnimationFrame(frame);
      deltas.sort(function (a, b) { return a - b; });
      var med = deltas[Math.floor(deltas.length / 2)] || 16.7;                // mediana: un tirón puntual no falsea la medida
      lastAt = Date.now(); busy = false;
      apply(snap(1000 / med));
    }
    requestAnimationFrame(frame);
  }
  window.tcMeasureRefresh = function () { lastAt = 0; measure(); };            // para diagnóstico
  apply(60);                                                                    // valor inicial razonable hasta medir
  if (document.readyState === "complete") setTimeout(measure, 600); else window.addEventListener("load", function () { setTimeout(measure, 900); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) setTimeout(measure, 500); });
  try { window.matchMedia("(resolution: 1dppx)").addEventListener("change", function () { lastAt = 0; setTimeout(measure, 500); }); } catch (e) { }   // cambio de pantalla/monitor
})();

/**
 * TatoCine · js/ui/splash.js
 * Pantalla de carga estilo plataforma de streaming: mismo fondo cinematográfico que el selector de perfiles (la última imagen mostrada, guardada en el dispositivo
 * y servida desde la caché de imágenes: sin peticiones nuevas), logo animado y fundido hacia el selector. Pantalla de carga (el HTML y el CSS van en línea en index.html para pintarse antes que nada). Se retira con un fundido cuando la app ya tiene
 * algo bonito que mostrar: la portada lista, el selector de perfiles con sus tarjetas o la bienvenida. Dura siempre 1,5 s. No hace ninguna petición de red.
 */
(function () {
  var el = document.getElementById("tc-splash"); if (!el) return;
  var done = false, timer = null;
  try {                                                                                    // fondo: la imagen con la que terminó el selector la última vez (si existe)
    var seed = localStorage.getItem("tatoSplashBgV1");
    if (seed && /^\/[A-Za-z0-9_-]+\.jpg$/.test(seed)) {
      var url = "https://image.tmdb.org/t/p/w780" + seed, bg = document.getElementById("tc-splash-bg"), im = new Image();
      im.onload = function () { if (bg && !done) { bg.style.backgroundImage = "url(\"" + url + "\")"; bg.classList.add("on"); } };
      im.src = url;
    }
  } catch (e) { }
  function hide() {
    if (done) return; done = true; clearTimeout(timer);
    el.classList.add("out");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
  }
  // Dura SIEMPRE 1,5 s (haya cargado ya todo o no): ni más rápido ni más lento. (window.__TC_SPLASH_MS solo lo usan las pruebas automáticas.)
  var ms = typeof window.__TC_SPLASH_MS === "number" ? window.__TC_SPLASH_MS : 1500;
  timer = setTimeout(hide, ms);
  window.tcSplashHide = hide;
})();

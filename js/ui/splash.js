/**
 * TatoCine · js/ui/splash.js
 * Pantalla de carga estilo plataforma de streaming: mismo fondo cinematográfico que el selector de perfiles (la última imagen mostrada, guardada en el dispositivo
 * y servida desde la caché de imágenes: sin peticiones nuevas), logo y nombre fijos (sin animación ni barra de progreso) y un fundido corto de salida. Pantalla de carga (el HTML y el CSS van en línea en index.html para pintarse antes que nada). Se retira con un fundido cuando la app ya tiene
 * algo bonito que mostrar: la portada lista, el selector de perfiles con sus tarjetas o la bienvenida. Dura siempre 1,5 s. No hace ninguna petición de red.
 */
(function () {
  // Televisores: todo se veía enorme al 100 %. Se muestra al 90 % con la escala inicial de la ventana (no con CSS zoom, que rompe los 100vh de las ventanas a
  // pantalla completa). Lo respetan los navegadores de TV basados en Android WebView (TV Bro, Google TV, Android TV) y Chromium; ?tvscale=0 lo desactiva.
  try {
    if (document.documentElement.classList.contains("tc-tv") && !/[?&]tvscale=0/.test(location.search)) {
      var vm = document.querySelector('meta[name="viewport"]');
      if (vm) vm.setAttribute("content", "width=device-width,initial-scale=0.9,viewport-fit=cover");
      document.documentElement.classList.add("tc-tv-scaled");
    }
  } catch (e0) { }
  var el = document.getElementById("tc-splash"); if (!el) return;
  var done = false, timer = null;
  try {                                                                                    // fondo: si boot.js dejó la imagen COMPLETA guardada, ya se ve desde el primer cuadro; si solo hay la ruta, aparece al cargar
    var seed = localStorage.getItem("tatoSplashBgV1");
    if (seed && /^\/[A-Za-z0-9_-]+\.jpg$/.test(seed) && !document.documentElement.classList.contains("tc-seed-data")) {
      var bg = document.getElementById("tc-splash-bg"), im = new Image();
      im.onload = function () { if (bg && !done) bg.classList.add("on"); };
      im.src = "https://image.tmdb.org/t/p/w780" + seed;
    }
  } catch (e) { }
  function hide() {
    if (done) return; done = true; clearTimeout(timer);
    el.classList.add("out");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
  }
  // Dura SIEMPRE 1,5 s (haya cargado ya todo o no): ni más rápido ni más lento. (window.__TC_SPLASH_MS solo lo usan las pruebas automáticas.)
  var ms = typeof window.__TC_SPLASH_MS === "number" ? window.__TC_SPLASH_MS : 1500;
  timer = setTimeout(hide, ms);
  window.tcSplashHide = hide;
})();

/**
 * TatoCine · js/ui/splash.js
 * Pantalla de carga estilo plataforma de streaming: mismo fondo cinematográfico que el selector de perfiles (la última imagen mostrada, guardada en el dispositivo
 * y servida desde la caché de imágenes: sin peticiones nuevas), logo y nombre fijos (sin animación ni barra de progreso) y un fundido corto de salida. Pantalla de carga (el HTML y el CSS van en línea en index.html para pintarse antes que nada). Se retira con un fundido cuando la app ya tiene
 * algo bonito que mostrar: la portada lista, el selector de perfiles con sus tarjetas o la bienvenida. Dura siempre 1,5 s. No hace ninguna petición de red.
 */
(function () {
  // Televisores: todo se veía enorme al 100 %. Se muestra al 80 % con la escala inicial de la ventana (no con CSS zoom, que rompe los 100vh de las ventanas a
  // pantalla completa). Lo respetan los navegadores de TV basados en Android WebView (TV Bro, Google TV, Android TV) y Chromium; ?tvscale=0 lo desactiva.
  // App instalada (PWA en móvil o escritorio) y app de Google TV: SIN zoom (ya está ajustada a la pantalla; a veces se agrandaba por accidente). La web normal
  // en el navegador sigue dejando hacer zoom (accesibilidad). Se bloquean: pellizco (viewport + touch-action + gestos de iOS), Ctrl+rueda / pellizco del
  // touchpad y Ctrl + / Ctrl −. Ctrl+0 se deja: restablece el tamaño si ya estaba agrandada (el navegador recuerda el zoom de cada sitio).
  var app = false;
  try {
    var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
    app = mq("(display-mode: standalone)") || mq("(display-mode: fullscreen)") || mq("(display-mode: minimal-ui)") || mq("(display-mode: window-controls-overlay)") ||
      window.navigator.standalone === true || /TatoCine(TV|App)\//.test(navigator.userAgent);
  } catch (eA) { }
  try {
    var tvScale = document.documentElement.classList.contains("tc-tv") && !/[?&]tvscale=0/.test(location.search);
    var vm = document.querySelector('meta[name="viewport"]'), sc = tvScale ? "0.8" : "1";
    if (vm && (tvScale || app)) vm.setAttribute("content", "width=device-width,initial-scale=" + sc + (app ? ",minimum-scale=" + sc + ",maximum-scale=" + sc + ",user-scalable=no" : "") + ",viewport-fit=cover");
    if (tvScale) document.documentElement.classList.add("tc-tv-scaled");
  } catch (e0) { }
  if (app) {
    document.documentElement.classList.add("tc-app");
    var stop = function (e) { if (e.cancelable) e.preventDefault(); };
    try {
      window.addEventListener("wheel", function (e) { if (e.ctrlKey || e.metaKey) stop(e); }, { passive: false });          // Ctrl+rueda y pellizco del touchpad
      window.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && (/^[+=\-_]$/.test(e.key) || e.code === "NumpadAdd" || e.code === "NumpadSubtract" || e.code === "Equal" || e.code === "Minus")) stop(e);
      }, true);
      ["gesturestart", "gesturechange", "gestureend"].forEach(function (t) { document.addEventListener(t, stop, { passive: false }); });   // iPhone / iPad
      document.addEventListener("touchmove", function (e) { if (e.touches && e.touches.length > 1) stop(e); }, { passive: false });
    } catch (eZ) { }
  }
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

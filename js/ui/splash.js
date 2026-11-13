/**
 * TatoCine · js/ui/splash.js
 * Pantalla de carga estilo plataforma de streaming: mismo fondo cinematográfico que el selector de perfiles (la última imagen mostrada, guardada en el dispositivo
 * y servida desde la caché de imágenes: sin peticiones nuevas), logo animado y fundido hacia el selector. Pantalla de carga (el HTML y el CSS van en línea en index.html para pintarse antes que nada). Se retira con un fundido cuando la app ya tiene
 * algo bonito que mostrar: la portada lista, el selector de perfiles con sus tarjetas o la bienvenida. Mínimo 1,1–1,5 s visible (sin parpadeo) y un
 * seguro de 7 s por si algo tarda. No hace ninguna petición de red.
 */
(function () {
  var el = document.getElementById("tc-splash"); if (!el) return;
  var t0 = Date.now(), done = false, timer = null, hasBg = false;
  try {                                                                                    // fondo: la imagen con la que terminó el selector la última vez (si existe)
    var seed = localStorage.getItem("tatoSplashBgV1");
    if (seed && /^\/[A-Za-z0-9_-]+\.jpg$/.test(seed)) {
      var url = "https://image.tmdb.org/t/p/w780" + seed, bg = document.getElementById("tc-splash-bg"), im = new Image();
      im.onload = function () { if (bg && !done) { bg.style.backgroundImage = "url(\"" + url + "\")"; bg.classList.add("on"); } };
      im.src = url; hasBg = true;
    }
  } catch (e) { }
  function hide() {
    if (done) return; done = true; clearInterval(timer);
    el.classList.add("out");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
  }
  function ready() {
    var b = document.body; if (!b) return false;
    if (window.tcWelcomeOpen) return true;
    if (b.classList.contains("app-ready")) return true;
    var o = document.getElementById("tc-profile-overlay");
    return !!(o && o.classList.contains("open") && document.querySelector("#tc-profile-grid .tc-profile-card"));
  }
  timer = setInterval(function () {
    var age = Date.now() - t0;
    if (age > 7000 || (age > (hasBg ? 1500 : 1100) && ready())) hide();
  }, 120);
  window.tcSplashHide = hide;
})();

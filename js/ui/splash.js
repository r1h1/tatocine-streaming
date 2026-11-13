/**
 * TatoCine · js/ui/splash.js
 * Pantalla de carga (el HTML y el CSS van en línea en index.html para pintarse antes que nada). Se retira con un fundido cuando la app ya tiene
 * algo bonito que mostrar: la portada lista, el selector de perfiles con sus tarjetas o la bienvenida. Mínimo 700 ms visible (sin parpadeo) y un
 * seguro de 7 s por si algo tarda. No hace ninguna petición de red.
 */
(function () {
  var el = document.getElementById("tc-splash"); if (!el) return;
  var t0 = Date.now(), done = false, timer = null;
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
    if (age > 7000 || (age > 700 && ready())) hide();
  }, 120);
  window.tcSplashHide = hide;
})();

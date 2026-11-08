/**
 * TatoCine · js/core/rate-limit.js
 * Limitador de recargas: si la app se recarga 7 veces seguidas con ≤ 1 s entre cada una se bloquea 3 minutos (pantalla tipo «hora de dormir»,
 * fondo: The Social Network, TMDB 37799). Mientras dura el bloqueo no se hace ninguna petición a TMDB.
 * El estado vive en localStorage, así que recargar o abrir otra pestaña no lo salta. No afecta a nadie más: todo es local.
 */
(function () {
  var KEY = "tatoLoadsV2", LOCK_KEY = "tatoRateLockUntil", BG_KEY = "tatoSocialBg", MAX = 7, GAP_MS = 1000, LOCK_MS = 180000, MOVIE = "/movie/37799";
  function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  var now = Date.now(), until = Number(read(LOCK_KEY, 0)) || 0;
  if (until <= now) {
    // Racha de recargas seguidas: cada una a ≤ 1 s de la anterior. Si pasa más de 1 s, la racha vuelve a empezar.
    var st = read(KEY, null) || { n: 0, t: 0 };
    st = { n: now - (st.t || 0) <= GAP_MS ? (st.n || 0) + 1 : 1, t: now };
    write(KEY, st);
    if (st.n >= MAX) { until = now + LOCK_MS; write(LOCK_KEY, until); write(KEY, { n: 0, t: 0 }); }
  }
  if (until <= now) return;
  window.tcRateLocked = true;
  var el = document.getElementById("tc-rate-lock");
  if (!el) return;
  var es = (document.documentElement.lang || "es").slice(0, 2) !== "en";
  function T(a, b) { return es ? a : b; }
  el.querySelector("h3").textContent = T("Demasiadas peticiones", "Too many requests");
  var time = document.getElementById("tc-rate-lock-time");
  function tick() {
    var left = until - Date.now();
    if (left <= 0) { try { localStorage.removeItem(LOCK_KEY); } catch (e) { } location.reload(); return; }
    var m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
    time.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    setTimeout(tick, 500);
  }
  el.querySelector(".tc-bed-sub").textContent = T("Recargaste la app muchas veces seguidas. Para no saturar el servicio de TMDB, espera un momento: se desbloquea sola.", "You reloaded the app many times in a row. To avoid overloading TMDB, wait a moment: it unlocks by itself.");
  el.classList.add("open");
  document.body.style.overflow = "hidden";
  tick();
  // Fondo: ruta guardada (sin pedir nada) o una única petición permitida durante el bloqueo.
  function paint(p) { if (/^\/[A-Za-z0-9]+\.jpg$/.test(p || "")) el.style.setProperty("--bed-bg", 'url("https://image.tmdb.org/t/p/w1280' + p + '")'); }
  var saved = read(BG_KEY, ""); paint(saved);
  if (!saved) {
    var tries = 0;
    (function go() {
      if (typeof fetchTMDB !== "function") { if (tries++ < 40) setTimeout(go, 100); return; }
      window.tcRateAllow = true;
      fetchTMDB(MOVIE).then(function (d) { var p = d && d.backdrop_path; if (p) { write(BG_KEY, p); paint(p); } }).catch(function () { }).then(function () { window.tcRateAllow = false; });
    })();
  }
})();

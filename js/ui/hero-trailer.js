/**
 * TatoCine · js/ui/hero-trailer.js
 * Tráiler en silencio en la portada (como las plataformas grandes): tras ~3 s sin cambiar de título, el fondo pasa del
 * póster a su tráiler de YouTube (youtube-nocookie, sin sonido). Mientras suena no rota el carrusel; se detiene al
 * salir de la portada, abrir una ficha o el reproductor, ocultar la pestaña, o pasados 45 s.
 * Ajustes → «Tráiler en la portada»: Automático (solo equipos con ratón y buena conexión) / Activado / Desactivado.
 * Nunca en perfiles infantiles, con «reducir movimiento», modo ligero o ahorro de datos.
 */
var HT_KEY = "tatoHeroTrailer", HT_MAX_MS = 45000, htToken = 0, htTimer = null, htCache = {}, htWatch = null, htPlayingKey = "";
var htMode = (function () { try { var v = localStorage.getItem(HT_KEY); return v === "on" || v === "off" ? v : "auto"; } catch (e) { return "auto"; } })();
function htAllowed() {
  if (htMode === "off" || isKidProfile()) return false;
  if (document.body.classList.contains("lite") || document.body.classList.contains("rm") || document.hidden) return false;
  if (!(currentView === "home" || currentView === "movies" || currentView === "series" || currentView === "anime") || isSearching) return false;
  var c = navigator.connection || {};
  if (c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || "")) return false;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (htMode === "auto") return !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  return true;
}
function htStop() {
  htToken++;
  clearTimeout(htTimer); clearInterval(htWatch);
  htPlayingKey = "";
  $heroVideoWrap.classList.remove("active");
  document.body.classList.remove("hero-trailer-on");
  var b = $("hero-sound-btn"); if (b) b.remove();
  setTimeout(function () { if (!htPlayingKey) { $heroVideoWrap.innerHTML = ""; $heroVideoWrap.dataset.key = ""; } }, 520);
}
async function htTrailerKey(m) {
  var k = m.type + ":" + m.id;
  if (htCache[k] !== undefined) return htCache[k];
  var key = "";
  try {
    var d = await fetchTMDB("/" + (m.type === "tv" ? "tv" : "movie") + "/" + m.id + "/videos", "&include_video_language=" + (UI_LANG === "en" ? "en" : "es") + ",en,null");
    var vids = ((d && d.results) || []).filter(function (v) { return v.site === "YouTube" && /^[A-Za-z0-9_-]{6,15}$/.test(v.key || "") && (v.type === "Trailer" || v.type === "Teaser"); });
    vids.sort(function (a, b) { return (b.official - a.official) || ((b.type === "Trailer") - (a.type === "Trailer")) || ((b.iso_639_1 === (UI_LANG === "en" ? "en" : "es")) - (a.iso_639_1 === (UI_LANG === "en" ? "en" : "es"))); });
    key = vids[0] ? vids[0].key : "";
  } catch (e) { }
  htCache[k] = key;
  return key;
}
function htPlay(key, token) {
  if (token !== htToken) return;
  var f = document.createElement("iframe");
  f.setAttribute("tabindex", "-1"); f.setAttribute("aria-hidden", "true"); f.setAttribute("title", "");
  f.setAttribute("allow", "autoplay; encrypted-media");
  f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  f.src = "https://www.youtube-nocookie.com/embed/" + key + "?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&loop=1&playlist=" + key + "&enablejsapi=1&origin=" + encodeURIComponent(location.origin);
  f.onload = function () {
    if (token !== htToken) return;
    setTimeout(function () {
      if (token !== htToken) return;
      $heroVideoWrap.classList.add("active");
      document.body.classList.add("hero-trailer-on");
      htPlayingKey = key;
      var b = document.createElement("button");
      b.type = "button"; b.id = "hero-sound-btn"; b.className = "hero-sound-btn"; b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", L("Activar el sonido del tráiler", "Turn trailer sound on"));
      b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path class="snd-on" d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/><path class="snd-off" d="M22 9l-6 6M16 9l6 6"/></svg>';
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", String(on));
        b.setAttribute("aria-label", on ? L("Silenciar el tráiler", "Mute the trailer") : L("Activar el sonido del tráiler", "Turn trailer sound on"));
        f.contentWindow.postMessage(JSON.stringify({ event: "command", func: on ? "unMute" : "mute", args: [] }), "https://www.youtube-nocookie.com");
        if (on) f.contentWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [60] }), "https://www.youtube-nocookie.com");
      });
      $heroSection.appendChild(b);
      var t0 = Date.now();
      htWatch = setInterval(function () {                                          // condiciones para seguir sonando
        var out = window.scrollY > $heroSection.offsetHeight * 0.6;
        if (document.hidden || out || document.body.style.overflow === "hidden" || Date.now() - t0 > HT_MAX_MS || !htAllowed()) htStop();
      }, 1500);
    }, 700);
  };
  $heroVideoWrap.innerHTML = "";
  $heroVideoWrap.dataset.key = key;
  $heroVideoWrap.appendChild(f);
}
function htSchedule(m) {
  htStop();
  if (!m || m.isUpcoming || !htAllowed()) return;
  var token = htToken;
  htTimer = setTimeout(async function () {
    if (token !== htToken || !htAllowed()) return;
    var key = await htTrailerKey(m);
    if (key && token === htToken && htAllowed() && currentHeroMedia === m) htPlay(key, token);
  }, 3000);
}
decorate("setHero", function (original) { return function (m) { var r = original(m); htSchedule(m); return r; }; });
decorate("openDetails", function (original) { return function () { htStop(); return original.apply(this, arguments); }; });
decorate("openPlayer", function (original) { return function () { htStop(); return original.apply(this, arguments); }; });
decorate("switchView", function (original) { return function () { htStop(); return original.apply(this, arguments); }; });
document.addEventListener("visibilitychange", function () { if (document.hidden) htStop(); });
function htLabel() { return { auto: L("Automático (equipos con ratón)", "Automatic (devices with a mouse)"), on: L("Activado", "On"), off: L("Desactivado", "Off") }[htMode]; }
function cycleHeroTrailer() {
  htMode = { auto: "on", on: "off", off: "auto" }[htMode];
  try { localStorage.setItem(HT_KEY, htMode); } catch (e) { }
  var el = $("hero-trailer-sub"); if (el) el.textContent = htLabel();
  htStop();
  showToast(L("Tráiler en la portada: ", "Hero trailer: ") + htLabel());
  if (htMode !== "off") htSchedule(currentHeroMedia);
}
registerAction("hero-trailer-cycle", cycleHeroTrailer);
decorate("showSettings", function (original) { return function () { var r = original.apply(this, arguments); var el = $("hero-trailer-sub"); if (el) el.textContent = htLabel(); return r; }; });
if (typeof i18nAdd === "function") i18nAdd({ "Tráiler en la portada": "Hero trailer", "Cambiar": "Change" });

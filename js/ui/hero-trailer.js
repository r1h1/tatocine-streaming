/**
 * TatoCine · js/ui/hero-trailer.js
 * Tráiler en silencio en la portada (como las plataformas grandes): tras ~3 s sin cambiar de título, el fondo pasa del
 * póster a su tráiler de YouTube (youtube-nocookie, sin sonido). Mientras suena no rota el carrusel; se detiene al
 * salir de la portada, abrir una ficha o el reproductor, ocultar la pestaña, o pasados 45 s.
 * Ajustes → «Tráiler en la portada»: Automático (equipos con ratón y buena conexión; respeta «reducir animaciones» del sistema) /
 * Activado (manda sobre el sistema) / Desactivado. El vídeo solo se muestra cuando YouTube confirma que reproduce; Ajustes indica el motivo si no sale.
 * Nunca en perfiles infantiles, con «reducir movimiento», modo ligero o ahorro de datos.
 */
var HT_KEY = "tatoHeroTrailer", HT_MAX_MS = 45000, htToken = 0, htTimer = null, htCache = {}, htWatch = null, htPlayingKey = "";
var htMode = (function () { try { var v = localStorage.getItem(HT_KEY); return v === "on" || v === "off" ? v : "auto"; } catch (e) { return "auto"; } })();
var htStatus = "";
/** Motivo por el que NO se reproduce el tráiler ahora ("" = se puede). «Activado» ignora los ajustes del sistema (elección explícita). */
function htWhyNot() {
  var forced = htMode === "on", mm = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  if (htMode === "off") return L("Desactivado en Ajustes.", "Off in Settings.");
  if (isKidProfile()) return L("No se usa en perfiles infantiles.", "Not used on kid profiles.");
  if (location.protocol === "file:") return L("YouTube no permite reproducir desde un archivo local (file://). Abre TatoCine desde http://localhost o desde el sitio publicado.", "YouTube won't play from a local file (file://). Open TatoCine from http://localhost or the published site.");
  if (document.body.classList.contains("rm")) return L("«Reducir movimiento» está activado en Ajustes.", "“Reduce motion” is on in Settings.");
  if (document.body.classList.contains("lite") && !forced) return L("Modo ligero activado.", "Lite mode is on.");
  if (!(currentView === "home" || currentView === "movies" || currentView === "series" || currentView === "anime") || isSearching) return L("Solo en la portada de Inicio, Películas, Series y Anime.", "Only on the Home, Movies, Series and Anime hero.");
  if (!forced) {
    var c = navigator.connection || {};
    if (c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || "")) return L("Ahorro de datos o conexión lenta.", "Data saver or slow connection.");
    if (mm("(prefers-reduced-motion: reduce)")) return L("Tu sistema tiene «reducir animaciones» activado. Pon «Activado» aquí para verlo igualmente.", "Your system has “reduce animations” on. Choose “On” here to see it anyway.");
    if (htMode === "auto" && !mm("(hover: hover) and (pointer: fine)")) return L("Automático solo en equipos con ratón. Pon «Activado» para verlo en este dispositivo.", "Automatic only on devices with a mouse. Choose “On” to see it on this device.");
  }
  return "";
}
function htAllowed() { return !document.hidden && htWhyNot() === ""; }
function htSetStatus(msg) { htStatus = msg; var el = $("hero-trailer-sub"); if (el) el.textContent = htLabel() + (htStatus ? " — " + htStatus : ""); }
function htStop() {
  htToken++;
  clearTimeout(htTimer); clearInterval(htWatch);
  htPlayingKey = "";
  $heroVideoWrap.classList.remove("active");
  document.body.classList.remove("hero-trailer-on");
  var b = $("hero-sound-btn"); if (b) b.remove();
  setTimeout(function () { if (!htPlayingKey) { $heroVideoWrap.innerHTML = ""; $heroVideoWrap.dataset.key = ""; } }, 520);
}
async function htTrailerKeys(m) {
  var k = m.type + ":" + m.id;
  if (htCache[k] !== undefined) return htCache[k];
  var keys = [];
  try {
    var lang = UI_LANG === "en" ? "en" : "es";
    var d = await fetchTMDB("/" + (m.type === "tv" ? "tv" : "movie") + "/" + m.id + "/videos", "&include_video_language=" + lang + ",en,null");
    var vids = ((d && d.results) || []).filter(function (v) { return v.site === "YouTube" && /^[A-Za-z0-9_-]{6,15}$/.test(v.key || "") && (v.type === "Trailer" || v.type === "Teaser"); });
    vids.sort(function (a, b) { return (b.official - a.official) || ((b.type === "Trailer") - (a.type === "Trailer")) || ((b.iso_639_1 === lang) - (a.iso_639_1 === lang)); });
    keys = vids.slice(0, 3).map(function (v) { return v.key; });
  } catch (e) { }
  htCache[k] = keys;
  return keys;
}
/** Reproduce keys[i]; el vídeo solo se muestra cuando YouTube confirma que está reproduciendo. Si falla, prueba el siguiente. */
function htPlay(keys, i, token) {
  if (token !== htToken) return;
  if (i >= keys.length) { htSetStatus(L("YouTube no pudo reproducir los tráilers de este título.", "YouTube couldn't play this title's trailers.")); return; }
  var key = keys[i], f = document.createElement("iframe"), shown = false, giveUp = null;
  f.setAttribute("tabindex", "-1"); f.setAttribute("aria-hidden", "true"); f.setAttribute("title", "");
  f.setAttribute("allow", "autoplay; encrypted-media");
  f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  f.src = "https://www.youtube-nocookie.com/embed/" + key + "?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&loop=1&playlist=" + key + "&enablejsapi=1&origin=" + encodeURIComponent(location.origin);
  function next(reason) { cleanup(); if (token === htToken) { htSetStatus(reason); $heroVideoWrap.innerHTML = ""; htPlay(keys, i + 1, token); } }
  function cleanup() { clearTimeout(giveUp); window.removeEventListener("message", onMsg); }
  function onMsg(e) {
    if (e.source !== f.contentWindow || token !== htToken) return;
    var d = e.data; if (typeof d === "string") { try { d = JSON.parse(d); } catch (x) { return; } }
    if (!d) return;
    var state = d.event === "onStateChange" ? d.info : (d.event === "infoDelivery" && d.info && d.info.playerState !== undefined ? d.info.playerState : null);
    if (d.event === "onError") { next(L("YouTube rechazó el tráiler (error " + d.info + ")", "YouTube rejected the trailer (error " + d.info + ")")); return; }
    if (state === 1 && !shown) { shown = true; clearTimeout(giveUp); htReveal(f, key, token); }
  }
  window.addEventListener("message", onMsg);
  f.onload = function () {
    try { f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "https://www.youtube-nocookie.com"); } catch (e) { }
    giveUp = setTimeout(function () { if (!shown) next(L("El tráiler no arrancó (el navegador pudo bloquear la reproducción automática).", "The trailer didn't start (the browser may have blocked autoplay).")); }, 9000);
  };
  $heroVideoWrap.innerHTML = "";
  $heroVideoWrap.dataset.key = key;
  $heroVideoWrap.appendChild(f);
}
function htReveal(f, key, token) {
  if (token !== htToken) return;
  $heroVideoWrap.classList.add("active");
  document.body.classList.add("hero-trailer-on");
  htPlayingKey = key;
  htSetStatus(L("Reproduciendo.", "Playing."));
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
}
function htSchedule(m) {
  htStop();
  if (!m || m.isUpcoming) return;
  var why = htWhyNot();
  if (why || document.hidden) { if (why) htSetStatus(why); return; }
  var token = htToken;
  htTimer = setTimeout(async function () {
    if (token !== htToken || !htAllowed()) return;
    var keys = await htTrailerKeys(m);
    if (!keys.length) { htSetStatus(L("Este título no tiene tráiler en TMDB.", "This title has no trailer on TMDB.")); return; }
    if (token === htToken && htAllowed() && currentHeroMedia === m) htPlay(keys, 0, token);
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
  htStatus = "";
  var el = $("hero-trailer-sub"); if (el) el.textContent = htLabel();
  htStop();
  showToast(L("Tráiler en la portada: ", "Hero trailer: ") + htLabel());
  if (htMode !== "off") htSchedule(currentHeroMedia);
}
registerAction("hero-trailer-cycle", cycleHeroTrailer);
decorate("showSettings", function (original) { return function () { var r = original.apply(this, arguments); if (!htStatus) { var why = htWhyNot(); if (why && currentView !== "list") htStatus = why; } htSetStatus(htStatus); return r; }; });
if (typeof i18nAdd === "function") i18nAdd({ "Tráiler en la portada": "Hero trailer", "Cambiar": "Change" });

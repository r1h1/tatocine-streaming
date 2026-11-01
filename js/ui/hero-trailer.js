/**
 * TatoCine · js/ui/hero-trailer.js
 * Tráiler en silencio en la portada (como las plataformas grandes). Cada título dura 8 s en pantalla; si TIENE tráiler dura 30 s (29 s de tráiler y 1 s en pausa antes de cambiar)
 * y el vídeo se ve en el segundo 2 (se precarga y arranca oculto antes, sin pasar el ratón), en Inicio, Películas, Series, Anime y Niños.
 * Es youtube-nocookie y sin sonido. Se detiene al cambiar de título, salir de la portada, abrir una ficha o el reproductor,
 * u ocultar la pestaña.
 * Ajustes → «Tráiler en la portada»: Siempre (POR DEFECTO para todos: se reproduce en cualquier dispositivo; solo lo apaga el interruptor
 * «Reducir movimiento» de la app) / Solo con ratón / Desactivado. El vídeo solo se muestra cuando YouTube confirma que reproduce; Ajustes indica el motivo si no sale.
 * Nunca en perfiles infantiles, con «reducir movimiento», modo ligero o ahorro de datos.
 */
var HT_KEY = "tatoHeroTrailer", HT_MAX_MS = 45000, htToken = 0, htTimer = null, htCache = {}, htWatch = null, htPlayingKey = "";
var htMode = (function () { try { var v = localStorage.getItem(HT_KEY); return v === "auto" || v === "off" ? v : "on"; } catch (e) { return "on"; } })();     // por defecto SIEMPRE ("on") para todos los perfiles
var htStatus = "";
/** ¿Reproducir CON sonido? Sí si ya interactuaste con la página (el navegador solo lo permite así) y no lo silenciaste tú; si no, en silencio con el botón. */
function htWantSound() {
  try { var v = sessionStorage.getItem("tatoHtSound"); if (v === "0") return false; if (v === "1") return true; } catch (e) { }
  return !!(navigator.userActivation && navigator.userActivation.hasBeenActive);
}
function htRememberSound(on) { try { sessionStorage.setItem("tatoHtSound", on ? "1" : "0"); } catch (e) { } }
/** Motivo por el que NO se reproduce el tráiler ahora ("" = se puede). `htWhyNotify` indica si conviene avisar al usuario (una vez por sesión). */
var htWhyNotify = false;
function htWhyNot() {
  var forced = htMode === "on";
  htWhyNotify = false;
  if (htMode === "off") return L("Desactivado en Ajustes.", "Off in Settings.");
  var picker = document.getElementById("tc-profile-overlay");
  if (picker && picker.classList.contains("open")) return L("Hay que elegir perfil primero.", "Choose a profile first.");
  if (location.protocol === "file:") { htWhyNotify = true; return L("YouTube no permite reproducir desde un archivo local (file://). Abre TatoCine desde http://localhost o desde el sitio publicado.", "YouTube won't play from a local file (file://). Open TatoCine from http://localhost or the published site."); }
  if (document.body.classList.contains("rm")) { htWhyNotify = true; return L("«Reducir movimiento» está activado en Ajustes → Accesibilidad.", "“Reduce motion” is on in Settings → Accessibility."); }
  if (document.body.classList.contains("lite") && !forced) { htWhyNotify = true; return L("El modo ligero está activado (Ajustes → Modo ligero). Pon «Siempre» para verlo igualmente.", "Lite mode is on (Settings → Lite mode). Choose “Always” to see it anyway."); }
  if (!(currentView === "home" || currentView === "movies" || currentView === "series" || currentView === "anime" || currentView === "kids") || isSearching) return L("Solo en la portada de Inicio, Películas, Series, Anime y Niños.", "Only on the Home, Movies, Series, Anime and Kids hero.");
  if (htMode === "auto" && !(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches)) { htWhyNotify = true; return L("Está en «Solo con ratón» y este dispositivo no tiene ratón. Cámbialo a «Siempre» en Ajustes.", "It's set to “Mouse only” and this device has no mouse. Change it to “Always” in Settings."); }
  return "";
}
function htAllowed() { return !document.hidden && htWhyNot() === ""; }
var htFailToasted = false;
function htNotifyOnce(msg) {
  try { if (sessionStorage.getItem("tatoHtFail")) return; sessionStorage.setItem("tatoHtFail", "1"); } catch (e) { }
  showToast(L("Tráiler de la portada: ", "Hero trailer: ") + msg);
}
function htFail(msg) {
  htSetStatus(msg);
  if (htFailToasted) return;
  htFailToasted = true;
  try { if (sessionStorage.getItem("tatoHtFail")) return; sessionStorage.setItem("tatoHtFail", "1"); } catch (e) { }
  showToast(L("Tráiler de la portada: ", "Hero trailer: ") + msg);
}
function htSetStatus(msg) { htStatus = msg; var el = $("hero-trailer-sub"); if (el) el.textContent = htLabel() + (htStatus ? " — " + htStatus : ""); }
var htWrapGen = 0, htPauseTimer = null;
function htStop() {
  htToken++;
  clearTimeout(htTimer); clearInterval(htWatch); clearTimeout(htPauseTimer);
  htPlayingKey = "";
  $heroVideoWrap.classList.remove("active");
  document.body.classList.remove("hero-trailer-on");
  var b = $("hero-sound-btn"); if (b) b.remove();
  var gen = ++htWrapGen;                                                              // la limpieza diferida no debe borrar un tráiler que empezó a cargarse después
  setTimeout(function () { if (gen === htWrapGen && !htPlayingKey) { $heroVideoWrap.innerHTML = ""; $heroVideoWrap.dataset.key = ""; } }, 520);
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
var HT_PRELOAD_MS = 500, HT_PLAY_MS = 1000, HT_START_MS = 2000;   // se precarga a los 0,5 s, arranca (oculto) a 1 s y SE VE a los 2 s del título: los controles que YouTube muestra al empezar ya pasaron
/** Prepara keys[i] en pausa y lo arranca oculto y lo muestra en el segundo 2. Solo se muestra cuando YouTube confirma que reproduce; si falla, prueba el siguiente. */
function htPlay(keys, i, token) {
  if (token !== htToken) return;
  if (i >= keys.length) { htFail(L("YouTube no pudo reproducir los tráilers de este título.", "YouTube couldn't play this title's trailers.")); return; }
  var key = keys[i], f = document.createElement("iframe"), shown = false, giveUp = null, kick = null;
  f.setAttribute("tabindex", "-1"); f.setAttribute("aria-hidden", "true"); f.setAttribute("title", "");
  f.setAttribute("allow", "autoplay; encrypted-media");
  f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  f.src = "https://www.youtube-nocookie.com/embed/" + key + "?autoplay=0&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&loop=1&playlist=" + key + "&enablejsapi=1&origin=" + encodeURIComponent(location.origin);
  function post(func) { try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: [] }), "https://www.youtube-nocookie.com"); } catch (e) { } }
  function next(reason) { cleanup(); if (token === htToken) { if (i + 1 >= keys.length) htFail(reason); else htSetStatus(reason); $heroVideoWrap.innerHTML = ""; htPlay(keys, i + 1, token); } }
  function cleanup() { clearTimeout(giveUp); clearInterval(kick); window.removeEventListener("message", onMsg); }
  var lastState = null;
  function onMsg(e) {
    if (token !== htToken) { window.removeEventListener("message", onMsg); return; }
    if (e.source !== f.contentWindow) return;
    var d = e.data; if (typeof d === "string") { try { d = JSON.parse(d); } catch (x) { return; } }
    if (!d) return;
    var state = d.event === "onStateChange" ? d.info : (d.event === "infoDelivery" && d.info && d.info.playerState !== undefined ? d.info.playerState : null);
    if (state !== null) lastState = state;
    f.__htState = function () { return lastState; };
    if (d.event === "onError") { next(L("YouTube rechazó el tráiler (error " + d.info + ")", "YouTube rejected the trailer (error " + d.info + ")")); return; }
    if (state === 1 && !shown) {
      shown = true; clearTimeout(giveUp); clearInterval(kick);
      setTimeout(function () { htReveal(f, key, token, post); }, Math.max(0, heroShownAt + HT_START_MS - Date.now()));       // nunca se ve antes del segundo 2
    }
  }
  window.addEventListener("message", onMsg);
  giveUp = setTimeout(function () { if (!shown) next(L("YouTube no respondió: el navegador o una extensión (p. ej. Brave Shields) pudo bloquear el vídeo incrustado.", "YouTube didn't respond: the browser or an extension (e.g. Brave Shields) may have blocked the embedded video.")); }, HT_START_MS + 7000);
  f.onload = function () {
    try { f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "https://www.youtube-nocookie.com"); } catch (e) { }
    // A 1 s se da la orden de reproducir, oculto (se repite cada 0,7 s hasta que YouTube confirme que reproduce).
    var startIn = Math.max(0, heroShownAt + HT_PLAY_MS - Date.now());
    setTimeout(function () {
      if (token !== htToken || shown) return;
      post("playVideo");
      kick = setInterval(function () { if (!shown) post("playVideo"); }, 700);
      clearTimeout(giveUp);
      giveUp = setTimeout(function () { if (!shown) next(L("El tráiler no arrancó (el navegador pudo bloquear la reproducción automática).", "The trailer didn't start (the browser may have blocked autoplay).")); }, 4000);
    }, startIn);
  };
  htWrapGen++;
  $heroVideoWrap.innerHTML = "";
  $heroVideoWrap.dataset.key = key;
  $heroVideoWrap.appendChild(f);
}
function htReveal(f, key, token, post) {
  if (token !== htToken) return;
  $heroVideoWrap.classList.add("active");
  document.body.classList.add("hero-trailer-on");
  htPlayingKey = key;
  htSetStatus("");
  var b = document.createElement("button");
  b.type = "button"; b.id = "hero-sound-btn"; b.className = "hero-sound-btn"; b.setAttribute("aria-pressed", "false");
  b.setAttribute("aria-label", L("Activar el sonido del tráiler", "Turn trailer sound on"));
  function setSoundUi(on) { b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? L("Silenciar el tráiler", "Mute the trailer") : L("Activar el sonido del tráiler", "Turn trailer sound on")); }
  function soundOn() { post("unMute"); try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [60] }), "https://www.youtube-nocookie.com"); } catch (e) { } setSoundUi(true); }
  function soundOff() { post("mute"); setSoundUi(false); }
  // Con sonido desde el principio si el navegador lo permite; si lo bloquea (el vídeo se detiene al activar el sonido), vuelve a silencio y sigue.
  if (htWantSound()) {
    soundOn();
    setTimeout(function () {
      var st = f.__htState && f.__htState();
      if (token === htToken && st !== null && st !== 1) { soundOff(); post("playVideo"); }
    }, 1000);
  }
  b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path class="snd-on" d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/><path class="snd-off" d="M22 9l-6 6M16 9l6 6"/></svg>';
  b.addEventListener("click", function () {
    var on = b.getAttribute("aria-pressed") !== "true";
    htRememberSound(on);
    if (on) soundOn(); else soundOff();
  });
  // Último segundo: el sonido baja y el vídeo se PAUSA; justo después la portada pasa al siguiente título.
  var untilPause = Math.max(0, heroShownAt + HERO_DWELL_TRAILER - 1000 - Date.now());
  htPauseTimer = setTimeout(function () {
    if (token !== htToken) return;
    ["40", "25", "10", "0"].forEach(function (v, k) { setTimeout(function () { if (token === htToken) try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [Number(v)] }), "https://www.youtube-nocookie.com"); } catch (e) { } }, k * 200); });
    setTimeout(function () { if (token === htToken) post("pauseVideo"); }, 850);
  }, untilPause);
  $heroSection.appendChild(b);
  var t0 = Date.now();
  htWatch = setInterval(function () {                                          // condiciones para seguir sonando
    var out = window.scrollY > $heroSection.offsetHeight * 0.6;
    if (document.hidden || out || document.body.style.overflow === "hidden" || !htAllowed()) htStop();
  }, 1500);
}
function htSchedule(m) {
  htStop();
  if (!m || m.isUpcoming) return;
  var why = htWhyNot();
  if (why || document.hidden) {
    htSetStatus(htWhyNotify ? why : "");                           // solo se muestra en Ajustes lo que el usuario puede cambiar
    if (why && htWhyNotify) htNotifyOnce(why);
    return;
  }
  var token = htToken;
  htTrailerKeys(m).then(function (keys) {
    if (token !== htToken || currentHeroMedia !== m || !htAllowed()) return;
    if (!keys.length) { htSetStatus(L("Este título no tiene tráiler en TMDB.", "This title has no trailer on TMDB.")); return; }       // sin tráiler: 8 s
    heroPlan(HERO_DWELL_TRAILER);                                                                                                        // con tráiler: 15 s
    htTimer = setTimeout(function () { if (token === htToken && htAllowed() && currentHeroMedia === m) htPlay(keys, 0, token); }, Math.max(0, HT_PRELOAD_MS - (Date.now() - heroShownAt)));
  });
}
var HERO_DWELL_TRAILER = 30000;       // 29 s de tráiler + 1 s de pausa antes de pasar al siguiente
decorate("setHero", function (original) { return function (m) { var r = original(m); htSchedule(m); return r; }; });
decorate("openDetails", function (original) { return function () { htStop(); return original.apply(this, arguments); }; });
decorate("openPlayer", function (original) { return function () { htStop(); return original.apply(this, arguments); }; });
decorate("switchView", function (original) { return function () { htStop(); return original.apply(this, arguments); }; });
document.addEventListener("visibilitychange", function () { if (document.hidden) htStop(); });
function htLabel() { return { on: L("Siempre", "Always"), auto: L("Solo con ratón", "Mouse only"), off: L("Desactivado", "Off") }[htMode]; }
function cycleHeroTrailer() {
  htMode = { on: "auto", auto: "off", off: "on" }[htMode];     // Siempre → Solo con ratón → Desactivado → Siempre
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

(function restartAfterPicker() {
  var ov = document.getElementById("tc-profile-overlay");
  if (!ov || !window.MutationObserver) return;
  new MutationObserver(function () {
    if (ov.classList.contains("open") || !currentHeroMedia) return;
    heroShownAt = Date.now();                       // el título que estaba detrás del selector empieza a contar ahora
    heroPlan(HERO_DWELL);
    htSchedule(currentHeroMedia);
  }).observe(ov, { attributes: true, attributeFilter: ["class"] });
})();

/**
 * TatoCine · js/ui/hero-trailer.js
 * Tráiler en silencio en la portada (como las plataformas grandes). Cada título dura 8 s en pantalla; si TIENE tráiler dura 31 s (se ve desde 1,8 s, se pausa en el segundo 30 y a los 31 s cambia)
 * y el vídeo se ve en el segundo 1,8 (se precarga y arranca oculto antes, sin pasar el ratón), en Inicio, Películas, Series, Anime y Niños.
 * Es youtube-nocookie y siempre con sonido (sin botón de volumen). Se detiene al cambiar de título, salir de la portada, abrir una ficha o el reproductor,
 * u ocultar la pestaña.
 * Ajustes → «Tráiler en la portada»: Siempre (POR DEFECTO para todos: se reproduce en cualquier dispositivo; solo lo apaga el interruptor
 * «Reducir movimiento» de la app) / Solo con ratón / Desactivado. El vídeo solo se muestra cuando YouTube confirma que reproduce; Ajustes indica el motivo si no sale.
 * Nunca en perfiles infantiles, con «reducir movimiento», modo ligero o ahorro de datos.
 */
var HT_KEY = "tatoHeroTrailer", HT_MAX_MS = 45000, htToken = 0, htTimer = null, htCache = {}, htWatch = null, htPlayingKey = "";
var htMode = (function () { try { var v = localStorage.getItem(HT_KEY); return v === "auto" || v === "off" ? v : "on"; } catch (e) { return "on"; } })();     // por defecto SIEMPRE ("on") para todos los perfiles
var htStatus = "";
/** ¿Reproducir CON sonido? Sí si ya interactuaste con la página (el navegador solo lo permite así) y no lo silenciaste tú; si no, en silencio con el botón. */
function htWantSound() { return true; }
function htRememberSound() { }
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
  if (!(currentView === "home" || currentView === "movies" || currentView === "series" || currentView === "anime" || currentView === "kids" || isSearching)) return L("Solo en la portada de Inicio, Películas, Series, Anime y Niños.", "Only on the Home, Movies, Series, Anime and Kids hero.");
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
  var ob = $("hero-sound-btn"); if (ob) ob.remove();
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
    // Idioma del tráiler: ES → español latino, si no español de España, si no inglés. EN → inglés, y solo si no hay, español.
    var LATAM = /^(MX|AR|CO|CL|PE|VE|UY|PY|BO|EC|CR|GT|HN|SV|NI|PA|DO|CU|PR|419)$/;
    function tier(v) {
      var l = v.iso_639_1 || "", c = (v.iso_3166_1 || "").toUpperCase(), n = (v.name || "").toLowerCase();
      var latinName = /latino|latam|latinoam|hispanoam|\bmx\b|méxico|mexico/.test(n), spainName = /castellano|españa|\bspain\b|\bes-es\b/.test(n);
      if (lang === "en") return l === "en" ? 0 : !l ? 1 : 2;
      if (l === "es") return (LATAM.test(c) || (latinName && c !== "ES")) ? 0 : (c === "ES" || spainName) ? 1 : 2;
      return l === "en" ? 3 : 4;
    }
    vids.sort(function (a, b) { return (tier(a) - tier(b)) || ((b.type === "Trailer") - (a.type === "Trailer")) || (b.official - a.official); });
    keys = vids.slice(0, 3).map(function (v) { return v.key; });
  } catch (e) { }
  htCache[k] = keys;
  return keys;
}
var HT_PRELOAD_MS = 300, HT_PLAY_MS = 800, HT_START_MS = 1800;   // se precarga a los 0,5 s, arranca (oculto) a 1 s y SE VE a los 2 s del título: los controles que YouTube muestra al empezar ya pasaron
/** Prepara keys[i] en pausa y lo arranca oculto y lo muestra en el segundo 2. Solo se muestra cuando YouTube confirma que reproduce; si falla, prueba el siguiente. */
function htPlay(keys, i, token) {
  if (token !== htToken) return;
  if (i >= keys.length) { htFail(L("YouTube no pudo reproducir los tráilers de este título.", "YouTube couldn't play this title's trailers.")); return; }
  var key = keys[i], f = document.createElement("iframe"), shown = false, giveUp = null, kick = null;
  f.setAttribute("tabindex", "-1"); f.setAttribute("aria-hidden", "true"); f.setAttribute("title", "");
  f.setAttribute("allow", "autoplay; encrypted-media");
  f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  f.src = "https://www.youtube-nocookie.com/embed/" + key + "?autoplay=0&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1&origin=" + encodeURIComponent(location.origin);
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
    if (d.event === "infoDelivery" && d.info && d.info.muted !== undefined) f.__htMuted = !!d.info.muted;
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
  function setVol(v) { try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [v] }), "https://www.youtube-nocookie.com"); } catch (e) { } }
  function soundOn() { post("unMute"); setVol(70); }
  // Siempre con sonido. En una PWA instalada (o sin interacción previa) el navegador puede bloquear el audio: entonces sigue en silencio,
  // avisa una vez y el PRIMER toque, clic o tecla (cuenta al soltar, no al pulsar) lo activa; si aun así no suena, vuelve a esperar el siguiente.
  var GEST = ["pointerup", "click", "touchend", "keydown"], armed = false;
  function disarm() { GEST.forEach(function (n) { removeEventListener(n, onGesture, true); }); armed = false; }
  function onGesture() { disarm(); if (token !== htToken) return; soundOn(); setTimeout(check, 900); }
  function arm() {
    if (armed) return; armed = true;
    GEST.forEach(function (n) { addEventListener(n, onGesture, true); });
    try { if (!sessionStorage.getItem("tatoHtSoundHint")) { sessionStorage.setItem("tatoHtSoundHint", "1"); showToast(L("Toca la pantalla para activar el sonido del tráiler", "Tap the screen to turn on the trailer sound")); } } catch (e) { }
  }
  function check() {
    if (token !== htToken) return;
    var st = f.__htState && f.__htState();
    if (st !== null && st !== 1) { post("mute"); post("playVideo"); arm(); }          // el navegador detuvo el vídeo al quitar el silencio
    else if (f.__htMuted === true) arm();                                             // sigue sin sonido
  }
  soundOn();
  setTimeout(check, 1200);
  setTimeout(check, 3500);
  // Último segundo: el sonido baja y el vídeo se PAUSA; justo después la portada pasa al siguiente título.
  var untilPause = Math.max(0, heroShownAt + HERO_DWELL_TRAILER - 1000 - Date.now());
  htPauseTimer = setTimeout(function () {
    if (token !== htToken) return;
    ["40", "25", "10", "0"].forEach(function (v, k) { setTimeout(function () { if (token === htToken) try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [Number(v)] }), "https://www.youtube-nocookie.com"); } catch (e) { } }, k * 200); });
    setTimeout(function () { if (token === htToken) post("pauseVideo"); }, 850);
  }, untilPause);
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
var HERO_DWELL_TRAILER = 31000;       // se ve desde 1,8 s; en el segundo 30 se pausa y a los 31 s pasa al siguiente (1 s de pausa) antes de pasar al siguiente
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

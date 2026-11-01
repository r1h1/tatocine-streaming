/**
 * TatoCine · js/player/player-robust.js
 * Reproductor más robusto (se añade con decorate(), sin editar player.js):
 *   1. Cambio automático de servidor: si el servidor elegido no termina de cargar en PLAYER_LOAD_TIMEOUT ms
 *      se prueba el siguiente (primero los de tu idioma) y se avisa con un mensaje. No toca el servidor
 *      predeterminado de los Ajustes.
 *   2. Memoria por título: se recuerda el último servidor que funcionó (o que elegiste a mano) para ESE título
 *      y se usa la próxima vez; el resto de títulos siguen con tu servidor predeterminado.
 *   3. Al cambiar de episodio se mantiene el servidor que está funcionando (antes volvía al inicial).
 * Un servidor «sano»: ESP1 cuando envía sus mensajes «mm:…»; los demás cuando su iframe termina de cargar.
 * Límite: un servidor caído que responde con una página de error también «carga»; solo se detectan los que no
 * responden o, en ESP1, los que cargan pero no arrancan el reproductor.
 */
var PLAYER_LOAD_TIMEOUT = 12000, TITLE_SERVER_KEY = "tatoTitleServer", TITLE_SERVER_MAX = 200;
var titleServers = readLocalJSON(profileStorageKey(TITLE_SERVER_KEY), {});
if (!titleServers || typeof titleServers !== "object" || Array.isArray(titleServers)) titleServers = {};
var fb = { tried: {}, timer: null, manual: false, auto: false, silent: false, keepGlobal: true, current: null, fellBack: false };

function titleServerKey() { return currentMedia ? currentMedia.type + ":" + currentMedia.id : ""; }
function rememberTitleServer(name) {
  var k = titleServerKey();
  if (!k) return;
  titleServers[k] = { s: name, t: Date.now() };
  var keys = Object.keys(titleServers);
  if (keys.length > TITLE_SERVER_MAX) {
    keys.sort(function (a, b) { return titleServers[a].t - titleServers[b].t; }).slice(0, keys.length - TITLE_SERVER_MAX).forEach(function (x) { delete titleServers[x]; });
  }
  safeStorageSet(profileStorageKey(TITLE_SERVER_KEY), JSON.stringify(titleServers));
}
function persistedServerName() {
  var v = "";
  try { v = localStorage.getItem(profileStorageKey("tatoServer")) || ""; } catch (e) { }
  return SERVERS.some(function (s) { return s.name === v; }) ? v : defaultServerFor(UI_LANG);
}
/** Siguiente servidor sin probar, empezando por los del idioma del perfil. */
function nextServerIndex() {
  var en = UI_LANG === "en";
  var order = SERVERS.map(function (s, x) { return x; }).sort(function (a, b) {
    var ra = /^ENG/.test(SERVERS[a].name) === en ? 0 : 1, rb = /^ENG/.test(SERVERS[b].name) === en ? 0 : 1;
    return ra - rb || a - b;
  });
  for (var i = 0; i < order.length; i++) if (!fb.tried[order[i]]) return order[i];
  return -1;
}
function serverIsHealthy(i) {
  fb.current = i;
  if (fb.fellBack) { rememberTitleServer(SERVERS[i].name); fb.fellBack = false; }
}
function armPlayerWatchdog(i) {
  clearTimeout(fb.timer);
  var frame = activePlayerFrame;
  if (!frame) return;
  var healthy = false, host = "";
  try { host = new URL(frame.src).hostname; } catch (e) { }
  var speaks = /(^|\.)moviemaster\.lat$/.test(host);       // ESP1 avisa con mensajes «mm:…»: ahí sí se puede comprobar que funciona
  function ok() { if (!healthy) { healthy = true; clearTimeout(fb.timer); serverIsHealthy(i); } }
  // Un iframe que carga una página de error también dispara `load`: por eso, donde hay mensajes, solo ellos cuentan.
  if (!speaks) frame.addEventListener("load", ok);
  window.addEventListener("message", function onMsg(e) {
    if (activePlayerFrame !== frame) { window.removeEventListener("message", onMsg); return; }
    if (e.source !== frame.contentWindow) return;
    var d = e.data, type = typeof d === "string" ? d : (d && typeof d.type === "string" ? d.type : "");
    if (speaks ? /^mm:/.test(type) : true) { ok(); window.removeEventListener("message", onMsg); }
  });
  (function check() {
    fb.timer = setTimeout(function () {
      if (healthy || activePlayerFrame !== frame || !$modal.classList.contains("open")) return;
      if (document.hidden) { check(); return; }                                        // pestaña en segundo plano: no se juzga
      if (navigator.onLine === false) { showToast(L("Sin conexión: revisa tu internet", "Offline: check your connection")); return; }
      var next = nextServerIndex();
      if (next < 0) { showToast(L("Ningún servidor respondió. Prueba de nuevo en unos minutos.", "No server responded. Try again in a few minutes.")); return; }
      showToast(L(SERVERS[i].name + " no respondió; probando " + SERVERS[next].name + "…", SERVERS[i].name + " did not respond; trying " + SERVERS[next].name + "…"));
      fb.auto = true;
      playEmbed(next, document.getElementById("server-btn-" + next));
    }, PLAYER_LOAD_TIMEOUT);
  })();
}

decorate("setPreferredServer", function (original) {
  // Los cambios automáticos y la memoria por título no sustituyen el servidor predeterminado de los Ajustes.
  return function (name) {
    if (fb.silent || fb.keepGlobal) { preferredServer = name; if (typeof updateSettingsUI === "function") updateSettingsUI(); return; }
    return original(name);
  };
});
decorate("openPlayer", function (original) {
  return function (i, t) {
    clearTimeout(fb.timer);
    fb.tried = {}; fb.current = null; fb.fellBack = false; fb.manual = false; fb.auto = false; fb.keepGlobal = true;
    var mem = titleServers[t + ":" + i], base = persistedServerName();
    preferredServer = mem && SERVERS.some(function (s) { return s.name === mem.s; }) ? mem.s : base;
    return original.apply(this, arguments);
  };
});
decorate("playEmbed", function (original) {
  return function (i, b) {
    var manual = fb.manual, auto = fb.auto;
    fb.manual = false; fb.auto = false;
    if (manual) { fb.tried = {}; fb.fellBack = false; fb.keepGlobal = false; }                // elección explícita: se vuelve a empezar
    if (!manual && !auto && fb.current != null && fb.current !== i) { i = fb.current; b = document.getElementById("server-btn-" + i) || b; }
    fb.tried[i] = true;
    fb.silent = auto;
    fb.fellBack = auto || fb.fellBack;
    var r;
    try { r = original(i, b); } finally { fb.silent = false; }
    if (activePlayerFrame && currentMedia) activePlayerFrame.title = L("Reproductor de ", "Player for ") + currentMedia.title + " · " + SERVERS[i].name;   // nombre accesible del iframe
    if (manual) rememberTitleServer(SERVERS[i].name);
    armPlayerWatchdog(i);
    return r;
  };
});
decorate("closePlayer", function (original) {
  return function () {
    clearTimeout(fb.timer); fb.current = null; fb.keepGlobal = true;
    preferredServer = persistedServerName(); if (typeof updateSettingsUI === "function") updateSettingsUI();
    return original.apply(this, arguments);
  };
});
(function bindServerPick() {
  var sw = document.getElementById("server-switcher");
  if (sw) sw.addEventListener("click", function (e) { if (e.target.closest(".server-btn")) fb.manual = true; }, true);
})();

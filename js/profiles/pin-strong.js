/**
 * TatoCine · js/profiles/pin-strong.js
 * PIN más sólido (se añade con decorate(), sin editar profile-store.js):
 *   - Hash lento PBKDF2-SHA-256 (WebCrypto, 150 000 vueltas, sal aleatoria de 16 bytes) en lugar del hash rápido casero.
 *     Los PIN antiguos siguen valiendo y se actualizan solos la primera vez que se escribe el PIN correcto.
 *   - Bloqueo por intentos que PERSISTE (recargar la página no lo reinicia) y crece: 30 s, 2 min, 10 min, 1 h.
 *   - Comparación en tiempo constante.
 * Sigue siendo una barrera local de uso familiar: quien tenga acceso al almacenamiento del navegador puede borrar los datos
 * del sitio. Un PIN de 4 cifras no resiste un ataque offline dedicado; el hash lento solo lo encarece.
 */
var PIN_ITER = 150000, PIN_GUARD_KEY = "tatoPinGuardV1", PIN_LOCKS = [30, 120, 600, 3600];
var pinPrecomputed = null;

function pinB64(bytes) { var s = ""; bytes.forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s); }
function pinUnb64(str) { var b = atob(str), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }
function pinStrongSupported() { return !!(window.crypto && crypto.subtle && crypto.getRandomValues); }
async function pinDerive(pin, salt, iter) {
  var key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: iter }, key, 256));
}
function pinSame(a, b) { if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
async function makePinStrong(pin) {
  var salt = crypto.getRandomValues(new Uint8Array(16));
  return { v: 2, i: PIN_ITER, s: pinB64(salt), h: pinB64(await pinDerive(pin, salt, PIN_ITER)) };
}
/** Comprueba un PIN contra el guardado (nuevo o antiguo). Devuelve { ok, upgrade? }. */
async function verifyProfilePin(profile, pin) {
  var p = profile && profile.pin;
  if (!p) return { ok: true };
  if (p.v === 2) { try { return { ok: pinSame(await pinDerive(pin, pinUnb64(p.s), p.i || PIN_ITER), pinUnb64(p.h)) }; } catch (e) { return { ok: false }; } }
  var ok = hashPin(pin, p.s) === p.h;
  return { ok: ok, upgrade: ok && pinStrongSupported() };
}

/* ---- Bloqueo persistente por intentos ---- */
function pinGuardRead() { var g = readLocalJSON(PIN_GUARD_KEY, {}); return g && typeof g === "object" && !Array.isArray(g) ? g : {}; }
function pinGuardWait(id) { var e = pinGuardRead()[id]; return e && e.u > Date.now() ? e.u - Date.now() : 0; }
function pinGuardFail(id) {
  var g = pinGuardRead(), e = g[id] || { f: 0, c: 0, u: 0 };
  e.f++;
  if (e.f >= 5) { e.f = 0; e.u = Date.now() + PIN_LOCKS[Math.min(e.c, PIN_LOCKS.length - 1)] * 1000; e.c++; }
  g[id] = e;
  safeStorageSet(PIN_GUARD_KEY, JSON.stringify(g));
  return e;
}
function pinGuardClear(id) { var g = pinGuardRead(); if (g[id]) { delete g[id]; safeStorageSet(PIN_GUARD_KEY, JSON.stringify(g)); } }
function pinWaitText(ms) { var s = Math.ceil(ms / 1000); return s >= 90 ? Math.ceil(s / 60) + " min" : s + " s"; }

/* ---- PIN nuevo al crear/editar un perfil (el hash lento es asíncrono; se calcula antes y se usa en makePin) ---- */
decorate("makePin", function (legacy) {
  return function (pin) { return pinPrecomputed && pinPrecomputed.pin === pin ? pinPrecomputed.obj : legacy(pin); };
});
function withStrongPin(fn) {
  return async function () {
    var self = this, args = arguments, el = document.getElementById("tc-new-profile-pin"), raw = String(el && el.value || "").trim();
    if (pinStrongSupported() && /^\d{4}$/.test(raw)) { try { pinPrecomputed = { pin: raw, obj: await makePinStrong(raw) }; } catch (e) { pinPrecomputed = null; } }
    try { return fn.apply(self, args); } finally { pinPrecomputed = null; }
  };
}
decorate("saveProfileFromModal", function (orig) { return withStrongPin(orig); });
decorate("createLocalProfile", function (orig) { return withStrongPin(orig); });

/* ---- Verificación al entrar en un perfil protegido ---- */
decorate("submitPinModal", function () {
  return async function () {
    var input = document.getElementById("tc-pin-input"), err = document.getElementById("tc-pin-error");
    if (!pinProfile || !input) return;
    var profile = pinProfile, wait = pinGuardWait(profile.id);
    if (wait > 0) { if (err) err.textContent = "Demasiados intentos. Espera " + pinWaitText(wait) + "."; return; }
    var value = String(input.value || "").trim(), res = await verifyProfilePin(profile, value);
    if (pinProfile !== profile) return;                        // se cerró el cuadro mientras se calculaba
    if (res.ok) {
      var cb = pinCallback;
      pinGuardClear(profile.id);
      if (res.upgrade) {                                       // PIN antiguo: se guarda de nuevo con el hash lento
        try { var real = localProfiles.find(function (p) { return p.id === profile.id; }); if (real) { real.pin = await makePinStrong(value); saveLocalProfiles(); } } catch (e) { }
      }
      closePinModal();
      if (cb) cb();
      return;
    }
    input.value = "";
    var e = pinGuardFail(profile.id), left = pinGuardWait(profile.id);
    if (err) err.textContent = left > 0 ? "Demasiados intentos. Espera " + pinWaitText(left) + "." : "PIN incorrecto. Intentos restantes: " + (5 - e.f) + ".";
    input.focus();
  };
});

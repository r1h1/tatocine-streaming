/**
 * TatoCine · js/features/adult-limit.js
 * Uso responsable para perfiles de ADULTO (incluye Invitado). Valores fijos: no se editan en Ajustes ni en el perfil.
 *   · 10 h de uso → descanso obligatorio de 2 h → al terminar el descanso, otras 10 h. El contador también vuelve a cero con el día nuevo.
 *   · A 5 min del límite se avisa con una ventana. Ajustes (arriba de todo) muestra «Tu tiempo de hoy».
 * El contador es del DISPOSITIVO (compartido por los perfiles de adulto y entre pestañas del mismo origen) y suma solo con la app visible.
 * Los perfiles Niño siguen con su propio límite configurable (kids.js).
 * Ahorro de escrituras: el avance se acumula en memoria y se GUARDA cada 30 min, al ocultar/cerrar la app, al avisar y al bloquear; Ajustes lo muestra en
 * vivo desde la memoria. Cada pestaña suma su avance al valor guardado, así dos pestañas no se pisan.
 * Límite honesto: es local (localStorage). Quien borre los datos del sitio o cambie de navegador/dispositivo lo reinicia; es un recordatorio de descanso y
 * una forma de moderar el uso, no un sistema de identidad. No se envía nada a ningún servidor.
 */
var ADULT_KEY = "tatoAdultUsageV2";
var ADULT_DAY_SECS = 10 * 3600, ADULT_REST_MS = 2 * 3600000, ADULT_WARN_SECS = 5 * 60, ADULT_SAVE_MS = 30 * 60000, ADULT_TICK_MS = 5000;
var adultLockTimer = null, adultOpen = false, adultPending = 0, adultLastTick = Date.now(), adultLastSave = Date.now();

function adultToday() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function adultNum(v, max) { v = Number(v); return isFinite(v) && v >= 0 ? Math.min(v, max) : 0; }
function adultRead() {
  var s = readLocalJSON(ADULT_KEY, null) || {};
  return { day: typeof s.day === "string" ? s.day.slice(0, 12) : "", secs: adultNum(s.secs, ADULT_DAY_SECS), lockedUntil: adultNum(s.lockedUntil, 4e12), warned: s.warnedDay === true || s.warned === true };
}
function adultWrite(s) { safeStorageSet(ADULT_KEY, JSON.stringify(s)); }
function adultFmt(ms) {
  var t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
  return (h ? h + ":" : "") + (h && m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
}
function adultHM(secs) { var m = Math.floor(secs / 60), h = Math.floor(m / 60); return (h ? h + " h " : "") + (m % 60) + " min"; }
/** Guarda en el dispositivo lo acumulado en memoria (se suma al valor guardado: varias pestañas no se pisan). */
function adultFlush() {
  var st = adultRead();
  if (st.day !== adultToday()) { st = { day: adultToday(), secs: 0, lockedUntil: 0, warned: false }; adultPending = 0; }
  else { st.secs = Math.min(ADULT_DAY_SECS, st.secs + adultPending); adultPending = 0; }
  adultWrite(st); adultLastSave = Date.now();
  return st;
}
/** Texto de Ajustes («Tu tiempo de hoy»): lo usado hoy, el límite y la regla del descanso. */
function adultUsageText() {
  var st = adultRead(), used = st.day !== adultToday() ? 0 : Math.min(ADULT_DAY_SECS, st.secs + adultPending);
  if (st.lockedUntil > Date.now()) return L("En descanso: quedan " + adultFmt(st.lockedUntil - Date.now()) + " para volver a usar TatoCine.", "On break: " + adultFmt(st.lockedUntil - Date.now()) + " left before you can use TatoCine again.");
  return L(adultHM(used) + " de 10 h · descanso de 2 h al superar las 10 h de uso", adultHM(used) + " of 10 h · 2 h break after the 10 h of use");
}
function adultPaintUsage() { var el = document.getElementById("adult-usage-label"); if (el) el.textContent = adultUsageText(); }

function adultShowLock(st) {
  var el = $("tc-adult-lock"); if (!el) return;
  $("tc-adult-lock-title").textContent = L("Hora de descansar", "Time to rest");
  $("tc-adult-lock-sub").textContent = L("Llegaste a 10 horas de uso. Gracias por utilizar TatoCine. Para evitar la saturación de los servicios, en 2 horas puedes utilizarlo nuevamente.", "You reached 10 hours of use. Thank you for using TatoCine. To avoid overloading the services, you can use it again in 2 hours.");
  if (!adultOpen) {
    adultOpen = true; el.classList.add("open"); adultCloseWarn();
    try { if ($modal.classList.contains("open")) closePlayer(); } catch (e) { }
    try { if ($detailsModal.classList.contains("open")) closeDetails(true); } catch (e) { }
    try { if ($actorModal.classList.contains("open")) closeActor(); } catch (e) { }
    document.body.style.overflow = "hidden";
    clearInterval(adultLockTimer); adultLockTimer = setInterval(adultTick, 1000);
    window.setTimeout(function () { var b = el.querySelector("button"); if (b) b.focus(); }, 80);
  }
  $("tc-adult-lock-time").textContent = adultFmt(st.lockedUntil - Date.now());
}
function adultHideLock() {
  var el = $("tc-adult-lock"); if (!el || !adultOpen) return;
  adultOpen = false; el.classList.remove("open"); document.body.style.overflow = "";
  clearInterval(adultLockTimer); adultLockTimer = null;
}
/** Ventana de aviso: faltan 20 min para el descanso (o para el límite del día). */
function adultOpenWarn(secsLeft) {
  var m = Math.max(1, Math.round(secsLeft / 60));
  var t = $("tc-adult-warn-title"), p = $("tc-adult-warn-sub"); if (!t || !p) { showToast(L("Quedan " + m + " minutos antes del descanso", m + " minutes left before the break")); return; }
  t.textContent = L("Descanso en " + m + " minutos", "Break in " + m + " minutes");
  p.textContent = L("Llevas casi 10 horas de uso. Al llegar a las 10 horas TatoCine descansa 2 horas. Termina lo que estás viendo y aprovecha para estirarte, hidratarte o descansar la vista.", "You have used almost 10 hours. At 10 hours TatoCine rests for 2 hours. Finish what you are watching and take a moment to stretch, drink water or rest your eyes.");
  if (typeof openOverlay === "function") openOverlay("tc-adult-warn");
}
function adultCloseWarn() { if (typeof closeOverlay === "function") { try { closeOverlay("tc-adult-warn"); } catch (e) { } } }
registerAction("adult-warn-ok", function () { adultCloseWarn(); });

function adultTick() {
  var now = Date.now();
  if (typeof isKidProfile === "function" && isKidProfile()) { adultHideLock(); adultCloseWarn(); adultLastTick = now; return; }   // los perfiles Niño tienen su propio límite
  var st = adultRead();
  if (st.day !== adultToday() && st.lockedUntil <= now) { st = { day: adultToday(), secs: 0, lockedUntil: 0, warned: false }; adultWrite(st); adultPending = 0; adultLastTick = now; adultLastSave = now; adultCloseWarn(); adultPaintUsage(); }   // día nuevo: contador a cero
  // Descanso en curso (se muestra en todas las pestañas y perfiles de adulto del dispositivo)
  if (st.lockedUntil > now) {
    if (st.lockedUntil > now + ADULT_REST_MS) { st.lockedUntil = now + ADULT_REST_MS; adultWrite(st); }           // un reloj adelantado no puede dejar un bloqueo eterno
    adultPending = 0; adultLastTick = now; adultShowLock(st); return;
  }
  if (st.lockedUntil) {                                                                                         // el descanso terminó: otras 10 h
    st = { day: adultToday(), secs: 0, lockedUntil: 0, warned: false }; adultWrite(st); adultPending = 0; adultLastTick = now; adultLastSave = now;
    adultHideLock(); adultPaintUsage(); showToast(L("Descanso terminado: ya puedes volver a usar TatoCine", "Break over: you can use TatoCine again"));
  }
  adultHideLock();
  if (document.hidden) { adultLastTick = now; return; }                                                         // en segundo plano no se cuenta
  adultPending += Math.min(15, Math.max(0, (now - adultLastTick) / 1000)); adultLastTick = now;
  var left = ADULT_DAY_SECS - (st.secs + adultPending);
  if (left <= 0) { st.secs = ADULT_DAY_SECS; st.lockedUntil = now + ADULT_REST_MS; adultPending = 0; adultWrite(st); adultShowLock(st); return; }
  if (!st.warned && left <= ADULT_WARN_SECS) { st = adultFlush(); st.warned = true; adultWrite(st); adultOpenWarn(left); return; }
  if (now - adultLastSave >= ADULT_SAVE_MS) adultFlush();                                                       // guardado cada 30 min
}
setInterval(adultTick, ADULT_TICK_MS);
setInterval(function () { var m = document.getElementById("settings-modal"); if (m && m.classList.contains("open")) adultPaintUsage(); }, 60000);   // «Tu tiempo de hoy» se actualiza en vivo (desde memoria) mientras Ajustes está abierto
document.addEventListener("visibilitychange", function () { if (document.hidden) adultFlush(); else { adultLastTick = Date.now(); adultTick(); } });
window.addEventListener("pagehide", function () { adultFlush(); });                                             // al cerrar: se guarda lo que falte
window.addEventListener("storage", function (e) {                                                               // otra pestaña activó el descanso: solo se muestra (no se escribe: evita ciclos entre pestañas)
  if (e.key !== ADULT_KEY || (typeof isKidProfile === "function" && isKidProfile())) return;
  var st = adultRead(); if (st.lockedUntil > Date.now()) adultShowLock(st);
});
decorate("showSettings", function (original) { return function () { var r = original.apply(this, arguments); adultPaintUsage(); return r; }; });
adultTick();

// Pruebas y diagnóstico: window.tcAdultLimit.state() / .usage() / .force() (a 1 s del descanso) / .forceWarn() (a 20 min)
window.tcAdultLimit = {
  state: adultRead, usage: function () { var s = adultRead(); return { secs: s.secs + adultPending, limit: ADULT_DAY_SECS }; },
  force: function () { var s = adultRead(); s.secs = ADULT_DAY_SECS - 1; s.day = adultToday(); s.warned = true; adultWrite(s); adultPending = 0; adultLastTick = Date.now(); adultTick(); },
  forceWarn: function () { var s = adultRead(); s.secs = ADULT_DAY_SECS - ADULT_WARN_SECS + 5; s.day = adultToday(); s.warned = false; adultWrite(s); adultPending = 0; adultLastTick = Date.now(); adultTick(); }
};

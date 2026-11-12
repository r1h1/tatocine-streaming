/**
 * TatoCine · js/features/adult-limit.js
 * Uso responsable para perfiles de ADULTO (incluye Invitado). Valores fijos: no se editan en Ajustes ni en el perfil.
 *   · Por día: 12 h de uso activo → descanso obligatorio de 2 h.
 *   · Seguido: 10 h de uso sin pausas largas → descanso obligatorio de 3 h. Una pausa de 30 min o más reinicia «seguido».
 * El contador es del DISPOSITIVO (compartido por los perfiles de adulto y entre pestañas del mismo origen) y solo suma con la
 * app visible. Los perfiles Niño siguen con su propio límite configurable (kids.js).
 * Límite honesto: es local (localStorage). Quien borre los datos del sitio o cambie de navegador/dispositivo lo reinicia; es un
 * recordatorio de descanso y una forma de moderar el uso, no un sistema de identidad. No se envía nada a ningún servidor.
 */
var ADULT_KEY = "tatoAdultUsageV1";
var ADULT_DAY_SECS = 12 * 3600, ADULT_DAY_REST_MS = 2 * 3600000;
var ADULT_RUN_SECS = 10 * 3600, ADULT_RUN_REST_MS = 3 * 3600000;
var ADULT_GAP_RESET_MS = 30 * 60000, ADULT_WARN_SECS = 900, ADULT_TICK_MS = 5000;
var adultLockTimer = null, adultOpen = false;

function adultToday() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function adultNum(v, max) { v = Number(v); return isFinite(v) && v >= 0 ? Math.min(v, max) : 0; }
function adultRead() {
  var s = readLocalJSON(ADULT_KEY, null) || {};
  return {
    day: typeof s.day === "string" ? s.day.slice(0, 12) : "",
    daySecs: adultNum(s.daySecs, ADULT_DAY_SECS), runSecs: adultNum(s.runSecs, ADULT_RUN_SECS),
    last: adultNum(s.last, 4e12), lockedUntil: adultNum(s.lockedUntil, 4e12), kind: s.kind === "run" ? "run" : "day", warned: s.warned === true
  };
}
function adultWrite(s) { safeStorageSet(ADULT_KEY, JSON.stringify(s)); }
function adultFmt(ms) {
  var t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
  return (h ? h + ":" : "") + (h && m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
}

function adultShowLock(st) {
  var el = $("tc-adult-lock"); if (!el) return;
  var run = st.kind === "run", rest = run ? "3" : "2";
  $("tc-adult-lock-title").textContent = L("Hora de descansar", "Time to rest");
  $("tc-adult-lock-sub").textContent = (run ? L("Llevas 10 horas seguidas. ", "You have been watching for 10 hours in a row. ") : L("Llegaste a 12 horas de uso hoy. ", "You reached 12 hours of use today. ")) +
    L("Gracias por utilizar TatoCine. Para evitar la saturación de los servicios, en " + rest + " horas puedes utilizarlo nuevamente.", "Thank you for using TatoCine. To avoid overloading the services, you can use it again in " + rest + " hours.");
  if (!adultOpen) {
    adultOpen = true; el.classList.add("open");
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

function adultTick() {
  if (typeof isKidProfile === "function" && isKidProfile()) { adultHideLock(); return; }       // los perfiles Niño tienen su propio límite
  var now = Date.now(), st = adultRead();
  // Descanso en curso (se muestra en todas las pestañas y perfiles de adulto del dispositivo)
  if (st.lockedUntil > now) {
    var cap = now + (st.kind === "run" ? ADULT_RUN_REST_MS : ADULT_DAY_REST_MS);
    if (st.lockedUntil > cap) { st.lockedUntil = cap; adultWrite(st); }          // un reloj adelantado no puede dejar un bloqueo eterno
    adultShowLock(st); return;
  }
  if (st.lockedUntil) {                                                          // el descanso terminó: empieza un ciclo nuevo
    if (st.kind === "run") st.runSecs = 0; else { st.daySecs = 0; st.runSecs = 0; }
    st.lockedUntil = 0; st.warned = false; st.last = now; adultWrite(st);
    adultHideLock(); showToast(L("Descanso terminado: ya puedes volver a usar TatoCine", "Break over: you can use TatoCine again"));
  }
  adultHideLock();
  if (st.day !== adultToday()) { st.day = adultToday(); st.daySecs = 0; st.warned = false; }
  var gap = now - st.last;
  if (st.last && gap > ADULT_GAP_RESET_MS) st.runSecs = 0;                       // pausa larga: ya no es uso seguido
  if (document.hidden) return;                                                   // en segundo plano no se cuenta (ni se avanza st.last) ni se escribe
  var add = st.last ? Math.min(15, Math.max(0, gap / 1000)) : 0;
  st.last = now; st.daySecs += add; st.runSecs += add;
  if (st.daySecs >= ADULT_DAY_SECS) { st.kind = "day"; st.lockedUntil = now + ADULT_DAY_REST_MS; adultWrite(st); adultShowLock(st); return; }
  if (st.runSecs >= ADULT_RUN_SECS) { st.kind = "run"; st.lockedUntil = now + ADULT_RUN_REST_MS; adultWrite(st); adultShowLock(st); return; }
  var left = Math.min(ADULT_DAY_SECS - st.daySecs, ADULT_RUN_SECS - st.runSecs);
  if (!st.warned && left <= ADULT_WARN_SECS) { st.warned = true; showToast(L("Quedan 15 minutos de uso antes del descanso", "15 minutes of use left before the break")); }
  adultWrite(st);
}
setInterval(adultTick, ADULT_TICK_MS);
document.addEventListener("visibilitychange", function () { if (!document.hidden) adultTick(); });
window.addEventListener("storage", function (e) {                                  // otra pestaña activó el descanso: solo se muestra (no se escribe: evita ciclos entre pestañas)
  if (e.key !== ADULT_KEY || (typeof isKidProfile === "function" && isKidProfile())) return;
  var st = adultRead(); if (st.lockedUntil > Date.now()) adultShowLock(st);
});
adultTick();

// Pruebas y diagnóstico: window.tcAdultLimit.state() / .force("day"|"run")
window.tcAdultLimit = {
  state: adultRead,
  force: function (kind) { var s = adultRead(); if (kind === "run") s.runSecs = ADULT_RUN_SECS - 1; else s.daySecs = ADULT_DAY_SECS - 1; s.last = Date.now(); s.day = adultToday(); adultWrite(s); adultTick(); }
};

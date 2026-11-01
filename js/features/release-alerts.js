/**
 * TatoCine · js/features/release-alerts.js
 * Avisos de estreno con notificaciones del navegador (opcionales, solo perfiles de adulto).
 * Honestidad técnica: sin servidor no hay avisos en segundo plano. La comprobación ocurre cuando abres TatoCine:
 * si algo de «Mi calendario» se estrena hoy o mañana, se avisa una sola vez por título y día (`tatoNotifiedV1`).
 * Si el navegador no concede permiso, el aviso se muestra dentro de la app.
 */
var ALERTS_KEY = "tatoReleaseAlerts", NOTIFIED_KEY = "tatoNotifiedV1";
function alertsEnabled() { try { return localStorage.getItem(profileStorageKey(ALERTS_KEY)) === "1"; } catch (e) { return false; } }
function alertsSupported() { return "Notification" in window; }
function updateAlertsRow() {
  var b = $("alerts-btn"), s = $("alerts-sub");
  if (!b) return;
  var on = alertsEnabled();
  b.textContent = on ? L("Desactivar", "Turn off") : L("Activar", "Turn on");
  b.setAttribute("aria-pressed", String(on));
  if (s) s.textContent = !alertsSupported() ? L("Este navegador no permite notificaciones; se avisará dentro de la app.", "This browser doesn't allow notifications; you'll be told inside the app.") : (on ? L("Activados: se comprueba cuando abres TatoCine.", "On: checked whenever you open TatoCine.") : L("Te avisa de estrenos de hoy y mañana al abrir la app.", "Tells you about releases today and tomorrow when you open the app."));
}
async function toggleReleaseAlerts() {
  if (isKidProfile() || isGuestProfile()) return;
  if (alertsEnabled()) { safeStorageSet(profileStorageKey(ALERTS_KEY), "0"); updateAlertsRow(); showToast(L("Avisos de estreno desactivados", "Release alerts off")); return; }
  var perm = alertsSupported() ? Notification.permission : "denied";
  if (perm === "default") { try { perm = await Notification.requestPermission(); } catch (e) { perm = "denied"; } }
  safeStorageSet(profileStorageKey(ALERTS_KEY), "1");
  updateAlertsRow();
  showToast(perm === "granted" ? L("Avisos de estreno activados", "Release alerts on") : L("Activados dentro de la app (sin notificaciones del navegador)", "On inside the app (no browser notifications)"));
  checkReleaseAlerts(true);
}
async function notifyRelease(it, when) {
  var title = it.title, body = (it.type === "tv" ? L("Nuevo episodio " + it.label, "New episode " + it.label) : L("Estreno de película", "Movie release")) + " · " + when;
  var url = "./?id=" + it.id + "&type=" + it.type;
  if (alertsSupported() && Notification.permission === "granted") {
    try {
      var reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) { await reg.showNotification(title, { body: body, tag: "tc-" + it.type + it.id + it.date, icon: "icons/icon-192.png", data: { url: url } }); return; }
      new Notification(title, { body: body, tag: "tc-" + it.type + it.id + it.date, icon: "icons/icon-192.png" });
      return;
    } catch (e) { }
  }
  showToastAction(title + " · " + body, L("Ver", "View"), function () { openDetails(it.id, it.type); }, 9000);
}
async function checkReleaseAlerts(force) {
  if (!alertsEnabled() || isKidProfile() || isGuestProfile()) return;
  var items = await calendarCollect(!!force), today = calToday(), tomorrow = usageDayKey(new Date(Date.now() + 86400000));
  var done = readLocalJSON(profileStorageKey(NOTIFIED_KEY), {});
  if (!done || typeof done !== "object" || Array.isArray(done)) done = {};
  Object.keys(done).forEach(function (k) { if (done[k] < today) delete done[k]; });
  var fresh = items.filter(function (it) { return (it.date === today || it.date === tomorrow) && !done[it.type + it.id + it.date]; }).slice(0, 3);
  for (var i = 0; i < fresh.length; i++) { done[fresh[i].type + fresh[i].id + fresh[i].date] = fresh[i].date; await notifyRelease(fresh[i], calDayLabel(fresh[i].date)); }
  safeStorageSet(profileStorageKey(NOTIFIED_KEY), JSON.stringify(done));
}
registerAction("alerts-toggle", toggleReleaseAlerts);
decorate("showSettings", function (original) { return function () { var r = original.apply(this, arguments); updateAlertsRow(); return r; }; });
(function bootAlerts() {
  var tries = 0;
  (function wait() {
    if (document.body.classList.contains("app-ready") && !document.getElementById("tc-profile-overlay").classList.contains("open")) { setTimeout(function () { checkReleaseAlerts(false).catch(function () { }); }, 2500); return; }
    if (tries++ < 60) setTimeout(wait, 1000);
  })();
  if (typeof i18nAdd === "function") i18nAdd({ "Avisos de estreno": "Release alerts", "Activar": "Turn on", "Desactivar": "Turn off" });
})();

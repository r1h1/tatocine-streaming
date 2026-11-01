/**
 * TatoCine · js/features/streak.js
 * Racha: días seguidos en los que el perfil reprodujo algo. Se muestra junto al perfil con un icono de fuego.
 * Es solo un contador local y discreto (sin avisos ni presión). No existe en perfiles Niño.
 * Datos por perfil: tatoStreak = { last: "YYYY-M-D", count, best }.
 */
var STREAK_KEY = "tatoStreak";
var streakData = readLocalJSON(profileStorageKey(STREAK_KEY), null);
if (!streakData || typeof streakData !== "object") streakData = { last: "", count: 0, best: 0 };

function streakDayKey(date) { return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(); }
/** Días seguidos vigentes: si el último día con actividad no es hoy ni ayer, la racha se perdió. */
function currentStreak() {
  if (!streakData.last) return 0;
  var today = streakDayKey(new Date()), yesterday = streakDayKey(new Date(Date.now() - 86400000));
  return streakData.last === today || streakData.last === yesterday ? streakData.count : 0;
}
function registerStreakDay() {
  if (isKidProfile()) return;
  var today = streakDayKey(new Date());
  if (streakData.last === today) return;
  var yesterday = streakDayKey(new Date(Date.now() - 86400000));
  streakData.count = streakData.last === yesterday ? (streakData.count || 0) + 1 : 1;
  streakData.last = today;
  streakData.best = Math.max(streakData.best || 0, streakData.count);
  safeStorageSet(profileStorageKey(STREAK_KEY), JSON.stringify(streakData));
  renderStreak();
}
function renderStreak() {
  var pill = $("streak-pill");
  if (!pill) return;
  var n = isKidProfile() ? 0 : currentStreak();
  pill.hidden = n < 1;
  if (n < 1) return;
  $("streak-count").textContent = String(n);
  var label = n === 1 ? L("Racha: 1 día seguido viendo algo", "Streak: 1 day in a row watching something") : L("Racha: " + n + " días seguidos viendo algo", "Streak: " + n + " days in a row watching something");
  pill.title = label;
  pill.setAttribute("aria-label", label);
}
decorate("recordMediaStart", function (original) {
  return function (media, genreIds) { registerStreakDay(); return original(media, genreIds); };
});
renderStreak();

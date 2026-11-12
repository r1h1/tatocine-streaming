/**
 * TatoCine · js/features/calendar.js
 * «Mi calendario»: próximos estrenos y episodios de lo que sigues (continuar viendo, favoritos, finalizadas y Ver más tarde).
 * Sin servidor: se consulta TMDB (máx. 30 títulos, 6 a la vez) y el resultado se guarda 6 h en el dispositivo (`tatoCalCacheV1`).
 * Series → `next_episode_to_air`; películas → fecha de estreno futura. Solo para perfiles de adulto.
 */
var CAL_KEY = "tatoCalCacheV1", CAL_TTL = 6 * 3600 * 1000, CAL_MAX = 30, calRun = 0;
function calTargets() {
  var seen = {}, out = [];
  function add(x) { if (x && x.id && (x.type === "tv" || x.type === "movie") && !seen[x.type + ":" + x.id]) { seen[x.type + ":" + x.id] = 1; out.push({ id: x.id, type: x.type, title: x.title, bg: x.bg || "" }); } }
  followedSeries().forEach(add);
  laterList.forEach(add);
  myList.forEach(add);
  return out.slice(0, CAL_MAX);
}
function calToday() { return usageDayKey(new Date()); }
async function calendarCollect(force) {
  var cache = readLocalJSON(profileStorageKey(CAL_KEY), null);
  if (!force && cache && Array.isArray(cache.items) && Date.now() - cache.ts < CAL_TTL) return cache.items;
  var targets = calTargets(), items = [], next = 0, today = calToday();
  async function worker() {
    while (next < targets.length) {
      var t = targets[next++];
      try {
        var d = await fetchTMDB("/" + t.type + "/" + t.id);
        if (!d) continue;
        var bg = bkBg(d.backdrop_path || d.poster_path || t.bg || ""), title = bkText(d.name || d.title || t.title, 120);
        if (t.type === "tv" && d.next_episode_to_air && /^\d{4}-\d{2}-\d{2}$/.test(d.next_episode_to_air.air_date || "") && d.next_episode_to_air.air_date >= today) {
          var e = d.next_episode_to_air;
          items.push({ type: "tv", id: t.id, title: title, bg: bg, date: e.air_date, label: "T" + (e.season_number | 0) + " · E" + (e.episode_number | 0) });
        } else if (t.type === "movie" && /^\d{4}-\d{2}-\d{2}$/.test(d.release_date || "") && d.release_date >= today) {
          items.push({ type: "movie", id: t.id, title: title, bg: bg, date: d.release_date, label: "" });
        }
      } catch (e) { }
    }
  }
  await Promise.all([worker(), worker(), worker()]);                                  // 3 a la vez (antes 6): menos picos hacia TMDB
  items.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  safeStorageSet(profileStorageKey(CAL_KEY), JSON.stringify({ ts: Date.now(), items: items }));
  return items;
}
function calDayLabel(date) {
  var a = new Date(date + "T00:00:00"), b = new Date(calToday() + "T00:00:00"), n = Math.round((a - b) / 86400000);
  if (n === 0) return L("Hoy", "Today");
  if (n === 1) return L("Mañana", "Tomorrow");
  if (n < 7) return L("En " + n + " días", "In " + n + " days");
  return a.toLocaleDateString(UI_LANG === "en" ? "en" : "es", { weekday: "short", day: "numeric", month: "short" });
}
function calSkeleton() {
  var h = '<div class="cal-skel cal-grid" aria-hidden="true">';
  for (var i = 0; i < 6; i++) h += '<div class="cal-item"><span class="skel cal-thumb"></span><span class="cal-info"><span class="skel skel-line"></span><span class="skel skel-line short"></span></span></div>';
  return h + "</div>";
}
async function openCalendar() {
  if (isKidProfile() || isGuestProfile()) { showToast(L("El calendario no está disponible en este perfil", "The calendar is not available on this profile")); return; }
  var run = ++calRun;
  qrOpen(L("Mi calendario", "My calendar"), true);
  qrBody().innerHTML = '<p class="tc-qr-note">' + L("Próximos estrenos y episodios de lo que sigues.", "Upcoming releases and episodes of what you follow.") + "</p>" + calSkeleton();
  var items = await calendarCollect(false);
  if (run !== calRun || !$("tc-qr-overlay").classList.contains("open")) return;
  if (!items.length) { qrBody().innerHTML = emptyStateHTML("calendar", L("Sin estrenos próximos", "No upcoming releases"), L("Guarda series o películas por estrenar en Favoritos o Ver más tarde y aparecerán aquí.", "Save upcoming series or movies to Favorites or Watch later and they'll show up here."), "", ""); return; }
  var html = '<p class="tc-qr-note">' + L("Próximos estrenos y episodios de lo que sigues.", "Upcoming releases and episodes of what you follow.") + '</p><div class="cal-grid">';
  items.forEach(function (it) {
    html += '<button type="button" class="cal-item" data-act="cal-open" data-type="' + it.type + '" data-id="' + it.id + '">' +
      (it.bg ? '<img class="cal-thumb" alt="" loading="lazy" src="' + IMG_W185 + it.bg + '">' : '<span class="cal-thumb skel"></span>') +
      '<span class="cal-info"><span class="cal-date">' + escapeHTML(calDayLabel(it.date)) + '</span><span class="cal-title" data-i18n="skip">' + escapeHTML(it.title) + '</span><span class="cal-sub">' + (it.type === "tv" ? L("Episodio nuevo", "New episode") + " · " + escapeHTML(it.label) : L("Estreno de película", "Movie release")) + "</span></span></button>";
  });
  qrBody().innerHTML = html + "</div>";
}
registerAction("open-calendar", openCalendar);
registerAction("cal-open", function (el) { var id = Number(el.getAttribute("data-id")), type = el.getAttribute("data-type") === "tv" ? "tv" : "movie"; closeQr(); openDetails(id, type); });
registerCommand({ id: "calendar", es: "Mi calendario de estrenos", en: "My release calendar", keys: "calendario estrenos episodios proximos", adult: true, run: openCalendar });
if (typeof i18nAdd === "function") i18nAdd({ "Mi calendario": "My calendar", "Hoy": "Today", "Mañana": "Tomorrow" });

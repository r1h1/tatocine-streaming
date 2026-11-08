/**
 * TatoCine · js/features/marathon.js
 * «Maratón de películas» (Mi cine): una cadena infinita de películas parecidas a tus gustos, recientes y que aún no viste.
 * Al terminar una (o con «Siguiente película») empieza la siguiente; la cola se rellena sola. Se detiene al cerrar el reproductor.
 * Solo adultos (los perfiles Niño no la tienen). Todo ocurre en el dispositivo; solo se consulta el catálogo de TMDB.
 */
var marathon = { on: false, queue: [], seen: {}, page: 0, loading: null, count: 0, advancing: false };
function marathonAvoid() {
  var avoid = {};
  (localAnalytics.items || []).forEach(function (x) { if ((x.secs || 0) >= 900 || (x.done || 0) > 0) avoid[x.type + ":" + x.id] = true; });
  (typeof watchedList === "function" ? watchedList() : []).forEach(function (x) { avoid[x.type + ":" + x.id] = true; });
  return avoid;
}
/** Trae más películas: rota entre tus géneros favoritos (y alguno de fuera) y mezcla recomendaciones de lo último que viste. */
function marathonFill() {
  if (marathon.loading) return marathon.loading;
  var profile = getTasteProfile(), tops = profile.slice(0, 5).map(function (p) { return p.id; });
  var g = tops.length ? tops[marathon.page % tops.length] : 0, wild = marathon.page % 4 === 3;
  var page = 1 + Math.floor(marathon.page / Math.max(1, tops.length || 1)), since = new Date(Date.now() - 6 * 365 * 86400000).toISOString().slice(0, 10);
  var jobs = [fetchTMDB("/discover/movie", (g && !wild ? "&with_genres=" + g : "") + "&primary_release_date.gte=" + since + "&sort_by=popularity.desc&vote_count.gte=200&include_adult=false&page=" + page),
    fetchTMDB("/discover/movie", (g && !wild ? "&with_genres=" + g : "") + "&sort_by=vote_average.desc&vote_count.gte=1500&include_adult=false&page=" + page)];
  var last = engagedTitles().filter(function (x) { return x.type === "movie"; }).sort(function (a, b) { return (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0); })[marathon.page % 3];
  if (last) jobs.push(fetchTMDB("/movie/" + last.id + "/recommendations"));
  marathon.page++;
  marathon.loading = Promise.all(jobs.map(function (j) { return j.catch(function () { return null; }); })).then(function (r) {
    var avoid = marathonAvoid(), added = [];
    r.forEach(function (res) { ((res && res.results) || []).forEach(function (raw) {
      var m = mapMovieResult(raw), k = "movie:" + m.id;
      if (!m.bg || m.isUpcoming || raw.adult || avoid[k] || marathon.seen[k]) return;
      marathon.seen[k] = true; added.push(m);
    }); });
    marathon.queue = marathon.queue.concat(shuffleInPlace(added));
    return marathon.queue.length;
  }).finally(function () { marathon.loading = null; });
  return marathon.loading;
}
function marathonButton(on) {
  var b = document.getElementById("marathon-next");
  if (!on) { if (b) b.remove(); return; }
  if (b) return;
  b = document.createElement("button");
  b.type = "button"; b.id = "marathon-next"; b.className = "marathon-next"; b.setAttribute("data-act", "marathon-next");
  b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4l10 8-10 8V4zM19 5v14"/></svg><span>' + L("Siguiente película", "Next movie") + "</span>";
  var host = document.getElementById("player-modal") || document.body;
  host.appendChild(b);
}
async function marathonNext() {
  if (!marathon.on || marathon.advancing) return;
  marathon.advancing = true;
  try {
    if (marathon.queue.length < 3) await marathonFill();
    if (!marathon.queue.length) { await marathonFill(); }
    var m = marathon.queue.shift();
    if (!m) { showToast(L("No encontré más películas nuevas ahora. Inténtalo en un rato.", "I couldn't find more new movies right now. Try again later.")); marathon.on = false; marathonButton(false); return; }
    marathon.count++;
    showToast(L("Maratón · película " + marathon.count + ": ", "Marathon · movie " + marathon.count + ": ") + m.title);
    marathonButton(true);
    openPlayer(m.id, "movie", m.title, null, null, m.bg);
    if (marathon.queue.length < 4) marathonFill();
  } finally { marathon.advancing = false; }
}
function startMarathon() {
  if (isKidProfile() || isGuestProfile()) { showToast(L("No disponible en este perfil", "Not available on this profile")); return; }
  marathon = { on: true, queue: [], seen: {}, page: 0, loading: null, count: 0, advancing: false };
  showToast(L("Maratón de películas: empieza la primera…", "Movie marathon: starting the first one…"));
  marathonNext();
}
registerAction("start-marathon", startMarathon);
registerAction("marathon-next", function () { if (marathon.on) { var b = document.getElementById("marathon-next"); marathon.advancing = false; marathonNext(); if (b) b.blur(); } });
// Al terminar una película, en maratón empieza la siguiente de la cola (si no, sigue la lógica de «similares» de siempre).
decorate("playNextSimilar", function (original) { return function () { if (marathon.on) { if (!playerEndedHandled) { playerEndedHandled = true; marathonNext(); } return; } return original.apply(this, arguments); }; });
// El maratón termina cuando cierras el reproductor tú.
decorate("closePlayer", function (original) { return function () { if (marathon.on && !marathon.advancing) { marathon.on = false; marathonButton(false); } return original.apply(this, arguments); }; });
registerCommand({ id: "marathon", es: "Maratón de películas", en: "Movie marathon", keys: "maraton peliculas infinito seguidas", adult: true, run: startMarathon });
if (typeof i18nAdd === "function") i18nAdd({ "Maratón de películas": "Movie marathon" });

/**
 * TatoCine · js/features/new-episodes.js
 * Avisos de «Nuevo episodio» para las series que sigues (continuar viendo, favoritas y finalizadas).
 * Sin servidor: la comprobación ocurre al abrir el Inicio (una vez cada 6 horas) y guarda, por serie,
 * el último episodio emitido que ya conocíamos. Si aparece uno más reciente se avisa y se muestra la
 * fila «Nuevos episodios» durante 14 días (o hasta que reproduzcas la serie).
 */
var NEWEP_KEY = "tatoSeriesSeen", NEWEP_META_KEY = "tatoSeriesCheck";
var NEWEP_INTERVAL = 6 * 3600 * 1000, NEWEP_TTL = 14 * 86400000, NEWEP_MAX = 10;
var seriesSeen = readLocalJSON(profileStorageKey(NEWEP_KEY), {});
if (!seriesSeen || typeof seriesSeen !== "object" || Array.isArray(seriesSeen)) seriesSeen = {};
var newEpChecked = false;

function saveSeriesSeen() { return safeStorageSet(profileStorageKey(NEWEP_KEY), JSON.stringify(seriesSeen)); }

/** Series que sigue el perfil (sin repetir), las más recientes primero. */
function followedSeries() {
  var out = {}, list = [];
  function add(x, bg) {
    if (!x || x.type !== "tv" || out[x.id]) return;
    out[x.id] = { id: x.id, title: x.title, bg: x.bg || bg || "" };
    list.push(out[x.id]);
  }
  continueWatching.forEach(function (m) { add(m); });
  myList.forEach(function (m) { add(m); });
  completedTitles().forEach(function (m) { add(m); });
  return list.slice(0, NEWEP_MAX);
}

function checkNewEpisodes() {
  if (isKidProfile() || newEpChecked) return;
  newEpChecked = true;
  var last = Number(readLocalJSON(profileStorageKey(NEWEP_META_KEY), 0)) || 0;
  if (Date.now() - last < NEWEP_INTERVAL) return;
  var queue = followedSeries(), found = [];
  (function next() {
    var s = queue.shift();
    if (!s) {
      safeStorageSet(profileStorageKey(NEWEP_META_KEY), JSON.stringify(Date.now()));
      saveSeriesSeen();
      if (found.length) {
        showToast(found.length === 1 ? L("Nuevo episodio de ", "New episode of ") + found[0] : L(found.length + " series tienen episodios nuevos", found.length + " series have new episodes"));
        if (currentView === "home") renderNewEpisodesRow(true);
      }
      return;
    }
    fetchTMDB("/tv/" + s.id).then(function (d) {
      var ep = d && d.last_episode_to_air;
      if (!ep) return;
      var key = ep.season_number * 1000 + ep.episode_number, prev = seriesSeen[s.id];
      var entry = prev || { k: key };
      if (prev && key > prev.k) {
        entry.alert = Date.now();
        entry.label = "T" + ep.season_number + " · E" + ep.episode_number;
        found.push(s.title);
      }
      entry.k = Math.max(key, entry.k || 0);
      entry.title = s.title;
      entry.bg = (d.backdrop_path || d.poster_path || s.bg || "");
      entry.rating = d.vote_average || 0;
      entry.year = (d.first_air_date || "").slice(0, 4);
      seriesSeen[s.id] = entry;
    }).catch(function () { }).then(next);
  })();
}

function activeNewEpisodes() {
  var now = Date.now();
  return Object.keys(seriesSeen).map(function (id) { var e = seriesSeen[id]; return { id: Number(id), type: "tv", title: e.title, bg: e.bg, rating: e.rating, year: e.year, alert: e.alert, label: e.label }; })
    .filter(function (e) { return e.alert && now - e.alert < NEWEP_TTL; })
    .sort(function (a, b) { return b.alert - a.alert; });
}

function acknowledgeNewEpisode(id) {
  var e = seriesSeen[id];
  if (e && e.alert) { delete e.alert; saveSeriesSeen(); }
}

/** Pinta la fila (debajo de «Continuar viendo»); `replace` la sustituye si ya existe. */
function renderNewEpisodesRow(replace) {
  var old = $rowsContainer.querySelector(".new-ep-row");
  if (old && !replace) return;
  if (old) old.parentNode.removeChild(old);
  var items = activeNewEpisodes();
  if (!items.length || isKidProfile()) return;
  var row = document.createElement("div");
  row.className = "row new-ep-row";
  row.innerHTML = '<div class="row-header"><h2 class="row-title">' + L("Nuevos episodios", "New episodes") + '</h2></div>' +
    '<button class="row-nav prev" data-act="row-scroll" data-dir="-1" aria-label="Anterior">‹</button><button class="row-nav next" data-act="row-scroll" data-dir="1" aria-label="Siguiente">›</button>' +
    '<div class="row-scroll">' + items.map(function (m) { return getCardHTML(m).replace('<div class="card ', '<div class="card has-new-ep '); }).join("") + "</div>";
  var cont = $rowsContainer.querySelector(".continue-row");
  if (cont) cont.parentNode.insertBefore(row, cont.nextSibling);
  else $rowsContainer.insertBefore(row, $rowsContainer.firstChild);
}

// Integración: tras pintar «Continuar viendo» se muestra la fila y se programa la comprobación; al reproducir una serie se da por vista la alerta.
decorate("renderContinueRow", function (original) {
  return function () { original(); renderNewEpisodesRow(); IDLE(checkNewEpisodes); };
});
decorate("recordMediaStart", function (original) {
  return function (media, genreIds) { if (media && media.type === "tv") acknowledgeNewEpisode(media.id); return original(media, genreIds); };
});
if (typeof i18nAdd === "function") i18nAdd({ "Nuevos episodios": "New episodes" });

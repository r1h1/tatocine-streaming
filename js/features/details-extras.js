/**
 * TatoCine · js/features/details-extras.js
 * Extras de la ficha del título (se invoca desde ui/details.js tras pintar el detalle):
 *   - Director (películas) o creadores (series), con enlace a sus obras.
 *   - Temporadas y episodios con imagen, duración y sinopsis; al tocar un episodio se reproduce.
 *   - Botones «Marcar como vista» y me gusta/no me gusta (ver watched.js).
 */
var detailsGenres = [];
var episodesRequest = 0;

function renderDetailsExtras(data, type, id, title) {
  detailsGenres = (data.genres || []).map(function (g) { return g.id; });
  renderCreditsLine(data, type);
  renderEpisodes(data, type, id, title);
  if (typeof renderUserActions === "function") renderUserActions();
}

function renderCreditsLine(data, type) {
  var el = $("details-credits");
  if (!el) return;
  var people, label;
  if (type === "movie") {
    people = ((data.credits && data.credits.crew) || []).filter(function (c) { return c.job === "Director"; }).slice(0, 2);
    label = L("Dirigida por", "Directed by");
  } else {
    people = (data.created_by || []).slice(0, 3);
    label = L("Creada por", "Created by");
  }
  el.hidden = !people.length;
  el.innerHTML = people.length ? "<span>" + label + "</span> " + people.map(function (p) {
    return '<button type="button" class="credit-link" data-person="' + p.id + '" data-name="' + escapeHTML(p.name) + '" data-i18n="skip">' + escapeHTML(p.name) + "</button>";
  }).join(", ") : "";
}

function renderEpisodes(data, type, id, title) {
  var box = $("details-episodes");
  if (!box) return;
  var seasons = (data.seasons || []).filter(function (s) { return s.season_number > 0 && s.episode_count > 0; });
  if (type !== "tv" || !seasons.length) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.dataset.id = String(id);
  box.dataset.title = title;
  box.dataset.bg = data.backdrop_path || data.poster_path || "";
  box.innerHTML = '<div class="details-cast-title">' + L("Temporadas y episodios", "Seasons and episodes") + "</div>" +
    '<div class="ep-seasons" role="tablist" aria-label="' + L("Temporadas", "Seasons") + '">' + seasons.map(function (s) {
      return '<button type="button" class="ep-season-chip" role="tab" data-season="' + s.season_number + '">' + L("Temporada ", "Season ") + s.season_number + "</button>";
    }).join("") + '</div><div class="ep-list" id="ep-list" aria-live="polite"></div>';
  loadSeasonEpisodes(id, seasons[0].season_number);
}

function episodeCardHTML(ep, season, isLastAired) {
  var today = new Date().toISOString().slice(0, 10);
  var upcoming = !ep.air_date || ep.air_date > today;
  var img = ep.still_path ? IMG_W185 + ep.still_path : "";
  var meta = [ep.runtime ? ep.runtime + " min" : "", ep.air_date || ""].filter(Boolean).join(" · ");
  return '<div class="ep-item' + (upcoming ? " ep-upcoming" : "") + '" tabindex="0" role="button" data-season="' + season + '" data-ep="' + ep.episode_number + '"' + (upcoming ? ' aria-disabled="true"' : "") + ">" +
    '<div class="ep-thumb">' + (img ? '<img loading="lazy" decoding="async" alt="" src="' + escapeHTML(img) + '" data-fb="remove">' : "") +
    '<span class="ep-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></div>' +
    '<div class="ep-info"><div class="ep-title" data-i18n="skip">' + ep.episode_number + ". " + escapeHTML(ep.name || "") + "</div>" +
    '<div class="ep-meta">' + (upcoming ? L("Próximamente", "Coming soon") + (ep.air_date ? " · " + ep.air_date : "") : escapeHTML(meta)) + "</div>" +
    (ep.overview ? '<p class="ep-overview" data-i18n="skip">' + escapeHTML(ep.overview) + "</p>" : "") + "</div></div>";
}

function loadSeasonEpisodes(id, season) {
  var list = $("ep-list"), box = $("details-episodes");
  if (!list || !box) return;
  var run = ++episodesRequest;
  box.querySelectorAll(".ep-season-chip").forEach(function (c) {
    var on = Number(c.getAttribute("data-season")) === Number(season);
    c.classList.toggle("active", on);
    c.setAttribute("aria-selected", on ? "true" : "false");
  });
  list.innerHTML = skeletonEpisodes(4);
  fetchTMDB("/tv/" + id + "/season/" + season).then(function (d) {
    if (run !== episodesRequest) return;
    var eps = (d && d.episodes) || [];
    list.innerHTML = eps.length ? eps.map(function (e) { return episodeCardHTML(e, season); }).join("") : '<div class="ep-loading">' + L("Sin episodios disponibles.", "No episodes available.") + "</div>";
  }).catch(function () {
    if (run === episodesRequest) list.innerHTML = '<div class="ep-loading">' + L("No se pudieron cargar los episodios.", "Could not load the episodes.") + ' <button type="button" class="credit-link" data-retry="1">' + L("Reintentar", "Retry") + "</button></div>";
  });
}

(function bindDetailsExtras() {
  var box = $("details-episodes"), credits = $("details-credits");
  if (box) box.addEventListener("click", function (e) {
    var chip = e.target.closest(".ep-season-chip");
    if (chip) { loadSeasonEpisodes(box.dataset.id, chip.getAttribute("data-season")); return; }
    if (e.target.closest("[data-retry]")) { var a = box.querySelector(".ep-season-chip.active"); if (a) loadSeasonEpisodes(box.dataset.id, a.getAttribute("data-season")); return; }
    var item = e.target.closest(".ep-item");
    if (!item || item.classList.contains("ep-upcoming")) return;
    closeDetails(true);
    openPlayer(Number(box.dataset.id), "tv", box.dataset.title, item.getAttribute("data-season"), item.getAttribute("data-ep"), box.dataset.bg || null);
  });
  if (credits) credits.addEventListener("click", function (e) {
    var b = e.target.closest("[data-person]");
    if (!b) return;
    closeDetails(true);
    openPersonCredits(Number(b.getAttribute("data-person")), b.getAttribute("data-name"));
  });
  if (typeof i18nAdd === "function") i18nAdd({ "Temporadas y episodios": "Seasons and episodes" });
})();

// La ✕ de la ficha cierra primero el tráiler (si está abierto) y solo después la ficha: un único botón de salir.
decorate("closeDetails", function (original) {
  return function (fromPlay) {
    var trailer = $("details-trailer");
    if (!fromPlay && trailer && trailer.classList.contains("active")) { closeDetailsTrailer(); return; }
    return original.apply(this, arguments);
  };
});

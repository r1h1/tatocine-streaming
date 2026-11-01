/**
 * TatoCine · js/features/search-suggest.js
 * Búsqueda inteligente:
 *   - Sugerencias mientras escribes (películas, series y personas) con espera para no saturar la API.
 *   - Obras de un actor o director (`openPersonCredits`), también desde la ficha del título.
 *   - Fila «Personas» en los resultados de la búsqueda.
 * En la sección Niños y en perfiles infantiles las sugerencias están desactivadas (la búsqueda por
 * Enter sigue pasando por el filtro infantil).
 */
var SUGGEST_DELAY = 300, suggestTimer = null, suggestRun = 0;

function suggestEnabled() { return !kidsContext(); }
function hideSuggestions() { var p = $("search-suggest"); if (p) p.classList.remove("open"); }

function suggestItemHTML(r) {
  var isPerson = r.media_type === "person";
  var title = r.title || r.name || "";
  var img = isPerson ? r.profile_path : (r.poster_path || r.backdrop_path);
  var date = r.release_date || r.first_air_date || "";
  var sub = isPerson ? (r.known_for_department === "Directing" ? L("Director/a", "Director") : L("Actor / Actriz", "Actor")) :
    (r.media_type === "tv" ? L("Serie", "Series") : L("Película", "Movie")) + (date ? " · " + date.slice(0, 4) : "");
  return '<button type="button" class="suggest-item" data-type="' + r.media_type + '" data-id="' + r.id + '" data-name="' + escapeHTML(title) + '">' +
    '<span class="suggest-thumb' + (isPerson ? " round" : "") + '">' + (img ? '<img loading="lazy" decoding="async" alt="" src="' + escapeHTML(IMG_W185 + img) + '" data-fb="remove">' : "") + "</span>" +
    '<span class="suggest-text"><span class="suggest-title" data-i18n="skip">' + escapeHTML(title) + '</span><span class="suggest-sub">' + sub + "</span></span></button>";
}

function showSuggestions(q) {
  var panel = $("search-suggest");
  if (!panel) return;
  var run = ++suggestRun;
  fetchTMDB("/search/multi", "&include_adult=false&query=" + encodeURIComponent(q)).then(function (d) {
    if (run !== suggestRun || $searchInput.value.trim() !== q) return;
    var all = (d.results || []).filter(function (r) { return r.media_type === "movie" || r.media_type === "tv" || (r.media_type === "person" && r.profile_path); });
    var people = all.filter(function (r) { return r.media_type === "person"; }).slice(0, 2);
    var titles = all.filter(function (r) { return r.media_type !== "person"; }).slice(0, 5 - people.length + 1);
    var items = titles.concat(people).slice(0, 6);
    if (!items.length) { hideSuggestions(); return; }
    panel.innerHTML = items.map(suggestItemHTML).join("");
    panel.classList.add("open");
  }).catch(hideSuggestions);
}

/** Obras de una persona: «Con X» (actuación) y «Dirigidas por X». */
function openPersonCredits(id, name) {
  var my = ++searchRequestId;
  catalogRequestId++;
  isSearching = true;
  clearInterval(heroInterval);
  hideSuggestions();
  if ($searchInput) $searchInput.value = name || "";
  $genreContainer.innerHTML = "";
  $loadMoreContainer.innerHTML = "";
  $rowsContainer.innerHTML = skeletonRows(2);
  window.scrollTo(0, 0);
  fetchTMDB("/person/" + id + "/combined_credits").then(function (d) {
    if (my !== searchRequestId) return;
    function toCards(list) {
      var seen = {};
      return list.filter(function (x) { return (x.media_type === "movie" || x.media_type === "tv") && (x.backdrop_path || x.poster_path); })
        .sort(function (a, b) { return (b.popularity || 0) - (a.popularity || 0); })
        .filter(function (x) { var k = x.media_type + x.id; if (seen[k]) return false; seen[k] = true; return true; })
        .slice(0, 30).map(function (x) { return x.media_type === "tv" ? mapTvResult(x) : mapMovieResult(x); })
        .filter(function (m) { return !m.isUpcoming; });
    }
    var acted = toCards(d.cast || []);
    var directed = toCards((d.crew || []).filter(function (c) { return c.job === "Director"; }));
    $rowsContainer.innerHTML = "";
    if (!acted.length && !directed.length) { setSearchEmptyState(name || ""); return; }
    setHero((acted[0] || directed[0]));
    if (acted.length) renderRow(L("Con ", "With ") + name, acted);
    if (directed.length) renderRow(L("Dirigidas por ", "Directed by ") + name, directed);
    startHeroCarousel((acted.length ? acted : directed).slice(0, 5));
  }).catch(function () { if (my === searchRequestId) setSearchErrorState(); });
}

/** Fila «Personas» tras una búsqueda por Enter si el texto coincide con una persona conocida. */
function addPeopleRow(q, run) {
  fetchTMDB("/search/person", "&include_adult=false&query=" + encodeURIComponent(q)).then(function (d) {
    if (run !== searchRequestId || kidsContext()) return;
    var people = (d.results || []).filter(function (p) { return p.profile_path && (p.popularity || 0) >= 8; }).slice(0, 8);
    if (!people.length) return;
    // Espera a que los resultados de títulos estén pintados (la fila de personas va justo después).
    (function insert(tries) {
      if (run !== searchRequestId) return;
      var first = $rowsContainer.querySelector(".catalog-row");
      if (!first) { if (tries < 12) setTimeout(function () { insert(tries + 1); }, 400); return; }
      if ($rowsContainer.querySelector(".people-row")) return;
    var row = document.createElement("div");
    row.className = "row people-row";
    row.innerHTML = '<div class="row-header"><h2 class="row-title">' + L("Personas", "People") + '</h2></div><div class="row-scroll details-cast people-scroll">' + people.map(function (p) {
      return '<div class="cast-item" tabindex="0" role="button" data-person="' + p.id + '" data-name="' + escapeHTML(p.name) + '"><img class="cast-photo" loading="lazy" decoding="async" alt="" src="' + escapeHTML(IMG_W185 + p.profile_path) + '">' +
        '<div class="cast-name" data-i18n="skip">' + escapeHTML(p.name) + '</div><div class="cast-char">' + (p.known_for_department === "Directing" ? L("Dirección", "Directing") : L("Actuación", "Acting")) + "</div></div>";
    }).join("") + "</div>";
      first.parentNode.insertBefore(row, first.nextSibling);
    })(0);
  }).catch(function () { });
}

(function bindSearchSuggest() {
  var wrap = document.querySelector(".hero-content .search-wrap");
  if (!wrap || !$searchInput) return;
  var panel = document.createElement("div");
  panel.id = "search-suggest";
  panel.className = "recent-searches suggest-panel";
  panel.setAttribute("role", "listbox");
  wrap.appendChild(panel);
  panel.addEventListener("mousedown", function (e) { e.preventDefault(); });
  panel.addEventListener("click", function (e) {
    var b = e.target.closest(".suggest-item");
    if (!b) return;
    var type = b.getAttribute("data-type"), id = Number(b.getAttribute("data-id"));
    hideSuggestions();
    if (type === "person") openPersonCredits(id, b.getAttribute("data-name"));
    else openDetails(id, type);
  });
  $searchInput.addEventListener("input", function () {
    clearTimeout(suggestTimer);
    var q = $searchInput.value.trim();
    if (q.length < 2 || !suggestEnabled()) { hideSuggestions(); return; }
    suggestTimer = setTimeout(function () { showSuggestions(q); }, SUGGEST_DELAY);
  });
  $searchInput.addEventListener("blur", function () { setTimeout(hideSuggestions, 150); });
  $searchInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { clearTimeout(suggestTimer); suggestRun++; hideSuggestions(); } });
  document.addEventListener("click", function (e) {
    var p = e.target.closest("#rows-container [data-person]");
    if (p) openPersonCredits(Number(p.getAttribute("data-person")), p.getAttribute("data-name"));
  });
  // La búsqueda por Enter añade, además, la fila «Personas».
  decorate("performSearch", function (original) {
    return function (q) {
      var r = original(q);
      var run = searchRequestId;
      if (suggestEnabled()) addPeopleRow(q, run);
      return r;
    };
  });
  if (typeof i18nAdd === "function") i18nAdd({ "Personas": "People" });
})();

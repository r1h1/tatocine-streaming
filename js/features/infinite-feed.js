/**
 * TatoCine · js/features/infinite-feed.js
 * Scroll infinito en todas las pestañas:
 *   - Inicio ....... filas por género que continúan al bajar, empezando por tus géneros favoritos.
 *   - Películas, Series, Anime y Niños: filas por género de su catálogo (Niños solo con contenido apto). Si aplicas
 *     un género o un filtro avanzado, vuelve a paginar ese resultado como antes.
 *   - Búsqueda ..... páginas siguientes de resultados.
 *   - Plataformas .. más películas y series de la plataforma o el estudio.
 *   - Favoritos .... las cuadrículas largas se muestran por bloques.
 * Un único observador del elemento #sentinel; cada fuente implementa `next()` y se reinicia al cambiar de vista.
 * Perfiles Niño: sin descubrimiento infinito (solo el catálogo infantil existente y la búsqueda filtrada).
 *
 * Diseño responsable: es descubrimiento a demanda (sin temporizadores, avisos ni recompensas variables). El usuario
 * controla el ritmo y los perfiles infantiles tienen además un límite diario de uso.
 */
var FEED_GENRES = [
  { id: 28, tv: 10759, es: "Acción", en: "Action" }, { id: 35, tv: 35, es: "Comedia", en: "Comedy" },
  { id: 18, tv: 18, es: "Drama", en: "Drama" }, { id: 878, tv: 10765, es: "Ciencia ficción", en: "Science Fiction" },
  { id: 53, tv: 9648, es: "Suspenso", en: "Thriller" }, { id: 12, tv: 10759, es: "Aventura", en: "Adventure" },
  { id: 14, tv: 10765, es: "Fantasía", en: "Fantasy" }, { id: 80, tv: 80, es: "Crimen", en: "Crime" },
  { id: 10749, tv: 18, es: "Romance", en: "Romance" }, { id: 9648, tv: 9648, es: "Misterio", en: "Mystery" },
  { id: 16, tv: 16, es: "Animación", en: "Animation" }, { id: 27, tv: 9648, es: "Terror", en: "Horror" },
  { id: 99, tv: 99, es: "Documental", en: "Documentary" }, { id: 10751, tv: 10751, es: "Familia", en: "Family" },
  { id: 36, tv: 10768, es: "Historia", en: "History" }, { id: 10402, tv: null, es: "Música", en: "Music" },
  { id: 37, tv: 37, es: "Western", en: "Western" }, { id: 10752, tv: 10768, es: "Bélica", en: "War" }
];
var feed = null, feedObserver = null, feedToken = 0;

function feedSeenSet() {
  var seen = {};
  myList.forEach(function (x) { seen[x.type + ":" + x.id] = true; });
  (typeof watchedList === "function" ? watchedList() : []).forEach(function (x) { seen[x.type + ":" + x.id] = true; });
  return seen;
}
function feedAppendRow(title, items) {
  var before = $rowsContainer.querySelectorAll(".row").length;
  renderRow(title, items);
  return $rowsContainer.querySelectorAll(".row").length > before;
}
function feedShowSkeleton() { var s = document.createElement("div"); s.className = "feed-skeleton"; s.innerHTML = skeletonRow(5); $rowsContainer.appendChild(s); return s; }

/** Fuente: Inicio. Los géneros que más ves van primero (con «Para ti»), el resto después, siempre sin repetir. */
function homeFeedSource() {
  var weights = {};
  getTasteProfile().forEach(function (p) { weights[p.id] = p.score; });
  var queue = FEED_GENRES.slice().sort(function (a, b) { return (weights[b.id] || 0) - (weights[a.id] || 0) || Math.random() - 0.5; });
  var pass = 0;
  return {
    next: function () {
      if (!queue.length) { if (++pass > 2) return Promise.resolve(false); queue = shuffleInPlace(FEED_GENRES.slice()); }
      var g = queue.shift(), page = pass + 1, seen = feedSeenSet(), forYou = !!weights[g.id];
      var name = L(g.es, g.en);
      var reqs = [fetchTMDB("/discover/movie", "&with_genres=" + g.id + "&sort_by=popularity.desc&vote_count.gte=150&include_adult=false&page=" + page).catch(function () { return null; })];
      if (g.tv) reqs.push(fetchTMDB("/discover/tv", "&with_genres=" + g.tv + "&sort_by=popularity.desc&vote_count.gte=80&include_adult=false&page=" + page).catch(function () { return null; }));
      return Promise.all(reqs).then(function (r) {
        var movies = ((r[0] && r[0].results) || []).map(mapMovieResult), shows = ((r[1] && r[1].results) || []).map(function (x) { return mapTvResult(x); });
        function clean(list) { return list.filter(function (m) { return m.bg && !m.isUpcoming && !seen[m.type + ":" + m.id]; }); }
        movies = clean(movies); shows = clean(shows);
        if (movies.length >= 6) feedAppendRow((forYou ? L("Para ti: ", "For you: ") : "") + name + " · " + L("Películas", "Movies"), movies);
        if (shows.length >= 6) feedAppendRow((forYou ? L("Para ti: ", "For you: ") : "") + name + " · " + L("Series", "Series"), shows);
        return true;
      });
    }
  };
}
/** Fuente: búsqueda (páginas 2, 3…). */
function searchFeedSource(q) {
  var page = 1, total = 99;
  return {
    next: function () {
      if (page >= total) return Promise.resolve(false);
      page++;
      return fetchTMDB("/search/multi", "&include_adult=false&page=" + page + "&query=" + encodeURIComponent(q)).then(function (d) {
        total = Math.min(d.total_pages || 1, 15);
        var list = (d.results || []).filter(function (i) { return i.media_type === "movie" || i.media_type === "tv"; }).map(function (i) {
          var m = i.media_type === "tv" ? mapTvResult(i) : mapMovieResult(i);
          m.adult = !!i.adult;
          return m;
        });
        var done = function (items) { if (items.length) feedAppendRow(L("Más resultados", "More results"), items); return page < total; };
        return kidsContext() ? kidsFilterSearch(list).then(done) : done(list);
      });
    }
  };
}
/** Fuente: plataforma o estudio (páginas 3, 4…). */
function brandFeedSource(key) {
  var page = 2, b = BRANDS.find(function (x) { return x.key === key; });
  return {
    next: function () {
      if (!b || page >= 10) return Promise.resolve(false);
      page++;
      return Promise.all([fetchTMDB("/discover/movie", brandQuery(b, page)), fetchTMDB("/discover/tv", brandQuery(b, page))].map(function (p) { return p.catch(function () { return null; }); })).then(function (r) {
        var seen = feedSeenSet(), got = false;
        var movies = ((r[0] && r[0].results) || []).map(mapMovieResult).filter(function (m) { return m.bg && !m.isUpcoming; });
        var shows = ((r[1] && r[1].results) || []).map(function (x) { return mapTvResult(x); }).filter(function (m) { return m.bg; });
        if (movies.length) got = feedAppendRow(L("Más películas · ", "More movies · ") + b.name, movies) || got;
        if (shows.length) got = feedAppendRow(L("Más series · ", "More series · ") + b.name, shows) || got;
        return got;
      });
    }
  };
}

/* ---------- Catálogos (Películas, Series, Anime, Niños): filas por género que continúan al bajar ---------- */
var FEED_TV_GENRES = [
  { id: 10759, es: "Acción y aventura", en: "Action & Adventure" }, { id: 35, es: "Comedia", en: "Comedy" }, { id: 18, es: "Drama", en: "Drama" },
  { id: 10765, es: "Ciencia ficción y fantasía", en: "Sci-Fi & Fantasy" }, { id: 9648, es: "Misterio", en: "Mystery" }, { id: 80, es: "Crimen", en: "Crime" },
  { id: 16, es: "Animación", en: "Animation" }, { id: 10751, es: "Familia", en: "Family" }, { id: 99, es: "Documental", en: "Documentary" },
  { id: 37, es: "Western", en: "Western" }, { id: 10768, es: "Bélica y política", en: "War & Politics" }
];
var FEED_BASE_MOVIE = "&sort_by=popularity.desc&vote_count.gte=150&include_adult=false", FEED_BASE_TV = "&sort_by=popularity.desc&vote_count.gte=80&include_adult=false";
var KID_NOT = "&without_genres=27,53,80,10752&sort_by=popularity.desc&include_adult=false";
function catalogFeedConfig(view) {
  if (view === "movies") return { cat: null, movie: FEED_BASE_MOVIE, slots: FEED_GENRES.map(function (g) { return { es: g.es, en: g.en, movie: "&with_genres=" + g.id }; }) };
  if (view === "series") return { cat: null, tv: FEED_BASE_TV, slots: FEED_TV_GENRES.map(function (g) { return { es: g.es, en: g.en, tv: "&with_genres=" + g.id }; }) };
  if (view === "anime") {
    var a = [[28, 10759, "Acción", "Action"], [12, 10759, "Aventura", "Adventure"], [35, 35, "Comedia", "Comedy"], [18, 18, "Drama", "Drama"], [14, 10765, "Fantasía", "Fantasy"],
      [878, 10765, "Ciencia ficción", "Science Fiction"], [9648, 9648, "Misterio", "Mystery"], [10749, null, "Romance", "Romance"], [10751, 10751, "Familia", "Family"]];
    return { cat: "Anime", prefix: "Anime · ", movie: "&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=50&include_adult=false&with_genres=16",
      tv: "&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=30&include_adult=false&with_genres=16",
      slots: a.map(function (x) { return { es: x[2], en: x[3], movie: "," + x[0], tv: x[1] == null ? null : "," + x[1] }; }) };
  }
  var k = [[16, "Animación", "Animation"], [10751, "Familia", "Family"], [35, "Comedia", "Comedy"], [12, "Aventura", "Adventure"], [14, "Fantasía", "Fantasy"], [878, "Ciencia ficción", "Science Fiction"]];
  return { cat: "kids", prefix: L("Niños · ", "Kids · "), movie: "&certification_country=US&certification=G" + KID_NOT, tv: "&certification_country=US&certification=TV-Y|TV-Y7|TV-G" + KID_NOT,
    slots: k.map(function (x) { return { es: x[1], en: x[2], movie: "&with_genres=" + x[0], tv: "&with_genres=" + (x[0] === 12 ? 10759 : x[0] === 14 || x[0] === 878 ? 10765 : x[0]) }; }) };
}
function renderedKeys() {
  var seen = {};
  $rowsContainer.querySelectorAll(".card[onclick]").forEach(function (c) {
    var m = /openDetails\((\d+),'(movie|tv)'\)/.exec(c.getAttribute("onclick") || "");
    if (m) seen[m[2] + ":" + m[1]] = true;
  });
  return seen;
}
/** El feed por géneros solo manda si no hay género ni filtros avanzados elegidos (entonces pagina ese resultado). */
function catalogFeedActive() {
  return !!feed && feed.kind === "catalog" && !currentGenreFilter && !filtersState.year && !filtersState.rating && filtersState.sort === "popularity.desc";
}
function catalogFeedSource(view) {
  var cfg = catalogFeedConfig(view), queue = shuffleInPlace(cfg.slots.slice()), pass = 0;
  return {
    next: function () {
      if (!catalogFeedActive()) return Promise.resolve(true);
      if (!queue.length) { if (++pass > 2) return Promise.resolve(false); queue = shuffleInPlace(cfg.slots.slice()); }
      var s = queue.shift(), page = pass + 1, seen = renderedKeys(), none = Promise.resolve(null);
      var name = (cfg.prefix || "") + L(s.es, s.en);
      var rm = cfg.movie && s.movie != null ? fetchTMDB("/discover/movie", cfg.movie + s.movie + "&page=" + page).catch(function () { return null; }) : none;
      var rt = cfg.tv && s.tv != null ? fetchTMDB("/discover/tv", cfg.tv + s.tv + "&page=" + page).catch(function () { return null; }) : none;
      return Promise.all([rm, rt]).then(function (r) {
        if (!catalogFeedActive()) return true;
        function clean(list) { return list.filter(function (m) { return m.bg && !m.isUpcoming && !seen[m.type + ":" + m.id]; }); }
        var movies = clean(((r[0] && r[0].results) || []).map(function (i) { var x = mapMovieResult(i); if (cfg.cat === "kids") x.category = "Película infantil"; return x; }));
        var shows = clean(((r[1] && r[1].results) || []).map(function (i) { return mapTvResult(i, cfg.cat === "kids" ? "Serie infantil" : undefined); }));
        if (cfg.movie && cfg.tv) {
          if (movies.length >= 5) feedAppendRow(name + " · " + L("Películas", "Movies"), movies);
          if (shows.length >= 5) feedAppendRow(name + " · " + L("Series", "Series"), shows);
        } else if (movies.length >= 5) feedAppendRow(name, movies);
        else if (shows.length >= 5) feedAppendRow(name, shows);
        return true;
      });
    }
  };
}
/** Fuente: Favoritos (muestra más tarjetas de las secciones largas). */
function favsFeedSource() {
  return { next: function () { if (!favTruncated) return Promise.resolve(false); favLimit += FAV_PAGE; renderFavoritesView(); return Promise.resolve(favTruncated); } };
}

function setFeed(kind, source) {
  feedToken++;
  var old = $rowsContainer.querySelector(".feed-skeleton");
  if (old) old.remove();
  feed = source ? { kind: kind, source: source, loading: false, done: false, token: feedToken } : null;
}
function homeReady() { return $rowsContainer.querySelectorAll(".row").length >= 7; }
function feedLoadNext() {
  var f = feed;
  if (!f || f.loading || f.done || document.hidden) return;
  if (f.kind === "catalog" && !catalogFeedActive()) return;
  if (f.kind === "catalog" && !$rowsContainer.querySelector(".row:not(.skeleton-row)")) { setTimeout(feedLoadNext, 800); return; }   // espera a la primera carga
  if (f.kind === "home" && !homeReady()) { setTimeout(feedLoadNext, 1500); return; }
  f.loading = true;
  var skeleton = f.kind === "favs" ? null : feedShowSkeleton();
  f.source.next().then(function (more) { if (f.token === feedToken) f.done = !more; })
    .catch(function () { if (f.token === feedToken) f.done = true; })
    .then(function () {
      if (skeleton) skeleton.remove();
      f.loading = false;
      // Si el centinela sigue a la vista (pantallas altas), carga el siguiente bloque.
      var s = $("sentinel");
      if (f.token === feedToken && !f.done && s && s.getBoundingClientRect().top < window.innerHeight + 700) setTimeout(feedLoadNext, 250);
    });
}

(function bindInfiniteFeed() {
  var sentinel = $("sentinel");
  if (sentinel && "IntersectionObserver" in window) {
    feedObserver = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) feedLoadNext(); }, { rootMargin: "900px 0px" });
    feedObserver.observe(sentinel);
  } else window.addEventListener("scroll", function () { var s = $("sentinel"); if (s && s.getBoundingClientRect().top < window.innerHeight + 900) feedLoadNext(); }, { passive: true });
  // Reinicio según la vista
  decorate("switchView", function (original) {
    return function (v, r) {
      var out = original(v, r);
      var view = currentView;
      if (view === "movies" || view === "series" || view === "anime" || view === "kids") setFeed("catalog", catalogFeedSource(view));
      else if (isKidProfile()) setFeed(null);
      else if (view === "home") setFeed("home", homeFeedSource());
      else if (view === "list") setFeed("favs", favsFeedSource());
      else if (view.indexOf("brand:") === 0) setFeed("brand", brandFeedSource(view.slice(6)));
      else setFeed(null);
      return out;
    };
  });
  // Con el feed por géneros activo no se muestra el botón «Cargar más» ni se pagina la lista general.
  decorate("renderLoadMore", function (original) {
    return function (total) {
      if (catalogFeedActive()) { $loadMoreContainer.innerHTML = ""; hasMorePages = false; return; }
      return original(total);
    };
  });
  decorate("performSearch", function (original) {
    return function (q) { var out = original(q); setFeed("search", searchFeedSource(q)); return out; };
  });
  decorate("openPersonCredits", function (original) { return function (id, name) { setFeed(null); return original(id, name); }; });
  if (typeof i18nAdd === "function") i18nAdd({ "Mis listas": "My lists" });
  if (typeof i18nRule === "function") i18nRule(/(\d+) título\b/g, "$1 title");
})();

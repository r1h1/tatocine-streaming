/**
 * TatoCine · js/features/infinite-feed.js
 * Scroll infinito en todas las pestañas que no lo tenían (Películas, Series, Anime y Niños ya cargan más solas):
 *   - Inicio ....... filas por género que continúan al bajar, empezando por tus géneros favoritos.
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
      if (isKidProfile()) setFeed(null);
      else if (view === "home") setFeed("home", homeFeedSource());
      else if (view === "list") setFeed("favs", favsFeedSource());
      else if (view.indexOf("brand:") === 0) setFeed("brand", brandFeedSource(view.slice(6)));
      else setFeed(null);
      return out;
    };
  });
  decorate("performSearch", function (original) {
    return function (q) { var out = original(q); setFeed("search", searchFeedSource(q)); return out; };
  });
  decorate("openPersonCredits", function (original) { return function (id, name) { setFeed(null); return original(id, name); }; });
  if (typeof i18nAdd === "function") i18nAdd({ "Mis listas": "My lists" });
  if (typeof i18nRule === "function") i18nRule(/(\d+) título\b/g, "$1 title");
})();

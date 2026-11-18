/**
 * TatoCine · js/features/search-intent.js
 * Buscador que entiende lo que se pide, no solo títulos: «pelicuals de terror», «pelis de miedo», «peli de matar», «series de risa»,
 * «las mejores de acción», «anime de magia», «terror 2023»… Si la frase es (solo) un género, un tipo (películas / series / anime), «mejores» o
 * «nuevas» y un año, se muestran las mejores de ese género desde TMDB (discover) en lugar de buscar el texto literal.
 *   - Tolera faltas: cada palabra se compara con el vocabulario con distancia de edición (1 letra; 2 en palabras largas; las transposiciones cuentan 1).
 *   - Conservador: si queda CUALQUIER palabra que no reconoce («el terror de chucky»), se busca el título como siempre.
 *   - En perfiles infantiles o en la sección Niños los resultados pasan por el mismo filtro de contenido apto que la búsqueda normal.
 * SEARCH_INTENT.parse(texto) es una función pura (probada en tests/search-intent.test.js).
 */
var SEARCH_INTENT = (function () {
  // Géneros: palabras (sin tildes) → [id de película, id de serie] en TMDB. null = ese género no existe para series (se usa el más cercano o se omite).
  var GENRES = [
    { label: ["Terror", "Horror"], movie: 27, tv: 9648, words: ["terror", "horror", "miedo", "susto", "sustos", "asustar", "asustan", "aterradora", "aterradoras", "espanto", "zombies", "zombie", "fantasmas", "fantasma", "demonios", "sangre", "slasher", "scary"] },
    { label: ["Acción", "Action"], movie: 28, tv: 10759, words: ["accion", "action", "matar", "matan", "balazos", "balas", "disparos", "tiros", "peleas", "pelea", "golpes", "explosiones", "artes marciales"] },
    { label: ["Aventura", "Adventure"], movie: 12, tv: 10759, words: ["aventura", "aventuras", "adventure"] },
    { label: ["Comedia", "Comedy"], movie: 35, tv: 35, words: ["comedia", "comedias", "comedy", "risa", "risas", "reir", "chistes", "chistosa", "chistosas", "graciosa", "graciosas", "divertida", "divertidas", "humor", "funny"] },
    { label: ["Romance", "Romance"], movie: 10749, tv: 18, words: ["romance", "romantica", "romanticas", "romanticos", "amor", "enamorados", "love"] },
    { label: ["Drama", "Drama"], movie: 18, tv: 18, words: ["drama", "dramas", "dramatica", "dramaticas", "llorar", "tristes", "triste"] },
    { label: ["Ciencia ficción", "Science fiction"], movie: 878, tv: 10765, words: ["ciencia ficcion", "scifi", "sci fi", "espacio", "espaciales", "aliens", "alien", "extraterrestres", "robots", "futuristas", "futurista"] },
    { label: ["Fantasía", "Fantasy"], movie: 14, tv: 10765, words: ["fantasia", "fantasy", "magia", "magos", "brujas", "dragones"] },
    { label: ["Animación", "Animation"], movie: 16, tv: 16, words: ["animacion", "animadas", "animados", "dibujos", "dibujos animados", "caricaturas", "cartoons"] },
    { label: ["Suspenso", "Thriller"], movie: 53, tv: 9648, words: ["suspenso", "suspense", "thriller", "thrillers", "intriga", "psicologicas"] },
    { label: ["Misterio", "Mystery"], movie: 9648, tv: 9648, words: ["misterio", "misterios", "mystery", "detectives", "detective"] },
    { label: ["Crimen", "Crime"], movie: 80, tv: 80, words: ["crimen", "crimenes", "crime", "mafia", "mafias", "narcos", "policias", "policiacas", "policiaca", "gangsters", "robos", "atracos", "asesinos"] },
    { label: ["Documentales", "Documentaries"], movie: 99, tv: 99, words: ["documental", "documentales", "documentary", "documentaries"] },
    { label: ["Guerra", "War"], movie: 10752, tv: 10768, words: ["guerra", "guerras", "belica", "belicas", "war", "soldados", "militares"] },
    { label: ["Western", "Western"], movie: 37, tv: 37, words: ["western", "westerns", "vaqueros", "oeste"] },
    { label: ["Familia", "Family"], movie: 10751, tv: 10751, words: ["familia", "familiares", "familiar", "family", "infantiles", "infantil", "ninos", "kids"] },
    { label: ["Musicales", "Music"], movie: 10402, tv: null, words: ["musicales", "musical", "musica", "music"] },
    { label: ["Historia", "History"], movie: 36, tv: null, words: ["historia", "historicas", "historicos", "epicas", "history"] }
  ];
  var MOVIE = ["pelicula", "peliculas", "peli", "pelis", "film", "films", "movie", "movies", "filme", "filmes", "cine"];
  var TV = ["serie", "series", "show", "shows", "tv", "novela", "novelas", "temporadas"];
  var ANIME = ["anime", "animes"];
  var BEST = ["mejores", "mejor", "top", "buenas", "buenos", "best", "clasicas", "clasicos", "imperdibles", "recomendadas", "valoradas", "aclamadas"];
  var NEW = ["nuevas", "nuevos", "nueva", "estrenos", "estreno", "recientes", "ultimas", "new", "latest"];
  var STOP = ["de", "del", "la", "las", "el", "los", "un", "una", "unos", "unas", "para", "con", "que", "y", "o", "a", "en", "mas", "muy", "algo", "quiero", "ver", "busco",
    "buscar", "dame", "pon", "ponme", "recomiendame", "recomienda", "recomendaciones", "sobre", "tipo", "estilo", "genero", "generos", "me", "mi", "sea", "sean",
    "hay", "alguna", "algunas", "algun", "ah", "of", "the", "some", "and", "to", "watch", "i", "want", "show me", "mucho", "mucha", "bien", "bueno", "buena", "lo", "le", "les"];

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s-]/g, " ").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  }
  /** Distancia de Damerau-Levenshtein (las transposiciones cuentan 1: «pelicuals» → «peliculas») con tope */
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }
  function near(tok, list) {
    if (list.indexOf(tok) >= 0) return true;
    if (tok.length < 5) return false;                                            // palabras cortas: solo exactas (evita «peli» ≈ «pela»)
    var max = tok.length >= 8 ? 2 : 1;
    for (var i = 0; i < list.length; i++) if (list[i].indexOf(" ") < 0 && list[i].length >= 5 && dist(tok, list[i], max) <= max) return true;
    return false;
  }

  /** → null (búsqueda normal) o { type: "movie"|"tv", genre, best, recent, year, anime, label:[es,en] } */
  function parse(q) {
    var s = " " + norm(q) + " ";
    if (s.length < 4) return null;
    var genre = null, type = null, best = false, recent = false, anime = false, year = null;
    // frases de varias palabras primero («ciencia ficcion», «dibujos animados», «artes marciales»)
    GENRES.forEach(function (g) { g.words.forEach(function (w) { if (w.indexOf(" ") > 0 && s.indexOf(" " + w + " ") >= 0) { if (!genre) genre = g; s = s.replace(" " + w + " ", " "); } }); });
    var toks = s.trim().split(" ").filter(Boolean), unknown = 0;
    toks.forEach(function (t) {
      if (/^(19[3-9]\d|20[0-4]\d)$/.test(t)) { year = Number(t); return; }
      if (STOP.indexOf(t) >= 0) return;
      if (near(t, ANIME)) { anime = true; return; }
      if (near(t, MOVIE)) { type = type || "movie"; return; }
      if (near(t, TV)) { type = type || "tv"; return; }
      if (near(t, BEST)) { best = true; return; }
      if (near(t, NEW)) { recent = true; return; }
      for (var i = 0; i < GENRES.length; i++) if (near(t, GENRES[i].words)) { if (!genre) genre = GENRES[i]; return; }
      unknown++;
    });
    if (unknown > 0) return null;                                                 // queda algo que no es género ni tipo: es (parte de) un título
    if (!genre && !anime) return null;                                            // «películas» o «mejores» solos no bastan
    if (anime) { type = type || "tv"; }
    type = type || "movie";
    var gid = genre ? (type === "tv" ? genre.tv : genre.movie) : null;
    if (genre && gid == null) { type = "movie"; gid = genre.movie; }              // ese género no existe en series: se muestran películas
    return { type: type, genre: gid, best: best, recent: recent, year: year, anime: anime, label: genre ? genre.label : ["Anime", "Anime"] };
  }

  /** Parámetros de /discover para la intención */
  function discoverParams(it) {
    var p = "&include_adult=false&page=1";
    var g = [];
    if (it.genre) g.push(it.genre);
    if (it.anime && g.indexOf(16) < 0) g.push(16);
    if (g.length) p += "&with_genres=" + g.join(",");
    if (it.anime) p += "&with_original_language=ja";
    var today = new Date().toISOString().slice(0, 10);
    var dateKey = it.type === "tv" ? "first_air_date" : "primary_release_date";
    if (it.year) p += it.type === "tv" ? "&first_air_date_year=" + it.year : "&primary_release_year=" + it.year;
    if (it.best) p += "&sort_by=vote_average.desc&vote_count.gte=" + (it.anime ? 300 : 1500);
    else if (it.recent) p += "&sort_by=" + dateKey + ".desc&" + dateKey + ".lte=" + today + "&vote_count.gte=40";
    else p += "&sort_by=popularity.desc&vote_count.gte=" + (it.year ? 50 : 300);
    return p;
  }

  return { parse: parse, discoverParams: discoverParams, norm: norm, dist: dist };
})();
if (typeof module !== "undefined" && module.exports) module.exports = SEARCH_INTENT;

// ---- En la página: la búsqueda por intención va ANTES de la búsqueda de títulos ----
if (typeof decorate === "function" && typeof document !== "undefined") {
  decorate("performSearch", function (original) {
    return function (q) {
      var it = SEARCH_INTENT.parse(q);
      if (!it) return original.apply(this, arguments);
      var text = bkText(q, 100);
      var myId = ++searchRequestId;
      catalogRequestId++;
      isSearching = true;
      try { var url = new URL(location.href); url.searchParams.set("q", text); url.searchParams.delete("id"); url.searchParams.delete("type"); history.replaceState(null, "", url.toString()); } catch (e) { }
      try { if (typeof rememberSearch === "function") rememberSearch(text); if (typeof hideRecentSearches === "function") hideRecentSearches(); if (typeof hideSuggestions === "function") hideSuggestions(); } catch (e) { }
      clearInterval(heroInterval);
      $genreContainer.innerHTML = "";
      $loadMoreContainer.innerHTML = "";
      $rowsContainer.innerHTML = skeletonRows(2);
      var base = "/discover/" + it.type, params = SEARCH_INTENT.discoverParams(it);
      var map = function (r) { return it.type === "tv" ? mapTvResult(r) : mapMovieResult(r); };
      Promise.all([fetchTMDB(base, params), fetchTMDB(base, params.replace("&page=1", "&page=2"))]).then(function (pages) {
        if (myId !== searchRequestId) return;
        var seen = {}, list = [];
        pages.forEach(function (d) { (d && d.results || []).forEach(function (r) { if (!seen[r.id] && (r.backdrop_path || r.poster_path)) { seen[r.id] = 1; list.push(map(r)); } }); });
        list = list.filter(function (m) { return !m.isUpcoming; });
        var kind = it.anime ? L("Anime", "Anime") : (it.type === "tv" ? L("Series", "Series") : L("Películas", "Movies"));
        var g = it.label[UI_LANG === "en" ? 1 : 0];
        var title = (it.best ? L("Las mejores · ", "Best · ") : it.recent ? L("Lo más nuevo · ", "Newest · ") : "") + kind + (it.genre ? (it.anime ? " · " + g : L(" de ", ": ") + g.toLowerCase()) : "") + (it.year ? " · " + it.year : "");
        var show = function (items) {
          if (myId !== searchRequestId) return;
          if (!items.length) { setSearchEmptyState(text); return; }
          $rowsContainer.innerHTML = "";
          setHero(items[0]);
          renderRow(title, items);
          startHeroCarousel(items.slice(0, 10));
        };
        if (kidsContext()) kidsFilterSearch(list).then(show).catch(function () { show([]); });
        else show(list);
      }).catch(function () { if (myId === searchRequestId) setSearchErrorState(); });
    };
  });
}

// ---- Sugerencias: si lo que se escribe es un género («pelis de miedo»), la sugerencia es esa búsqueda («Buscar: Películas de terror»), no títulos sueltos ----
if (typeof decorate === "function" && typeof document !== "undefined") {
  decorate("showSuggestions", function (original) {
    return function (q) {
      var it = SEARCH_INTENT.parse(q), panel = document.getElementById("search-suggest");
      if (!it || !panel) return original.apply(this, arguments);
      suggestRun++;                                                                 // anula una petición de sugerencias en curso
      var kind = it.anime ? L("Anime", "Anime") : (it.type === "tv" ? L("Series", "Series") : L("Películas", "Movies"));
      var g = it.label[UI_LANG === "en" ? 1 : 0];
      var text = (it.best ? L("Las mejores ", "Best ") + kind.toLowerCase() : kind) + (it.genre && !it.anime ? L(" de ", ": ") + g.toLowerCase() : (it.anime && it.genre ? " · " + g : "")) + (it.year ? " · " + it.year : "");
      panel.innerHTML = '<button type="button" class="suggest-item" data-intent="1"><span class="suggest-thumb"></span><span class="suggest-text"><span class="suggest-title">' +
        escapeHTML(L("Buscar: ", "Search: ") + text) + '</span><span class="suggest-sub">' + escapeHTML(L("Las mejores del género", "Top titles of the genre")) + "</span></span></button>";
      panel.classList.add("open");
    };
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest('#search-suggest [data-intent]');
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (typeof hideSuggestions === "function") hideSuggestions();
    performSearch($searchInput.value);
  }, true);
}

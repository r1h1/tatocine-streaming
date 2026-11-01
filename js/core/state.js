/**
 * TatoCine · js/core/state.js
 * Estado global de la app, caché de TMDB, imagen de respaldo y referencias al DOM.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    const LOCAL_ANALYTICS_KEY = "tatoLocalAnalyticsV1";
    let currentView = "home";
    let myList = readLocalJSON(profileStorageKey("tatoList"), []);
    let continueWatching = readLocalJSON(profileStorageKey("tatoContinue"), []);
    let localAnalytics = readLocalJSON(profileStorageKey(LOCAL_ANALYTICS_KEY), { items: [] });
    if (!localAnalytics || !Array.isArray(localAnalytics.items)) localAnalytics = { items: [] };
    let autoNextEpisode = readLocalJSON(profileStorageKey("tatoAutoNextEpisode"), true) !== false;
    let preferredServer = (function () {
      var def = defaultServerFor(UI_LANG), v = def;
      try { v = String(localStorage.getItem(profileStorageKey("tatoServer")) || def).replace(/"/g, ""); } catch (e) { }
      return SERVERS.some(function (sv) { return sv.name === v; }) ? v : def;
    })();

    let currentMedia = null,
      currentHeroMedia = null;
    let heroInterval = null,
      heroMoviesList = [],
      currentHeroIndex = 0,
      autoScrollInterval = null;
    let isSearching = false,
      currentGenreFilter = "",
      cachedDetails = {};
    let currentPage = 1,
      isLoadingMore = false,
      hasMorePages = false,
      currentMaxPage = 500;
    let filtersState = { year: "", rating: "", sort: "popularity.desc" };
    let searchRequestId = 0,
      heroRequestId = 0,
      searchDebounceTimer = null,
      catalogRequestId = 0;
    let loadMoreObserver = null,
      loadMoreScrollFallback = false,
      autoScrollPaused = false;
    let activePlayerFrame = null,
      currentTvSeasons = [],
      currentTvEpisodes = [],
      isAdvancingEpisode = false,
      similarQueue = [],
      similarQueuePromise = Promise.resolve([]),
      playerEndedHandled = false,
      isAdvancingSimilar = false;

    const tmdbCache = new Map();
    const tmdbPending = new Map();
    const CACHE_TTL = 10 * 60 * 1000;
    const CACHE_MAX_ENTRIES = 180;
    const MAX_TMDB_PAGE = 500;
    const FALLBACK_IMG =
      "data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 225%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22225%22/%3E%3Cpath d=%22M180 90v45l40-22.5z%22 fill=%22%23ffffff%22/%3E%3C/svg%3E";

    const $ = (id) => document.getElementById(id);
    const $heroSection = $("hero-section"),
      $heroVideoWrap = $("hero-video-wrap"),
      $heroBg = $("hero-bg"),
      $heroTitle = $("hero-title"),
      $heroYear = $("hero-year"),
      $heroMeta = $("hero-meta"),
      $heroDesc = $("hero-desc"),
      $heroContent = $("hero-content"),
      $heroActions = $("hero-actions"),
      $heroPlayBtn = $("hero-play-btn"),
      $heroDetailsBtn = $("hero-details-btn"),
      $rowsContainer = $("rows-container"),
      $searchInput = $("search-input"),
      $genreContainer = $("genre-filters-container"),
      $loadMoreContainer = $("load-more-container"),
      $modal = $("player-modal"),
      $modalTitle = $("modal-title"),
      $playerView = $("player-view"),
      $serverSwitcher = $("server-switcher"),
      $topBar = $("top-bar"),
      $tvControls = $("tv-controls"),
      $seasonSelect = $("season-select"),
      $episodeSelect = $("episode-select"),
      $disclaimerModal = $("disclaimer-modal"),
      $detailsModal = $("details-modal"),
      $settingsModal = $("settings-modal"),
      $actorModal = $("actor-modal"),
      $filtersModal = $("filters-modal"),
      $offlineBanner = $("offline-banner");

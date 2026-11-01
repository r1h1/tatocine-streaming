/**
 * TatoCine · js/features/watch-tracking.js
 * Seguimiento del tiempo visto, títulos finalizados y categorías.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Analítica local de visualización (tiempo, finalizados, categoría) ----
    var CAT_LABELS = { movie: "Películas", tv: "Series", anime: "Anime", doc: "Documentales" };
    function analyticsItem(type, id) {
      var items = localAnalytics.items || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type === type && String(items[i].id) === String(id)) return items[i];
      }
      return null;
    }
    function categoryOf(it) {
      var g = it.genreIds || [];
      if (g.indexOf(99) > -1) return "doc";
      if (g.indexOf(16) > -1 && it.lang === "ja") return "anime";
      return it.type === "tv" ? "tv" : "movie";
    }
    function completedTitles() { return (localAnalytics.items || []).filter(function (x) { return x.done > 0; }); }
    function tasteWeight(it) {
      var d = it.done || 0;
      if (d > 0) return 1.4 + 0.5 * Math.min(3, d) + Math.min(1, (it.secs || 0) / 7200);
      return (it.secs || 0) > 600 ? 0.6 : 0.25;
    }
    var watch = null, watchTimer = null;
    decorate("recordMediaStart", function (original) { return function (media, genreIds) {
      original(media, genreIds);
      var it = analyticsItem(media.type, media.id);
      if (it) {
        if (media.bg && !it.bg) it.bg = media.bg;
        it.secs = it.secs || 0;
        it.done = it.done || 0;
      }
      watch = { type: media.type, id: media.id, epKey: null, epSecs: 0, counted: false, sinceFlush: 0 };
      captureMediaMeta(media);
    }; });
    function captureMediaMeta(media) {
      var endpoint = media.type === "tv" ? "/tv/" + media.id : "/movie/" + media.id;
      var append = media.type === "movie" ? "&append_to_response=recommendations,similar" : "";
      fetchTMDB(endpoint, append).then(function (d) {
        var it = analyticsItem(media.type, media.id);
        if (!it || !d) return;
        (d.genres || []).forEach(function (g) { if (it.genreIds.indexOf(g.id) === -1 && it.genreIds.length < 8) it.genreIds.push(g.id); });
        it.lang = d.original_language || it.lang || "";
        it.runtime = media.type === "tv"
          ? ((d.episode_run_time && d.episode_run_time[0]) || (d.last_episode_to_air && d.last_episode_to_air.runtime) || 40)
          : (d.runtime || 100);
        it.cat = categoryOf(it);
        if (watch) watch.dirty = true;
      }).catch(function () { });
    }
    function watchRuntimeSec() {
      if (!watch) return 0;
      var it = analyticsItem(watch.type, watch.id);
      if (watch.type === "tv") {
        var ep = Number($episodeSelect.value || 0);
        var e = (currentTvEpisodes || []).find(function (x) { return Number(x.episode_number) === ep; });
        return ((e && e.runtime) || (it && it.runtime) || 40) * 60;
      }
      return ((it && it.runtime) || 100) * 60;
    }
    function setContinuePct(pct) {
      for (var i = 0; i < continueWatching.length; i++) {
        var m = continueWatching[i];
        if (m.type === watch.type && String(m.id) === String(watch.id)) { m.pct = pct; return; }
      }
    }
    function markCompleted() {
      if (!watch || watch.counted) return;
      var it = analyticsItem(watch.type, watch.id);
      if (!it) return;
      watch.counted = true;
      it.done = (it.done || 0) + 1;
      if (typeof autoMarkWatched === "function") autoMarkWatched(it);
      setContinuePct(100);
      flushWatch();
    }
    function flushWatch() {
      if (!watch) return;
      watch.sinceFlush = 0;
      saveLocalAnalytics();
      safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
    }
    function watchTick() {
      if (!watch || !$modal.classList.contains("open") || document.hidden || !activePlayerFrame) return;
      var it = analyticsItem(watch.type, watch.id);
      if (!it) return;
      if (watch.type === "tv") {
        var k = $seasonSelect.value + ":" + $episodeSelect.value;
        if (k !== watch.epKey) { watch.epKey = k; watch.epSecs = 0; watch.counted = false; watch.nextPrompted = false; }
      }
      it.secs = (it.secs || 0) + 5;
      it.lastPlayedAt = Date.now();
      watch.epSecs += 5;
      var total = watchRuntimeSec();
      if (total) setContinuePct(Math.min(99, Math.round(watch.epSecs / total * 100)));
      if (!watch.counted && total && watch.epSecs >= total * 0.8) markCompleted();
      if (watch.type === "tv" && autoNextEpisode && total && watch.epSecs >= total * 0.985 && !watch.nextPrompted) {
        watch.nextPrompted = true;               // una vez por episodio; si el reproductor avisa "ended", se adelanta solo
        showNextEpisodePrompt();
      }
      watch.sinceFlush += 5;
      if (watch.sinceFlush >= 30) flushWatch();
    }
    watchTimer = setInterval(watchTick, 5000);
    window.addEventListener("message", function (event) {
      if (!watch || !activePlayerFrame || event.source !== activePlayerFrame.contentWindow) return;
      if (isEndedPlayerMessage(event.data)) markCompleted();
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden) flushWatch(); });
    window.addEventListener("pagehide", flushWatch);
    decorate("closePlayer", function (original) { return function () {
      flushWatch();
      watch = null;
      return original.apply(this, arguments);
    }; });
    decorate("saveContinueWatching", function (original) { return function (media, season, episode) {
      var old = continueWatching.find(function (m) { return m.id === media.id && m.type === media.type; });
      var pct = old && String(old.season || "") === String(season || "") && String(old.episode || "") === String(episode || "") ? old.pct : 0;
      original(media, season, episode);
      if (pct && continueWatching[0]) continueWatching[0].pct = pct;
    }; });
    function updateLocalAnalyticsUI() {
      var el = $("local-analytics-summary");
      if (!el) return;
      var done = completedTitles().length;
      var names = getTasteProfile().slice(0, 3).map(function (x) { return x.name; });
      el.textContent = getDistinctPlayedCount() + " títulos reproducidos · " + done + " finalizados. " +
        (done < 2 ? "Termina 2 títulos para activar «Hecho para ti». " : (names.length ? "Géneros principales: " + names.join(", ") + ". " : "")) +
        "Los datos permanecen en este dispositivo.";
    };

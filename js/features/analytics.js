/**
 * TatoCine · js/features/analytics.js
 * Analítica local base: reproducciones, géneros y perfil de gustos.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function getDistinctPlayedCount() {
      var seen = {};
      (localAnalytics.items || []).forEach(function (x) {
        seen[x.type + ":" + x.id] = true;
      });
      return Object.keys(seen).length;
    }
    function saveLocalAnalytics() {
      safeStorageSet(profileStorageKey(LOCAL_ANALYTICS_KEY), JSON.stringify(localAnalytics));
      updateLocalAnalyticsUI();
    }
    function recordMediaStart(media, genreIds) {
      if (!media || !media.id || !media.type) return;
      var key = media.type + ":" + media.id;
      var now = Date.now();
      var item = (localAnalytics.items || []).find(function (x) {
        return x.type + ":" + x.id === key;
      });
      if (!item) {
        item = {
          id: media.id,
          type: media.type,
          title: media.title || "Contenido",
          genreIds: [],
          plays: 0,
          firstPlayedAt: now,
          lastPlayedAt: now,
        };
        localAnalytics.items.push(item);
      }
      item.plays = (item.plays || 0) + 1;
      item.lastPlayedAt = now;
      item.title = media.title || item.title;
      (genreIds || media.genre_ids || []).forEach(function (id) {
        var n = Number(id);
        if (n && item.genreIds.indexOf(n) === -1) item.genreIds.push(n);
      });
      localAnalytics.items = localAnalytics.items.slice(-120);
      saveLocalAnalytics();
    }
    function updateMediaGenres(media, genreIds) {
      if (!media || !media.id || !media.type) return;
      var key = media.type + ":" + media.id;
      var item = (localAnalytics.items || []).find(function (x) {
        return x.type + ":" + x.id === key;
      });
      if (!item) return;
      (genreIds || []).forEach(function (id) {
        var n = Number(id);
        if (n && item.genreIds.indexOf(n) === -1) item.genreIds.push(n);
      });
      saveLocalAnalytics();
    }
    function getTasteProfile() {
      var counts = {};
      var names = {};
      var source = localAnalytics.items || [];
      source.forEach(function (item) {
        (item.genreIds || []).forEach(function (id) {
          // Los gustos recientes pesan más; los antiguos se atenúan sin desaparecer.
          var ageDays = Math.max(0, (Date.now() - (item.lastPlayedAt || Date.now())) / 86400000);
          var recency = 0.4 + 0.6 * Math.pow(0.5, ageDays / 45);
          counts[id] =
            (counts[id] || 0) + tasteWeight(item) * recency;
        });
      });
      // Señales extra (valoraciones me gusta/no me gusta del usuario) definidas en features/watched.js
      if (typeof tasteExtras === "function") {
        tasteExtras().forEach(function (x) {
          x.genres.forEach(function (id) { counts[id] = Math.max(0, (counts[id] || 0) + x.weight); });
        });
      }
      var genreNames = {
        28: "Acción",
        12: "Aventura",
        16: "Animación",
        35: "Comedia",
        80: "Crimen",
        99: "Documental",
        18: "Drama",
        10751: "Familia",
        14: "Fantasía",
        36: "Historia",
        27: "Terror",
        10402: "Música",
        9648: "Misterio",
        10749: "Romance",
        878: "Ciencia ficción",
        10770: "Película para televisión",
        53: "Suspenso",
        10752: "Bélica",
        37: "Western",
        10759: "Acción y aventura",
        10762: "Infantil",
        10763: "Noticias",
        10764: "Reality",
        10765: "Ciencia ficción y fantasía",
        10766: "Telenovela",
        10767: "Talk show",
        10768: "Guerra y política",
      };
      return Object.keys(counts)
        .map(function (id) {
          return {
            id: Number(id),
            score: Math.round(counts[id] * 100) / 100,
            name: genreNames[id] || "Otros",
          };
        })
        .sort(function (a, b) {
          return b.score - a.score;
        });
    }
    function clearLocalAnalytics() {
      if (
        !confirm(
          "¿Borrar el historial local que utiliza TatoCine para personalizar las recomendaciones?",
        )
      )
        return;
      localAnalytics = { items: [] };
      safeStorageRemove(profileStorageKey(LOCAL_ANALYTICS_KEY));
      document.querySelectorAll(".personalized-row").forEach(function (row) {
        if (row.parentNode) row.parentNode.removeChild(row);
      });
      updateLocalAnalyticsUI();
      closeSettings();
      showToast("Preferencias locales borradas");
    }

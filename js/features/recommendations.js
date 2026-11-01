/**
 * TatoCine · js/features/recommendations.js
 * Recomendaciones locales («Hecho para ti» y «Porque viste…»).
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Recomendaciones locales: se activan con 2 títulos finalizados y mejoran con cada uno más ----
    function insertPersonalRow(title, picks, anchor, className) {
      var row = document.createElement("div");
      row.className = "row catalog-row personalized-row " + (className || "");
      row.innerHTML =
        '<div class="row-header"><h2 class="row-title">' + escapeHTML(title) + '</h2></div><button class="row-nav prev" data-act="row-scroll" data-dir="-1" aria-label="Anterior">‹</button><button class="row-nav next" data-act="row-scroll" data-dir="1" aria-label="Siguiente">›</button><div class="row-scroll">' +
        picks.map(getCardHTML).join("") + "</div>";
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(row, anchor.nextSibling);
      else $rowsContainer.insertBefore(row, $rowsContainer.querySelector(".catalog-row") || null);
      return row;
    }
    function loadPersonalizedHomeRow() {
      if (isKidProfile()) return;
      var items = localAnalytics.items || [];
      var done = completedTitles();
      var n = done.length;
      if (n < 2) return;                                   // mínimo 2 títulos finalizados
      var profile = getTasteProfile();
      if (!profile.length) return;
      var snapshot = catalogRequestId;
      var now = Date.now();
      var weights = {};
      profile.forEach(function (p) { weights[p.id] = p.score; });
      var maxWeight = profile[0].score || 1;
      var genreCount = n < 5 ? 3 : n < 10 ? 4 : 5;         // más datos = perfil más fino
      var topGenres = profile.slice(0, genreCount).map(function (x) { return x.id; });
      var typeScore = { movie: 0, tv: 0 }, langScore = {}, langTotal = 0;
      done.forEach(function (it) {
        var w = tasteWeight(it) * recencyOf(it);
        typeScore[it.type === "tv" ? "tv" : "movie"] += w;
        if (it.lang) { langScore[it.lang] = (langScore[it.lang] || 0) + w; langTotal += w; }
      });
      var typeTotal = typeScore.movie + typeScore.tv || 1;
      var typeShare = { movie: typeScore.movie / typeTotal, tv: typeScore.tv / typeTotal };
      var topLang = Object.keys(langScore).sort(function (a, b) { return langScore[b] - langScore[a]; })[0];
      var langShare = topLang && langTotal ? langScore[topLang] / langTotal : 0;
      var seedCount = Math.max(2, Math.min(6, 1 + Math.ceil(n / 2)));
      var seeds = done.slice().sort(function (a, b) {
        function sc(x) { return tasteWeight(x) * recencyOf(x, 30); }
        return sc(b) - sc(a);
      }).slice(0, seedCount);
      var favSeeds = myList.slice(-2).filter(function (f) {
        return !seeds.some(function (s) { return s.type === f.type && String(s.id) === String(f.id); });
      }).map(function (f) { return { type: f.type, id: f.id, title: f.title, fav: true }; });
      var liked = (typeof likedSeeds === "function" ? likedSeeds() : []).filter(function (l) {
        return !seeds.concat(favSeeds).some(function (s) { return s.type === l.type && String(s.id) === String(l.id); });
      });
      var allSeeds = seeds.concat(favSeeds, liked);
      var genreParam = encodeURIComponent(topGenres.join("|"));
      var pages = n >= 4 ? [1, 2] : [1];
      var requests = [];
      pages.forEach(function (pg) {
        requests.push(fetchTMDB("/discover/movie", "&with_genres=" + genreParam + "&sort_by=popularity.desc&vote_count.gte=60&page=" + pg));
        requests.push(fetchTMDB("/discover/tv", "&with_genres=" + genreParam + "&sort_by=popularity.desc&vote_count.gte=30&page=" + pg));
      });
      var seedOffset = requests.length;
      allSeeds.forEach(function (sd) {
        requests.push(fetchTMDB("/" + (sd.type === "tv" ? "tv" : "movie") + "/" + sd.id + "/recommendations"));
      });
      Promise.all(requests.map(function (p) { return p.catch(function () { return null; }); })).then(function (res) {
        if (snapshot !== catalogRequestId || currentView !== "home") return;
        var seen = {};
        items.forEach(function (x) { seen[x.type + ":" + x.id] = true; });
        myList.forEach(function (x) { seen[x.type + ":" + x.id] = true; });
        if (typeof watchedList === "function") watchedList().forEach(function (x) { seen[x.type + ":" + x.id] = true; });
        var pool = {};
        function add(raw, type, source, seedIdx) {
          if (!raw || !raw.id || seen[type + ":" + raw.id]) return;
          if (!(raw.backdrop_path || raw.poster_path)) return;
          var key = type + ":" + raw.id;
          if (!pool[key]) pool[key] = { raw: raw, type: type, seedHits: 0, discover: false, seeds: [] };
          if (source === "seed") { pool[key].seedHits++; pool[key].seeds.push(seedIdx); } else pool[key].discover = true;
        }
        pages.forEach(function (pg, i) {
          ((res[i * 2] && res[i * 2].results) || []).forEach(function (x) { add(x, "movie", "discover"); });
          ((res[i * 2 + 1] && res[i * 2 + 1].results) || []).forEach(function (x) { add(x, "tv", "discover"); });
        });
        allSeeds.forEach(function (sd, i) {
          var r = res[seedOffset + i];
          ((r && r.results) || []).forEach(function (x) { add(x, sd.type === "tv" ? "tv" : "movie", "seed", i); });
        });
        var scored = Object.keys(pool).map(function (key) {
          var c = pool[key];
          var g = c.raw.genre_ids || [];
          var genreScore = g.reduce(function (sum, id) { return sum + (weights[id] || 0); }, 0) / (maxWeight * 2);
          var votes = c.raw.vote_count || 0;
          var quality = votes >= 40 ? (c.raw.vote_average || 0) / 10 : 0.3;
          var pop = Math.min(1, Math.log10((c.raw.popularity || 0) + 1) / 3);
          var lang = topLang && c.raw.original_language === topLang ? 0.15 * langShare : 0;
          var score = Math.min(1.5, genreScore) + c.seedHits * 0.55 + (c.discover ? 0.1 : 0) + quality * 0.8 + pop * 0.2 + typeShare[c.type] * 0.35 + lang;
          var mapped = c.type === "tv" ? mapTvResult(c.raw) : mapMovieResult(c.raw);
          if (mapped.isUpcoming) return null;
          mapped._tasteScore = score;
          mapped._seeds = c.seeds;
          return mapped;
        }).filter(Boolean);
        scored.sort(function (a, b) { return b._tasteScore - a._tasteScore; });
        var limit = n < 4 ? 16 : n < 8 ? 20 : 24;
        var cap = {
          movie: Math.max(6, Math.ceil(limit * Math.min(0.85, typeShare.movie + 0.25))),
          tv: Math.max(6, Math.ceil(limit * Math.min(0.85, typeShare.tv + 0.25)))
        };
        var picks = [], counts = { movie: 0, tv: 0 }, used = {};
        scored.forEach(function (m) {
          if (picks.length >= limit || counts[m.type] >= cap[m.type]) return;
          counts[m.type]++;
          used[m.type + ":" + m.id] = true;
          picks.push(m);
        });
        if (!picks.length) return;
        var main = insertPersonalRow("Hecho para ti", picks, null, "");
        // "Porque viste X": recomendaciones directas del título finalizado más relevante.
        var because = scored.filter(function (m) { return m._seeds.indexOf(0) > -1 && !used[m.type + ":" + m.id]; }).slice(0, 16);
        if (because.length >= 6 && seeds[0]) insertPersonalRow("Porque viste " + seeds[0].title, because, main, "because-row");
      }).catch(function () { });
    };
    function recencyOf(it, half) {
      var age = Math.max(0, (Date.now() - (it.lastPlayedAt || Date.now())) / 86400000);
      return 0.4 + 0.6 * Math.pow(0.5, age / (half || 45));
    }

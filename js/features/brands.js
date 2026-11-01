/**
 * TatoCine · js/features/brands.js
 * Plataformas y estudios: fila del inicio, imágenes y catálogos.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Estudios y plataformas (estilo Disney+, Netflix, Prime, Max...) ----
    var BRANDS = [
      { key: "netflix", name: "Netflix", provider: 8 },
      { key: "disney", name: "Disney+", provider: 337 },
      { key: "max", name: "HBO Max", provider: 1899 },
      { key: "prime", name: "Prime Video", provider: 9 },
      { key: "apple", name: "Apple TV", provider: 350 },
      { key: "hulu", name: "Hulu", provider: 15 },
      { key: "crunchyroll", name: "Crunchyroll", provider: 283 },
      { key: "marvel", name: "Marvel Studios", company: 420 },
      { key: "pixar", name: "Pixar", company: 3 },
      { key: "wdp", name: "Walt Disney Pictures", company: 2 },
      { key: "lucasfilm", name: "Lucasfilm", company: 1 },
      { key: "dc", name: "DC", company: 9993 },
      { key: "warner", name: "Warner Bros.", company: 174 },
      { key: "universal", name: "Universal", company: 33 },
      { key: "paramount", name: "Paramount", company: 4 },
      { key: "ghibli", name: "Studio Ghibli", company: 10342 },
      { key: "a24", name: "A24", company: 41077 }
    ];
    function brandQuery(b, page) {
      var base = "&sort_by=popularity.desc&vote_count.gte=20&page=" + page;
      return b.provider ? "&with_watch_providers=" + b.provider + "&watch_region=US&with_watch_monetization_types=flatrate" + base : "&with_companies=" + b.company + base;
    }
    function loadBrandView(key) {
      var b = BRANDS.find(function (x) { return x.key === key; });
      var snapshot = ++catalogRequestId;
      $loadMoreContainer.innerHTML = "";
      if (!b) { switchView("home"); return; }
      var view = currentView;
      Promise.all([
        fetchTMDB("/discover/movie", brandQuery(b, 1)), fetchTMDB("/discover/movie", brandQuery(b, 2)),
        fetchTMDB("/discover/tv", brandQuery(b, 1)), fetchTMDB("/discover/tv", brandQuery(b, 2))
      ].map(function (p) { return p.catch(function () { return null; }); })).then(function (r) {
        if (snapshot !== catalogRequestId || currentView !== view) return;
        $rowsContainer.innerHTML = "";
        var movies = [].concat((r[0] && r[0].results) || [], (r[1] && r[1].results) || []).map(mapMovieResult);
        var shows = [].concat((r[2] && r[2].results) || [], (r[3] && r[3].results) || []).map(function (i) { return mapTvResult(i); });
        var seen = {};
        function uniq(list) { return list.filter(function (m) { var k = m.type + m.id; if (seen[k]) return false; seen[k] = true; return true; }); }
        movies = uniq(movies); shows = uniq(shows);
        var first = movies[0] || shows[0];
        if (!first) { $rowsContainer.innerHTML = '<div class="empty-state"><h2>Sin resultados</h2><p>No encontramos contenido para ' + escapeHTML(b.name) + ".</p></div>"; return; }
        setHero(first);
        if (movies.length) renderRow("Películas · " + b.name, movies);
        if (shows.length) renderRow("Series · " + b.name, shows);
        startHeroCarousel(movies.slice(0, 3).concat(shows.slice(0, 2)));
      });
    }

    // ---- Plataformas y estudios con imagen de fondo ----
    var brandBgStore = readLocalJSON("tatoBrandBgV1", null);
    if (!brandBgStore || typeof brandBgStore.m !== "object") brandBgStore = { ts: 0, m: {} };
    function applyBrandBg(tile, path) {
      tile.style.backgroundImage = "url('" + IMG_CARD + path + "')";
      tile.classList.add("has-bg");
    }
    function loadBrandImages(row) {
      var stale = Date.now() - (brandBgStore.ts || 0) > 7 * 86400000;
      var queue = [];
      row.querySelectorAll(".brand-tile").forEach(function (tile) {
        var key = tile.getAttribute("data-key");
        if (brandBgStore.m[key]) applyBrandBg(tile, brandBgStore.m[key]);
        if (!brandBgStore.m[key] || stale) queue.push(tile);
      });
      var active = 0, index = 0, total = queue.length, finished = 0;
      if (!total) return;
      function next() {
        while (active < 3 && index < total) {
          (function (tile) {
            active++;
            var b = BRANDS.find(function (x) { return x.key === tile.getAttribute("data-key"); });
            fetchTMDB("/discover/movie", brandQuery(b, 1)).then(function (d) {
              var r = ((d && d.results) || []).find(function (x) { return x.backdrop_path; });
              if (r) { brandBgStore.m[b.key] = r.backdrop_path; applyBrandBg(tile, r.backdrop_path); }
            }).catch(function () { }).then(function () {
              active--; finished++;
              if (finished === total) { brandBgStore.ts = Date.now(); safeStorageSet("tatoBrandBgV1", JSON.stringify(brandBgStore)); }
              next();
            });
          })(queue[index++]);
        }
      }
      next();
    }
    function renderBrandRow() {
      if (isKidProfile()) return;
      var row = document.createElement("div");
      row.className = "row brand-row";
      row.innerHTML = '<div class="row-header"><h2 class="row-title">Plataformas y estudios</h2></div>' +
        '<button class="row-nav prev" onclick="scrollRow(this,-1)" aria-label="Anterior">‹</button><button class="row-nav next" onclick="scrollRow(this,1)" aria-label="Siguiente">›</button>' +
        '<div class="row-scroll">' + BRANDS.map(function (b) {
          return '<button type="button" class="brand-tile" data-key="' + b.key + '" onclick="switchView(\'brand:' + b.key + '\')"><span>' + escapeHTML(b.name) + "</span></button>";
        }).join("") + "</div>";
      $rowsContainer.appendChild(row);
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { io.disconnect(); loadBrandImages(row); }
        }, { rootMargin: "400px" });
        io.observe(row);
      } else loadBrandImages(row);
    };

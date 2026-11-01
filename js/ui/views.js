/**
 * TatoCine · js/ui/views.js
 * Navegación entre vistas y carga de catálogos (inicio, películas, series, anime, niños).
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function buildSkeletonRows() { return skeletonRows(3, 5); }
    function switchView(v, r) {
      if (r === undefined) r = true;
      // Perfil infantil: la única sección disponible es Niños.
      if (isKidProfile() && v !== "kids") v = "kids";
      document.body.classList.toggle("kids-view", v === "kids");
      document.body.classList.toggle("brand-view", v.indexOf("brand:") === 0);
      // Al cambiar de pestaña, la vista empieza siempre desde arriba (no donde se quedó el scroll).
      if (r !== false || v !== currentView) {
        try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); }
        var focused = document.activeElement;
        if (focused && focused !== document.body && focused.blur) focused.blur();
      }
      searchRequestId++;
      catalogRequestId++;
      clearTimeout(searchDebounceTimer);
      clearInterval(heroInterval);
      currentView = v;
      isSearching = false;
      currentGenreFilter = "";
      currentPage = 1;
      currentMaxPage = MAX_TMDB_PAGE;
      isLoadingMore = false;
      hasMorePages = false;
      filtersState = { year: "", rating: "", sort: "popularity.desc" };
      if (r) $searchInput.value = "";
      resetPageSEO();
      $heroSection.classList.remove("empty-search");
      $heroActions.style.display = "";
      document.querySelectorAll(".nav-item").forEach(function (b) {
        b.classList.remove("active");
      });
      document
        .querySelectorAll('.nav-item[data-view="' + v + '"]')
        .forEach(function (btn) {
          btn.classList.add("active");
        });
      $genreContainer.innerHTML = "";
      $loadMoreContainer.innerHTML = "";
      $rowsContainer.innerHTML = buildSkeletonRows();
      if (v !== "list") { setHeroLoading(true); setTimeout(function () { setHeroLoading(false); }, 12000); }
      if (v === "list") {
        $heroSection.style.display = "none";
        $rowsContainer.style.paddingTop = "110px";
        renderFavoritesView();
        return;
      }
      $heroSection.style.display = "flex";
      $rowsContainer.style.paddingTop = "0px";
      if (v === "home") loadHomeView();
      else if (v === "movies") {
        renderGenreFilters("movies");
        loadMoviesView();
      } else if (v === "series") {
        renderGenreFilters("series");
        loadSeriesView();
      } else if (v === "anime") {
        renderGenreFilters("anime");
        loadAnimeView();
      } else if (v === "kids") {
        renderGenreFilters("kids");
        loadKidsView();
      } else if (v.indexOf("brand:") === 0) {
        loadBrandView(v.slice(6));
      }
    }
    function buildDiscoverQuery() {
      var parts = [];
      parts.push("&sort_by=" + filtersState.sort);
      if (currentGenreFilter)
        parts.push("&with_genres=" + currentGenreFilter);
      if (filtersState.year)
        parts.push("&primary_release_year=" + filtersState.year);
      if (filtersState.rating)
        parts.push("&vote_average.gte=" + filtersState.rating);
      return parts.join("");
    }

    // Paginación progresiva. TMDB limita la paginación a 500 páginas por consulta.
    function requestMoreWhenNearBottom() {
      if (
        !isLoadingMore &&
        hasMorePages &&
        currentView !== "list" &&
        !isSearching
      )
        loadMore();
    }
    if ("IntersectionObserver" in window) {
      loadMoreObserver = new IntersectionObserver(
        function (entries) {
          if (entries[0] && entries[0].isIntersecting)
            requestMoreWhenNearBottom();
        },
        { root: null, rootMargin: "700px 0px", threshold: 0 },
      );
      loadMoreObserver.observe(document.getElementById("sentinel"));
    } else {
      loadMoreScrollFallback = true;
      var scrollCheckPending = false;
      window.addEventListener(
        "scroll",
        function () {
          if (scrollCheckPending) return;
          scrollCheckPending = true;
          setTimeout(function () {
            scrollCheckPending = false;
            var sentinel = $("sentinel");
            if (!sentinel) return;
            var rect = sentinel.getBoundingClientRect();
            if (
              rect.top <
              (window.innerHeight || document.documentElement.clientHeight) +
              700
            )
              requestMoreWhenNearBottom();
          }, 120);
        },
        false,
      );
    }
    function renderLoadMore(totalPages) {
      if (typeof totalPages === "number" && totalPages > 0)
        currentMaxPage = Math.min(MAX_TMDB_PAGE, totalPages);
      else
        currentMaxPage = Math.min(
          MAX_TMDB_PAGE,
          currentMaxPage || MAX_TMDB_PAGE,
        );
      hasMorePages = currentPage < currentMaxPage;
      if (!hasMorePages) {
        $loadMoreContainer.innerHTML = "";
        return;
      }
      $loadMoreContainer.innerHTML =
        '<button class="load-more-btn" onclick="loadMore()">Cargar más</button>';
    }

    function mapMovieResult(i) {
      var date = i.release_date;
      return {
        id: i.id,
        title: i.title,
        bg: i.backdrop_path || i.poster_path,
        type: "movie",
        desc: i.overview,
        rating: i.vote_average,
        year: date ? date.split("-")[0] : "",
        isUpcoming: isUpcoming(date, i.status, "movie"),
        status: i.status,
        original_language: i.original_language,
        genre_ids: i.genre_ids || [],
      };
    }
    function mapTvResult(i, category) {
      var date = i.first_air_date;
      return {
        id: i.id,
        title: i.name,
        bg: i.backdrop_path || i.poster_path,
        type: "tv",
        desc: i.overview,
        rating: i.vote_average,
        year: date ? date.split("-")[0] : "",
        isUpcoming: isUpcoming(date, i.status, "tv"),
        status: i.status,
        original_language: i.original_language,
        genre_ids: i.genre_ids || [],
        category: category || undefined,
      };
    }
    function loadMore() {
      if (isLoadingMore || !hasMorePages || currentPage >= MAX_TMDB_PAGE)
        return;
      isLoadingMore = true;
      currentPage++;
      var requestedView = currentView;
      var requestedPage = currentPage;
      var requestedCatalogId = catalogRequestId;
      var btn = $loadMoreContainer.querySelector(".load-more-btn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Cargando...";
      }
      if (currentView === "kids") {
        var movieQ =
          "&certification_country=US&certification=G&without_genres=27,53,80,10752&sort_by=popularity.desc&page=" +
          currentPage;
        var tvQ =
          "&certification_country=US&certification=TV-Y|TV-Y7|TV-G&without_genres=27,53,80,10752&sort_by=popularity.desc&page=" +
          currentPage;
        if (currentGenreFilter) {
          movieQ += "&with_genres=" + currentGenreFilter;
          tvQ += "&with_genres=" + currentGenreFilter;
        }
        Promise.all([
          fetchTMDB("/discover/movie", movieQ),
          fetchTMDB("/discover/tv", tvQ),
        ])
          .then(function (res) {
            if (
              requestedView !== currentView ||
              requestedCatalogId !== catalogRequestId
            )
              return;
            var mv = res[0],
              tv = res[1];
            if (mv.results && mv.results.length)
              renderRow(
                "Películas para Niños · página " + currentPage,
                mv.results.map(mapMovieResult),
              );
            if (tv.results && tv.results.length)
              renderRow(
                "Series para Niños · página " + currentPage,
                tv.results.map(function (i) {
                  return mapTvResult(i, "Serie infantil");
                }),
              );
            var max = Math.max(mv.total_pages || 1, tv.total_pages || 1);
            isLoadingMore = false;
            renderLoadMore(max);
          })
          .catch(function () {
            currentPage = Math.max(1, currentPage - 1);
            isLoadingMore = false;
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Reintentar";
            }
          });
        return;
      }
      var endpoint = "",
        query = "",
        title = "Página " + currentPage;
      if (currentView === "home") {
        endpoint = "/trending/movie/week";
        query = "&page=" + currentPage;
        title = "Más tendencias";
      } else if (currentView === "movies") {
        endpoint = "/discover/movie";
        query = buildDiscoverQuery() + "&page=" + currentPage;
      } else if (currentView === "series") {
        endpoint = "/discover/tv";
        query = buildDiscoverQuery() + "&page=" + currentPage;
      } else if (currentView === "anime") {
        endpoint = "/discover/tv";
        query =
          "&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=" +
          currentPage;
        if (filtersState.year)
          query += "&first_air_date_year=" + filtersState.year;
        if (filtersState.rating)
          query += "&vote_average.gte=" + filtersState.rating;
        if (filtersState.sort !== "popularity.desc")
          query = query.replace(
            "sort_by=popularity.desc",
            "sort_by=" + filtersState.sort,
          );
      }
      if (!endpoint) {
        isLoadingMore = false;
        return;
      }
      fetchTMDB(endpoint, query)
        .then(function (d) {
          if (
            requestedView !== currentView ||
            requestedCatalogId !== catalogRequestId
          )
            return;
          if (d.results && d.results.length) {
            var m = d.results.map(function (i) {
              return currentView === "movies" || currentView === "home"
                ? mapMovieResult(i)
                : mapTvResult(
                  i,
                  currentView === "anime" ? "Anime" : undefined,
                );
            });
            renderRow(
              currentView === "home"
                ? title
                : currentView === "movies"
                  ? "Películas · página " + currentPage
                  : currentView === "series"
                    ? "Series · página " + currentPage
                    : "Anime · página " + currentPage,
              m,
            );
          } else {
            currentMaxPage = currentPage;
          }
          isLoadingMore = false;
          renderLoadMore(d.total_pages || currentMaxPage);
        })
        .catch(function () {
          currentPage = Math.max(1, currentPage - 1);
          isLoadingMore = false;
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Reintentar";
          }
        });
    }

    function loadTop10AndCollections(snapshot) {
      var collections = [
        { title: "Colección · Acción y aventura", query: "&with_genres=28|12&sort_by=popularity.desc&vote_count.gte=80&page=1" },
        { title: "Colección · Ciencia ficción y fantasía", query: "&with_genres=878|14&sort_by=popularity.desc&vote_count.gte=60&page=1" },
        { title: "Colección · Misterio, suspenso y terror", query: "&with_genres=9648|53|27&sort_by=popularity.desc&vote_count.gte=50&page=1" }
      ];
      var requests = [fetchTMDB("/trending/all/week")].concat(collections.map(function (item) {
        return fetchTMDB("/discover/movie", item.query);
      }));
      Promise.all(requests).then(function (results) {
        if (snapshot !== catalogRequestId || currentView !== "home") return;
        var ranked = (results[0].results || []).filter(function (item) {
          return item && item.id && (item.media_type === "movie" || item.media_type === "tv" || item.title || item.name);
        }).slice(0, 10).map(function (item, index) {
          var media = item.media_type === "tv" ? mapTvResult(item) : mapMovieResult(item);
          media.topRank = index + 1;
          return media;
        });
        if (ranked.length) renderRow("Top 10 de la semana", ranked);
        collections.forEach(function (collection, index) {
          var data = results[index + 1];
          if (!data || !data.results || !data.results.length) return;
          renderRow(collection.title, data.results.map(mapMovieResult));
        });
      }).catch(function () { });
    }

    function loadHomeView() {
      var snapshot = catalogRequestId;
      Promise.all([
        fetchTMDB("/trending/movie/week"),
        fetchTMDB("/movie/upcoming", "&region=" + (UI_EN ? "US" : "GT")),
        fetchTMDB("/movie/popular"),
        fetchTMDB("/tv/popular"),
      ])
        .then(function (res) {
          if (snapshot !== catalogRequestId || currentView !== "home") return;
          var t = res[0],
            u = res[1],
            p = res[2],
            s = res[3];
          $rowsContainer.innerHTML = "";
          var h = null;
          renderContinueRow();
          if (t.results && t.results.length) {
            var m = t.results.map(mapMovieResult);
            h = m[0];
            renderRow("Tendencias de la semana", m);
            startHeroCarousel(m);
          }
          if (u.results && u.results.length)
            renderRow("Próximos Estrenos", u.results.map(mapMovieResult));
          if (p.results && p.results.length)
            renderRow("Películas Populares", p.results.map(mapMovieResult));
          if (s.results && s.results.length)
            renderRow("Series Populares", s.results.map(mapTvResult));
            renderBrandRow();
          if (h) setHero(h);
          renderLoadMore(t.total_pages || 1);
          // Las filas no esenciales se escalonan para mostrar primero el catálogo principal.
          // Cada tarea comprueba el identificador de vista para no insertar resultados obsoletos.
          window.setTimeout(function () {
            if (snapshot === catalogRequestId && currentView === "home") loadPersonalizedHomeRow();
          }, 250);
          window.setTimeout(function () {
            IDLE(function () { if (snapshot === catalogRequestId && currentView === "home") loadTop10AndCollections(snapshot); });
          }, 650);
          window.setTimeout(function () {
            if (snapshot !== catalogRequestId || currentView !== "home") return;
            fetchTMDB("/discover/movie", "&sort_by=vote_average.desc&vote_count.gte=300&page=1")
              .then(function (d) {
                if (snapshot !== catalogRequestId || currentView !== "home" || !d.results || !d.results.length) return;
                var top = d.results.map(mapMovieResult).sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
                renderRow("Películas mejor calificadas", top);
              }).catch(function () { });
          }, 1250);
          window.setTimeout(function () {
            if (snapshot !== catalogRequestId || currentView !== "home") return;
            fetchTMDB("/discover/tv", "&sort_by=vote_average.desc&vote_count.gte=150&page=1")
              .then(function (d) {
                if (snapshot !== catalogRequestId || currentView !== "home" || !d.results || !d.results.length) return;
                var top = d.results.map(mapTvResult).sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
                renderRow("Series mejor calificadas", top);
              }).catch(function () { });
          }, 1750);
        })
        .catch(function () {
          if (snapshot !== catalogRequestId || currentView !== "home") return;
          $rowsContainer.innerHTML =
            emptyOffline();
        });
    }

    function loadMoviesView() {
      var snapshot = ++catalogRequestId;
      isLoadingMore = false;
      $loadMoreContainer.innerHTML = "";
      var query = buildDiscoverQuery() + "&page=1";
      fetchTMDB("/discover/movie", query)
        .then(function (d) {
          if (snapshot !== catalogRequestId || currentView !== "movies")
            return;
          $rowsContainer.innerHTML = "";
          if (d.results && d.results.length) {
            var m = d.results.map(mapMovieResult);
            setHero(m[0]);
            renderRow("Películas", m);
            startHeroCarousel(m);
            renderLoadMore(d.total_pages || 1);
          } else {
            $rowsContainer.innerHTML =
              emptyNone();
          }
        })
        .catch(function () {
          if (snapshot === catalogRequestId && currentView === "movies")
            $rowsContainer.innerHTML =
              emptyOffline();
        });
    }
    function loadSeriesView() {
      var snapshot = ++catalogRequestId;
      isLoadingMore = false;
      $loadMoreContainer.innerHTML = "";
      var query = buildDiscoverQuery() + "&page=1";
      fetchTMDB("/discover/tv", query)
        .then(function (d) {
          if (snapshot !== catalogRequestId || currentView !== "series")
            return;
          $rowsContainer.innerHTML = "";
          if (d.results && d.results.length) {
            var m = d.results.map(mapTvResult);
            setHero(m[0]);
            renderRow("Series", m);
            startHeroCarousel(m);
            renderLoadMore(d.total_pages || 1);
          } else {
            $rowsContainer.innerHTML =
              emptyNone();
          }
        })
        .catch(function () {
          if (snapshot === catalogRequestId && currentView === "series")
            $rowsContainer.innerHTML =
              emptyOffline();
        });
    }
    function loadAnimeView() {
      var snapshot = ++catalogRequestId;
      isLoadingMore = false;
      $loadMoreContainer.innerHTML = "";
      var query =
        "&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1";
      if (filtersState.year)
        query += "&first_air_date_year=" + filtersState.year;
      if (filtersState.rating)
        query += "&vote_average.gte=" + filtersState.rating;
      if (filtersState.sort !== "popularity.desc")
        query = query.replace(
          "sort_by=popularity.desc",
          "sort_by=" + filtersState.sort,
        );
      fetchTMDB("/discover/tv", query)
        .then(function (d) {
          if (snapshot !== catalogRequestId || currentView !== "anime")
            return;
          $rowsContainer.innerHTML = "";
          if (d.results && d.results.length) {
            var m = d.results.map(function (i) {
              return mapTvResult(i, "Anime");
            });
            setHero(m[0]);
            renderRow("Anime", m);
            startHeroCarousel(m);
            renderLoadMore(d.total_pages || 1);
          } else {
            $rowsContainer.innerHTML =
              emptyNone();
          }
        })
        .catch(function () {
          if (snapshot === catalogRequestId && currentView === "anime")
            $rowsContainer.innerHTML =
              emptyOffline();
        });
    }
    function loadKidsView() {
      var snapshot = ++catalogRequestId;
      isLoadingMore = false;
      $loadMoreContainer.innerHTML = "";
      var movieQ =
        "&certification_country=US&certification=G&without_genres=27,53,80,10752&sort_by=popularity.desc&page=1";
      var tvQ =
        "&certification_country=US&certification=TV-Y|TV-Y7|TV-G&without_genres=27,53,80,10752&sort_by=popularity.desc&page=1";
      if (currentGenreFilter) {
        movieQ += "&with_genres=" + currentGenreFilter;
        tvQ += "&with_genres=" + currentGenreFilter;
      }
      Promise.all([
        fetchTMDB("/discover/movie", movieQ),
        fetchTMDB("/discover/tv", tvQ),
      ])
        .then(function (res) {
          if (snapshot !== catalogRequestId || currentView !== "kids") return;
          var mv = res[0],
            tv = res[1];
          $rowsContainer.innerHTML = "";
          var h = null,
            combined = [];
          if (mv.results && mv.results.length) {
            var m = mv.results.map(function (i) {
              var x = mapMovieResult(i);
              x.category = "Película infantil";
              return x;
            });
            h = m[0];
            combined = combined.concat(m);
            renderRow("Películas para Niños", m);
          }
          if (tv.results && tv.results.length) {
            var m = tv.results.map(function (i) {
              return mapTvResult(i, "Serie infantil");
            });
            if (!h) h = m[0];
            combined = combined.concat(m);
            renderRow("Series para Niños", m);
          }
          if (h) {
            setHero(h);
            startHeroCarousel(combined);
            renderLoadMore(
              Math.max(mv.total_pages || 1, tv.total_pages || 1),
            );
          } else {
            $rowsContainer.innerHTML =
              emptyNone();
            $loadMoreContainer.innerHTML = "";
          }
        })
        .catch(function () {
          if (snapshot === catalogRequestId && currentView === "kids")
            $rowsContainer.innerHTML =
              emptyOffline();
        });
    }

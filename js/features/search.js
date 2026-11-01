/**
 * TatoCine · js/features/search.js
 * Búsqueda de películas y series.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function setSearchEmptyState(q) {
      clearInterval(heroInterval);
      heroRequestId++;
      currentHeroMedia = null;
      heroHovered = false;
      $heroSection.classList.add("empty-search");
      $heroVideoWrap.classList.remove("active");
      $heroVideoWrap.innerHTML = "";
      $heroVideoWrap.dataset.key = "";
      $heroBg.style.backgroundImage = "none";
      $heroTitle.textContent = "No encontramos resultados";
      $heroYear.textContent = 'Búsqueda: "' + q + '"';
      $heroMeta.innerHTML = "";
      $heroDesc.textContent =
        "No encontramos películas, series o anime con ese nombre. Prueba con otro título o revisa la escritura.";
      $heroActions.style.display = "none";
      $rowsContainer.innerHTML = "";
      $loadMoreContainer.innerHTML = "";
      $genreContainer.innerHTML = "";
    }
    function setSearchErrorState() {
      clearInterval(heroInterval);
      heroRequestId++;
      currentHeroMedia = null;
      $heroSection.classList.add("empty-search");
      $heroVideoWrap.classList.remove("active");
      $heroVideoWrap.innerHTML = "";
      $heroBg.style.backgroundImage = "none";
      $heroTitle.textContent = "No se pudo completar la búsqueda";
      $heroYear.textContent = "Comprueba tu conexión";
      $heroMeta.innerHTML = "";
      $heroDesc.textContent =
        "TatoCine no pudo consultar el catálogo en este momento. Inténtalo de nuevo.";
      $heroActions.style.display = "none";
      $rowsContainer.innerHTML = "";
      $loadMoreContainer.innerHTML = "";
    }
    function performSearch(q) {
      var myId = ++searchRequestId;
      catalogRequestId++;
      isSearching = true;
      try {
        var url = new URL(location.href);
        url.searchParams.set("q", q);
        url.searchParams.delete("id");
        url.searchParams.delete("type");
        history.replaceState(null, "", url.toString());
      } catch (e) { }
      clearInterval(heroInterval);
      $genreContainer.innerHTML = "";
      $loadMoreContainer.innerHTML = "";
      $rowsContainer.innerHTML = skeletonRows(2);
      fetchTMDB("/search/multi", "&include_adult=false&query=" + encodeURIComponent(q))
        .then(function (d) {
          if (myId !== searchRequestId) return;
          var m = (d.results || [])
            .filter(function (i) {
              return i.media_type === "movie" || i.media_type === "tv";
            })
            .map(function (i) {
              var date = i.release_date || i.first_air_date;
              return {
                id: i.id,
                title: i.title || i.name,
                bg: i.backdrop_path || i.poster_path,
                type: i.media_type,
                desc: i.overview,
                rating: i.vote_average,
                year: date ? date.split("-")[0] : "",
                isUpcoming: isUpcoming(date, i.status, i.media_type),
                status: i.status,
                original_language: i.original_language,
                genre_ids: i.genre_ids || [],
                adult: !!i.adult,
              };
            });
          var showSearchResults = function (list) {
            if (myId !== searchRequestId) return;
            if (list.length > 0) {
              $rowsContainer.innerHTML = "";
              setHero(list[0]);
              renderRow('Resultados para "' + q + '"', list);
              startHeroCarousel(list);
            } else setSearchEmptyState(q);
          };
          // En la sección Niños (o en un perfil infantil) solo se muestra contenido apto: se verifica la clasificación de TMDB.
          if (kidsContext()) kidsFilterSearch(m).then(showSearchResults).catch(function () { showSearchResults([]); });
          else showSearchResults(m);
        })
        .catch(function () {
          if (myId !== searchRequestId) return;
          setSearchErrorState();
        });
    }
    $searchInput.addEventListener("change", function (e) {
      var q = e.target.value.trim();
      if (q.length === 0) {
        isSearching = false;
        try {
          var url = new URL(location.href);
          url.searchParams.delete("q");
          history.replaceState(null, "", url.toString());
        } catch (err) { }
        switchView(currentView, false);
        return;
      }
      performSearch(q);
    });
    $searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var q = $searchInput.value.trim();
        if (q.length) {
          clearTimeout(searchDebounceTimer);
          performSearch(q);
        }
      }
    });
    $searchInput.addEventListener("search", function () {
      if (!$searchInput.value.trim()) {
        isSearching = false;
        try {
          var url = new URL(location.href);
          url.searchParams.delete("q");
          history.replaceState(null, "", url.toString());
        } catch (err) { }
        switchView(currentView, false);
      }
    });

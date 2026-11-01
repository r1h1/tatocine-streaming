/**
 * TatoCine · js/ui/filters.js
 * Géneros, filtros avanzados y estados vacíos/errores de búsqueda.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    var GENRES = {
      movies: [
        { id: 28, name: "Acción" },
        { id: 12, name: "Aventura" },
        { id: 16, name: "Animación" },
        { id: 35, name: "Comedia" },
        { id: 80, name: "Crimen" },
        { id: 18, name: "Drama" },
        { id: 10751, name: "Familia" },
        { id: 14, name: "Fantasía" },
        { id: 27, name: "Terror" },
        { id: 9648, name: "Misterio" },
        { id: 10749, name: "Romance" },
        { id: 878, name: "Sci-Fi" },
        { id: 53, name: "Suspense" },
      ],
      series: [
        { id: 10759, name: "Acción y Aventura" },
        { id: 16, name: "Animación" },
        { id: 35, name: "Comedia" },
        { id: 80, name: "Crimen" },
        { id: 18, name: "Drama" },
        { id: 9648, name: "Misterio" },
        { id: 10765, name: "Sci-Fi & Fantasy" },
      ],
      anime: [
        { id: 10759, name: "Acción y Aventura" },
        { id: 16, name: "Animación" },
        { id: 35, name: "Comedia" },
        { id: 18, name: "Drama" },
        { id: 14, name: "Fantasía" },
        { id: 10749, name: "Romance" },
        { id: 10765, name: "Sci-Fi & Fantasy" },
      ],
      kids: [
        { id: 16, name: "Animación" },
        { id: 10751, name: "Familia" },
        { id: 35, name: "Comedia" },
        { id: 12, name: "Aventura" },
        { id: 14, name: "Fantasía" },
      ],
    };
    function renderGenreFilters(view) {
      $genreContainer.innerHTML = "";
      if (!GENRES[view]) return;
      var div = document.createElement("div");
      div.className = "genre-filters";
      var allActive = currentGenreFilter === "" ? "active" : "";
      div.innerHTML =
        '<button class="genre-chip ' +
        allActive +
        '" onclick="filterByGenre(\'\',this)">Todos</button>';
      GENRES[view].forEach(function (g) {
        var active = currentGenreFilter === String(g.id) ? "active" : "";
        div.innerHTML +=
          '<button class="genre-chip ' +
          active +
          '" onclick="filterByGenre(\'' +
          g.id +
          "',this)\">" +
          g.name +
          "</button>";
      });
      var filterBtn = document.createElement("button");
      filterBtn.className = "genre-chip";
      filterBtn.style.marginLeft = "auto";
      filterBtn.innerHTML = "⚙ Filtros";
      filterBtn.onclick = openFilters;
      div.appendChild(filterBtn);
      $genreContainer.appendChild(div);
    }
    function filterByGenre(genreId, btn) {
      currentGenreFilter = genreId;
      document.querySelectorAll(".genre-chip").forEach(function (c) {
        c.classList.remove("active");
      });
      if (btn) btn.classList.add("active");
      currentPage = 1;
      currentMaxPage = MAX_TMDB_PAGE;
      hasMorePages = false;
      if (currentView === "movies") loadMoviesView();
      else if (currentView === "series") loadSeriesView();
      else if (currentView === "anime") loadAnimeView();
      else if (currentView === "kids") loadKidsView();
    }
    function openFilters() {
      $filtersModal.classList.add("open");
      var years = [""];
      var currentYear = new Date().getFullYear();
      for (var y = currentYear; y >= currentYear - 10; y--)
        years.push(String(y));
      $("filter-year-options").innerHTML = years
        .map(function (y) {
          return (
            '<button class="filter-option ' +
            (filtersState.year === y ? "active" : "") +
            "\" onclick=\"setFilter('year','" +
            y +
            "',this)\">" +
            (y || "Todos") +
            "</button>"
          );
        })
        .join("");
      var ratings = [
        { v: "", l: "Todos" },
        { v: "6", l: "6+" },
        { v: "7", l: "7+" },
        { v: "8", l: "8+" },
        { v: "9", l: "9+" },
      ];
      $("filter-rating-options").innerHTML = ratings
        .map(function (r) {
          return (
            '<button class="filter-option ' +
            (filtersState.rating === r.v ? "active" : "") +
            "\" onclick=\"setFilter('rating','" +
            r.v +
            "',this)\">" +
            r.l +
            "</button>"
          );
        })
        .join("");
      var sorts = [
        { v: "popularity.desc", l: "Popularidad" },
        { v: "vote_average.desc", l: "Mejor puntuadas" },
        { v: "primary_release_date.desc", l: "Más recientes" },
      ];
      $("filter-sort-options").innerHTML = sorts
        .map(function (s) {
          return (
            '<button class="filter-option ' +
            (filtersState.sort === s.v ? "active" : "") +
            "\" onclick=\"setFilter('sort','" +
            s.v +
            "',this)\">" +
            s.l +
            "</button>"
          );
        })
        .join("");
    }
    function closeFilters() {
      $filtersModal.classList.remove("open");
    }
    function setFilter(key, val, btn) {
      filtersState[key] = val;
      btn.parentElement
        .querySelectorAll(".filter-option")
        .forEach(function (b) {
          b.classList.remove("active");
        });
      btn.classList.add("active");
      currentPage = 1;
      currentMaxPage = MAX_TMDB_PAGE;
      hasMorePages = false;
      setTimeout(function () {
        closeFilters();
        if (currentView === "movies") loadMoviesView();
        else if (currentView === "series") loadSeriesView();
        else if (currentView === "anime") loadAnimeView();
        else if (currentView === "kids") loadKidsView();
      }, 200);
    }

/**
 * TatoCine · js/profiles/profile-backdrop.js
 * Fondos cinematográficos rotativos del selector de perfiles.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ==========================================================
    // Selector de perfiles: fondos cinematográficos curados TMDB
    // Orden solicitado; las búsquedas conservan ese orden.
    // ==========================================================
    var PROFILE_BACKDROP_FEATURED = [
      { label: "Stranger Things", type: "tv", queries: ["Stranger Things"] },
      { label: "Ratatouille", type: "movie", queries: ["Ratatouille"] },
      { label: "Batman: El caballero de la noche", type: "movie", queries: ["The Dark Knight", "Batman: El caballero de la noche"] },
      { label: "Yo, él y Raquel", type: "movie", queries: ["Me and Earl and the Dying Girl", "Yo, él y Raquel"] },
      { label: "Loki", type: "tv", queries: ["Loki"] },
      { label: "Game of Thrones", type: "tv", queries: ["Game of Thrones"] },
      { label: "Pulp Fiction", type: "movie", queries: ["Pulp Fiction"] },
      { label: "Star Wars: Episodio III", type: "movie", queries: ["Star Wars: Episode III - Revenge of the Sith", "Revenge of the Sith"] },
      { label: "Naruto Shippuden", type: "tv", queries: ["Naruto Shippuden", "Naruto: Shippuden"] },
      { label: "Avengers: Doomsday", type: "movie", year: 2026, queries: ["Avengers: Doomsday", "Avengers Doomsday"] },
      { label: "Spider-Man: Brand New Day", type: "movie", year: 2026, queries: ["Spider-Man: Brand New Day", "Spider-Man Brand New Day", "Spider-Man: No Way Home"] },
      { label: "1917", type: "movie", queries: ["1917"] },
      { label: "El Padrino", type: "movie", queries: ["The Godfather", "El Padrino"] },
      { label: "Volver al futuro", type: "movie", queries: ["Back to the Future", "Volver al futuro"] },
      { label: "American Psycho", type: "movie", queries: ["American Psycho", "American Psyco"] },
      { label: "Spider-Man: A través del Spider-Verso", type: "movie", queries: ["Spider-Man: Across the Spider-Verse", "Spider-Man Across the Spider Verse"] },
      { label: "Dune: Parte uno", type: "movie", year: 2021, queries: ["Dune: Part One", "Dune"] },
      { label: "Gravity Falls", type: "tv", queries: ["Gravity Falls"] },
      { label: "Coco", type: "movie", queries: ["Coco"] },
      { label: "Toy Story", type: "movie", queries: ["Toy Story"] }
    ];

    function profileBackdropEndpoint(entry) {
      return entry.type === "tv" ? "/search/tv" : "/search/movie";
    }

    function chooseProfileBackdropResult(entry, results) {
      var valid = (Array.isArray(results) ? results : []).filter(function (item) {
        return item && typeof item.backdrop_path === "string" && item.backdrop_path.charAt(0) === "/";
      });
      if (!valid.length) return null;

      // Si se indicó año, prioriza el título de ese año sin descartar un resultado válido.
      if (entry.year) {
        var dateField = entry.type === "tv" ? "first_air_date" : "release_date";
        var exactYear = valid.find(function (item) {
          return String(item[dateField] || "").slice(0, 4) === String(entry.year);
        });
        if (exactYear) return exactYear;
      }
      return valid[0];
    }

    function fetchProfileBackdropEntry(entry, queryIndex) {
      var index = queryIndex || 0;
      if (index >= entry.queries.length) return Promise.resolve(null);

      var params = "query=" + encodeURIComponent(entry.queries[index]) + "&include_adult=false&page=1";
      if (entry.year) params += "&year=" + encodeURIComponent(entry.year);

      return fetchTMDB(profileBackdropEndpoint(entry), params)
        .then(function (data) {
          var selected = chooseProfileBackdropResult(entry, data && data.results);
          if (selected) {
            selected._tcProfileLabel = entry.label;
            selected._tcProfileType = entry.type;
            return selected;
          }
          return fetchProfileBackdropEntry(entry, index + 1);
        })
        .catch(function (error) {
          console.warn("TatoCine: búsqueda de fondo fallida para " + entry.label + ".", error);
          return fetchProfileBackdropEntry(entry, index + 1);
        });
    }

    function loadProfileBackdropCollection() {
      var results = new Array(PROFILE_BACKDROP_FEATURED.length);
      var cursor = 0;
      var workerCount = Math.min(4, PROFILE_BACKDROP_FEATURED.length);

      function worker() {
        var current = cursor++;
        if (current >= PROFILE_BACKDROP_FEATURED.length) return Promise.resolve();
        return fetchProfileBackdropEntry(PROFILE_BACKDROP_FEATURED[current], 0)
          .then(function (item) {
            results[current] = item;
            return worker();
          });
      }

      var workers = [];
      for (var w = 0; w < workerCount; w++) workers.push(worker());

      return Promise.all(workers).then(function () {
        var curated = results.filter(Boolean);
        var missing = PROFILE_BACKDROP_FEATURED.filter(function (entry, index) {
          return !results[index];
        }).map(function (entry) { return entry.label; });

        if (missing.length) {
          console.warn("TatoCine: TMDB no devolvió fondos para:", missing.join(" · "));
        }

        // Conserva los 20 títulos en el orden solicitado. Solo añade tendencias
        // al final como respaldo cuando TMDB no encuentre suficientes fondos.
        if (curated.length >= 2) return shuffleInPlace(curated);   // orden aleatorio en cada carga
        return fetchTMDB("/trending/all/week")
          .then(function (data) {
            var seen = Object.create(null);
            curated.forEach(function (item) { seen[item.backdrop_path] = true; });
            (data && Array.isArray(data.results) ? data.results : []).forEach(function (item) {
              if (curated.length >= 6) return;
              if (!item || !item.backdrop_path || seen[item.backdrop_path]) return;
              seen[item.backdrop_path] = true;
              item._tcProfileLabel = item.title || item.name || "Tendencia";
              curated.push(item);
            });
            return curated;
          })
          .catch(function () { return curated; });
      });
    }

    function preloadProfileBackdropImage(item) {
      if (!item || !item.backdrop_path) return Promise.resolve(null);
      if (item._tcBackdropImage && item._tcBackdropImage.complete && item._tcBackdropImage.naturalWidth > 0) {
        return Promise.resolve(item._tcBackdropImage);
      }
      if (item._tcBackdropPromise) return item._tcBackdropPromise;

      item._tcBackdropPromise = new Promise(function (resolve) {
        var image = new Image();
        var settled = false;
        var timeout = window.setTimeout(function () { finish(null); }, 12000);

        function finish(result) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          image.onload = null;
          image.onerror = null;
          if (result) item._tcBackdropImage = image;
          else item._tcBackdropPromise = null;
          resolve(result);
        }

        image.decoding = "async";
        image.onload = function () { finish(image.naturalWidth > 0 ? image : null); };
        image.onerror = function () { finish(null); };
        item._tcBackdropUrl = IMG_BG + item.backdrop_path;
        image.src = item._tcBackdropUrl;
        if (image.complete && image.naturalWidth > 0) finish(image);
      });

      return item._tcBackdropPromise;
    }

    function scheduleNextProfileBackdrop() {
      if (profileBackdropTimer) {
        window.clearTimeout(profileBackdropTimer);
        profileBackdropTimer = null;
      }

      var overlay = document.getElementById("tc-profile-overlay");
      if (!overlay || !overlay.classList.contains("open") || profileBackdropItems.length < 2) return;

      // El cambio de imagen NO depende de prefers-reduced-motion. Esa preferencia
      // solo afecta al fundido CSS, no al funcionamiento del carrusel.
      profileBackdropTimer = window.setTimeout(function () {
        profileBackdropTimer = null;
        if (!overlay.classList.contains("open")) return;
        if (document.hidden || profileBackdropLoading) {
          scheduleNextProfileBackdrop();
          return;
        }
        setProfileBackdrop(profileBackdropNextIndex, 0);
      }, 6000);
    }

    function setProfileBackdrop(index, attempts) {
      var overlay = document.getElementById("tc-profile-overlay");
      var layers = overlay ? overlay.querySelectorAll(".tc-profile-backdrop-layer") : [];
      var total = profileBackdropItems.length;
      if (!overlay || !overlay.classList.contains("open") || !layers || layers.length < 2 || !total || profileBackdropLoading) return;

      var currentAttempt = attempts || 0;
      if (currentAttempt >= total) {
        profileBackdropLoading = false;
        console.warn("TatoCine: no quedan fondos de perfil disponibles para mostrar.");
        return;
      }

      var normalizedIndex = ((index % total) + total) % total;
      var item = profileBackdropItems[normalizedIndex];
      if (!item || !item.backdrop_path) {
        profileBackdropNextIndex = (normalizedIndex + 1) % total;
        setProfileBackdrop(profileBackdropNextIndex, currentAttempt + 1);
        return;
      }

      profileBackdropLoading = true;
      var requestId = ++profileBackdropImageRequest;

      preloadProfileBackdropImage(item).then(function (image) {
        if (requestId !== profileBackdropImageRequest) return;
        if (!overlay.classList.contains("open")) {
          profileBackdropLoading = false;
          return;
        }

        if (!image) {
          item._tcBackdropFailed = true;
          profileBackdropLoading = false;
          profileBackdropNextIndex = (normalizedIndex + 1) % total;
          setProfileBackdrop(profileBackdropNextIndex, currentAttempt + 1);
          return;
        }

        var currentLayers = overlay.querySelectorAll(".tc-profile-backdrop-layer");
        if (!currentLayers || currentLayers.length < 2) {
          profileBackdropLoading = false;
          return;
        }

        var targetLayerIndex = profileBackdropLayerIndex === 0 ? 1 : 0;
        currentLayers[targetLayerIndex].style.backgroundImage = "url(\"" + (item._tcBackdropUrl || IMG_BG + item.backdrop_path) + "\")";
        currentLayers[targetLayerIndex].style.backgroundPosition = "center 35%";
        currentLayers[targetLayerIndex].classList.add("visible");
        currentLayers[profileBackdropLayerIndex].classList.remove("visible");

        profileBackdropLayerIndex = targetLayerIndex;
        profileBackdropIndex = normalizedIndex;
        profileBackdropNextIndex = (normalizedIndex + 1) % total;
        profileBackdropHasVisibleImage = true;
        profileBackdropLoading = false;

        // Prepara el próximo fondo antes de que llegue el siguiente intervalo.
        preloadProfileBackdropImage(profileBackdropItems[profileBackdropNextIndex]);
        scheduleNextProfileBackdrop();
      }).catch(function (error) {
        if (requestId !== profileBackdropImageRequest) return;
        profileBackdropLoading = false;
        console.warn("TatoCine: no se pudo aplicar el fondo de " + (item._tcProfileLabel || "TMDB") + ".", error);
        profileBackdropNextIndex = (normalizedIndex + 1) % total;
        setProfileBackdrop(profileBackdropNextIndex, currentAttempt + 1);
      });
    }

    function stopProfileBackdropCarousel() {
      if (profileBackdropTimer) {
        window.clearTimeout(profileBackdropTimer);
        profileBackdropTimer = null;
      }
      // Cada vez que se vuelve a abrir el selector el orden es distinto.
      if (profileBackdropItems.length > 1) {
        shuffleInPlace(profileBackdropItems);
        profileBackdropNextIndex = Math.floor(Math.random() * profileBackdropItems.length);
      }
      // Invalida cualquier descarga de imagen pendiente al cerrar el selector.
      profileBackdropImageRequest++;
      profileBackdropLoading = false;
    }

    function startProfileBackdropCarousel() {
      var overlay = document.getElementById("tc-profile-overlay");
      if (!overlay || !overlay.classList.contains("open")) return;

      if (profileBackdropItems.length) {
        if (!profileBackdropStarted || !profileBackdropHasVisibleImage) {
          profileBackdropStarted = true;
          if (!profileBackdropLoading) setProfileBackdrop(profileBackdropNextIndex, 0);
        } else if (!profileBackdropTimer && !profileBackdropLoading) {
          scheduleNextProfileBackdrop();
        }
        return;
      }

      if (profileBackdropFetchPending) return;
      profileBackdropFetchPending = true;
      loadProfileBackdropCollection()
        .then(function (items) {
          profileBackdropItems = items;
          profileBackdropNextIndex = items.length ? Math.floor(Math.random() * items.length) : 0;
          profileBackdropFetchPending = false;
          if (profileBackdropItems.length) {
            console.info("TatoCine: fondos del selector listos en el orden solicitado (" + profileBackdropItems.length + "/" + PROFILE_BACKDROP_FEATURED.length + ").");
            if (overlay.classList.contains("open")) startProfileBackdropCarousel();
          } else {
            console.warn("TatoCine: TMDB no devolvió fondos utilizables para el selector.");
          }
        })
        .catch(function (error) {
          profileBackdropFetchPending = false;
          console.warn("TatoCine: no se pudieron obtener los fondos del selector desde TMDB.", error);
        });
    }

    if (!window.__tcProfileBackdropVisibilityListener) {
      window.__tcProfileBackdropVisibilityListener = true;
      document.addEventListener("visibilitychange", function () {
        var overlay = document.getElementById("tc-profile-overlay");
        if (!overlay || !overlay.classList.contains("open")) return;
        if (!document.hidden && !profileBackdropTimer && !profileBackdropLoading && profileBackdropItems.length >= 2) {
          scheduleNextProfileBackdrop();
        }
      });
    }

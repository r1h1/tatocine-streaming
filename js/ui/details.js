/**
 * TatoCine · js/ui/details.js
 * Modal de detalle del título y ficha de actor.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    var detailsMedia = null;
    function openDetails(id, type) {
      id = Number(id);
      if (!Number.isSafeInteger(id) || id <= 0 || (type !== "movie" && type !== "tv")) {
        showToast("No se pudieron identificar los detalles de este título");
        return;
      }
      var key = type + "_" + id;
      closeDetailsTrailer();
      var detailsPanel = document.querySelector(
        "#details-modal .details-content",
      );
      var trailerPanel = $("details-trailer");
      if (
        detailsPanel &&
        trailerPanel &&
        trailerPanel.parentNode !== detailsPanel
      )
        detailsPanel.appendChild(trailerPanel);
      $detailsModal.dataset.mediaKey = key;
      $detailsModal.classList.add("open");
      document.body.style.overflow = "hidden";
      try {
        history.pushState(
          { modal: "details" },
          "",
          "?id=" + id + "&type=" + type,
        );
      } catch (e) { }
      $("details-skeleton").style.display = "block";
      $("details-real-content").style.display = "none";
      $("details-backdrop").style.backgroundImage = "none";
      $("details-similar-container").style.display = "none";
      function renderDetails(data) {
        $("details-skeleton").style.display = "none";
        $("details-real-content").style.display = "block";
        var title = data.title || data.name || "Sin título";
        var year = (data.release_date || data.first_air_date || "").split(
          "-",
        )[0];
        var rating = data.vote_average ? data.vote_average.toFixed(1) : "N/A";
        var runtime = data.runtime
          ? data.runtime + " min"
          : data.number_of_seasons
            ? data.number_of_seasons + " temporadas"
            : "";
        var status = data.status || "";
        var statusText = getStatusText(status);
        var statusClass = isEndedStatus(status) ? "ended" : "";
        var genres = (data.genres || []).map(function (g) {
          return g.name;
        });
        var overview = data.overview || "Sin descripción disponible.";
        var backdrop = data.backdrop_path
          ? IMG_BG + data.backdrop_path
          : data.poster_path
            ? IMG_BG + data.poster_path
            : FALLBACK_IMG;
        var cast = data.credits && data.credits.cast ? data.credits.cast : [];
        var similar =
          data.recommendations &&
            data.recommendations.results &&
            data.recommendations.results.length > 0
            ? data.recommendations.results
            : data.similar && data.similar.results
              ? data.similar.results
              : [];
        var trailer = null;
        if (data.videos && data.videos.results) {
          var candidates = data.videos.results.filter(function (v) {
            return (
              v.site === "YouTube" &&
              (v.type === "Trailer" || v.type === "Teaser")
            );
          });
          var spanish = candidates.filter(function (v) {
            return UI_EN ? v.iso_639_1 === "en" : (v.iso_639_1 === "es" || v.iso_639_1 === "es-MX");
          });
          if (spanish.length > 0) trailer = spanish[0];
          else if (candidates.length > 0) trailer = candidates[0];
        }
        $("details-backdrop").style.backgroundImage =
          "url('" + backdrop + "')";
        $("details-title").textContent = title;
        updatePageSEO(title, overview, type, data);
        $("details-meta").innerHTML =
          (year ? "<span>" + year + "</span>" : "") +
          (rating !== "N/A"
            ? '<span class="rating-meta">' + icons.star + rating + "</span>"
            : "") +
          (runtime ? "<span>" + runtime + "</span>" : "") +
          (statusText
            ? '<span class="status ' +
            statusClass +
            '">' +
            statusText +
            "</span>"
            : "");
        $("details-genres").innerHTML = genres
          .map(function (g) {
            return '<span class="details-genre">' + escapeHTML(g) + "</span>";
          })
          .join("");
        $("details-overview").textContent = overview;
        if (cast.length > 0) {
          $("details-cast-container").style.display = "block";
          $("details-cast").innerHTML = cast
            .map(function (c) {
              return (
                '<div class="cast-item" tabindex="0" role="button" onclick="openActor(' +
                c.id +
                ')"><img class="cast-photo" alt="" loading="lazy" decoding="async" src="' +
                (c.profile_path
                  ? IMG_W185 + c.profile_path
                  : "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%2240%22 fill=%22%23333%22/%3E%3C/svg%3E") +
                '" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%2240%22 fill=%22%23333%22/%3E%3C/svg%3E\'"/><div class="cast-name">' +
                escapeHTML(c.name) +
                '</div><div class="cast-char">' +
                escapeHTML(c.character || "") +
                "</div></div>"
              );
            })
            .join("");
        } else $("details-cast-container").style.display = "none";
        if (similar.length > 0) {
          $("details-similar-container").style.display = "block";
          $("details-similar").innerHTML = similar
            .slice(0, 20)
            .map(function (s) {
              var sTitle = escapeHTML(s.title || s.name || "");
              var sBg = s.poster_path
                ? IMG_CARD + s.poster_path
                : "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%23222%22 width=%22200%22 height=%22300%22/%3E%3C/svg%3E";
              return (
                '<div class="similar-card" tabindex="0" role="button" onclick="openDetails(' +
                s.id +
                ",'" +
                type +
                '\')"><img class="similar-poster" alt="" src="' +
                sBg +
                '" loading="lazy" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%23222%22 width=%22200%22 height=%22300%22/%3E%3C/svg%3E\'"/><div class="similar-title">' +
                sTitle +
                "</div></div>"
              );
            })
            .join("");
        }
        var trailerBtn = $("details-trailer-btn");
        if (trailer) {
          trailerBtn.style.display = "inline-flex";
          trailerBtn.onclick = function () {
            var t = $("details-trailer");
            if (t.classList.contains("active")) {
              closeDetailsTrailer();
              return;
            }
            var panel = document.querySelector(
              "#details-modal .details-content",
            );
            if (panel && t.parentNode !== panel) panel.appendChild(t);
            t.classList.add("active");
            var trailerUrl =
              "https://www.youtube.com/embed/" +
              encodeURIComponent(trailer.key) +
              "?autoplay=1&rel=0&modestbranding=1";
            var watchUrl =
              "https://www.youtube.com/watch?v=" +
              encodeURIComponent(trailer.key);
            t.innerHTML =
              '<iframe title="Tráiler de ' +
              escapeHTML(title) +
              '" src="' +
              trailerUrl +
              '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="origin"></iframe><a class="details-trailer-external" href="' +
              watchUrl +
              '" target="_blank" rel="noopener noreferrer">Abrir en YouTube</a><button class="details-trailer-close" type="button" onclick="closeDetailsTrailer()" aria-label="Cerrar tráiler">✕</button>';
            trailerBtn.querySelector("span").textContent = "Ocultar Tráiler";
          };
        } else trailerBtn.style.display = "none";
        var playBtn = $("details-play-btn");
        var releaseDate = type === "tv" ? data.first_air_date : data.release_date;
        // Una sola regla de disponibilidad para el modal: estado Released o fecha anterior al día local.
        var isAvailable = !isUpcoming(releaseDate, data.status, type);

        if (playBtn) {
          playBtn.disabled = !isAvailable;
          playBtn.setAttribute("aria-disabled", String(!isAvailable));
          playBtn.style.opacity = isAvailable ? "1" : "0.45";
          playBtn.style.cursor = isAvailable ? "pointer" : "not-allowed";
          playBtn.title = isAvailable
            ? "Reproducir contenido"
            : "Este contenido todavía no está disponible";
          playBtn.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
            (isAvailable ? "Ver" : "Próximamente");
          playBtn.onclick = function () {
            if (!isAvailable) return;
            closeDetails(true);
            var bgUrl = data.backdrop_path || data.poster_path || null;
            openPlayer(id, type, title, null, null, bgUrl);
          };
        }

        var detailsShareButton = $("details-share-btn");
        if (detailsShareButton) {
          detailsShareButton.type = "button";
          detailsShareButton.setAttribute("data-media-id", String(id));
          detailsShareButton.setAttribute("data-media-type", String(type));
          detailsShareButton.setAttribute("data-media-title", title);
          detailsShareButton.onclick = window.shareDetailsFromModal;
        }
        detailsMedia = {
          id: id,
          type: type,
          title: title,
          bg: data.backdrop_path || data.poster_path || "",
          rating: Number(data.vote_average) || 0,
          year: year || ""
        };
        updateDetailsFavButton();
        if (typeof renderDetailsExtras === "function") renderDetailsExtras(data, type, id, title);
      }
      function showDetailsLoadError(error) {
        if ($detailsModal.dataset.mediaKey !== key) return;
        console.error("TatoCine: no se pudieron renderizar los detalles", error);
        $("details-skeleton").style.display = "none";
        $("details-real-content").style.display = "block";
        $("details-title").textContent = "Error al cargar";
        $("details-overview").textContent =
          "No se pudieron cargar los detalles. Comprueba tu conexión e inténtalo de nuevo.";
      }

      function renderDetailsSafely(data) {
        if ($detailsModal.dataset.mediaKey !== key) return;
        if (!data || data.success === false) {
          showDetailsLoadError(new Error("Respuesta de TMDB no válida"));
          return;
        }
        try {
          renderDetails(data);
        } catch (error) {
          showDetailsLoadError(error);
        }
      }

      if (cachedDetails[key]) {
        renderDetailsSafely(cachedDetails[key]);
      } else {
        var endpoint = type === "tv" ? "/tv/" + id : "/movie/" + id;
        fetchTMDB(
          endpoint,
          "&append_to_response=credits,videos,similar,recommendations",
        )
          .then(function (data) {
            if ($detailsModal.dataset.mediaKey !== key) return;
            cachedDetails[key] = data;
            renderDetailsSafely(data);
          })
          .catch(showDetailsLoadError);
      }
    }
    function closeDetailsTrailer() {
      var t = $("details-trailer");
      if (t) {
        t.classList.remove("active");
        t.innerHTML = "";
      }
      var btn = $("details-trailer-btn");
      if (btn) {
        var label = btn.querySelector("span");
        if (label) label.textContent = "Ver Tráiler";
      }
    }
    function closeDetails(fromPlay) {
      closeDetailsTrailer();
      $detailsModal.classList.remove("open");
      document.body.style.overflow = "";
      resetPageSEO();
      if (
        !fromPlay &&
        location.search &&
        location.search.indexOf("id=") > -1
      ) {
        try {
          history.replaceState(null, "", location.pathname);
        } catch (e) { }
      }
    }

    function openActor(actorId) {
      $actorModal.classList.add("open");
      $actorModal.classList.add("is-loading");
      $("actor-name").textContent = "Cargando...";
      $("actor-meta").textContent = "";
      $("actor-bio").textContent = "";
      $("actor-photo").src = FALLBACK_IMG;
      $("actor-photo").alt = "Fotografía de perfil";
      function fetchAndRender(lang) {
        var q = lang ? "&language=" + lang : "";
        fetchTMDB("/person/" + actorId, q)
          .then(function (d) {
            $actorModal.classList.remove("is-loading");
            $("actor-name").textContent = d.name || "Sin nombre";
            var meta = [];
            if (d.known_for_department) meta.push(d.known_for_department);
            if (d.birthday) {
              var age = d.deathday
                ? null
                : Math.floor(
                  (Date.now() - new Date(d.birthday).getTime()) /
                  31557600000,
                );
              meta.push(
                new Date(d.birthday).getFullYear() +
                (age ? " (" + age + " años)" : ""),
              );
            }
            if (d.deathday)
              meta.push("† " + new Date(d.deathday).getFullYear());
            if (d.place_of_birth) meta.push(d.place_of_birth);
            $("actor-meta").textContent = meta.join(" · ");
            if (d.profile_path)
              $("actor-photo").src = IMG_W185 + d.profile_path;
            if (d.biography && d.biography.trim().length > 20)
              $("actor-bio").textContent = d.biography;
            else if (lang !== "en-US") {
              fetchAndRender("en-US");
              return;
            } else
              $("actor-bio").textContent =
                "Este actor no tiene biografía disponible en TMDB.";
          })
          .catch(function () {
            if (lang !== "en-US") {
              fetchAndRender("en-US");
              return;
            }
            $actorModal.classList.remove("is-loading");
            $("actor-name").textContent = "Error al cargar";
            $("actor-bio").textContent = "No se pudo obtener la biografía.";
          });
      }
      fetchAndRender(null);
    }
    function closeActor() {
      $actorModal.classList.remove("is-loading");
      $actorModal.classList.remove("open");
    }

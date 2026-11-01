/**
 * TatoCine · js/features/continue-watching.js
 * Continuar viendo: guardado, progreso y fila del inicio.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function getStatusText(s) {
      if (!s) return "";
      if (s === "Ended" || s === "Canceled") return "Finalizada";
      if (s === "Returning Series" || s === "In Production")
        return "En Emisión";
      if (s === "Released") return "Estrenada";
      if (s === "Post Production") return "Próximamente";
      if (s === "Planned") return "Planeada";
      if (s === "Rumored") return "Rumoreada";
      if (s === "Pilot") return "Piloto";
      return s;
    }
    function isEndedStatus(s) {
      return s === "Ended" || s === "Canceled";
    }
    function saveContinueWatching(media, season, episode) {
      var entry = {
        id: media.id,
        type: media.type,
        title: media.title,
        bg: media.bg,
        year: media.year,
        rating: media.rating,
        season: season || null,
        episode: episode || null,
        episodeName: (currentTvEpisodes || []).find(function (item) { return Number(item.episode_number) === Number(episode); })?.name || "",
        timestamp: Date.now(),
      };
      continueWatching = continueWatching.filter(function (m) {
        return !(m.id === media.id && m.type === media.type);
      });
      continueWatching.unshift(entry);
      continueWatching = continueWatching.slice(0, 20);
      safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
    }
    function clearContinueWatching() {
      safeStorageRemove(profileStorageKey("tatoContinue"));
      continueWatching = [];
      closeSettings();
      switchView(currentView, false);
      showToast("Historial borrado");
    }
    function removeContinueWatchingItem(id, type, card) {
      var updated = continueWatching.filter(function (item) {
        return !(String(item.id) === String(id) && item.type === type);
      });

      if (updated.length === continueWatching.length) return;

      try {
        safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(updated));
      } catch (error) {
        showToast("No se pudo guardar el cambio");
        return;
      }

      // Capturar la fila ANTES de quitar la tarjeta del DOM.
      var row = card && card.closest ? card.closest(".continue-row") : null;
      continueWatching = updated;

      if (card && card.parentNode) card.parentNode.removeChild(card);

      if (row) {
        var scroller = row.querySelector(".row-scroll");
        if (!scroller || !scroller.querySelector(".continue-card")) {
          row.parentNode && row.parentNode.removeChild(row);
        }
      }

      showToast("Eliminado de Continuar Viendo");
    }

    function renderContinueRow() {
      var continueVisible = continueWatching.filter(function (m) { return !(m.type === "movie" && m.pct >= 92); });
      if (continueVisible.length === 0) return;

      var d = document.createElement("div");
      d.className = "row continue-row";

      d.innerHTML =
        '<div class="row-header">' +
        '<h2 class="row-title">Continuar Viendo</h2>' +
        '<button class="row-clear-btn" onclick="clearContinueWatching()">Limpiar</button>' +
        "</div>" +
        '<button class="row-nav prev" onclick="scrollRow(this,-1)">‹</button>' +
        '<button class="row-nav next" onclick="scrollRow(this,1)">›</button>' +
        '<div class="row-scroll"></div>';

      var scroll = d.querySelector(".row-scroll");

      continueVisible.forEach(function (m) {
        var card = document.createElement("div");
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "group");
        card.setAttribute("aria-label", m.title || "");
        card.className = "card continue-card";

        var progressInfo = m.season
          ? "T" + m.season + " · E" + m.episode + (m.episodeName ? " · " + m.episodeName : "")
          : (m.type === "movie" ? "Película · Reanudar" : "Serie · Reanudar");

        var imageUrl = m.bg
          ? String(m.bg).startsWith("http")
            ? m.bg
            : IMG_CARD + m.bg
          : FALLBACK_IMG;

        var img = document.createElement("img");
        img.src = imageUrl;
        img.alt = m.title || "Contenido";
        img.loading = "lazy";
        img.decoding = "async";

        img.onload = function () {
          img.classList.add("loaded");
        };

        img.onerror = function () {
          img.onerror = null;
          img.src = FALLBACK_IMG;
        };

        var overlay = document.createElement("div");
        overlay.className = "card-overlay";

        var title = document.createElement("div");
        title.className = "card-title";
        title.textContent = m.title || "Sin título";

        var progress = document.createElement("div");
        progress.style.cssText = "font-size:13px;line-height:1.35;color:#d0d0d0;margin-top:5px;";
        progress.textContent = progressInfo + (m.timestamp ? " · " + (new Date(m.timestamp).toLocaleDateString(UI_EN ? "en-US" : "es-GT", { day: "numeric", month: "short" })) : "");

        overlay.appendChild(title);
        overlay.appendChild(progress);

        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "continue-remove-btn";
        removeBtn.title = "Quitar de Continuar Viendo";
        removeBtn.setAttribute(
          "aria-label",
          "Quitar " + (m.title || "contenido") + " de Continuar Viendo",
        );

        removeBtn.innerHTML =
          '<svg viewBox="0 0 24 24" width="17" height="17" ' +
          'fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5"/>' +
          "</svg>";

        removeBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation && e.stopImmediatePropagation();
          removeContinueWatchingItem(m.id, m.type, card);
        });

        card.appendChild(img);
        card.appendChild(overlay);
        card.appendChild(removeBtn);
        card.addEventListener("click", function () {
          openPlayer(m.id, m.type, m.title, m.season, m.episode, m.bg);
        });

        scroll.appendChild(card);
        // Si la entrada no tiene imagen guardada, se obtiene de TMDB y se guarda para la próxima vez.
        if (!m.bg) {
          fetchTMDB((m.type === "tv" ? "/tv/" : "/movie/") + m.id).then(function (det) {
            var p = det && (det.backdrop_path || det.poster_path);
            if (!p) return;
            m.bg = p;
            img.src = IMG_CARD + p;
            safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
          }).catch(function () { });
        }
      });

      $rowsContainer.appendChild(d);
    }

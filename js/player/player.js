/**
 * TatoCine · js/player/player.js
 * Reproductor: servidores, temporadas y episodios, siguiente automático y pantalla completa.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function updateAutoNextButton() {
      var button = document.getElementById("auto-next-toggle");
      if (!button) return;
      button.textContent = autoNextEpisode ? "Siguiente: ACTIVADO" : "Siguiente: DESACTIVADO";
      button.classList.toggle("on", !!autoNextEpisode);
      button.setAttribute("aria-pressed", autoNextEpisode ? "true" : "false");
    }
    function toggleAutoNextEpisode() {
      autoNextEpisode = !autoNextEpisode;
      safeStorageSet(profileStorageKey("tatoAutoNextEpisode"), JSON.stringify(autoNextEpisode));
      updateAutoNextButton();
      showToast(autoNextEpisode ? "Siguiente episodio automático activado" : "Reproducción automática desactivada");
    }

    function loadEpisodes(s, n) {
      return fetchTMDB("/tv/" + s + "/season/" + n)
        .then(function (d) {
          var eps = d.episodes || [];
          currentTvEpisodes = eps.slice();
          $episodeSelect.innerHTML = eps
            .map(function (e) {
              return (
                '<option value="' +
                e.episode_number +
                '">Episodio ' +
                e.episode_number +
                ": " +
                e.name +
                "</option>"
              );
            })
            .join("");
          if (!eps.length)
            $episodeSelect.innerHTML =
              '<option value="1">Episodio 1</option>';
          return eps;
        })
        .catch(function () {
          currentTvEpisodes = [];
          $episodeSelect.innerHTML = '<option value="1">Episodio 1</option>';
          return [];
        });
    }
    function prepareSimilarQueue(media) {
      similarQueue = [];
      playerEndedHandled = false;
      isAdvancingSimilar = false;
      if (!media) {
        similarQueuePromise = Promise.resolve([]);
        return similarQueuePromise;
      }
      var endpoint =
        media.type === "tv" ? "/tv/" + media.id : "/movie/" + media.id;
      var append =
        media.type === "movie"
          ? "&append_to_response=recommendations,similar"
          : "";
      similarQueuePromise = fetchTMDB(endpoint, append)
        .then(function (d) {
          var ids = (d.genres || []).map(function (g) {
            return g.id;
          });
          media.genre_ids = ids;
          updateMediaGenres(media, ids);
          if (media.type !== "movie") return similarQueue;
          var list =
            d.recommendations &&
              d.recommendations.results &&
              d.recommendations.results.length
              ? d.recommendations.results
              : d.similar && d.similar.results
                ? d.similar.results
                : [];
          similarQueue = list
            .filter(function (x) {
              return x.id !== media.id;
            })
            .slice(0, 20)
            .map(function (x) {
              var date = x.release_date || "";
              return {
                id: x.id,
                type: "movie",
                title: x.title || "Siguiente película",
                bg: x.backdrop_path || x.poster_path,
                year: date ? date.split("-")[0] : "",
                rating: x.vote_average,
              };
            });
          return similarQueue;
        })
        .catch(function () {
          similarQueue = [];
          return similarQueue;
        });
      return similarQueuePromise;
    }
    function playNextSimilar() {
      if (
        !currentMedia ||
        currentMedia.type !== "movie" ||
        playerEndedHandled ||
        isAdvancingSimilar
      )
        return;
      playerEndedHandled = true;
      isAdvancingSimilar = true;
      similarQueuePromise.then(function () {
        var next = similarQueue.shift();
        if (!next) {
          isAdvancingSimilar = false;
          showToast(
            "La película terminó. No hay otra recomendación disponible.",
          );
          return;
        }
        showToast("Reproduciendo: " + next.title);
        openPlayer(next.id, next.type, next.title, null, null, next.bg);
      });
    }
    function playNextEpisode() {
      if (!autoNextEpisode || !currentMedia || currentMedia.type !== "tv" || isAdvancingEpisode) return;
      var seasonNumber = Number($seasonSelect.value || 0);
      var episodeNumber = Number($episodeSelect.value || 0);
      var nextEpisode = currentTvEpisodes.slice().sort(function (a, b) {
        return Number(a.episode_number) - Number(b.episode_number);
      }).find(function (episode) { return Number(episode.episode_number) > episodeNumber; });
      var serverIndex = SERVERS.findIndex(function (server) { return server.name === preferredServer; });
      if (serverIndex < 0) serverIndex = 0;
      var serverButton = function () { return document.getElementById("server-btn-" + serverIndex); };
      if (nextEpisode) {
        isAdvancingEpisode = true;
        $episodeSelect.value = String(nextEpisode.episode_number);
        showToast("Siguiente episodio: " + (nextEpisode.name || ("Episodio " + nextEpisode.episode_number)));
        var button = serverButton();
        if (button) playEmbed(serverIndex, button);
        isAdvancingEpisode = false;
        return;
      }
      var nextSeason = currentTvSeasons.slice().sort(function (a, b) {
        return Number(a.season_number) - Number(b.season_number);
      }).find(function (season) {
        return Number(season.season_number) > seasonNumber && Number(season.episode_count || 0) > 0;
      });
      if (!nextSeason) {
        showToast("Has llegado al último episodio disponible");
        return;
      }
      isAdvancingEpisode = true;
      $seasonSelect.value = String(nextSeason.season_number);
      loadEpisodes(currentMedia.id, nextSeason.season_number).then(function (episodes) {
        if (!episodes || !episodes.length) {
          isAdvancingEpisode = false;
          showToast("No se pudo cargar la siguiente temporada");
          return;
        }
        var first = episodes.slice().sort(function (a, b) {
          return Number(a.episode_number) - Number(b.episode_number);
        })[0];
        $episodeSelect.value = String(first.episode_number);
        showToast("Siguiente temporada: T" + nextSeason.season_number + " · " + (first.name || ("Episodio " + first.episode_number)));
        var button = serverButton();
        if (button) playEmbed(serverIndex, button);
        isAdvancingEpisode = false;
      }).catch(function () {
        isAdvancingEpisode = false;
        showToast("No se pudo cargar la siguiente temporada");
      });
    }

    function isEndedPlayerMessage(raw) {
      var data = raw;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          return /(^|[^a-z])(ended|video_ended|player_ended)([^a-z]|$)/i.test(
            data,
          );
        }
      }
      if (!data || typeof data !== "object") return false;
      var eventName = String(
        data.event || data.type || data.name || data.method || "",
      )
        .toLowerCase()
        .replace(/[\s-]/g, "_");
      if (
        [
          "ended",
          "video_ended",
          "player_ended",
          "on_ended",
          "onended",
          "playback_ended",
        ].includes(eventName)
      )
        return true;
      if (
        eventName === "onstatechange" &&
        (data.info === 0 || data.data === 0 || data.playerState === 0)
      )
        return true;
      if (
        data.event === "onStateChange" &&
        (data.info === 0 || (data.info && data.info.playerState === 0))
      )
        return true;
      if (
        data.data &&
        typeof data.data === "object" &&
        isEndedPlayerMessage(data.data)
      )
        return true;
      if (
        data.payload &&
        typeof data.payload === "object" &&
        isEndedPlayerMessage(data.payload)
      )
        return true;
      return false;
    }
    window.addEventListener("message", function (event) {
      if (
        !activePlayerFrame ||
        event.source !== activePlayerFrame.contentWindow
      )
        return;
      if (isEndedPlayerMessage(event.data)) {
        if (currentMedia && currentMedia.type === "tv") {
          // Falsos «ended»: si según la duración conocida faltaba mucho, se ignora (nunca salta a mitad del episodio).
          var known = typeof watchKnownRuntimeSec === "function" ? watchKnownRuntimeSec() : 0;
          if (known && watch && watch.epSecs < known * 0.6) return;
          if (autoNextEpisode) showNextEpisodePrompt();
        } else playNextSimilar();
      }
    });
    function updateFullscreenButton() {
      var btn = $("player-fullscreen-btn");
      if (!btn) return;
      var active = !!document.fullscreenElement && document.fullscreenElement !== document.documentElement;
      var label = btn.querySelector(".fullscreen-label");
      if (label)
        label.textContent = active
          ? "Salir de pantalla completa"
          : "Pantalla completa";
      btn.title = active ? "Salir de pantalla completa" : "Pantalla completa";
      btn.setAttribute("aria-label", btn.title);
    }
    function togglePlayerFullscreen() {
      var target = $playerView;
      if (document.fullscreenElement && document.fullscreenElement !== document.documentElement) {
        if (document.exitFullscreen)
          document.exitFullscreen().catch(function () { });
        return;
      }
      if (target && target.requestFullscreen) {
        target
          .requestFullscreen()
          .then(updateFullscreenButton)
          .catch(function () {
            if (activePlayerFrame && activePlayerFrame.requestFullscreen)
              activePlayerFrame.requestFullscreen().catch(function () {
                showToast(
                  "El navegador no permite pantalla completa en este reproductor.",
                );
              });
            else
              showToast(
                "El navegador no permite pantalla completa en este reproductor.",
              );
          });
      } else if (activePlayerFrame && activePlayerFrame.requestFullscreen)
        activePlayerFrame.requestFullscreen().catch(function () {
          showToast(
            "El navegador no permite pantalla completa en este reproductor.",
          );
        });
      else
        showToast(
          "La pantalla completa no está disponible en este navegador.",
        );
    }
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    function playEmbed(i, b) {
      if (SERVERS[i] && SERVERS[i].adultAds && typeof isKidProfile === "function" && isKidProfile()) { i = 0; b = document.getElementById("server-btn-0") || b; }   // perfiles infantiles: jamás OP5
      var s = SERVERS[i];
      $playerView.innerHTML = "";
      activePlayerFrame = null;
      $serverSwitcher.querySelectorAll(".server-btn").forEach(function (x) {
        x.classList.remove("active");
      });
      b.classList.add("active");
      setPreferredServer(s.name);
      var u = "";
      if (currentMedia.type === "tv") {
        var se = $seasonSelect.value,
          ep = $episodeSelect.value;
        u = s.url(currentMedia.id, currentMedia.type, se, ep);
        saveContinueWatching(currentMedia, se, ep);
      } else {
        u = s.url(currentMedia.id, currentMedia.type);
        saveContinueWatching(currentMedia);
      }
      var l = document.createElement("div");
      l.className = "player-loading";
      l.textContent = "Conectando con " + s.name + "...";
      var f = document.createElement("iframe");
      try { if (window.TatoNative && TatoNative.playerUrl) TatoNative.playerUrl(window.__tcNT || "", u); } catch (eN) { }   // APK de TV: sin animaciones dentro del reproductor
      f.src = u;
      f.setAttribute(
        "allow",
        "autoplay; fullscreen; picture-in-picture; encrypted-media",
      );
      f.setAttribute("referrerpolicy", "origin");
      // Política de TatoCine: cero anuncios. Todos los reproductores van con sandbox SIN allow-popups ni allow-top-navigation: no pueden abrir
      // ventanas (OP5 abría anuncios para adultos y de apuestas) ni sacar al usuario de TatoCine. Medido en nov 2026: OP1–OP5 reproducen igual.
      // Un servidor que no lo acepte se marca con noSandbox en SERVERS (hoy ninguno). Para TODOS los perfiles.
      // En la app de TV NO hace falta (y algunos reproductores internos de OP5 lo rechazan: «sandboxed embed is not allowed»): la APK ya bloquea
      // ventanas emergentes (setSupportMultipleWindows false) y cualquier salida de TatoCine (shouldOverrideUrlLoading), más su lista BLOCK.
      if (!s.noSandbox && !window.TatoNative) f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-presentation");
      f.setAttribute("allowfullscreen", ""); f.allowFullscreen = true; f.setAttribute("webkitallowfullscreen", ""); f.style.border = "0";
      f.onload = function () {
        l.style.display = "none";
      };
      setTimeout(function () {
        if (l.isConnected) l.style.display = "none";
      }, 4000);
      $playerView.appendChild(l);
      $playerView.appendChild(f);
      activePlayerFrame = f;
      updateFullscreenButton();
    }
    window.openPlayer = function (i, t, ti, season, episode, bg) {
      currentMedia = {
        id: i,
        type: t,
        title: ti,
        bg: bg || null,
        genre_ids: [],
      };
      currentTvSeasons = [];
      currentTvEpisodes = [];
      isAdvancingEpisode = false;
      updateAutoNextButton();
      recordMediaStart(currentMedia, []);
      $modal.classList.add("open");
      document.documentElement.classList.add("tc-playing");                      // el fondo (portada, filas: ~3000 nodos) deja de pintarse mientras se ve (css/21-fluidez.css)
      document.body.style.overflow = "hidden";
      $modalTitle.textContent = ti;
      $playerView.innerHTML = "";
      activePlayerFrame = null;
      prepareSimilarQueue(currentMedia);
      $serverSwitcher.innerHTML = SERVERS.map(function (s, x) {
        if (s.adultAds && typeof isKidProfile === "function" && isKidProfile()) return "";      // perfiles infantiles: sin el servidor con anuncios para adultos
        var isPref = s.name === preferredServer ? "preferred" : "";
        return (
          '<button class="server-btn ' +
          isPref +
          '" id="server-btn-' +
          x +
          '" data-act="play-server" data-i="' +
          x +
          '">' +
          s.icon +
          s.name +
          "</button>"
        );
      }).join("");
      var preferredIdx = SERVERS.findIndex(function (s) {
        return s.name === preferredServer;
      });
      var startIdx = preferredIdx >= 0 ? preferredIdx : 0;
      if (SERVERS[startIdx] && SERVERS[startIdx].adultAds && typeof isKidProfile === "function" && isKidProfile()) startIdx = 0;   // perfil infantil: nunca empieza en OP5 (aunque fuera el preferido o el recordado)
      if (t === "tv") {
        $tvControls.classList.add("active");
        fetchTMDB("/tv/" + i)
          .then(function (d) {
            var se = (d.seasons || []).filter(function (s) {
              return s.season_number > 0;
            });
            currentTvSeasons = se.slice();
            if (!se.length) throw new Error("No hay temporadas");
            $seasonSelect.innerHTML = se
              .map(function (s) {
                return (
                  '<option value="' +
                  s.season_number +
                  '">Temporada ' +
                  s.season_number +
                  "</option>"
                );
              })
              .join("");
            var targetSeason = season || se[0].season_number;
            $seasonSelect.value = targetSeason;
            return loadEpisodes(i, targetSeason).then(function () {
              if (episode) $episodeSelect.value = episode;
            });
          })
          .then(function () {
            $seasonSelect.onchange = function () {
              loadEpisodes(i, $seasonSelect.value).then(function () {
                playEmbed(
                  startIdx,
                  document.getElementById("server-btn-" + startIdx),
                );
              });
            };
            $episodeSelect.onchange = function () {
              playEmbed(
                startIdx,
                document.getElementById("server-btn-" + startIdx),
              );
            };
            playEmbed(
              startIdx,
              document.getElementById("server-btn-" + startIdx),
            );
          })
          .catch(function () {
            $tvControls.classList.remove("active");
            playEmbed(
              startIdx,
              document.getElementById("server-btn-" + startIdx),
            );
          });
      } else {
        $tvControls.classList.remove("active");
        playEmbed(
          startIdx,
          document.getElementById("server-btn-" + startIdx),
        );
      }
      updateFullscreenButton();
    };
    function closePlayer() {
      if (document.fullscreenElement && document.fullscreenElement !== document.documentElement && document.exitFullscreen)
        document.exitFullscreen().catch(function () { });
      $modal.classList.remove("open");
      document.documentElement.classList.remove("tc-playing");
      $playerView.innerHTML = "";
      activePlayerFrame = null;
      document.body.style.overflow = "";
    }
    window.closePlayer = closePlayer;

registerAction("play-server", function (el) { playEmbed(Number(el.dataset.i) || 0, el); });

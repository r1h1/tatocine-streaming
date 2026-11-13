/**
 * TatoCine · js/ui/hero.js
 * Portada (hero): metadatos, clasificación por edad, carrusel y descripción.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // HERO: metadatos y tráiler asociados siempre al título que realmente está visible.
    function heroCategory(m) {
      if (m.category) return m.category;
      if (currentView === "anime") return "Anime";
      if (currentView === "kids")
        return m.type === "movie" ? "Película infantil" : "Serie infantil";
      if (m.type === "movie") return "Película";
      if (
        m.type === "tv" &&
        m.original_language === "ja" &&
        (m.genre_ids || []).includes(16)
      )
        return "Anime";
      return "Serie";
    }
    function normalizeAgeRating(cert) {
      if (!cert) return "";

      var c = String(cert).trim().toUpperCase();

      var ratings = {
        G: "Todo público",
        "TV-G": "Todo público",
        "TV-Y": "Todo público",
        ALL: "Todo público",
        PG: "+7",
        "TV-PG": "+7",
        "TV-Y7": "+7",
        "TV-Y7-FV": "+7",
        "PG-13": "+13",
        "TV-14": "+14",
        12: "+12",
        "12A": "+12",
        13: "+13",
        15: "+15",
        16: "+16",
        R: "+18",
        "NC-17": "+18",
        "TV-MA": "+18",
        18: "+18",
        "18A": "+18",
      };

      if (ratings[c]) return ratings[c];

      if (/^\d{1,2}$/.test(c)) return "+" + c;

      return c;
    }

    function extractCertification(data, type) {
      // Ignorar registros sin una clasificación utilizable.
      function isUsableCertification(value) {
        var cert = String(value || "").trim();
        if (!cert) return false;
        return !/^(NR|N\/A|NA|NOT RATED|UNRATED|NOT RATED YET|-)$/i.test(
          cert,
        );
      }

      if (type === "movie") {
        var groups =
          data.release_dates && data.release_dates.results
            ? data.release_dates.results
            : [];

        function certificationsFromGroup(group) {
          return (group.release_dates || [])
            .map(function (item) {
              return item.certification;
            })
            .filter(isUsableCertification);
        }

        // Prioridad: Guatemala, Estados Unidos y después cualquier país
        // que realmente tenga una certificación. No basta con que exista
        // un registro de Guatemala si su campo certification está vacío.
        var preferredCountries = ["GT", "US"];
        for (var i = 0; i < preferredCountries.length; i++) {
          var preferredGroup = groups.find(function (group) {
            return group.iso_3166_1 === preferredCountries[i];
          });
          if (preferredGroup) {
            var preferredCertifications =
              certificationsFromGroup(preferredGroup);
            if (preferredCertifications.length) {
              return normalizeAgeRating(preferredCertifications[0]);
            }
          }
        }

        for (var j = 0; j < groups.length; j++) {
          var otherCertifications = certificationsFromGroup(groups[j]);
          if (otherCertifications.length) {
            return normalizeAgeRating(otherCertifications[0]);
          }
        }
      } else {
        var ratings =
          data.content_ratings && data.content_ratings.results
            ? data.content_ratings.results
            : [];

        function isUsableTvRating(item) {
          return item && isUsableCertification(item.rating);
        }

        // La misma prioridad se aplica a las clasificaciones de series.
        var preferredTvCountries = ["GT", "US"];
        for (var k = 0; k < preferredTvCountries.length; k++) {
          var preferredTv = ratings.find(function (item) {
            return (
              item.iso_3166_1 === preferredTvCountries[k] &&
              isUsableTvRating(item)
            );
          });
          if (preferredTv) {
            return normalizeAgeRating(preferredTv.rating);
          }
        }

        var anyTvRating = ratings.find(isUsableTvRating);
        if (anyTvRating) {
          return normalizeAgeRating(anyTvRating.rating);
        }
      }

      return "";
    }

    function formatHeroRuntime(data, type) {
      var minutes = 0;

      if (type === "movie") {
        minutes = Number(data.runtime) || 0;
      } else if (data.episode_run_time && data.episode_run_time.length) {
        minutes = Number(data.episode_run_time[0]) || 0;
      }

      if (!minutes) return "";

      if (minutes >= 60) {
        var hours = Math.floor(minutes / 60);
        var remaining = minutes % 60;

        return (
          hours +
          " h" +
          (remaining ? " " + remaining + " min" : " min") +
          (type === "tv" ? "/episodio" : "")
        );
      }

      return minutes + " min" + (type === "tv" ? "/episodio" : "");
    }

    function renderHeroMeta(m, details) {
      var rating = (details && details.vote_average) || m.rating || 0;

      var runtime = details ? formatHeroRuntime(details, m.type) : "";

      var age = details ? extractCertification(details, m.type) : m.age || "";

      var category = heroCategory(m);

      var pieces = [];

      if (rating > 0) {
        pieces.push(
          '<span class="hero-meta-item rating">' +
          icons.star +
          Number(rating).toFixed(1) +
          "</span>",
        );
      }

      if (runtime) {
        pieces.push('<span class="hero-meta-item">' + runtime + "</span>");
      }

      if (age) {
        pieces.push(
          '<span class="hero-meta-item">' + escapeHTML(age) + "</span>",
        );
      }

      if (category) {
        pieces.push(
          '<span class="hero-meta-item">' + escapeHTML(category) + "</span>",
        );
      }

      $heroMeta.innerHTML = pieces.join("");
    }

    function truncateHeroDesc(text) {
      var t = String(text || "").replace(/\s+/g, " ").trim();
      if (!t) return "Sin descripción disponible.";
      if (t.length <= 150) return t;
      return t.slice(0, 150).replace(/[\s.,;:!?¡¿-]+$/, "") + "...";
    }
    /** Precarga la imagen (y los tráilers) del SIGUIENTE título para que el cambio sea instantáneo. */
    function heroWarmNext(m) {
      // Solo si este título lleva ≥ 4 s a la vista y la portada se está viendo: si el usuario se va antes, no se pidió nada de más.
      setTimeout(function () {
        if (currentHeroMedia !== m || document.hidden || heroBlocked()) return;
        heroWarmNextNow(m);
      }, 4000);
    }
    function heroWarmNextNow(m) {
      try {
        var list = heroMoviesList || [], i = list.findIndex(function (x) { return x && x.id === m.id && x.type === m.type; });
        var nx = i > -1 && list.length > 1 ? list[i + 1] : null;                 // sin vuelta: en el último título no se precarga nada
        if (!nx) return;
        if (nx.bg) { var img = new Image(); img.decoding = "async"; img.src = nx.bg.startsWith("http") ? nx.bg : IMG_BG + nx.bg; }
        if (typeof htTrailerKeys === "function") htTrailerKeys(nx);
        fetchTMDB((nx.type === "tv" ? "/tv/" : "/movie/") + nx.id, nx.type === "tv" ? "&append_to_response=content_ratings" : "&append_to_response=release_dates").catch(function () { });
      } catch (e) { }
    }
    /** Muestra el texto de la portada (estaba oculto con visibility para que el diseño no «salte» mientras llegan título, descripción y etiquetas). */
    function heroReady() { document.body.classList.add("hero-ready"); }
    function setHero(m) {
      if (!m) return;

      var request = ++heroRequestId, heroPainted = false, heroDetails = null;   // si los detalles llegan ANTES del cambio de texto (caché), se guardan y se pintan con él
      heroShownAt = Date.now();
      heroPlan(HERO_DWELL);          // cada título dura 10 s; si tiene tráiler, hero-trailer.js lo amplía a 18 s
      setHeroLoading(false);

      currentHeroMedia = m;
      heroWarmNext(m);
      updateHeroSaveButton(m);
      updateHeroDots(m);

      $heroSection.classList.remove("empty-search");
      $heroActions.style.display = "";

      $heroVideoWrap.classList.remove("active");
      $heroVideoWrap.innerHTML = "";
      $heroVideoWrap.dataset.key = "";

      $heroContent.classList.add("fading");

      setTimeout(function () {
        if (request !== heroRequestId) return;

        if (m.bg) {
          var u = m.bg.startsWith("http") ? m.bg : IMG_BG + m.bg;

          heroSwapBg(u, request);        // fundido cruzado entre dos capas: sin parpadeo ni salto
        } else {
          heroBgClear();
        }

        $heroTitle.textContent = m.title || "Sin título";

        $heroYear.textContent = m.year || "Año no disponible";

        $heroDesc.textContent = truncateHeroDesc(m.desc);

        renderHeroMeta(m, heroDetails);
        heroPainted = true;
        if (heroDetails) heroReady();                       // texto y etiquetas ya completos: se muestra todo de una vez (sin saltos)

        if (m.isUpcoming) {
          $heroPlayBtn.disabled = true;
          $heroPlayBtn.classList.add("upcoming");
          $heroPlayBtn.innerHTML = "PRÓXIMAMENTE";
          $heroPlayBtn.style.cursor = "default";
          $heroPlayBtn.onclick = null;
        } else {
          $heroPlayBtn.disabled = false;
          $heroPlayBtn.classList.remove("upcoming");
          $heroPlayBtn.style.cursor = "pointer";

          $heroPlayBtn.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
            '<path d="M8 5v14l11-7z"/>' +
            "</svg>Ver";

          $heroPlayBtn.onclick = function () {
            openPlayer(m.id, m.type, m.title, null, null, m.bg);
          };
        }

        $heroContent.classList.remove("fading");
      }, 180);

      // Consultar únicamente los metadatos necesarios.
      // No solicita vídeos ni tráileres de YouTube.

      var endpoint = m.type === "tv" ? "/tv/" + m.id : "/movie/" + m.id;

      var append =
        m.type === "tv"
          ? "&append_to_response=content_ratings"
          : "&append_to_response=release_dates";

      fetchTMDB(endpoint, append)
        .then(function (data) {
          if (
            request !== heroRequestId ||
            !currentHeroMedia ||
            currentHeroMedia.id !== m.id ||
            currentHeroMedia.type !== m.type
          )
            return;

          heroDetails = data;
          if (heroPainted) { renderHeroMeta(m, data); heroReady(); }
        })
        .catch(function () {
          if (request === heroRequestId) { renderHeroMeta(m, null); if (heroPainted) heroReady(); }
        });
    }
    /** Indicadores del carrusel (uno por título del Top 10); tocar uno salta a ese título. */
    function renderHeroDots() {
      var box = $("hero-dots");
      if (!box) {
        box = document.createElement("div");
        box.id = "hero-dots";
        box.className = "hero-dots";
        box.setAttribute("role", "group");
        box.addEventListener("click", function (e) {
          var b = e.target.closest("[data-i]");
          if (!b) return;
          currentHeroIndex = Number(b.getAttribute("data-i"));
          setHero(heroMoviesList[currentHeroIndex]);
        });
        $heroSection.appendChild(box);
      }
      box.hidden = heroMoviesList.length < 2;
      box.innerHTML = heroMoviesList.map(function (x, i) {
        return '<button type="button" class="hero-dot' + (i === currentHeroIndex ? " active" : "") + '" data-i="' + i + '" aria-label="' + (i + 1) + '"></button>';
      }).join("");
    }
    function updateHeroDots(m) {
      var i = heroMoviesList.indexOf(m);
      if (i < 0) return;
      currentHeroIndex = i;
      document.querySelectorAll("#hero-dots .hero-dot").forEach(function (b, n) { b.classList.toggle("active", n === i); });
    }
    // Fundido cruzado de la portada: dos capas de fondo; la nueva (siempre encima) aparece sobre la actual ya cargada.
    var heroBgLayers = null, heroBgFront = 0;
    function heroBgInit() {
      if (heroBgLayers) return;
      var b2 = $heroBg.cloneNode(false);
      b2.id = "hero-bg2";
      b2.setAttribute("aria-hidden", "true");
      b2.style.opacity = "0";
      $heroBg.parentNode.insertBefore(b2, $heroBg.nextSibling);
      heroBgLayers = [$heroBg, b2];
    }
    function heroSwapBg(url, request) {
      heroBgInit();
      var front = heroBgLayers[heroBgFront], back = heroBgLayers[1 - heroBgFront], img = new Image();
      img.onload = img.onerror = function () {
        if (request !== heroRequestId) return;
        back.style.zIndex = "2"; front.style.zIndex = "1";
        back.style.backgroundImage = "url('" + url + "')";
        back.style.opacity = "1";                       // la capa nueva se funde por encima (transición en CSS)
        heroBgFront = 1 - heroBgFront;
        setTimeout(function () {                        // la anterior ya está tapada: se vacía sin animación
          front.style.transition = "none"; front.style.opacity = "0"; void front.offsetWidth; front.style.transition = "";
        }, 1000);
      };
      img.src = url;
    }
    function heroBgClear() {
      heroBgInit();
      heroBgLayers.forEach(function (l) { l.style.backgroundImage = "none"; });
    }
    function heroPreloadNext() {
      if (heroMoviesList.length < 2 || heroBlocked()) return;                       // sin precargar si la portada no se está viendo
      var n = heroMoviesList[currentHeroIndex + 1];                                    // sin vuelta al primero
      if (n && n.bg) { var i = new Image(); i.src = n.bg.startsWith("http") ? n.bg : IMG_BG + n.bg; }   // la imagen ya está lista al llegar su turno
    }
    // Rotación de la portada: UN temporizador por título (no un intervalo global), así cada título dura lo mismo aunque
    // se salte con los puntos, se vuelva de otra pestaña o se espere al selector de perfiles: 10 s (sin tráiler) o 1,8 + 18 + 10 s (con tráiler).
    var HERO_DWELL = 10000, heroShownAt = 0, heroCarouselOn = false;
    function heroBlocked() {
      var picker = document.getElementById("tc-profile-overlay");
      return document.hidden || isSearching || heroSectionIsEmpty() || (picker && picker.classList.contains("open")) || document.body.style.overflow === "hidden" ||
        document.body.classList.contains("rm") || window.scrollY > $heroSection.offsetHeight;
    }
    function heroPlan(total) {
      clearTimeout(heroInterval);
      if (!heroCarouselOn) return;
      if (currentHeroIndex >= heroMoviesList.length - 1) return;                        // el décimo del Top 10 se queda fijo (sin volver al primero) hasta que el usuario elija otro
      heroInterval = setTimeout(heroTick, Math.max(400, total - (Date.now() - heroShownAt)));
    }
    function heroTick() {
      if (heroBlocked()) { heroInterval = setTimeout(heroTick, 1000); return; }       // sin rotar (ni descargar) si no se está viendo
      if (currentHeroIndex >= heroMoviesList.length - 1) return;                        // último título: no hay siguiente
      currentHeroIndex = currentHeroIndex + 1;
      setHero(heroMoviesList[currentHeroIndex]);
      setTimeout(heroPreloadNext, 1500);
    }
    function startHeroCarousel(m) {
      heroMoviesList = (m || []).slice(0, 10);          // Top 10 de la semana
      currentHeroIndex = 0;
      clearTimeout(heroInterval);
      renderHeroDots();
      heroCarouselOn = heroMoviesList.length >= 2;
      heroShownAt = Date.now();
      heroPlan(HERO_DWELL);
      heroPreloadNext();
    }
    function heroSectionIsEmpty() {
      return $heroSection.classList.contains("empty-search");
    }
    function prefetchDetails(id, type) {
      var key = type + "_" + id;
      if (cachedDetails[key]) return;
      var endpoint = type === "tv" ? "/tv/" + id : "/movie/" + id;
      fetchTMDB(
        endpoint,
        "&append_to_response=credits,videos,similar,recommendations",
      )
        .then(function (d) {
          cachedDetails[key] = d;
        })
        .catch(function () { });
    }
    function openHeroDetails() {
      var media = currentHeroMedia;
      if (!media) {
        showToast("No hay un título destacado disponible");
        return;
      }

      var mediaId = Number(media.id);
      var mediaType = media.type || media.media_type;

      if (!Number.isSafeInteger(mediaId) || mediaId <= 0 ||
        (mediaType !== "movie" && mediaType !== "tv")) {
        console.error("TatoCine: datos inválidos del título destacado", media);
        showToast("No se pudieron identificar los detalles de este título");
        return;
      }

      openDetails(mediaId, mediaType);
    }
// Seguro: si la portada no llega (sin red o error de TMDB), a los 3 s se muestra lo que haya (nunca queda oculta).
setTimeout(function () { document.body.classList.add("hero-ready"); }, 3000);

/**
 * TatoCine · js/features/kids.js
 * Modo infantil: filtro de contenido apto y límite de uso (8 h + descanso de 1 h).
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Contenido para niños: solo se acepta lo que TMDB clasifica como apto (mismo criterio que la pestaña Niños) ----
    var KID_BLOCKED_GENRES = [27, 53, 80, 10752];
    var KID_MOVIE_CERTS = ["G"];
    var KID_TV_CERTS = ["TV-Y", "TV-Y7", "TV-G"];
    var kidSafeCache = {};
    function kidsContext() { return isKidProfile() || currentView === "kids"; }
    // Capa extra: descarta títulos con términos explícitos aunque TMDB los clasifique como aptos.
    var KID_BLOCKED_TERMS = /\bsex|porn|\bxxx|er[oó]tic|hentai|nsfw|fetish|bdsm|desnud|\bnaked|\bnude/i;
    function hasBlockedTerms() {
      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] && KID_BLOCKED_TERMS.test(String(arguments[i]))) return true;
      }
      return false;
    }
    function kidSafeFromDetails(d, type) {
      if (!d || d.adult) return false;
      if (hasBlockedTerms(d.title, d.name, d.original_title, d.original_name, d.overview, d.tagline)) return false;
      var blocked = (d.genres || []).some(function (g) { return KID_BLOCKED_GENRES.indexOf(g.id) > -1; });
      if (blocked) return false;
      var certs = [];
      if (type === "tv") {
        ((d.content_ratings && d.content_ratings.results) || []).forEach(function (r) {
          if (r.iso_3166_1 === "US" && r.rating) certs.push(r.rating);
        });
        return certs.length > 0 && certs.every(function (c) { return KID_TV_CERTS.indexOf(c) > -1; });
      }
      ((d.release_dates && d.release_dates.results) || []).forEach(function (r) {
        if (r.iso_3166_1 !== "US") return;
        (r.release_dates || []).forEach(function (x) { if (x.certification) certs.push(x.certification); });
      });
      return certs.length > 0 && certs.every(function (c) { return KID_MOVIE_CERTS.indexOf(c) > -1; });
    }
    function isKidSafe(id, type) {
      var key = type + ":" + id;
      if (Object.prototype.hasOwnProperty.call(kidSafeCache, key)) return Promise.resolve(kidSafeCache[key]);
      var endpoint = type === "tv" ? "/tv/" + id : "/movie/" + id;
      var append = type === "tv" ? "&append_to_response=content_ratings" : "&append_to_response=release_dates";
      return fetchTMDB(endpoint, append).then(function (d) {
        var ok = kidSafeFromDetails(d, type);
        kidSafeCache[key] = ok;
        return ok;
      }).catch(function () { return false; });
    }
    function kidsFilterSearch(list, limit) {
      var candidates = list.filter(function (x) {
        return !x.adult && !hasBlockedTerms(x.title, x.desc) && !(x.genre_ids || []).some(function (g) { return KID_BLOCKED_GENRES.indexOf(g) > -1; });
      }).slice(0, limit || 16);
      return Promise.all(candidates.map(function (x) {
        return isKidSafe(x.id, x.type).then(function (ok) { return ok ? x : null; });
      })).then(function (r) { return r.filter(Boolean); });
    }
    (function guardKidContent() {
      var BLOCKED_MSG = "Este contenido no está disponible en la sección Niños";
      decorate("openDetails", function (original) { return function (id, type) {
        if (!kidsContext()) return original(id, type);
        id = Number(id);
        if (!Number.isSafeInteger(id) || id <= 0 || (type !== "movie" && type !== "tv")) return original(id, type);
        isKidSafe(id, type).then(function (ok) { if (ok) original(id, type); else showToast(BLOCKED_MSG); });
      }; });
      decorate("openPlayer", function (original) { return function (i, t, ti, season, episode, bg) {
        if (!kidsContext()) return original(i, t, ti, season, episode, bg);
        isKidSafe(i, t).then(function (ok) { if (ok) original(i, t, ti, season, episode, bg); else showToast(BLOCKED_MSG); });
      }; });
      decorate("prepareSimilarQueue", function (original) { return function (media) {
        if (!kidsContext()) return original(media);
        similarQueue = [];
        playerEndedHandled = false;
        isAdvancingSimilar = false;
        similarQueuePromise = Promise.resolve([]);
        return similarQueuePromise;
      }; });
    })();

    // ==========================================================
    // V5 · Límite de uso infantil, imágenes de plataformas, regreso a inicio
    //      y modo ligero para Smart TV y dispositivos modestos.
    // ==========================================================

    // ---- Límite de uso infantil: 8 h de uso y 1 h de descanso (local, compartido por los perfiles Niño del dispositivo) ----
    var KID_LIMIT_SECS = 8 * 3600, KID_BREAK_MS = 3600 * 1000, KID_USAGE_KEY = "tatoKidUsageV1";
    var kidUsage = readLocalJSON(KID_USAGE_KEY, null);
    if (!kidUsage || typeof kidUsage !== "object") kidUsage = { day: "", secs: 0, lockedUntil: 0 };
    var kidLastTick = Date.now(), kidWarned = false, kidSavedAt = 0, kidLockTimer = null;
    function dayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
    function saveKidUsage() { kidSavedAt = Date.now(); safeStorageSet(KID_USAGE_KEY, JSON.stringify(kidUsage)); }
    function updateKidLockTime() {
      var left = (kidUsage.lockedUntil || 0) - Date.now();
      if (left <= 0) { unlockKid(); return; }
      var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      $("tc-kid-lock-time").textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    }
    function showKidLock() {
      var el = $("tc-kid-lock");
      if (!el.classList.contains("open")) {
        el.classList.add("open");
        try { if ($modal.classList.contains("open")) closePlayer(); } catch (e) { }
        try { if ($detailsModal.classList.contains("open")) closeDetails(true); } catch (e) { }
        try { if ($actorModal.classList.contains("open")) closeActor(); } catch (e) { }
        document.body.style.overflow = "hidden";
        kidLockTimer = setInterval(updateKidLockTime, 1000);
        window.setTimeout(function () { var b = el.querySelector("button"); if (b) b.focus(); }, 80);
      }
      updateKidLockTime();
    }
    function hideKidLock() {
      var el = $("tc-kid-lock");
      if (el.classList.contains("open")) { el.classList.remove("open"); document.body.style.overflow = ""; }
      clearInterval(kidLockTimer);
    }
    function unlockKid() {
      kidUsage = { day: dayKey(), secs: 0, lockedUntil: 0 };
      kidWarned = false;
      saveKidUsage();
      hideKidLock();
      if (isKidProfile()) showToast("Descanso terminado: ya puedes volver a ver contenido");
    }
    function kidUsageTick() {
      var now = Date.now();
      var elapsed = Math.min(15, Math.max(0, (now - kidLastTick) / 1000));
      kidLastTick = now;
      if (!isKidProfile()) return;
      if (kidUsage.lockedUntil && kidUsage.lockedUntil > now) { showKidLock(); return; }
      if (kidUsage.lockedUntil) { unlockKid(); return; }
      if (kidUsage.day !== dayKey()) { kidUsage.day = dayKey(); kidUsage.secs = 0; kidWarned = false; }
      if (document.hidden) return;
      kidUsage.secs += elapsed;
      if (kidUsage.secs >= KID_LIMIT_SECS) {
        kidUsage.lockedUntil = now + KID_BREAK_MS;
        saveKidUsage();
        showKidLock();
        return;
      }
      if (!kidWarned && KID_LIMIT_SECS - kidUsage.secs <= 900) { kidWarned = true; showToast("Quedan 15 minutos de uso antes del descanso"); }
      if (now - kidSavedAt > 30000) saveKidUsage();
    }
    setInterval(kidUsageTick, 5000);
    document.addEventListener("visibilitychange", function () { if (document.hidden && isKidProfile()) saveKidUsage(); kidLastTick = Date.now(); });
    window.addEventListener("pagehide", function () { if (isKidProfile()) saveKidUsage(); });
    if (isKidProfile()) kidUsageTick();

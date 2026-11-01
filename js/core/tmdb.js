/**
 * TatoCine · js/core/tmdb.js
 * Cliente de TMDB: caché en memoria, peticiones deduplicadas, tiempo límite e idioma por perfil.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function fetchTMDB(e, q) {
      return new Promise(function (resolve, reject) {
        if (
          !TMDB_API_KEY ||
          TMDB_API_KEY.includes("TU_CLAVE") ||
          TMDB_API_KEY === "xxx" ||
          TMDB_API_KEY === "xx" ||
          TMDB_API_KEY === "xxxx"
        )
          return reject(new Error("Sin API Key"));
        var key = e + "|" + (q || "");
        var now = Date.now();
        var cached = tmdbCache.get(key);
        if (cached && now - cached.ts < CACHE_TTL)
          return resolve(cached.data);
        if (tmdbPending.has(key)) {
          tmdbPending.get(key).then(resolve, reject);
          return;
        }
        var u;
        try {
          u = new URL("https://api.themoviedb.org/3" + e);
          u.searchParams.set("api_key", TMDB_API_KEY);
          u.searchParams.set("language", TMDB_LANG);
          if (activeProfileId === "guest") u.searchParams.set("_g", "1");   // el Service Worker no guarda estas respuestas
          var x = new URLSearchParams((q || "").replace(/^[?&]/, ""));
          x.forEach(function (v, k) {
            u.searchParams.set(k, v);
          });
        } catch (err) {
          return reject(err);
        }
        var controller =
          typeof window.AbortController === "function"
            ? new AbortController()
            : null;
        var options = {
          method: "GET",
          headers: { Accept: "application/json" },
        };
        if (controller) options.signal = controller.signal;
        var timeout = setTimeout(function () {
          if (controller) controller.abort();
        }, 18000);
        var request = fetch(u.toString(), options)
          .then(function (r) {
            if (!r.ok) throw new Error("TMDB HTTP " + r.status);
            return r.json();
          })
          .then(function (d) {
            if (d && !d.error) {
              tmdbCache.set(key, { data: d, ts: Date.now() });
              if (tmdbCache.size > CACHE_MAX_ENTRIES) {
                var oldest = tmdbCache.keys().next().value;
                if (oldest) tmdbCache.delete(oldest);
              }
            }
            return d;
          });
        tmdbPending.set(key, request);
        request.then(
          function (data) {
            clearTimeout(timeout);
            tmdbPending.delete(key);
            resolve(data);
          },
          function (err) {
            clearTimeout(timeout);
            tmdbPending.delete(key);
            reject(err);
          },
        );
      });
    }

/**
 * TatoCine · js/core/storage-maintenance.js
 * Mantenimiento de almacenamiento: limpieza, cuota y ajustes de espacio.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Almacenamiento local: guardado compacto, limpieza y manejo de cuota ----
    var STORAGE_LEGACY_KEYS = ["tatoList", "tatoContinue", "tatoLocalAnalyticsV1", "tatoServer", "tatoAutoNextEpisode"];
    // Escritura segura (la original de storage.js). La decorada reintenta tras liberar espacio si la cuota se llena.
    var storageSetOriginal = safeStorageSet;
    decorate("safeStorageSet", function (original) {
      return function (key, value) {
        if (original(key, value)) return true;
        pruneStorage(true);             // cuota llena: libera espacio y reintenta una vez
        return original(key, value);
      };
    });
    function pruneStorage(aggressive) {
      try {
        var valid = {};
        localProfiles.forEach(function (p) { valid[p.id] = true; });
        Object.keys(localStorage).forEach(function (k) {
          var m = /^tatoProfile_([^_]+)_/.exec(k);
          if (m && !valid[m[1]]) localStorage.removeItem(k);          // datos de perfiles que ya no existen
        });
        STORAGE_LEGACY_KEYS.forEach(function (k) {                    // claves antiguas ya migradas
          if (!valid.main || localStorage.getItem("tatoProfile_main_" + k) !== null) localStorage.removeItem(k);
        });
        var now = Date.now(), day = 86400000;
        var items = (localAnalytics.items || []).filter(function (x) {
          return x && x.id && x.type && (x.done > 0 || now - (x.lastPlayedAt || now) < 365 * day);
        });
        items.sort(function (a, b) { return (a.lastPlayedAt || 0) - (b.lastPlayedAt || 0); });
        items = items.slice(-(aggressive ? 60 : 150));
        items.forEach(function (x) { if (x.genreIds && x.genreIds.length > 6) x.genreIds = x.genreIds.slice(0, 6); });
        localAnalytics.items = items;
        storageSetOriginal(profileStorageKey(LOCAL_ANALYTICS_KEY), JSON.stringify(localAnalytics));
        continueWatching = continueWatching.filter(function (m) { return !m.timestamp || now - m.timestamp < 90 * day; }).slice(0, aggressive ? 8 : 20);
        storageSetOriginal(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
        var seenFav = {};
        myList = myList.filter(function (m) {
          var k = m && m.type + ":" + m.id;
          if (!m || !m.id || seenFav[k]) return false;
          seenFav[k] = true;
          return true;
        }).map(function (m) {
          var c = { id: m.id, type: m.type, title: m.title, bg: m.bg || "", rating: m.rating || 0, year: m.year || "" };
          if (m.list) c.list = m.list;
          return c;
        });
        storageSetOriginal(profileStorageKey("tatoList"), JSON.stringify(myList));
      } catch (e) { }
    }
    function clearSwCaches() {
      return new Promise(function (resolve) {
        var done = false;
        function finish() { if (!done) { done = true; resolve(); } }
        try {
          if (window.caches) {
            window.caches.keys().then(function (names) {
              return Promise.all(names.filter(function (n) { return /^tatocine-(img|api)/.test(n); }).map(function (n) { return window.caches.delete(n); }));
            }).then(finish, finish);
          } else finish();
        } catch (e) { finish(); }
        setTimeout(finish, 2500);
      });
    }
    function localStorageBytes() {
      var total = 0;
      try { Object.keys(localStorage).forEach(function (k) { total += (k.length + (localStorage.getItem(k) || "").length) * 2; }); } catch (e) { }
      return total;
    }
    function fmtBytes(n) {
      if (n < 1024) return n + " B";
      if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
      return (n / 1048576).toFixed(1) + " MB";
    }
    function updateStorageInfo() {
      var el = $("storage-summary");
      if (!el) return;
      var local = "Datos locales: " + fmtBytes(localStorageBytes());
      el.textContent = local;
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(function (e) {
          el.textContent = local + " · Total usado por la app: " + fmtBytes(e.usage || 0);
        }).catch(function () { });
      }
    }
    function freeStorage() {
      clearSwCaches().then(function () {
        pruneStorage(true);
        updateStorageInfo();
        showToast("Espacio liberado");
      });
    }

    // Limpieza de datos obsoletos sin bloquear el arranque
    IDLE(function () { pruneStorage(false); });

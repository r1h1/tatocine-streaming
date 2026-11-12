/**
 * TatoCine · js/core/pwa.js
 * PWA: manifiesto, Service Worker y reintento de imágenes.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- PWA: manifiesto real, Service Worker y avisos de actualización ----
    (function setupPwa() {
      var link = document.getElementById("manifest-link");
      function fallbackManifest() {
        try {
          var blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
          link.href = URL.createObjectURL(blob);
        } catch (e) { }
      }
      if (location.protocol === "file:") fallbackManifest();          // (antes también se pedía el manifiesto con HEAD en cada carga: el <link rel="manifest"> ya lo descarga)
      // La limpieza de cachés obsoletas la hace el Service Worker en «activate» (sw.js) y conserva la caché de imágenes activa.
      if (!("serviceWorker" in navigator)) return;
      // En desarrollo (localhost / 127.0.0.1) no se usa Service Worker: así siempre se ve el último código.
      // Para probarlo allí: abre la app una vez con ?sw=1 (y ?sw=0 para volver a desactivarlo).
      var devHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
      try {
        if (/[?&]sw=1/.test(location.search)) localStorage.setItem("tatoDevSw", "1");
        if (/[?&]sw=0/.test(location.search)) localStorage.removeItem("tatoDevSw");
      } catch (e) { }
      var devSw = false;
      try { devSw = localStorage.getItem("tatoDevSw") === "1"; } catch (e) { }
      if (devHost && !devSw) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { r.unregister(); });
          if (regs.length && window.caches) window.caches.keys().then(function (names) {
            names.forEach(function (n) { if (/^tatocine-/.test(n)) window.caches.delete(n); });
          });
        }).catch(function () { });
        return;
      }
      if (location.protocol === "https:" || devHost) {
        var refreshing = false, wantReload = false;
        // La versión nueva espera: se instala en segundo plano y se activa cuando el usuario pulsa «Actualizar» (no a mitad de una película).
        function offerUpdate(reg) {
          if (!reg.waiting || !navigator.serviceWorker.controller) return;
          showToastAction(L("Hay una versión nueva de TatoCine", "A new version of TatoCine is available"), L("Actualizar", "Update"), function () { wantReload = true; reg.waiting.postMessage({ type: "SKIP_WAITING" }); }, 30000);
        }
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (reg) {
            offerUpdate(reg);
            reg.addEventListener("updatefound", function () {
              var w = reg.installing;
              if (w) w.addEventListener("statechange", function () { if (w.state === "installed") offerUpdate(reg); });
            });
            reg.update();
            setInterval(function () { reg.update().catch(function () { }); }, 60 * 60 * 1000);                          // busca versiones nuevas cada hora
            var lastSwCheck = Date.now();
            document.addEventListener("visibilitychange", function () { if (!document.hidden && Date.now() - lastSwCheck > 30 * 60 * 1000) { lastSwCheck = Date.now(); reg.update().catch(function () { }); } });   // como mucho cada 30 min
          }).catch(function () { });
        });
        // El SW detectó que index.html cambió sin subir la versión y ya refrescó sus archivos: se ofrece recargar.
        navigator.serviceWorker.addEventListener("message", function (e) {
          if (e.data && e.data.type === "SHELL_REFRESHED") showToastAction(L("Hay una versión nueva de TatoCine", "A new version of TatoCine is available"), L("Actualizar", "Update"), function () { location.reload(); });
        });
        navigator.serviceWorker.addEventListener("controllerchange", function () {
          if (refreshing || !wantReload) return;                                                                      // la primera instalación toma el control sin recargar
          refreshing = true;
          location.reload();                                                                                           // tras «Actualizar»: se recarga con la versión nueva
        });
      }
    })();

    // Imágenes de TMDB: si una falla, se reintenta antes de mostrar la imagen de respaldo.
    document.addEventListener("error", function (e) {
      var img = e.target;
      if (!img || img.tagName !== "IMG" || !/image\.tmdb\.org/.test(img.src || "")) return;
      var tries = Number(img.getAttribute("data-retry") || 0);
      if (tries >= 2) return;                       // tercer fallo: sigue el manejador original (imagen de respaldo)
      e.stopImmediatePropagation();
      img.setAttribute("data-retry", String(tries + 1));
      var base = img.src.replace(/[?&]r=\d+$/, "");
      window.setTimeout(function () { img.src = base + (base.includes("?") ? "&" : "?") + "r=" + (tries + 1); }, 400 * (tries + 1));
    }, true);

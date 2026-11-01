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
      if (location.protocol === "file:") fallbackManifest();
      else fetch("manifest.webmanifest", { method: "HEAD", cache: "no-store" }).then(function (r) { if (!r.ok) fallbackManifest(); }).catch(fallbackManifest);
      // Limpia cachés de imágenes de versiones anteriores (ya no se usan).
      try {
        if (window.caches) window.caches.keys().then(function (names) {
          names.forEach(function (n) { if (/^tatocine-img/.test(n)) window.caches.delete(n); });
        });
      } catch (e) { }
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
        var hadController = !!navigator.serviceWorker.controller;
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("sw.js").then(function (reg) { reg.update(); }).catch(function () { });
        });
        navigator.serviceWorker.addEventListener("controllerchange", function () {
          if (hadController) showToast("TatoCine se actualizó. Recarga para ver la última versión.");
          hadController = true;
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
      window.setTimeout(function () { img.src = base + (base.indexOf("?") > -1 ? "&" : "?") + "r=" + (tries + 1); }, 400 * (tries + 1));
    }, true);

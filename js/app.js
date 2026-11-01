/**
 * TatoCine · js/app.js
 * Arranque: enlaces directos, manifiesto de respaldo y primera vista.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function checkDeepLink() {
      var params = new URLSearchParams(location.search);
      var id = params.get("id");
      var type = params.get("type");
      var tab = params.get("tab");
      var q = params.get("q");
      if (
        tab &&
        ["home", "movies", "series", "anime", "kids", "list"].indexOf(tab) >
        -1
      )
        switchView(tab, false);
      if (id && type && (type === "movie" || type === "tv"))
        setTimeout(function () {
          openDetails(parseInt(id, 10), type);
        }, 600);
      else if (q) {
        $searchInput.value = q;
        setTimeout(function () {
          performSearch(q);
        }, 450);
      }
    }

    const pwaIcon192 =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Ccircle cx="96" cy="96" r="96" fill="%23FFFFFF"/%3E%3Cpath d="M70 60l70 36-70 36z" fill="%23000000"/%3E%3C/svg%3E';
    const pwaIcon512 =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"%3E%3Ccircle cx="256" cy="256" r="256" fill="%23FFFFFF"/%3E%3Cpath d="M190 160l180 96-180 96z" fill="%23000000"/%3E%3C/svg%3E';
    const manifest = {
      name: "TatoCine - Streaming Gratis",
      short_name: "TatoCine",
      description: "TatoCine: películas, anime y series gratis en streaming.",
      lang: "es",
      dir: "ltr",
      start_url: location.href,
      scope: location.href.substring(0, location.href.lastIndexOf("/") + 1),
      display: "standalone",
      display_override: ["standalone", "minimal-ui", "browser"],
      orientation: "any",
      background_color: "#000000",
      theme_color: "#000000",
      categories: ["entertainment", "video"],
      icons: [
        {
          src: pwaIcon192,
          sizes: "192x192",
          type: "image/svg+xml",
          purpose: "any",
        },
        {
          src: pwaIcon512,
          sizes: "512x512",
          type: "image/svg+xml",
          purpose: "any",
        },
        {
          src: pwaIcon512,
          sizes: "512x512",
          type: "image/svg+xml",
          purpose: "maskable",
        },
      ],
    };
    if (!navigator.onLine) $offlineBanner.style.transform = "translateY(0)";
    $searchInput.value = "";
    updateProfileTrigger();
    if (profilePickerRequired) showProfiles(true);
    switchView("home");
    setTimeout(checkDeepLink, 300);

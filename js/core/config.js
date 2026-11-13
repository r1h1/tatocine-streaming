/**
 * TatoCine · js/core/config.js
 * Configuración global: clave de TMDB, bases de imágenes, iconos y servidores de reproducción.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // La clave se configura en config.js (raíz del proyecto), no en este archivo.
    const TMDB_API_KEY = String((window.TATOCINE_CONFIG && window.TATOCINE_CONFIG.TMDB_API_KEY) || "").trim();
    if (!TMDB_API_KEY && window.console) console.error("TatoCine: falta la clave de TMDB. Edita config.js (TMDB_API_KEY).");
    var IMG_BG = "https://image.tmdb.org/t/p/w1280";
    var IMG_CARD = "https://image.tmdb.org/t/p/w300";
    const IMG_W185 = "https://image.tmdb.org/t/p/w185";

    const icons = {
      lightning:
        '<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
      play: '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
      server:
        '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
      disc: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
      film: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
      globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
      star: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    };
    const SERVERS = [
      {
        name: "ESP1",
        icon: icons.lightning,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://api.moviemaster.lat/e/tv/${i}/${s}/${e}?skin=minimal&color=000000&lang=LAT&autoplay=1`
            : `https://api.moviemaster.lat/e/movie/${i}?skin=minimal&color=000000&lang=LAT&autoplay=1`,
      },
      {
        name: "ESP2",
        icon: icons.disc,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://tukiplay.com/embed/tv/${i}/${s}/${e}?autoplay=1`
            : `https://tukiplay.com/embed/movie/${i}?autoplay=1`,
      },
      {
        name: "ESP3",
        icon: icons.play,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://unlimplay.com/f/embed/tv/${i}/${s}/${e}`
            : `https://unlimplay.com/f/embed/movie/${i}`,
      },
      {
        name: "ESP4",                                  // VideoAPI (videoapi.la): embed público por ID de TMDB, películas y series
        icon: icons.film,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://videoapi.la/e/tv/${i}/${s}/${e}?autoplay=1`
            : `https://videoapi.la/e/movie/${i}?autoplay=1`,
      },
      {
        name: "ESP5",                                  // FacilitoPlay (facilitoplay.com): patrón público /e/pelicula y /e/serie por ID de TMDB
        icon: icons.globe,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://facilitoplay.com/e/serie/${i}/${s}/${e}`
            : `https://facilitoplay.com/e/pelicula/${i}`,
      },
      {
        name: "ENG1",
        icon: icons.server,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://vidsrc.sh/embed/tv/${i}/${s}/${e}`
            : `https://vidsrc.sh/embed/movie/${i}`,
      },
    ];

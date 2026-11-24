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
    // Nombres OP1–OP5 (antes ESP1–ESP5; ver migrateServerNamesV3).
    // Servidores, de los que funcionan mejor a los que menos (revisados en una Google TV con El rey león 2019, TMDB 420818): videoapi traía la versión correcta;
    // unlimplay a veces no carga o trae otra película y facilitoplay dio 404 con anuncios para adultos (por eso NO se ofrece en perfiles infantiles: adultAds).
    // El cambio automático de servidor sigue este mismo orden.
    const SERVERS = [
      {
        name: "OP1",                                  // MovieMaster (moviemaster.lat): latino obligatorio
        icon: icons.lightning,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://api.moviemaster.lat/e/tv/${i}/${s}/${e}?color=000000&lang=LAT&autoplay=1`
            : `https://api.moviemaster.lat/e/movie/${i}?color=000000&lang=LAT&autoplay=1`,
      },
      {
        name: "OP2",                                  // VideoAPI (videoapi.la): embed público por ID de TMDB, películas y series (antes ESP4)
        icon: icons.film,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://videoapi.la/e/tv/${i}/${s}/${e}?autoplay=1`
            : `https://videoapi.la/e/movie/${i}?autoplay=1`,
      },
      {
        name: "OP3",                                  // TukiPlay (tukiplay.com) (antes ESP2)
        icon: icons.disc,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://tukiplay.com/embed/tv/${i}/${s}/${e}?autoplay=1`
            : `https://tukiplay.com/embed/movie/${i}?autoplay=1`,
      },
      {
        name: "OP4",                                  // UnLimPlay (unlimplay.com) (antes ESP3): a veces no carga o trae otra película
        icon: icons.play,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://unlimplay.com/f/embed/tv/${i}/${s}/${e}`
            : `https://unlimplay.com/f/embed/movie/${i}`,
      },
      {
        name: "OP5",                                  // FacilitoPlay (facilitoplay.com): /e/pelicula y /e/serie por ID de TMDB; anuncios para adultos
        icon: icons.globe,
        adultAds: true,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://facilitoplay.com/e/serie/${i}/${s}/${e}`
            : `https://facilitoplay.com/e/pelicula/${i}`,
      },
      // ENG1 (vidsrc.sh) se QUITÓ en nov 2026: inyectaba un falso «Confirm you're not a robot» con un QR (publicidad engañosa desde dominios
      // aleatorios), cargaba rastreadores (histats, crwdcntrl, onaudience…) y no acepta sandbox. Política de TatoCine: cero anuncios y rastreadores.
      // Quien lo tenía como preferido o recordado vuelve a ESP1 (los nombres se validan contra esta lista).
    ];
    // Nombres guardados con la lista anterior (servidor preferido y el que funcionó por título, en cada perfil): se traducen UNA vez a los nuevos.
    // Antes: ESP2 tukiplay, ESP3 unlimplay, ESP4 videoapi, ESP5 facilitoplay.  Ahora: ESP2 videoapi, ESP3 tukiplay, ESP4 unlimplay, ESP5 facilitoplay.
    (function migrateServerNames() {
      try {
        if (localStorage.getItem("tatoServersV2") === "1") return;
        var MAP = { ESP2: "ESP3", ESP3: "ESP4", ESP4: "ESP2" };
        for (var n = localStorage.length - 1; n >= 0; n--) {
          var k = localStorage.key(n);
          if (!k) continue;
          if (/(^|_)tatoServer$/.test(k)) {
            var v = String(localStorage.getItem(k) || "").replace(/"/g, "");
            if (MAP[v]) localStorage.setItem(k, k === "tatoServer" ? JSON.stringify(MAP[v]) : MAP[v]);
          } else if (/(^|_)tatoTitleServer$/.test(k)) {
            var o = JSON.parse(localStorage.getItem(k) || "{}");
            if (o && typeof o === "object") { Object.keys(o).forEach(function (t) { if (o[t] && MAP[o[t].s]) o[t].s = MAP[o[t].s]; }); localStorage.setItem(k, JSON.stringify(o)); }
          }
        }
        localStorage.setItem("tatoServersV2", "1");
      } catch (e) { }
    })();
    // Nov 2026: ESP1–ESP5 pasan a llamarse OP1–OP5 (mismo orden y mismos sitios) y ENG1 se quitó (publicidad engañosa). Se traduce UNA vez lo guardado
    // en cada perfil (servidor preferido y memoria por título). Va DESPUÉS de la migración V2, que sigue usando los nombres ESP.
    (function migrateServerNamesV3() {
      try {
        if (localStorage.getItem("tatoServersV3") === "1") return;
        var to = function (v) { return /^ESP[1-5]$/.test(v) ? "OP" + v.slice(3) : v === "ENG1" ? "OP1" : v; };
        for (var n = localStorage.length - 1; n >= 0; n--) {
          var k = localStorage.key(n);
          if (!k) continue;
          if (/(^|_)tatoServer$/.test(k)) {
            var v = String(localStorage.getItem(k) || "").replace(/"/g, ""), w = to(v);
            if (w !== v) localStorage.setItem(k, k === "tatoServer" ? JSON.stringify(w) : w);
          } else if (/(^|_)tatoTitleServer$/.test(k)) {
            var o = JSON.parse(localStorage.getItem(k) || "{}");
            if (o && typeof o === "object") { Object.keys(o).forEach(function (t) { if (o[t] && o[t].s) o[t].s = to(o[t].s); }); localStorage.setItem(k, JSON.stringify(o)); }
          }
        }
        localStorage.setItem("tatoServersV3", "1");
      } catch (e) { }
    })();

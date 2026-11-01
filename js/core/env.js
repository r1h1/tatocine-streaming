/**
 * TatoCine · js/core/env.js
 * Detección de entorno (TV, standalone, desarrollo), utilidades de arranque y aviso de consola.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    var IDLE = window.requestIdleCallback
      ? function (fn) { window.requestIdleCallback(fn, { timeout: 2500 }); }
      : function (fn) { setTimeout(fn, 400); };
    var IS_LOCAL_DEV = /^(localhost|127\.0\.0\.1|\[::1\]|.*\.localhost)$/.test(location.hostname) || location.protocol === "file:";
    var IS_TV = /SmartTV|Tizen|Web0S|WebOS|HbbTV|NetCast|BRAVIA|VIDAA|Android TV|AFT[A-Z]|CrKey|GoogleTV|SMART-TV|Xbox|PlayStation|Roku|Hisense|Philips|SonyDTV|Toshiba/i.test(navigator.userAgent) || /[?&]tv=1/.test(location.search);
    var IS_STANDALONE = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
    if (IS_TV) document.body.classList.add("tv-mode");
    if (IS_STANDALONE) document.body.classList.add("standalone");

    // ---- Consola: aviso para evitar engaños (self-XSS) ----
    (function consoleWarning() {
      try {
        console.log("%c¡CUIDADO!", "color:#fff;background:#c62828;font-size:34px;font-weight:800;padding:6px 14px;border-radius:8px");
        console.log("%cEsta consola es solo para desarrolladores. No puedes acceder aquí.\nSi alguien te pidió copiar y pegar algo en esta ventana, es un intento de engaño: pueden robar tus perfiles y tus datos.\nNo pegues ni ejecutes código que no entiendas.", "font-size:15px;line-height:1.7");
      } catch (e) { }
    })();

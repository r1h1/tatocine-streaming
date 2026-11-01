/**
 * TatoCine · js/core/performance.js
 * Rendimiento: modo ligero para TV y equipos modestos, y precarga con espera.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Modo ligero: menos efectos e imágenes más livianas en TV y dispositivos modestos ----
    var LITE_PREF = "auto";
    try { LITE_PREF = localStorage.getItem("tatoLiteMode") || "auto"; } catch (e) { }
    var netInfo = navigator.connection || {};
    var slowNet = !!netInfo.saveData || /(^|-)(2g|3g)$/.test(netInfo.effectiveType || "");
    var lowDevice = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    var LITE_FX = LITE_PREF === "on" || (LITE_PREF === "auto" && (IS_TV || slowNet || lowDevice));
    var LITE_DATA = LITE_PREF === "on" || (LITE_PREF === "auto" && slowNet);
    if (LITE_FX) document.body.classList.add("lite");
    if (LITE_DATA) { IMG_CARD = "https://image.tmdb.org/t/p/w185"; IMG_BG = "https://image.tmdb.org/t/p/w780"; }
    var LITE_LABELS = {
      auto: "Automático: se activa en TV, conexiones lentas y equipos modestos",
      on: "Activado: menos efectos e imágenes más livianas",
      off: "Desactivado: máxima calidad visual"
    };
    function updateLiteRow() { var el = $("lite-summary"); if (el) el.textContent = LITE_LABELS[LITE_PREF] || LITE_LABELS.auto; }
    function cycleLiteMode() {
      var next = { auto: "on", on: "off", off: "auto" }[LITE_PREF] || "on";
      try { localStorage.setItem("tatoLiteMode", next); } catch (e) { }
      LITE_PREF = next;
      updateLiteRow();
      showToast("Modo ligero: " + { auto: "automático", on: "activado", off: "desactivado" }[next]);
      reloadApp(700);
    }
    decorate("showSettings", function (original) { return function () { original(); updateLiteRow(); }; });
    // Precarga al pasar el cursor: solo en equipos con puntero, con espera y una sola petición
    var prefetchTimer = null;
    decorate("prefetchDetails", function (original) { return function (id, type) {
      if (LITE_DATA || IS_TV || (window.matchMedia && window.matchMedia("(hover: none)").matches)) return;
      clearTimeout(prefetchTimer);
      prefetchTimer = setTimeout(function () { original(id, type); }, 220);
    }; });

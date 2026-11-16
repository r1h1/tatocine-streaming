/**
 * TatoCine · js/boot.js
 * Se ejecuta en la cabecera, ANTES de pintar nada (por eso es un archivo propio y síncrono, no un script en línea).
 * El selector de perfiles se muestra al abrir TatoCine en una pestaña/sesión nueva; mientras sigas en esa pestaña (recargar con
 * Ctrl+R, F5…) se conserva el perfil elegido —y su PIN ya validado— y NO se vuelve a pedir. Si hace falta elegir perfil, la página
 * queda oculta y el selector aparece primero, sin parpadeo de la portada.
 */
(function () {
  try { history.scrollRestoration = "manual"; } catch (e) { }      // recargar o volver a la página NO restaura el scroll de abajo: siempre se empieza arriba
  var root = document.documentElement, selected = "", active = "";
  try { selected = sessionStorage.getItem("tatoProfileSelectedForSessionV1") || ""; active = localStorage.getItem("tatoActiveProfileV1") || ""; } catch (e) { }
  // Navegadores viejos (televisores y Fire TV con Chromium 68–85): se detectan las funciones CSS que faltan y se avisa con clases. El CSS empaquetado ya trae los respaldos
  // (tools/css-legacy.js); estas clases activan solo los que dependen de la detección (gap en flex, :focus-visible). Los navegadores modernos no pagan nada.
  try {
    var probe = document.createElement("div"); probe.style.cssText = "display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden";
    probe.appendChild(document.createElement("i")); probe.appendChild(document.createElement("i")); probe.firstChild.style.height = probe.lastChild.style.height = "1px";
    root.appendChild(probe); var ph = probe.scrollHeight, noGap = ph > 0 && ph < 3; root.removeChild(probe);        // ph = 0 → el navegador no calculó el diseño: no se marca (nunca un falso «sin gap»)
    var noFv = true; try { document.querySelector(":focus-visible"); noFv = false; } catch (e2) { }
    if (noGap) root.classList.add("no-flex-gap");
    if (noFv) root.classList.add("no-focus-visible");
  } catch (e) { }
  // Bienvenida: solo usuarios NUEVOS. Flag «tatoWelcomeSeenV1»: ausente + sin datos previos = nuevo ("0" = pendiente, "1" = ya la vio). Quien ya tenía
  // perfiles, el aviso legal aceptado o el recorrido visto es un usuario existente: se marca como visto sin mostrarle nada.
  try {
    var wf = localStorage.getItem("tatoWelcomeSeenV1");
    if (wf === null) {
      var existing = !!(localStorage.getItem("tatoProfilesV1") || localStorage.getItem("tatoDisclaimerAccepted") || localStorage.getItem("tatoTourDone"));
      wf = existing ? "1" : "0";
      localStorage.setItem("tatoWelcomeSeenV1", wf);
    }
    if (wf === "0") root.classList.add("tc-welcome-boot");
  } catch (e) { }
  // Fondo de la pantalla de carga y del selector: la última imagen que mostró el selector. Se guarda COMPLETA en el dispositivo (data URL, tatoSplashBgDataV1), así ya está
  // en el primer cuadro que se pinta: ni tirón negro ni imagen que «aparece» después. Si solo hay la ruta (primera vez tras actualizar), se pide a TMDB con precarga.
  try {
    var sb = localStorage.getItem("tatoSplashBgV1"), sd = null;
    if (sb && /^\/[A-Za-z0-9_-]+\.jpg$/.test(sb)) {
      try { sd = JSON.parse(localStorage.getItem("tatoSplashBgDataV1") || "null"); } catch (e5) { sd = null; }
      if (sd && sd.p === sb && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(sd.d || "")) {
        root.style.setProperty("--tc-seed-bg", 'url("' + sd.d + '")'); root.classList.add("tc-seed-data");
      } else {
        root.style.setProperty("--tc-seed-bg", 'url("https://image.tmdb.org/t/p/w780' + sb + '")');
        var pl = document.createElement("link"); pl.rel = "preload"; pl.as = "image"; pl.href = "https://image.tmdb.org/t/p/w780" + sb; pl.setAttribute("fetchpriority", "high"); document.head.appendChild(pl);
      }
    }
  } catch (e) { }
  // Televisores (Google TV / Android TV de TCL, Hisense, Xiaomi, Sony, Philips…; Fire TV; LG webOS; Samsung Tizen; navegadores como TV Bro): por el
  // agente de usuario o, si el navegador no lo dice, porque no hay pantalla táctil ni ratón (solo el mando) en una pantalla grande.
  try {
    var ua = navigator.userAgent || "";
    var tvUa = /TatoCineTV|SmartTV|SMART-TV|Tizen|Web0S|WebOS|HbbTV|NetCast|BRAVIA|VIDAA|Android ?TV|Google ?TV|Chromecast|CrKey|AFT[A-Z]|MiTV|MIBOX|Mi ?Box|TV ?Bro|Leanback|SonyDTV|Philips|Hisense|Toshiba|Sharp|Vizio|Roku|Xbox|PlayStation|; ?TV[;)]|Large Screen/i.test(ua) && !/iPhone|iPad|Mobile Safari|Mobile\//i.test(ua);
    var mq = function (q) { try { return window.matchMedia && window.matchMedia(q).matches; } catch (e2) { return false; } };
    var remoteOnly = mq("(any-pointer: none)") && mq("(hover: none)") && !("ontouchstart" in window) && !navigator.maxTouchPoints && (screen.width || 0) >= 900;
    if (tvUa || remoteOnly || /[?&]tv=1/.test(location.search)) root.classList.add("tc-tv");
  } catch (e) { }
  var needsPicker = !selected || selected !== active;
  window.__tcSkipPicker = !needsPicker;
  if (needsPicker) { root.classList.add("tc-picker-boot"); setTimeout(function () { root.classList.remove("tc-picker-boot"); }, 8000); }
})();

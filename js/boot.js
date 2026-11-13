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
  // El fondo de la pantalla de carga (la última imagen que mostró el selector) se pide YA, desde la cabecera, en vez de esperar a que corra splash.js.
  try {
    var sb = localStorage.getItem("tatoSplashBgV1");
    if (sb && /^\/[A-Za-z0-9_-]+\.jpg$/.test(sb)) { var pl = document.createElement("link"); pl.rel = "preload"; pl.as = "image"; pl.href = "https://image.tmdb.org/t/p/w780" + sb; pl.setAttribute("fetchpriority", "high"); document.head.appendChild(pl); }
  } catch (e) { }
  var needsPicker = !selected || selected !== active;
  window.__tcSkipPicker = !needsPicker;
  if (needsPicker) { root.classList.add("tc-picker-boot"); setTimeout(function () { root.classList.remove("tc-picker-boot"); }, 8000); }
})();

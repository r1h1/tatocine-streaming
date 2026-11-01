/**
 * TatoCine · js/core/errors.js
 * Manejo global de errores: ignora el ruido de extensiones del navegador, guarda un registro corto de los errores propios
 * (sessionStorage `tatoErrLog`, útil para depurar), avisa al usuario sin bloquearlo y, si la app se rompe de verdad
 * (varios errores seguidos), muestra una pantalla de «Error 500» con Recargar en vez de dejarla muerta.
 */
(function () {
  var own = location.origin, recent = [], lastToast = 0, fatalShown = false;
  function tx(es, en) { return typeof L === "function" ? L(es, en) : es; }
  function isOwn(file) { return !file || String(file).indexOf(own) === 0; }       // los errores de extensiones (chrome-extension://…) o de otros orígenes no son nuestros
  function noise(msg) { return /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection|message channel closed|AbortError|The play\(\) request|NotAllowedError|TrustedScript/i.test(String(msg || "")); }
  function log(kind, msg, where) {
    try {
      var list = JSON.parse(sessionStorage.getItem("tatoErrLog") || "[]");
      list.push({ t: new Date().toISOString(), k: kind, m: String(msg).slice(0, 300), w: String(where || "").slice(0, 120) });
      sessionStorage.setItem("tatoErrLog", JSON.stringify(list.slice(-20)));
    } catch (e) { }
  }
  function fatal() {
    if (fatalShown || document.getElementById("tc-fatal")) return;
    fatalShown = true;
    var d = document.createElement("div");
    d.id = "tc-fatal"; d.className = "tc-fatal"; d.setAttribute("role", "alertdialog"); d.setAttribute("aria-modal", "true");
    d.innerHTML = '<div class="tc-fatal-code" aria-hidden="true">500</div><h1></h1><p></p><div class="tc-fatal-row"><button type="button" class="tc-fatal-btn" id="tc-fatal-reload"></button><button type="button" class="tc-fatal-btn sec" id="tc-fatal-continue"></button></div>';
    d.querySelector("h1").textContent = tx("Algo se rompió en la app", "Something broke in the app");
    d.querySelector("p").textContent = tx("Tus perfiles y favoritos siguen guardados en este dispositivo. Recarga para volver a empezar.", "Your profiles and favorites are still saved on this device. Reload to start again.");
    d.querySelector("#tc-fatal-reload").textContent = tx("Recargar", "Reload");
    d.querySelector("#tc-fatal-continue").textContent = tx("Seguir de todos modos", "Continue anyway");
    document.body.appendChild(d);
    d.querySelector("#tc-fatal-reload").addEventListener("click", function () { location.reload(); });
    d.querySelector("#tc-fatal-continue").addEventListener("click", function () { d.remove(); recent = []; fatalShown = false; });
  }
  function report(kind, msg, where) {
    if (noise(msg)) return;
    log(kind, msg, where);
    var now = Date.now();
    recent = recent.filter(function (t) { return now - t < 8000; }); recent.push(now);
    if (recent.length >= 5) { fatal(); return; }
    if (now - lastToast > 30000 && typeof showToast === "function") {
      lastToast = now;
      showToast(tx("Algo no salió bien. Si algo no responde, recarga la página.", "Something went wrong. If something stops responding, reload the page."));
    }
  }
  window.addEventListener("error", function (e) {
    if (e.target && e.target !== window) return;                                    // fallo al cargar una imagen o script: lo maneja cada componente
    if (!isOwn(e.filename)) return;
    report("error", e.message, (e.filename || "").replace(own, "") + ":" + e.lineno);
  });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason, msg = r && (r.message || r) || "promesa rechazada";
    if (r && r.stack && !isOwn((String(r.stack).match(/https?:\/\/[^\s)]+|chrome-extension:\/\/[^\s)]+/) || [""])[0])) return;
    if (r && (r.status || /TMDB HTTP|Failed to fetch|NetworkError|Load failed|Sin API Key/i.test(String(msg)))) return;   // fallos de red/API: ya los muestra cada fila con «Reintentar»
    report("promise", msg, "");
  });
})();

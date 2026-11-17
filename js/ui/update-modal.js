/**
 * TatoCine · js/ui/update-modal.js
 * Ventana de ACTUALIZACIÓN OBLIGATORIA (reemplaza al aviso pequeño). Sale cuando el Service Worker ya descargó una versión nueva: «¡Actualización disponible!», «Cambios:» con los
 * 5 más importantes y un único botón «Actualizar ahora». No tiene ✕, no se cierra con Esc, ni tocando fuera, ni con Tab: así todos terminan en la versión nueva.
 * Cada versión nueva: actualiza TC_RELEASE_NOTES (5 cambios que valgan la pena mencionar). Si el botón no logra activar la versión nueva en 8 s, recarga la página.
 * SIEMPRE que haya una versión nueva y no se haya actualizado, la ventana vuelve a salir en cada apertura (aunque se cierre la app o la pestaña sin actualizar): además del aviso del
 * Service Worker, la página compara su HUELLA (los ?v= de su index.html) con la de build.json (siempre sin caché) al abrir, al volver a la app y cada hora. La huella la calcula
 * tools/fp.js al estampar/empaquetar; aquí se calcula con el mismo algoritmo.
 */
var TC_RELEASE_NOTES = {
  es: [
    "Reproductor en la TV: aparece un puntero (flechas para moverlo, OK para pulsar) para usar el vídeo con el control; desaparece al cerrar.",
    "Buscador con el control: baja con las flechas a las sugerencias y elige una; Atrás las cierra.",
    "Búsqueda por voz con el micrófono del control de Google TV (sin permisos extra).",
    "App de Google TV mejorada: todo se ve al 80 %, sin «Saltar al contenido» ni botón «Descargar», y el teclado sale solo al pulsar OK.",
    "Recomendaciones más precisas, caché comprimida y mejor rendimiento en televisores."
  ],
  en: [
    "Player on TV: a pointer appears (arrows to move it, OK to click) so you can use the video with the remote; it disappears when you close it.",
    "Search with the remote: move down with the arrows to the suggestions and pick one; Back closes them.",
    "Voice search with the Google TV remote microphone (no extra permissions).",
    "Improved Google TV app: everything at 80%, no «Skip to content» or «Download» button, and the keyboard only opens when you press OK.",
    "More accurate recommendations, compressed cache and better performance on TVs."
  ]
};
var tcUpdateApply = null, tcUpdateOpen = false;
function tcShowUpdate(apply) {
  var o = document.getElementById("tc-update-overlay"); if (!o) { if (typeof apply === "function") apply(); return; }
  tcUpdateApply = typeof apply === "function" ? apply : function () { location.reload(); };
  if (tcUpdateOpen) return;
  tcUpdateOpen = true;
  var notes = (typeof UI_EN !== "undefined" && UI_EN ? TC_RELEASE_NOTES.en : TC_RELEASE_NOTES.es).slice(0, 5);
  var list = document.getElementById("tc-update-list"); list.textContent = "";
  notes.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; list.appendChild(li); });
  document.getElementById("tc-update-title").textContent = L("¡Actualización disponible!", "Update available!");
  o.querySelector(".tc-update-sub").textContent = L("Cambios:", "Changes:");
  var go = document.getElementById("tc-update-go"); go.textContent = L("Actualizar ahora", "Update now"); go.disabled = false;
  o.classList.add("open"); o.setAttribute("aria-hidden", "false");
  try { document.body.style.overflow = "hidden"; } catch (e) { }
  setTimeout(function () { go.focus(); }, 60);
}
// Nada cierra esta ventana: Esc y Tab se quedan en el botón (capturados antes que cualquier otro manejador de teclado).
document.addEventListener("keydown", function (e) {
  if (!tcUpdateOpen) return;
  if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); e.stopImmediatePropagation(); var g = document.getElementById("tc-update-go"); if (g) g.focus(); }
}, true);
document.addEventListener("click", function (e) {                                  // tocar fuera de la tarjeta no hace nada
  var o = document.getElementById("tc-update-overlay");
  if (tcUpdateOpen && o && e.target === o) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
registerAction("update-now", function () {
  var go = document.getElementById("tc-update-go"); if (go.disabled) return;
  go.disabled = true; go.textContent = L("Actualizando…", "Updating…");
  try { tcUpdateApply(); } catch (e) { location.reload(); }
  setTimeout(function () { location.reload(); }, 8000);                            // seguro: si la versión nueva no tomó el control, se recarga igual
});

/** Huella de la versión que se está ejecutando (mismo algoritmo que tools/fp.js: FNV-1a de «archivo:hash» de los <link>/<script> con ?v=, en orden). */
function tcRunningFp() {
  var parts = [], els = document.querySelectorAll('link[href*="?v="], script[src*="?v="]');
  for (var i = 0; i < els.length; i++) {
    var m = /^((?:css|js)\/[^?"]+)\?v=([0-9a-f]+)$/.exec(els[i].getAttribute("href") || els[i].getAttribute("src") || "");
    if (m && m[1].indexOf("js/vendor/") !== 0) parts.push(m[1] + ":" + m[2]);
  }
  var str = parts.join(","), h = 0x811c9dc5;
  for (var k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; }
  return ("00000000" + h.toString(16)).slice(-8);
}
var tcRunFp = tcRunningFp(), tcLastVersionCheck = 0;
/** Pregunta (sin caché) cuál es la última versión publicada; si no es la que se está ejecutando, muestra la ventana obligatoria. Sin red no hace nada. */
function tcCheckForUpdate(force) {
  if (tcUpdateOpen || !window.fetch || (!force && Date.now() - tcLastVersionCheck < 5 * 60 * 1000)) return;
  tcLastVersionCheck = Date.now();
  fetch("build.json?_=" + Date.now(), { cache: "no-store", credentials: "omit" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (d && typeof d.fp === "string" && /^[0-9a-f]{8}$/.test(d.fp) && d.fp !== tcRunFp) tcShowUpdate(tcForceUpdate);
  }).catch(function () { });
}
/** Aplica la versión nueva: activa la que espera; si no hay, la busca; si tampoco, borra el Service Worker y las cachés de la app y recarga desde la red. */
function tcForceUpdate() {
  var done = false;
  function hard() {
    if (done) return; done = true;
    var regs = navigator.serviceWorker && navigator.serviceWorker.getRegistrations ? navigator.serviceWorker.getRegistrations() : Promise.resolve([]);
    regs.then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }).catch(function () { })
      .then(function () { return window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^tatocine-(shell|api)/.test(k); }).map(function (k) { return caches.delete(k); })); }) : null; }).catch(function () { })
      .then(function () { location.reload(); });
  }
  if (!("serviceWorker" in navigator)) return hard();
  navigator.serviceWorker.addEventListener("controllerchange", function () { if (!done) { done = true; location.reload(); } });
  navigator.serviceWorker.getRegistration().then(function (reg) {
    if (!reg) return hard();
    function activate(w) { w.postMessage({ type: "SKIP_WAITING" }); }
    if (reg.waiting) return activate(reg.waiting);
    return reg.update().then(function () {
      if (reg.waiting) return activate(reg.waiting);
      var w = reg.installing;
      if (w) { w.addEventListener("statechange", function () { if (w.state === "installed" && reg.waiting) activate(reg.waiting); else if (w.state === "redundant") hard(); }); return; }
      hard();
    });
  }).catch(hard);
  setTimeout(hard, 7000);
}
window.addEventListener("load", function () { setTimeout(function () { tcCheckForUpdate(true); }, 1500); });                         // al abrir la app
document.addEventListener("visibilitychange", function () { if (!document.hidden) tcCheckForUpdate(false); });                       // al volver a ella (como mucho cada 5 min)
setInterval(function () { tcCheckForUpdate(false); }, 60 * 60 * 1000);                                                              // y cada hora con la app abierta

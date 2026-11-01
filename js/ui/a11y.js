/**
 * TatoCine · js/ui/a11y.js
 * Accesibilidad transversal (no cambia el diseño):
 *   - Semántica de diálogos (role/aria-modal/aria-labelledby) y regiones de navegación.
 *   - Foco: al abrir una ventana el foco entra en ella, Tab no se escapa y al cerrar vuelve a donde estaba.
 *   - Avisos (toast) anunciados por lectores de pantalla y enlace «Saltar al contenido».
 */
var A11Y_DIALOGS = ["details-modal", "settings-modal", "filters-modal", "actor-modal", "player-modal", "stats-modal", "disclaimer-modal"];
var a11yLastFocus = null;

function a11yFocusables(scope) {
  return Array.prototype.filter.call(scope.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'), function (el) {
    return el.offsetParent !== null && !el.closest("[hidden]") && getComputedStyle(el).visibility !== "hidden";
  });
}

(function setupA11y() {
  // 1) Semántica
  A11Y_DIALOGS.forEach(function (id) {
    var el = $(id);
    if (!el) return;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    var title = el.querySelector(".modal-title, .details-title");
    if (title) { if (!title.id) title.id = id + "-title"; el.setAttribute("aria-labelledby", title.id); }
  });
  var links = document.querySelector(".nav-links");
  if (links) { links.setAttribute("role", "navigation"); links.setAttribute("aria-label", "Principal"); }
  var menu = $("mobile-menu");
  if (menu) menu.setAttribute("aria-label", "Menú");
  var toasts = $("toast-container");
  if (toasts) { toasts.setAttribute("role", "status"); toasts.setAttribute("aria-live", "polite"); }
  var main = document.querySelector("main");
  if (main && !main.id) main.id = "main-content";
  var skip = document.createElement("a");
  skip.className = "skip-link";
  skip.href = "#rows-container";
  skip.textContent = "Saltar al contenido";
  skip.addEventListener("click", function (e) {
    e.preventDefault();
    var target = $("rows-container"), first = target && a11yFocusables(target)[0];
    if (target) target.scrollIntoView();
    if (first) first.focus();
  });
  document.body.insertBefore(skip, document.body.firstChild);

  // 2) Foco al abrir / cerrar ventanas
  var layerIds = typeof LAYER_IDS !== "undefined" ? LAYER_IDS : A11Y_DIALOGS;
  var open = {};
  var mo = new MutationObserver(function (list) {
    list.forEach(function (m) {
      var el = m.target, isOpen = el.classList.contains("open");
      if (isOpen && !open[el.id]) {
        open[el.id] = true;
        if (!a11yLastFocus || !document.contains(a11yLastFocus)) a11yLastFocus = document.activeElement;
        window.setTimeout(function () {
          if (el.contains(document.activeElement)) return;
          var f = a11yFocusables(el).filter(function (x) { return !/close|modal-close/.test(x.className); })[0] || a11yFocusables(el)[0];
          if (f) f.focus({ preventScroll: true });
        }, 60);
      } else if (!isOpen && open[el.id]) {
        open[el.id] = false;
        if (!Object.keys(open).some(function (k) { return open[k]; }) && a11yLastFocus && document.contains(a11yLastFocus)) {
          try { a11yLastFocus.focus({ preventScroll: true }); } catch (e) { }
          a11yLastFocus = null;
        }
      }
    });
  });
  layerIds.forEach(function (id) { var el = $(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ["class"] }); });

  // 3) Tab no se escapa de la ventana superior
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var layer = typeof topLayer === "function" ? topLayer() : null;
    if (!layer || layer.id === "player-modal") return;
    var items = a11yFocusables(layer);
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (!layer.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  if (typeof i18nAdd === "function") i18nAdd({ "Saltar al contenido": "Skip to content", "Principal": "Main", "Menú": "Menu" });
})();

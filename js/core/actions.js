/**
 * TatoCine · js/core/actions.js
 * Acciones por atributo: en lugar de `onclick="…"` el HTML nuevo lleva `data-act="nombre"` (+ `data-arg`) y un único
 * escuchador delegado ejecuta la acción registrada. Así se puede quitar 'unsafe-inline' de la política de seguridad (CSP).
 *   registerAction("retry", function (el, event) { … });
 */
var TC_ACTIONS = {};
function registerAction(name, fn) { TC_ACTIONS[name] = fn; }
document.addEventListener("click", function (e) {
  var el = e.target.closest && e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  var fn = TC_ACTIONS[el.getAttribute("data-act")];
  if (fn) fn(el, e);
});
document.addEventListener("keydown", function (e) {
  if ((e.key !== "Enter" && e.key !== " ") || !e.target.closest) return;
  var el = e.target.closest("[data-act]");
  if (el && el.tagName !== "BUTTON" && el.tagName !== "A" && el.tagName !== "INPUT" && TC_ACTIONS[el.getAttribute("data-act")]) { e.preventDefault(); TC_ACTIONS[el.getAttribute("data-act")](el, e); }
});

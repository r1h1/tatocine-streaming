/**
 * TatoCine · js/core/actions.js
 * Eventos por atributo (la app no usa `onclick="…"`: así la política de seguridad (CSP) no necesita 'unsafe-inline'):
 *   · data-act="nombre" (+ data-* con los argumentos) → acción registrada con registerAction(nombre, fn(el, ev)).
 *   · data-h="hN" / data-hk="hN"                      → manejadores del HTML estático (core/handlers.js: click / keydown).
 *   · data-hover="nombre"                             → acción al pasar el cursor por primera vez (precarga).
 *   · <img data-lc="clase"> añade la clase al cargar; <img data-fb="card|remove|cast|poster|stat"> pone una imagen de respaldo si falla.
 * Los manejadores se ejecutan como los atributos originales: de dentro hacia fuera, `this` = el elemento con el atributo,
 * `event.currentTarget` ese mismo elemento y `event.stopPropagation()` corta la subida.
 */
var TC_ACTIONS = {};
function registerAction(name, fn) { TC_ACTIONS[name] = fn; }

function tcDispatch(e, attr, table) {
  var stopped = false, el = e.target;
  while (el && el !== document) {
    var id = el.getAttribute && el.getAttribute(attr);
    if (id && table[id]) {
      var ev = new Proxy(e, {
        get: function (t, k) {
          if (k === "currentTarget") return el;
          if (k === "stopPropagation" || k === "stopImmediatePropagation") return function () { stopped = true; };
          var v = t[k];
          return typeof v === "function" ? v.bind(t) : v;
        }
      });
      table[id].call(el, ev);
      if (stopped || e.cancelBubble) return;
    }
    el = el.parentNode;
  }
}
document.addEventListener("click", function (e) {
  var el = e.target.closest && e.target.closest("[data-act]");
  if (el && !el.disabled && TC_ACTIONS[el.getAttribute("data-act")]) {
    var stopped = false, ev = new Proxy(e, { get: function (t, k) { if (k === "currentTarget") return el; if (k === "stopPropagation" || k === "stopImmediatePropagation") return function () { stopped = true; }; var v = t[k]; return typeof v === "function" ? v.bind(t) : v; } });
    TC_ACTIONS[el.getAttribute("data-act")](el, ev);
    if (stopped) return;
  }
  if (typeof TC_H !== "undefined") tcDispatch(e, "data-h", TC_H);
});
document.addEventListener("keydown", function (e) {
  if (typeof TC_H !== "undefined" && e.target.closest && e.target.closest("[data-hk]")) tcDispatch(e, "data-hk", TC_H);
  if ((e.key !== "Enter" && e.key !== " ") || !e.target.closest) return;
  var el = e.target.closest("[data-act]");
  if (el && el.tagName !== "BUTTON" && el.tagName !== "A" && el.tagName !== "INPUT" && TC_ACTIONS[el.getAttribute("data-act")]) { e.preventDefault(); TC_ACTIONS[el.getAttribute("data-act")](el, e); }
});
var hoverSeen = new WeakSet();
document.addEventListener("mouseover", function (e) {
  var el = e.target.closest && e.target.closest("[data-hover]");
  if (!el || hoverSeen.has(el) && false) return;
  if (el.contains(e.relatedTarget)) return;                       // equivale a onmouseenter: solo al entrar
  var fn = TC_ACTIONS[el.getAttribute("data-hover")];
  if (fn) fn(el, e);
});
/* Imágenes: clase al cargar e imagen de respaldo si falla (los eventos load/error no suben, pero sí se capturan). */
var FB_CAST = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%2240%22 fill=%22%23333%22/%3E%3C/svg%3E";
var FB_POSTER = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%23222%22 width=%22200%22 height=%22300%22/%3E%3C/svg%3E";
document.addEventListener("load", function (e) {
  var t = e.target;
  if (t && t.tagName === "IMG" && t.hasAttribute("data-lc")) t.classList.add(t.getAttribute("data-lc"));
}, true);
document.addEventListener("error", function (e) {
  var t = e.target;
  if (!t || t.tagName !== "IMG" || !t.hasAttribute("data-fb") || t.getAttribute("data-fb-done")) return;
  t.setAttribute("data-fb-done", "1");
  var m = t.getAttribute("data-fb");
  if (m === "remove") t.remove();
  else if (m === "card") t.src = FALLBACK_IMG;
  else if (m === "cast") t.src = FB_CAST;
  else if (m === "poster") t.src = FB_POSTER;
  else if (m === "stat") { t.classList.add("loaded"); t.src = FALLBACK_IMG; }
}, true);

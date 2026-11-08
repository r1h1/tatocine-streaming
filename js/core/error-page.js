/** Botones de las páginas de error (404/500/sin conexión) sin JavaScript en línea, para cumplir la CSP: data-reload recarga la página. */
document.addEventListener("click", function (e) {
  var t = e.target && e.target.closest ? e.target.closest("[data-reload]") : null;
  if (!t) return;
  e.preventDefault();
  location.reload();
});

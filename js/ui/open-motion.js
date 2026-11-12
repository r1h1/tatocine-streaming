/**
 * TatoCine · js/ui/open-motion.js
 * «La tarjeta se convierte en la ficha»: al tocar una tarjeta, la ficha se despliega desde el lugar y tamaño de esa tarjeta
 * (técnica FLIP con la Web Animations API: solo transform/opacity, se ejecuta en la GPU y dura 160 ms).
 * Se omite con «reducir movimiento», modo ligero, alto contraste o si el sistema lo pide.
 */
var omLast = null;
function motionOk() {
  var b = document.body;
  return !(b.classList.contains("rm") || b.classList.contains("lite") || b.classList.contains("hc") || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches));
}
document.addEventListener("pointerdown", function (e) {
  var c = e.target.closest && e.target.closest(".card, .similar-card, .cal-item, .wiz-result");
  omLast = c ? { rect: c.getBoundingClientRect(), t: Date.now() } : null;
}, true);
decorate("openDetails", function (original) {
  return function () {
    var r = original.apply(this, arguments), o = omLast;
    omLast = null;
    var el = document.querySelector("#details-modal .details-content");
    if (!o || Date.now() - o.t > 1500 || !motionOk() || !el || !el.animate) return r;
    requestAnimationFrame(function () {
      var b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      var dx = o.rect.left - b.left, dy = o.rect.top - b.top, sx = Math.max(.05, o.rect.width / b.width), sy = Math.max(.05, o.rect.height / b.height);
      el.animate([
        { transformOrigin: "top left", transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")", opacity: .2 },
        { transformOrigin: "top left", transform: "none", opacity: 1 }
      ], { duration: 160, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
    return r;
  };
});

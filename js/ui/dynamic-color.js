/**
 * TatoCine · js/ui/dynamic-color.js
 * Color dinámico: saca el color dominante de la imagen del título (una miniatura w92 de ~3 KB leída en un canvas de 16×16;
 * TMDB permite leerla porque sirve CORS) y lo usa como acento: brillo suave en la ficha y «modo cine» (resplandor ambiental)
 * alrededor del reproductor. No se usa en modo ligero ni con alto contraste. Guarda hasta 150 colores en memoria.
 */
var dcCache = {}, dcCount = 0;
function dominantColor(path) {
  if (!path || !/^\/[A-Za-z0-9_.-]{4,80}$/.test(path)) return Promise.resolve(null);
  if (dcCache[path]) return Promise.resolve(dcCache[path]);
  return new Promise(function (resolve) {
    var img = new Image(), done = false;
    function finish(v) { if (done) return; done = true; if (v && dcCount < 150) { dcCache[path] = v; dcCount++; } resolve(v); }
    img.crossOrigin = "anonymous";
    img.onload = function () {
      try {
        var c = document.createElement("canvas"); c.width = c.height = 16;
        var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, 16, 16);
        var d = x.getImageData(0, 0, 16, 16).data, r = 0, g = 0, b = 0, wsum = 0;
        for (var i = 0; i < d.length; i += 4) {
          var mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]), sat = mx ? (mx - mn) / mx : 0, lum = (mx + mn) / 510;
          var w = 0.15 + sat * 2 - Math.abs(lum - 0.5) * 0.6;        // prefiere colores vivos y de brillo medio
          if (w > 0) { r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; wsum += w; }
        }
        if (!wsum) return finish(null);
        r /= wsum; g /= wsum; b /= wsum;
        var m = Math.max(r, g, b) || 1, k = Math.min(2.2, 185 / m);  // se aviva si es muy oscuro (para que el brillo se note)
        finish([Math.min(255, Math.round(r * k)), Math.min(255, Math.round(g * k)), Math.min(255, Math.round(b * k))]);
      } catch (e) { finish(null); }
    };
    img.onerror = function () { finish(null); };
    img.src = "https://image.tmdb.org/t/p/w92" + path;
    setTimeout(function () { finish(null); }, 4000);
  });
}
function applyAccent(el, rgb) {
  if (!el) return;
  if (rgb) el.style.setProperty("--accent-rgb", rgb.join(","));
  else el.style.removeProperty("--accent-rgb");
  el.classList.toggle("has-accent", !!rgb);
}
function accentAllowed() { return !document.body.classList.contains("lite") && !document.body.classList.contains("hc"); }
decorate("renderDetailsExtras", function (original) {
  return function (data, type, id, title) {
    var r = original.apply(this, arguments), modal = $("details-modal");
    if (accentAllowed()) dominantColor(data && (data.backdrop_path || data.poster_path)).then(function (rgb) { if (detailsMedia && detailsMedia.id === id) applyAccent(modal, rgb); });
    else applyAccent(modal, null);
    return r;
  };
});
decorate("closeDetails", function (original) { return function () { var r = original.apply(this, arguments); setTimeout(function () { if (!$("details-modal").classList.contains("open")) applyAccent($("details-modal"), null); }, 400); return r; }; });
decorate("openPlayer", function (original) {
  return function (i, t, ti, season, episode, bg) {
    var r = original.apply(this, arguments), pm = $("player-modal");
    applyAccent(pm, null);
    if (accentAllowed()) {
      var path = bg && !/^http/.test(bg) ? bg : (detailsMedia && detailsMedia.id === i ? detailsMedia.bg : "");
      if (path) dominantColor(path).then(function (rgb) { if (currentMedia && currentMedia.id === i) applyAccent(pm, rgb); });
    }
    return r;
  };
});
decorate("closePlayer", function (original) { return function () { var r = original.apply(this, arguments); applyAccent($("player-modal"), null); return r; }; });

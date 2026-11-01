/**
 * TatoCine · js/features/wrapped.js
 * «Tu año en películas»: resumen visual (imagen vertical 1080×1920, ideal para historias) con horas vistas, géneros,
 * títulos más vistos y mejor racha. Se dibuja en un <canvas> con los datos locales del perfil; no se sube nada.
 * Se abre desde Estadísticas o con Ctrl+K. Guardar como PNG o compartir (si el navegador lo permite).
 */
function wrappedData() {
  var year = new Date().getFullYear(), start = new Date(year, 0, 1).getTime();
  var all = (localAnalytics.items || []).filter(function (x) { return (x.secs || 0) > 0 || (x.done || 0) > 0; });
  var inYear = all.filter(function (x) { return (x.lastPlayedAt || 0) >= start; });
  var items = inYear.length ? inYear : all, label = inYear.length ? String(year) : L("Todo el tiempo", "All time");
  var secs = items.reduce(function (s, x) { return s + (x.secs || 0); }, 0);
  var top = items.slice().sort(function (a, b) { return (b.secs || 0) - (a.secs || 0) || (b.done || 0) - (a.done || 0); }).slice(0, 3);
  var genres = getTasteProfile().slice(0, 3), maxScore = Math.max.apply(null, genres.map(function (g) { return g.score; }).concat([1]));
  return { label: label, secs: secs, titles: items.length, finished: items.filter(function (x) { return (x.done || 0) > 0; }).length, top: top, genres: genres, maxScore: maxScore, best: Math.max(streakData.best || 0, currentStreak()) };
}
function wrappedFit(ctx, text, max) { text = String(text || ""); if (ctx.measureText(text).width <= max) return text; while (text.length > 1 && ctx.measureText(text + "…").width > max) text = text.slice(0, -1); return text + "…"; }
function drawWrapped(canvas, d, name) {
  var W = 1080, H = 1920, ctx = canvas.getContext("2d"), F = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  canvas.width = W; canvas.height = H;
  var g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#2b1055"); g.addColorStop(.5, "#0d0d1a"); g.addColorStop(1, "#000");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  [[880, 220, 380, "rgba(255,138,61,.28)"], [140, 1500, 460, "rgba(125,92,255,.25)"]].forEach(function (c) {
    var r = ctx.createRadialGradient(c[0], c[1], 10, c[0], c[1], c[2]); r.addColorStop(0, c[3]); r.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  });
  ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#fff";
  ctx.font = "700 46px " + F; ctx.globalAlpha = .85; ctx.fillText("TatoCine", 90, 150); ctx.globalAlpha = 1;
  ctx.font = "800 96px " + F; ctx.fillText(L("Tu año en", "Your year in"), 90, 330); ctx.fillText(L("películas", "movies"), 90, 440);
  ctx.font = "600 44px " + F; ctx.fillStyle = "#ffb26b"; ctx.fillText(wrappedFit(ctx, name + " · " + d.label, W - 180), 90, 520);
  ctx.fillStyle = "#fff"; ctx.font = "800 250px " + F; var hours = Math.round(d.secs / 360) / 10; ctx.fillText(String(hours).replace(".", L(",", ".")), 90, 820);
  ctx.font = "600 56px " + F; ctx.fillText(L("horas viendo", "hours watched"), 90, 900);
  ctx.font = "500 44px " + F; ctx.globalAlpha = .8; ctx.fillText(d.titles + L(" títulos · ", " titles · ") + d.finished + L(" terminados", " finished"), 90, 975); ctx.globalAlpha = 1;
  ctx.font = "700 48px " + F; ctx.fillText(L("Tus géneros", "Your genres"), 90, 1110);
  d.genres.forEach(function (gn, i) {
    var y = 1160 + i * 96, w = Math.max(60, Math.round((W - 360) * gn.score / d.maxScore));
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(90, y, W - 180, 56);
    var bar = ctx.createLinearGradient(90, 0, 90 + w, 0); bar.addColorStop(0, "#ff8a3d"); bar.addColorStop(1, "#ffd36b"); ctx.fillStyle = bar; ctx.fillRect(90, y, w, 56);
    ctx.fillStyle = "#000"; ctx.font = "700 34px " + F; ctx.fillText(wrappedFit(ctx, gn.name, w - 30), 110, y + 40);
  });
  ctx.fillStyle = "#fff"; ctx.font = "700 48px " + F; ctx.fillText(L("Lo que más viste", "Most watched"), 90, 1520);
  d.top.forEach(function (it, i) {
    var y = 1580 + i * 82;
    ctx.font = "800 44px " + F; ctx.fillStyle = "#ffb26b"; ctx.fillText(String(i + 1), 90, y);
    ctx.font = "600 40px " + F; ctx.fillStyle = "#fff"; ctx.fillText(wrappedFit(ctx, bkText(it.title, 60), 700), 150, y);
    ctx.font = "500 34px " + F; ctx.globalAlpha = .7; var m = Math.round((it.secs || 0) / 60); ctx.fillText(m >= 60 ? Math.floor(m / 60) + " h " + (m % 60) + " min" : m + " min", W - 270, y); ctx.globalAlpha = 1;
  });
  ctx.fillStyle = "#fff"; ctx.font = "700 40px " + F; ctx.fillText("🔥 " + L("Mejor racha: ", "Best streak: ") + d.best + L(" días", " days"), 90, 1860);
}
function openWrapped() {
  if (isKidProfile() || isGuestProfile()) { showToast(L("No disponible en este perfil", "Not available on this profile")); return; }
  var d = wrappedData();
  qrOpen(L("Tu año en películas", "Your year in movies"));
  if (!d.titles) { qrBody().innerHTML = emptyStateHTML("none", L("Aún no hay datos", "No data yet"), L("Reproduce algunos títulos y vuelve para ver tu resumen.", "Watch a few titles and come back to see your summary."), "", ""); return; }
  var canvas = document.createElement("canvas");
  drawWrapped(canvas, d, bkText(getActiveProfile().name, 24));
  canvas.className = "wrapped-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", L("Resumen: " + Math.round(d.secs / 360) / 10 + " horas viendo, " + d.titles + " títulos", "Summary: " + Math.round(d.secs / 360) / 10 + " hours watched, " + d.titles + " titles"));
  qrBody().innerHTML = "";
  qrBody().appendChild(canvas);
  var actions = document.createElement("div");
  actions.className = "tc-profile-create-actions";
  actions.innerHTML = '<button type="button" class="tc-profile-create-btn" data-w="save">' + L("Guardar imagen", "Save image") + '</button><button type="button" class="tc-profile-create-btn" data-w="share">' + L("Compartir", "Share") + "</button>";
  qrBody().appendChild(actions);
  function toBlob() { return new Promise(function (res) { canvas.toBlob(res, "image/png"); }); }
  actions.querySelector('[data-w="save"]').onclick = async function () { var a = document.createElement("a"); a.href = URL.createObjectURL(await toBlob()); a.download = "tatocine-mi-anio.png"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };
  actions.querySelector('[data-w="share"]').onclick = async function () {
    var file = new File([await toBlob()], "tatocine-mi-anio.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "TatoCine" }); } catch (e) { } }
    else showToast(L("Tu navegador no permite compartir imágenes: usa Guardar imagen", "Your browser can't share images: use Save image"));
  };
}
registerAction("open-wrapped", openWrapped);
decorate("openStats", function (original) {
  return function () {
    var r = original.apply(this, arguments), wrap = document.querySelector("#stats-modal .stats-wrap");
    if (wrap && !wrap.querySelector('[data-act="open-wrapped"]')) wrap.insertAdjacentHTML("afterbegin", '<div class="wrapped-cta"><button type="button" class="genre-chip chip-primary" data-act="open-wrapped">✨ ' + L("Tu año en películas", "Your year in movies") + "</button></div>");
    return r;
  };
});
registerCommand({ id: "wrapped", es: "Tu año en películas (resumen)", en: "Your year in movies (summary)", keys: "wrapped resumen anual estadisticas", adult: true, run: openWrapped });
if (typeof i18nAdd === "function") i18nAdd({ "Tu año en películas": "Your year in movies" });

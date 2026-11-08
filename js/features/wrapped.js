/**
 * TatoCine · js/features/wrapped.js
 * «Tu año en películas»: resumen visual (imagen vertical 1080×1920, ideal para historias) con horas vistas, géneros,
 * títulos más vistos y mejor racha. Se dibuja en un <canvas> con los datos locales del perfil; no se sube nada.
 * Se abre desde Estadísticas o con Ctrl+K. Guardar como PNG o compartir (si el navegador lo permite).
 */
function wrappedData() {
  var year = new Date().getFullYear(), start = new Date(year, 0, 1).getTime();
  var all = countedItems(localAnalytics.items || []);                       // solo títulos con 15 min o más (o terminados)
  var inYear = all.filter(function (x) { return (x.lastPlayedAt || 0) >= start; });
  var items = inYear.length ? inYear : all, label = inYear.length ? String(year) : L("Todo el tiempo", "All time");
  var secs = items.reduce(function (s, x) { return s + (x.secs || 0); }, 0);
  var top = items.slice().sort(function (a, b) { return (b.secs || 0) - (a.secs || 0) || (b.plays || 0) - (a.plays || 0) || (b.done || 0) - (a.done || 0); }).slice(0, 3);
  var genres = getTasteProfile().slice(0, 3), totalScore = genres.reduce(function (s, g) { return s + g.score; }, 0) || 1;
  genres.forEach(function (g) { g.pct = Math.round(g.score / totalScore * 100); });
  // Fondo: el título más visto; si hay empate en el primer puesto, uno cualquiera de los empatados.
  var lead = top.filter(function (x) { return top[0] && (x.secs || 0) === (top[0].secs || 0) && (x.plays || 0) === (top[0].plays || 0); });
  var bgItem = lead.length ? lead[Math.floor(Math.random() * lead.length)] : top[0] || null;
  return { label: label, secs: secs, titles: items.length, finished: items.filter(function (x) { return (x.done || 0) > 0; }).length, top: top, genres: genres, bgItem: bgItem, best: Math.max(streakData.best || 0, currentStreak()) };
}
function wrappedFit(ctx, text, max) { text = String(text || ""); if (ctx.measureText(text).width <= max) return text; while (text.length > 1 && ctx.measureText(text + "…").width > max) text = text.slice(0, -1); return text + "…"; }
/** Carga la portada del título de fondo (CORS anónimo para poder exportar el PNG); si falla, el fondo es un degradado. */
function wrappedImage(d) {
  return new Promise(function (resolve) {
    var it = d.bgItem;
    if (!it) return resolve(null);
    fetchTMDB("/" + (it.type === "tv" ? "tv" : "movie") + "/" + it.id).then(function (info) {
      var path = (info && (info.poster_path || info.backdrop_path)) || it.bg;
      if (!path) return resolve(null);
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = "https://image.tmdb.org/t/p/w780" + path;
    }).catch(function () { resolve(null); });
  });
}
function drawWrapped(canvas, d, name, img) {
  var W = 1080, H = 1920, ctx = canvas.getContext("2d"), F = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", PAD = 84;
  canvas.width = W; canvas.height = H;
  var g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#2b1055"); g.addColorStop(.5, "#0d0d1a"); g.addColorStop(1, "#000");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (img) {                                                              // portada del título más visto, a pantalla completa (cover 9:16)
    var sc = Math.max(W / img.width, H / img.height), iw = img.width * sc, ih = img.height * sc;
    ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
  }
  var shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, "rgba(0,0,0,.72)"); shade.addColorStop(.35, "rgba(0,0,0,.55)"); shade.addColorStop(.7, "rgba(0,0,0,.82)"); shade.addColorStop(1, "rgba(0,0,0,.94)");
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#fff";
  // Logo de TatoCine (círculo con triángulo de reproducción + nombre)
  ctx.beginPath(); ctx.arc(PAD + 32, 142, 32, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(PAD + 24, 124); ctx.lineTo(PAD + 50, 142); ctx.lineTo(PAD + 24, 160); ctx.closePath(); ctx.fillStyle = "#000"; ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "800 54px " + F; ctx.fillText("TatoCine", PAD + 84, 160);
  ctx.font = "800 100px " + F; ctx.fillText(L("Tu año en", "Your year in"), PAD, 360); ctx.fillText(L("películas", "movies"), PAD, 470);
  ctx.font = "600 44px " + F; ctx.fillStyle = "#ffb26b"; ctx.fillText(wrappedFit(ctx, name + " · " + d.label, W - PAD * 2), PAD, 548);
  var mins = Math.round(d.secs / 60);
  ctx.fillStyle = "#fff"; ctx.font = "800 230px " + F; ctx.fillText(String(mins), PAD, 810);
  ctx.font = "600 58px " + F; ctx.fillText(L("minutos viendo", "minutes watched"), PAD, 888);
  ctx.font = "500 44px " + F; ctx.globalAlpha = .85; ctx.fillText(d.titles + L(" reproducidos · ", " played · ") + d.finished + L(" terminados", " finished"), PAD, 960); ctx.globalAlpha = 1;
  // Géneros: nombre completo y porcentaje arriba, barra debajo (nada recortado)
  ctx.font = "700 48px " + F; ctx.fillText(L("Tus géneros", "Your genres"), PAD, 1080);
  d.genres.forEach(function (gn, i) {
    var y = 1150 + i * 112, bw = W - PAD * 2;
    ctx.font = "600 40px " + F; ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(wrappedFit(ctx, gn.name, bw - 130), PAD, y);
    ctx.textAlign = "right"; ctx.fillStyle = "#ffb26b"; ctx.fillText(gn.pct + "%", PAD + bw, y); ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fillRect(PAD, y + 18, bw, 16);
    var bar = ctx.createLinearGradient(PAD, 0, PAD + bw, 0); bar.addColorStop(0, "#ff8a3d"); bar.addColorStop(1, "#ffd36b"); ctx.fillStyle = bar; ctx.fillRect(PAD, y + 18, Math.max(24, bw * gn.pct / 100), 16);
  });
  ctx.fillStyle = "#fff"; ctx.font = "700 48px " + F; ctx.fillText(L("Lo que más viste", "Most watched"), PAD, 1540);
  d.top.forEach(function (it, i) {
    var y = 1610 + i * 74;
    ctx.font = "800 42px " + F; ctx.fillStyle = "#ffb26b"; ctx.fillText(String(i + 1), PAD, y);
    ctx.font = "600 38px " + F; ctx.fillStyle = "#fff"; ctx.fillText(wrappedFit(ctx, bkText(it.title, 60), 640), PAD + 56, y);
    ctx.font = "500 32px " + F; ctx.globalAlpha = .75; ctx.textAlign = "right"; ctx.fillText(fmtDur(it.secs || 0), W - PAD, y); ctx.textAlign = "left"; ctx.globalAlpha = 1;
  });
  ctx.fillStyle = "#fff"; ctx.font = "700 38px " + F; ctx.fillText(L("Mejor racha: ", "Best streak: ") + d.best + L(" días", " days"), PAD, 1862);
}
function openWrapped() {
  if (isKidProfile() || isGuestProfile()) { showToast(L("No disponible en este perfil", "Not available on this profile")); return; }
  var d = wrappedData();
  qrOpen(L("Tu año en películas", "Your year in movies"));
  if (!d.titles) { qrBody().innerHTML = emptyStateHTML("none", L("Aún no hay datos", "No data yet"), L("Reproduce algunos títulos y vuelve para ver tu resumen.", "Watch a few titles and come back to see your summary."), "", ""); return; }
  var canvas = document.createElement("canvas");
  drawWrapped(canvas, d, bkText(getActiveProfile().name, 24), null);                       // primero sin imagen (instantáneo)
  wrappedImage(d).then(function (img) { if (img) drawWrapped(canvas, d, bkText(getActiveProfile().name, 24), img); });
  canvas.className = "wrapped-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", L("Resumen: " + Math.round(d.secs / 360) / 10 + " horas viendo, " + d.titles + " títulos", "Summary: " + Math.round(d.secs / 360) / 10 + " hours watched, " + d.titles + " titles"));
  qrBody().innerHTML = "";
  qrBody().appendChild(canvas);
  var actions = document.createElement("div");
  actions.className = "tc-profile-create-actions";
  var ICO = function (d) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
  actions.innerHTML = '<button type="button" class="tc-profile-create-btn wiz-btn" data-w="save">' + ICO('<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>') + L("Guardar imagen", "Save image") + '</button><button type="button" class="tc-profile-cancel-btn wiz-btn" data-w="share">' + ICO('<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/>') + L("Compartir", "Share") + "</button>";
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
    if (wrap && !wrap.querySelector('[data-act="open-wrapped"]')) wrap.insertAdjacentHTML("afterbegin", '<div class="wrapped-cta"><button type="button" class="hero-btn" data-act="open-wrapped"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>' + L("Tu año en películas", "Your year in movies") + "</button></div>");
    return r;
  };
});
registerCommand({ id: "wrapped", es: "Tu año en películas (resumen)", en: "Your year in movies (summary)", keys: "wrapped resumen anual estadisticas", adult: true, run: openWrapped });
if (typeof i18nAdd === "function") i18nAdd({ "Tu año en películas": "Your year in movies" });

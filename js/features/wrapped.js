/**
 * TatoCine · js/features/wrapped.js
 * «Tu mes en películas»: resumen visual (imagen vertical 1080×1920 para historias, con el contenido dentro de la zona segura de
 * Instagram) del mes: minutos viendo, títulos, terminados, géneros y los 3 más vistos. Se dibuja en un <canvas> con los datos
 * locales del perfil; no se sube nada.
 *  · Acceso manual: Estadísticas o Ctrl+K (mes actual; se puede ver el anterior).
 *  · Automático: al empezar un mes se ofrece el resumen del mes recién terminado, UNA vez por perfil y mes
 *    (marcador `tatoMonthlyWrappedShown_<perfil>` = YYYY-MM). Solo perfiles de adulto con actividad en ese mes.
 * Límite honesto: los datos locales guardan el total de cada título y su última reproducción, así que un título se cuenta en el mes
 * de su última reproducción.
 */
var WRAP_MARK = "tatoMonthlyWrappedShown_";
function wrapKey(y, m) { return y + "-" + (m < 9 ? "0" : "") + (m + 1); }
function wrapLabel(y, m) {
  var t = wrapKey(y, m);
  try { t = new Intl.DateTimeFormat(UI_EN ? "en" : "es", { month: "long", year: "numeric" }).format(new Date(y, m, 1)); } catch (e) { }
  return t.charAt(0).toUpperCase() + t.slice(1);
}
/** Datos del mes (y, m = 0-11). Intervalo [primer día del mes, primer día del mes siguiente). Por defecto, el mes actual. */
function wrappedData(y, m) {
  var now = new Date(); if (y == null) { y = now.getFullYear(); m = now.getMonth(); }
  var start = new Date(y, m, 1).getTime(), end = new Date(y, m + 1, 1).getTime();
  var items = countedItems(localAnalytics.items || []).filter(function (x) { var t = x.lastPlayedAt || 0; return t >= start && t < end; });   // solo títulos con 15 min o más (o terminados)
  var secs = items.reduce(function (s, x) { return s + (x.secs || 0); }, 0);
  var top = items.slice().sort(function (a, b) { return (b.secs || 0) - (a.secs || 0) || (b.plays || 0) - (a.plays || 0) || (b.done || 0) - (a.done || 0); }).slice(0, 3);
  // Géneros del MES: se calcula con la misma fórmula de gustos pero solo sobre los títulos del mes.
  var inMonth = {}; items.forEach(function (x) { (x.genreIds || []).forEach(function (g) { inMonth[g] = true; }); });
  var saved = localAnalytics.items, genres = [];
  localAnalytics.items = items;
  try { genres = getTasteProfile().filter(function (g) { return inMonth[g.id]; }).slice(0, 3); } finally { localAnalytics.items = saved; }
  var totalScore = genres.reduce(function (s, g) { return s + g.score; }, 0) || 1;
  genres.forEach(function (g) { g.pct = Math.round(g.score / totalScore * 100); });
  // Fondo: el título más visto; si hay empate en el primer puesto, uno cualquiera de los empatados.
  var lead = top.filter(function (x) { return top[0] && (x.secs || 0) === (top[0].secs || 0) && (x.plays || 0) === (top[0].plays || 0); });
  var bgItem = lead.length ? lead[Math.floor(Math.random() * lead.length)] : top[0] || null;
  return { y: y, m: m, key: wrapKey(y, m), label: wrapLabel(y, m), secs: secs, titles: items.length, finished: items.filter(function (x) { return (x.done || 0) > 0; }).length, top: top, genres: genres, bgItem: bgItem };
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
  var W = 1080, H = 1920, ctx = canvas.getContext("2d"), F = (getComputedStyle(document.body).fontFamily || "system-ui, sans-serif"), PAD = 96;
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
  // Zona segura de Stories/Reels: 1080x1920 con ~270 px libres arriba y ~360 px abajo (perfil, comentario y barra de IG). Todo el contenido vive entre y=290 y y=1540.
  ctx.beginPath(); ctx.arc(PAD + 24, 300, 24, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(PAD + 17, 286); ctx.lineTo(PAD + 37, 300); ctx.lineTo(PAD + 17, 314); ctx.closePath(); ctx.fillStyle = "#000"; ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "800 40px " + F; ctx.fillText("TatoCine", PAD + 64, 314);
  ctx.font = "800 74px " + F; ctx.fillText(L("Tu mes en", "Your month in"), PAD, 438); ctx.fillText(L("películas", "movies"), PAD, 518);
  ctx.font = "600 34px " + F; ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.fillText(wrappedFit(ctx, name + " · " + d.label, W - PAD * 2), PAD, 574);
  var mins = Math.round(d.secs / 60);
  ctx.fillStyle = "#fff"; ctx.font = "800 150px " + F; ctx.fillText(String(mins), PAD, 748);
  ctx.font = "600 42px " + F; ctx.fillText(L("minutos viendo", "minutes watched"), PAD, 808);
  ctx.font = "500 32px " + F; ctx.globalAlpha = .85; ctx.fillText(d.titles + L(" reproducidos · ", " played · ") + d.finished + L(" terminados", " finished"), PAD, 860); ctx.globalAlpha = 1;
  // Géneros: nombre y porcentaje arriba, barra fina debajo
  ctx.font = "700 38px " + F; ctx.fillText(L("Tus géneros", "Your genres"), PAD, 970);
  d.genres.forEach(function (gn, i) {
    var y = 1036 + i * 88, bw = W - PAD * 2;
    ctx.font = "600 32px " + F; ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(wrappedFit(ctx, gn.name, bw - 110), PAD, y);
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.fillText(gn.pct + "%", PAD + bw, y); ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fillRect(PAD, y + 14, bw, 12);
    var bar = ctx.createLinearGradient(PAD, 0, PAD + bw, 0); bar.addColorStop(0, "rgba(255,255,255,.55)"); bar.addColorStop(1, "#fff"); ctx.fillStyle = bar; ctx.fillRect(PAD, y + 14, Math.max(20, bw * gn.pct / 100), 12);
  });
  ctx.fillStyle = "#fff"; ctx.font = "700 38px " + F; ctx.fillText(L("Lo que más viste", "Most watched"), PAD, 1350);
  d.top.forEach(function (it, i) {
    var y = 1414 + i * 62;
    ctx.font = "800 34px " + F; ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.fillText(String(i + 1), PAD, y);
    ctx.font = "600 32px " + F; ctx.fillStyle = "#fff"; ctx.fillText(wrappedFit(ctx, bkText(it.title, 60), 600), PAD + 50, y);
    ctx.font = "500 28px " + F; ctx.globalAlpha = .75; ctx.textAlign = "right"; ctx.fillText(fmtDur(it.secs || 0), W - PAD, y); ctx.textAlign = "left"; ctx.globalAlpha = 1;
  });
}
/** Mes anterior al actual: [año, mes]. */
function wrapPrevMonth() { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return [d.getFullYear(), d.getMonth()]; }
/** Abre el resumen de un mes. opts.auto: se ofrece solo (botón principal = compartir). */
function openWrapped(y, m, opts) {
  if (typeof y !== "number") { y = undefined; m = undefined; }
  opts = opts || {};
  if (isKidProfile() || isGuestProfile()) { showToast(L("No disponible en este perfil", "Not available on this profile")); return; }
  var d = wrappedData(y, m), isCurrent = d.key === wrapKey(new Date().getFullYear(), new Date().getMonth()), name = bkText(getActiveProfile().name, 24);
  qrOpen(L("Tu mes en películas", "Your month in movies"));
  var ICO = function (p) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>"; };
  var otherLabel = isCurrent ? L("Ver el mes anterior", "See last month") : L("Ver este mes", "See this month");
  function toggleHandler() { if (isCurrent) { var pm = wrapPrevMonth(); openWrapped(pm[0], pm[1]); } else openWrapped(); }
  if (!d.titles) {
    qrBody().innerHTML = emptyStateHTML("none", d.label, L("Aún no hay actividad en este mes. Reproduce algunos títulos (15 min o más) y vuelve para ver tu resumen.", "No activity this month yet. Watch a few titles (15 min or more) and come back to see your summary."), "", "") +
      '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-cancel-btn" data-w="toggle">' + otherLabel + "</button></div>";
    qrBody().querySelector('[data-w="toggle"]').onclick = toggleHandler;
    return;
  }
  var canvas = document.createElement("canvas");
  drawWrapped(canvas, d, name, null);                                                    // primero sin imagen (instantáneo)
  wrappedImage(d).then(function (img) { if (img) drawWrapped(canvas, d, name, img); });
  canvas.className = "wrapped-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", L("Resumen de " + d.label + ": " + Math.round(d.secs / 60) + " minutos viendo, " + d.titles + " títulos", "Summary for " + d.label + ": " + Math.round(d.secs / 60) + " minutes watched, " + d.titles + " titles"));
  qrBody().innerHTML = "";
  qrBody().appendChild(canvas);
  var actions = document.createElement("div");
  actions.className = "tc-profile-create-actions";
  var shareBtn = '<button type="button" class="tc-profile-create-btn wiz-btn" data-w="share">' + ICO('<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/>') + L("Compartir tu mes en películas", "Share your month in movies") + "</button>";
  var saveBtn = '<button type="button" class="tc-profile-cancel-btn wiz-btn" data-w="save">' + ICO('<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>') + L("Guardar imagen", "Save image") + "</button>";
  actions.innerHTML = shareBtn + saveBtn + '<button type="button" class="tc-link-btn" data-w="toggle">' + otherLabel + "</button>";
  qrBody().appendChild(actions);
  var fname = "tatocine-mi-mes-" + d.key + ".png";
  function toBlob() { return new Promise(function (res) { canvas.toBlob(res, "image/png"); }); }
  async function save() { var a = document.createElement("a"); a.href = URL.createObjectURL(await toBlob()); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  actions.querySelector('[data-w="save"]').onclick = save;
  actions.querySelector('[data-w="toggle"]').onclick = toggleHandler;
  actions.querySelector('[data-w="share"]').onclick = async function () {
    var file = new File([await toBlob()], fname, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "TatoCine" }); } catch (e) { } }
    else { await save(); showToast(L("Tu navegador no permite compartir imágenes: se guardó la imagen. Súbela a Instagram desde tu galería.", "Your browser can't share images: the image was saved. Upload it to Instagram from your gallery.")); }
  };
}
registerAction("open-wrapped", function () { openWrapped(); });

/* ---------- Resumen automático al empezar el mes (el del mes recién terminado), una sola vez por perfil y mes ---------- */
function wrapMarkKey() { return WRAP_MARK + (typeof activeProfileId !== "undefined" ? activeProfileId : "main"); }
function wrapBusy() { return !!document.querySelector(".modal.open, .tc-profile-create-overlay.open, .tc-kid-lock.open, #tc-profile-overlay.open") || !document.body.classList.contains("app-ready"); }
function monthlyWrappedCheck() {
  try {
    if (isKidProfile() || isGuestProfile() || wrapBusy()) return;                      // se reintenta en el siguiente aviso
    var pm = wrapPrevMonth(), key = wrapKey(pm[0], pm[1]), shown = "";
    try { shown = localStorage.getItem(wrapMarkKey()) || ""; } catch (e) { }
    if (shown >= key) return;                                                          // ya se mostró (o se mostró uno más reciente)
    var d = wrappedData(pm[0], pm[1]);
    safeStorageSet(wrapMarkKey(), key);                                                // idempotente: aunque lo cierre, no vuelve a salir ese mes
    if (!d.titles) return;                                                             // sin datos útiles: no se molesta
    openWrapped(pm[0], pm[1], { auto: true });
  } catch (e) { }
}
setTimeout(monthlyWrappedCheck, 6000);
setInterval(monthlyWrappedCheck, 60000);                                               // si la app sigue abierta al cambiar de mes
document.addEventListener("visibilitychange", function () { if (!document.hidden) setTimeout(monthlyWrappedCheck, 800); });

decorate("openStats", function (original) {
  return function () {
    var r = original.apply(this, arguments), wrap = document.querySelector("#stats-modal .stats-wrap");
    if (wrap && !wrap.querySelector('[data-act="open-wrapped"]')) wrap.insertAdjacentHTML("afterbegin", '<div class="wrapped-cta"><button type="button" class="hero-btn" data-act="open-wrapped"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>' + L("Tu mes en películas", "Your month in movies") + "</button></div>");
    return r;
  };
});
registerCommand({ id: "wrapped", es: "Tu mes en películas (resumen)", en: "Your month in movies (summary)", keys: "wrapped resumen mensual mes estadisticas", adult: true, run: function () { openWrapped(); } });
if (typeof i18nAdd === "function") i18nAdd({ "Tu mes en películas": "Your month in movies", "Compartir tu mes en películas": "Share your month in movies" });

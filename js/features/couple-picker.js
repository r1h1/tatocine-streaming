/**
 * TatoCine · js/features/couple-picker.js
 * «Decidir en pareja» (o en grupo de dos): cada persona desliza los mismos 12 títulos (✓ sí / ✕ no) en el mismo
 * dispositivo, por turnos y sin ver lo que eligió la otra. Al final salen las COINCIDENCIAS.
 * Si marcas que hay un niño viendo, los 12 títulos salen solo de contenido infantil apto. Todo ocurre en el dispositivo.
 * Se abre desde «¿Qué ver hoy?» o con Ctrl+K. Teclado: ← no · → sí.
 */
var cpState = null, CP_COUNT = 12;
function cpName(i) { return cpState.names[i]; }
async function cpBuildPool(kid) {
  var calls, page = 1 + Math.floor(Math.random() * 3), movies = [], shows = [];
  if (kid) {
    var base = "&without_genres=27,53,80,10752&sort_by=popularity.desc&include_adult=false&page=" + page;
    calls = [fetchTMDB("/discover/movie", "&certification_country=US&certification=G" + base), fetchTMDB("/discover/tv", "&certification_country=US&certification=TV-Y|TV-Y7|TV-G" + base)];
  } else {
    calls = [fetchTMDB("/discover/movie", "&sort_by=popularity.desc&vote_count.gte=300&include_adult=false&page=" + page), fetchTMDB("/discover/tv", "&sort_by=popularity.desc&vote_count.gte=200&include_adult=false&page=" + page)];
  }
  var r = await Promise.all(calls.map(function (p) { return p.catch(function () { return null; }); }));
  movies = ((r[0] && r[0].results) || []).map(mapMovieResult); shows = ((r[1] && r[1].results) || []).map(function (x) { return mapTvResult(x); });
  var seen = {}, pool = shuffleInPlace(movies.concat(shows)).filter(function (m) {
    var k = m.type + ":" + m.id;
    if (!m.bg || m.isUpcoming || seen[k] || (!kid && isWatched(m))) return false;
    seen[k] = 1; return true;
  });
  return pool.slice(0, CP_COUNT);
}
function openCouplePicker() {
  qrOpen(L("Decidir en pareja", "Decide as a couple"));
  qrBody().innerHTML = '<p class="tc-qr-note">' + L("Cada uno desliza 12 títulos por turnos, sin ver lo que elige el otro. Al final verán en qué coinciden.", "Each person swipes 12 titles in turns without seeing the other's picks. At the end you'll see what you agree on.") + "</p>" +
    '<label class="tc-qr-label" for="cp-name2">' + L("Nombre de la otra persona", "Name of the other person") + '</label><input id="cp-name2" class="tc-qr-select" maxlength="20" autocomplete="off" placeholder="' + L("Persona 2", "Person 2") + '" />' +
    '<label class="tc-bedtime-on cp-kid"><input type="checkbox" id="cp-kid"' + (isKidProfile() ? " checked disabled" : "") + " /> " + L("Hay un niño viendo (solo contenido infantil)", "A kid is watching (kid-friendly only)") + "</label>" +
    '<p class="tc-qr-status" id="tc-qr-status" role="status"></p><div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-cp="start">' + L("Empezar", "Start") + "</button></div>";
  qrBody().querySelector('[data-cp="start"]').onclick = async function () {
    var n2 = bkText($("cp-name2").value, 20) || L("Persona 2", "Person 2"), kid = $("cp-kid").checked || isKidProfile();
    this.disabled = true; qrStatus(L("Preparando títulos…", "Preparing titles…"));
    var pool = await cpBuildPool(kid);
    if (pool.length < 4) { qrStatus(L("No se pudieron cargar títulos. Inténtalo de nuevo.", "Couldn't load titles. Try again."), true); this.disabled = false; return; }
    cpState = { pool: pool, names: [bkText(getActiveProfile().name, 20) || L("Persona 1", "Person 1"), n2], turn: 0, i: 0, yes: [[], []] };
    cpShowCard();
  };
}
function cpShowCard() {
  var s = cpState, m = s.pool[s.i];
  document.body.classList.toggle("cp-active", !!m);
  if (!m) { if (s.turn === 0) return cpPass(); return cpResults(); }
  qrBody().innerHTML = '<p class="tc-qr-meta">' + L("Turno de ", "Turn: ") + escapeHTML(cpName(s.turn)) + ' · ' + (s.i + 1) + "/" + s.pool.length + "</p>" +
    '<div class="cp-card" id="cp-card" tabindex="0" aria-label="' + escapeHTML(m.title) + '"><img alt="" src="https://image.tmdb.org/t/p/w780' + escapeHTML(m.bg) + '" decoding="async"><div class="cp-info"><strong data-i18n="skip">' + escapeHTML(m.title) + "</strong><span>" + (m.type === "tv" ? L("Serie", "Series") : L("Película", "Movie")) + (m.year ? " · " + escapeHTML(String(m.year)) : "") + (m.rating ? " · ★ " + Number(m.rating).toFixed(1) : "") + "</span></div></div>" +
    '<div class="cp-btns"><button type="button" class="cp-no" data-cp="no" aria-label="' + L("No me interesa", "Not interested") + '">✕</button><button type="button" class="cp-info-btn" data-cp="info" aria-label="' + L("Más información", "More info") + '">ⓘ</button><button type="button" class="cp-yes" data-cp="yes" aria-label="' + L("Me interesa", "Interested") + '">✓</button></div>' +
    '<p class="tc-qr-hint">← ' + L("no", "no") + " · " + L("sí", "yes") + " →</p>";
  var card = $("cp-card"), x0 = null;
  function answer(yes) { if (yes) s.yes[s.turn].push(m); s.i++; cpShowCard(); }
  qrBody().querySelector('[data-cp="no"]').onclick = function () { answer(false); };
  qrBody().querySelector('[data-cp="yes"]').onclick = function () { answer(true); };
  qrBody().querySelector('[data-cp="info"]').onclick = function () { window.open("?id=" + m.id + "&type=" + m.type, "_blank", "noopener"); };
  card.addEventListener("pointerdown", function (e) { x0 = e.clientX; card.setPointerCapture(e.pointerId); card.classList.add("drag"); });
  card.addEventListener("pointermove", function (e) { if (x0 == null) return; var dx = e.clientX - x0; card.style.transform = "translateX(" + dx + "px) rotate(" + dx / 22 + "deg)"; card.style.boxShadow = dx > 40 ? "0 0 0 3px #3ddc84" : dx < -40 ? "0 0 0 3px #ff5c5c" : ""; });
  card.addEventListener("pointerup", function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; card.classList.remove("drag"); if (Math.abs(dx) > 90) answer(dx > 0); else { card.style.transform = ""; card.style.boxShadow = ""; } });
  card.focus({ preventScroll: true });
}
// En `window` y en fase de captura (antes que cualquier otro escuchador): la navegación por flechas de la TV no debe «robar» las flechas.
window.addEventListener("keydown", function (e) {
  if (!cpState || !$("cp-card") || !$("tc-qr-overlay").classList.contains("open")) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); qrBody().querySelector('[data-cp="' + (e.key === "ArrowRight" ? "yes" : "no") + '"]').click(); }
}, true);
function cpPass() {
  var s = cpState;
  document.body.classList.remove("cp-active");
  qrBody().innerHTML = '<div class="tour-icon" aria-hidden="true">🤝</div><h4 class="tour-title">' + L("Pasa el dispositivo", "Pass the device") + '</h4><p class="tc-qr-note">' + L("Ahora es el turno de ", "Now it's ") + "<strong>" + escapeHTML(cpName(1)) + "</strong>" + L(". Tus respuestas quedan ocultas.", ". Your answers stay hidden.") + '</p><div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-cp="go">' + L("Estoy listo", "I'm ready") + "</button></div>";
  qrBody().querySelector('[data-cp="go"]').onclick = function () { s.turn = 1; s.i = 0; cpShowCard(); };
}
function cpResults() {
  document.body.classList.remove("cp-active");
  var s = cpState, ids = s.yes[0].map(function (m) { return m.type + m.id; });
  var both = s.yes[1].filter(function (m) { return ids.indexOf(m.type + m.id) > -1; });
  if (!both.length) {
    qrBody().innerHTML = '<div class="tour-icon" aria-hidden="true">🤷</div><h4 class="tour-title">' + L("Sin coincidencias", "No matches") + '</h4><p class="tc-qr-note">' + L("No coincidieron en ningún título. ¡Prueben otra ronda!", "You didn't agree on any title. Try another round!") + '</p><div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-cp="again">' + L("Otra ronda", "Another round") + "</button></div>";
    qrBody().querySelector('[data-cp="again"]').onclick = openCouplePicker;
    return;
  }
  var best = both[0];
  qrBody().innerHTML = '<h4 class="tour-title">🎉 ' + L("¡Coinciden en " + both.length + (both.length === 1 ? " título!" : " títulos!"), "You match on " + both.length + (both.length === 1 ? " title!" : " titles!")) + "</h4>" +
    '<div class="cp-card cp-win"><img alt="" src="https://image.tmdb.org/t/p/w780' + escapeHTML(best.bg) + '"><div class="cp-info"><strong data-i18n="skip">' + escapeHTML(best.title) + "</strong><span>" + L("La mejor opción para los dos", "The best pick for both of you") + "</span></div></div>" +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-cp="play">' + L("Ver ahora", "Watch now") + '</button><button type="button" class="tc-profile-cancel-btn" data-cp="detail">' + L("Info", "Info") + "</button></div>" +
    (both.length > 1 ? '<p class="wk-top">' + L("También coinciden: ", "Also matching: ") + both.slice(1).map(function (m) { return escapeHTML(m.title); }).join(" · ") + "</p>" : "");
  qrBody().querySelector('[data-cp="play"]').onclick = function () { closeQr(); openPlayer(best.id, best.type, best.title, null, null, best.bg || null); };
  qrBody().querySelector('[data-cp="detail"]').onclick = function () { closeQr(); openDetails(best.id, best.type); };
}
registerCommand({ id: "couple", es: "Decidir en pareja (qué ver juntos)", en: "Decide as a couple (what to watch together)", keys: "pareja decidir juntos amigos votar", run: openCouplePicker });
registerAction("open-couple", openCouplePicker);
if (typeof i18nAdd === "function") i18nAdd({ "Decidir en pareja": "Decide as a couple" });
registerAction("wizard-couple", function () { closeWizard(); openCouplePicker(); });
decorate("closeQr", function (original) { return function () { document.body.classList.remove("cp-active"); return original.apply(this, arguments); }; });

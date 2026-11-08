/**
 * TatoCine · js/features/couple-picker.js
 * «Decidir en pareja»: cada persona BUSCA y elige 5 títulos (por turnos, sin ver lo que elige la otra; se guardan solo en la
 * sesión del navegador). Los que ambos eligieron quedan aprobados solos; el resto se vota juntos en el mismo dispositivo
 * (✓ sí / ✕ no). Al final salen los títulos que todos aprobaron. Si hay un niño viendo, solo contenido infantil apto.
 * Se abre desde «¿Qué ver?» o con Ctrl+K. Teclado en la votación: ← no · → sí.
 */
var cpState = null, CP_COUNT = 5;
var EYE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>', DICE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" ry="3"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/></svg>', PLAY = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

var SEARCH_ICO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
function cpMode() { var o = $("tc-qr-overlay"); if (o) o.classList.add("cp-mode"); }
function cpName(i) { return cpState.names[i]; }
function cpKey(m) { return m.type + ":" + m.id; }
function cpMini(m) { return { id: m.id, type: m.type, title: m.title, bg: m.bg, year: m.year, rating: m.rating }; }
/* ---- La ronda se guarda en la sesión del navegador (sessionStorage): sobrevive a cerrar el diálogo, a ver una ficha y a recargar ---- */
var CP_KEY = "tatoPairV2", CP_TTL = 3 * 3600 * 1000;
function cpSave() {
  if (!cpState) return;
  try { sessionStorage.setItem(CP_KEY, JSON.stringify({ t: Date.now(), names: cpState.names, kid: !!cpState.kid, phase: cpState.phase, picks: [cpState.picks[0].map(cpMini), cpState.picks[1].map(cpMini)], deck: (cpState.deck || []).map(cpMini), i: cpState.i || 0, oks: (cpState.oks || []).map(cpMini), noes: (cpState.noes || []).map(cpMini) })); } catch (e) { }
}
function cpClear() { try { sessionStorage.removeItem(CP_KEY); sessionStorage.removeItem("tatoPairV1"); } catch (e) { } }
function cpCleanList(a, max) {
  var out = [];
  (Array.isArray(a) ? a : []).slice(0, max).forEach(function (x) { var m = bkMedia(x); if (m) { m.year = bkYear(String(x.year || "")) || ""; m.rating = bkNum(Number(x.rating), 0, 10, 0); out.push(m); } });
  return out;
}
/** Devuelve la ronda guardada (validada) o null. */
function cpLoad() {
  var raw = null;
  try { raw = JSON.parse(sessionStorage.getItem(CP_KEY) || "null"); } catch (e) { }
  if (!raw || typeof raw !== "object" || Date.now() - (raw.t || 0) > CP_TTL || !Array.isArray(raw.names) || !Array.isArray(raw.picks)) return null;
  var phase = ["pick0", "pass", "pick1", "vote", "result"].includes(raw.phase) ? raw.phase : "pick0";
  var deck = cpCleanList(raw.deck, 12);
  return { names: [bkText(String(raw.names[0] || ""), 20) || L("Persona 1", "Person 1"), bkText(String(raw.names[1] || ""), 20) || L("Persona 2", "Person 2")], kid: !!raw.kid, phase: phase,
    picks: [cpCleanList(raw.picks[0], CP_COUNT), cpCleanList(raw.picks[1], CP_COUNT)], deck: deck, i: Number.isInteger(raw.i) && raw.i >= 0 && raw.i <= deck.length ? raw.i : 0, oks: cpCleanList(raw.oks, 12), noes: cpCleanList(raw.noes, 12), ri: 0 };
}
function cpStep() {
  var s = cpState;
  if (s.phase === "pick0" || s.phase === "pick1") return cpPickScreen(s.phase === "pick0" ? 0 : 1);
  if (s.phase === "pass") return cpPass();
  if (s.phase === "vote") return cpShowCard();
  return cpResults();
}
function openCouplePicker() {
  var saved = cpLoad();
  if (!saved) return cpSetupScreen();
  qrOpen(L("Decidir en pareja", "Decide as a couple")); cpMode();
  var done = saved.phase === "result";
  qrBody().innerHTML = '<p class="tc-qr-note">' + (done ? L("Tienes un resultado de la última ronda.", "You have a result from the last round.") : L("Tienes una ronda sin terminar con ", "You have an unfinished round with ") + "<strong>" + escapeHTML(saved.names[1]) + "</strong>.") + "</p>" +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn cp-choice" data-cp="resume">' + (done ? EYE : PLAY) + "<span>" + (done ? L("Ver resultado", "See result") : L("Continuar", "Continue")) + '</span></button><button type="button" class="tc-profile-cancel-btn cp-choice" data-cp="fresh">' + DICE + "<span>" + L("Nueva ronda", "New round") + "</span></button></div>";
  qrBody().querySelector('[data-cp="resume"]').onclick = function () { cpState = saved; cpStep(); };
  qrBody().querySelector('[data-cp="fresh"]').onclick = function () { cpClear(); cpState = null; cpSetupScreen(); };
}
function cpSetupScreen() {
  qrOpen(L("Decidir en pareja", "Decide as a couple")); cpMode();
  qrBody().innerHTML = '<p class="tc-qr-note">' + L("Cada uno busca y elige 5 títulos, por turnos y sin ver lo que elige el otro. Los que coincidan quedan aprobados; los demás se votan juntos.", "Each person searches and picks 5 titles, in turns and without seeing the other's picks. Matching titles are approved; the rest are voted on together.") + "</p>" +
    '<label class="tc-qr-label" for="cp-name2">' + L("Nombre de la otra persona", "Name of the other person") + '</label><input id="cp-name2" class="tc-qr-select" maxlength="20" autocomplete="off" placeholder="' + L("Persona 2", "Person 2") + '" />' +
    '<label class="tc-bedtime-on cp-kid"><input type="checkbox" id="cp-kid"' + (isKidProfile() ? " checked disabled" : "") + " /> " + L("Hay un niño viendo (solo contenido infantil)", "A kid is watching (kid-friendly only)") + "</label>" +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn cp-choice" data-cp="start">' + PLAY + "<span>" + L("Empezar", "Start") + "</span></button></div>";
  qrBody().querySelector('[data-cp="start"]').onclick = function () {
    var n2 = bkText($("cp-name2").value, 20) || L("Persona 2", "Person 2");
    cpState = { names: [bkText(getActiveProfile().name, 20) || L("Persona 1", "Person 1"), n2], kid: $("cp-kid").checked || isKidProfile(), phase: "pick0", picks: [[], []], deck: [], i: 0, oks: [], noes: [], ri: 0 };
    cpSave(); cpStep();
  };
}
/** Pantalla de búsqueda: escribe, toca un resultado para agregarlo (hasta 5) y «Listo». */
function cpPickScreen(who) {
  var s = cpState, picked = s.picks[who], token = 0, timer = null;
  document.body.classList.remove("cp-active");
  qrBody().innerHTML = '<p class="tc-qr-meta">' + L("Turno de ", "Turn: ") + "<strong>" + escapeHTML(cpName(who)) + "</strong></p>" +
    '<p class="tc-qr-note">' + L("Busca y elige " + CP_COUNT + " títulos que quieras ver.", "Search and pick " + CP_COUNT + " titles you'd like to watch.") + "</p>" +
    '<div class="cp-search">' + SEARCH_ICO + '<input id="cp-q" type="search" class="tc-qr-select" maxlength="60" autocomplete="off" placeholder="' + L("Buscar películas o series…", "Search movies or series…") + '" /></div>' +
    '<div class="cp-chips" id="cp-chips"></div><div class="cp-results" id="cp-results" role="listbox"></div>' +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn cp-choice" data-cp="done" disabled></button></div>';
  var chips = $("cp-chips"), box = $("cp-results"), doneBtn = qrBody().querySelector('[data-cp="done"]');
  function paintChips() {
    chips.innerHTML = picked.map(function (m, i) { return '<span class="cp-chip"><span>' + escapeHTML(m.title) + '</span><button type="button" data-rm="' + i + '" aria-label="' + L("Quitar", "Remove") + '">×</button></span>'; }).join("");
    chips.querySelectorAll("[data-rm]").forEach(function (b) { b.onclick = function () { picked.splice(Number(b.getAttribute("data-rm")), 1); cpSave(); paintChips(); paintDone(); search(); }; });
  }
  function paintDone() { doneBtn.disabled = picked.length < 1; doneBtn.innerHTML = PLAY + "<span>" + L("Listo", "Done") + " (" + picked.length + "/" + CP_COUNT + ")</span>"; }
  function paintResults(list) {
    if (!list.length) { box.innerHTML = '<p class="tc-qr-hint">' + L("Sin resultados. Prueba otro nombre.", "No results. Try another name.") + "</p>"; return; }
    box.innerHTML = "";
    list.forEach(function (m) {
      var has = picked.some(function (p) { return cpKey(p) === cpKey(m); }), full = picked.length >= CP_COUNT && !has;
      var row = document.createElement("button");
      row.type = "button"; row.className = "cp-res" + (has ? " on" : ""); row.disabled = full;
      row.innerHTML = '<img alt="" loading="lazy" decoding="async" src="' + (m.bg ? "https://image.tmdb.org/t/p/w92" + escapeHTML(m.bg) : FALLBACK_IMG) + '"><span class="cp-res-t"><strong>' + escapeHTML(m.title) + "</strong><span>" + (m.type === "tv" ? L("Serie", "Series") : L("Película", "Movie")) + (m.year ? " · " + escapeHTML(m.year) : "") + '</span></span><span class="cp-res-a" aria-hidden="true">' + (has ? "✓" : "+") + "</span>";
      row.onclick = function () {
        var idx = picked.findIndex(function (p) { return cpKey(p) === cpKey(m); });
        if (idx > -1) picked.splice(idx, 1); else if (picked.length < CP_COUNT) picked.push(m);
        cpSave(); paintChips(); paintDone(); paintResults(list);
      };
      box.appendChild(row);
    });
  }
  function search() {
    var q = ($("cp-q").value || "").trim();
    if (q.length < 2) { box.innerHTML = ""; return; }
    var my = ++token;
    fetchTMDB("/search/multi", "&include_adult=false&query=" + encodeURIComponent(q)).then(function (d) {
      if (my !== token) return;
      var list = (d.results || []).filter(function (i) { return (i.media_type === "movie" || i.media_type === "tv") && (i.backdrop_path || i.poster_path); }).map(function (i) { var m = i.media_type === "tv" ? mapTvResult(i) : mapMovieResult(i); m.adult = !!i.adult; m.genre_ids = i.genre_ids || []; m.desc = i.overview; return m; }).slice(0, 8);
      if (s.kid) return kidsFilterSearch(list, 8).then(function (ok) { if (my === token) paintResults(ok); });
      paintResults(list.filter(function (m) { return !m.adult; }));
    }).catch(function () { if (my === token) box.innerHTML = '<p class="tc-qr-hint">' + L("No se pudo buscar. Revisa tu conexión.", "Couldn't search. Check your connection.") + "</p>"; });
  }
  $("cp-q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(search, 280); });
  doneBtn.onclick = function () {
    if (!picked.length) return;
    if (who === 0) s.phase = "pass"; else cpBuildDeck();
    cpSave(); cpStep();
  };
  paintChips(); paintDone();
  $("cp-q").focus({ preventScroll: true });
}
/** Coinciden (ambos lo eligieron) → aprobadas solas. El resto → se vota. */
function cpBuildDeck() {
  var s = cpState, k1 = s.picks[0].map(cpKey), k2 = s.picks[1].map(cpKey), oks = [], deck = [], seen = {};
  s.picks[0].concat(s.picks[1]).forEach(function (m) {
    var k = cpKey(m); if (seen[k]) return; seen[k] = 1;
    if (k1.includes(k) && k2.includes(k)) oks.push(m); else { m._by = k1.includes(k) ? 0 : 1; deck.push(m); }
  });
  s.oks = oks; s.noes = []; s.ri = 0; s.deck = shuffleInPlace(deck); s.i = 0; s.phase = s.deck.length ? "vote" : "result";
}
function cpPass() {
  document.body.classList.remove("cp-active");
  qrBody().innerHTML = '<div class="tour-icon tour-num" aria-hidden="true">2</div><h4 class="tour-title">' + L("Pasa el dispositivo", "Pass the device") + '</h4><p class="tc-qr-note">' + L("Ahora es el turno de ", "Now it's ") + "<strong>" + escapeHTML(cpName(1)) + "</strong>" + L(". Lo que elegiste queda oculto.", ". What you picked stays hidden.") + '</p><div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn cp-choice" data-cp="go">' + PLAY + "<span>" + L("Soy " + cpName(1), "I'm " + cpName(1)) + "</span></button></div>";
  qrBody().querySelector('[data-cp="go"]').onclick = function () { cpState.phase = "pick1"; cpSave(); cpStep(); };
}
function cpShowCard() {
  var s = cpState, m = s.deck[s.i];
  document.body.classList.toggle("cp-active", !!m);
  if (!m) { s.phase = "result"; cpSave(); return cpResults(); }
  var by = s.picks[0].some(function (p) { return cpKey(p) === cpKey(m); }) ? 0 : 1;
  qrBody().innerHTML = '<p class="tc-qr-meta">' + L("Voten juntos · ", "Vote together · ") + (s.i + 1) + "/" + s.deck.length + '</p><p class="tc-qr-hint">' + L("Elegida por ", "Picked by ") + "<strong>" + escapeHTML(cpName(by)) + "</strong>" + (s.oks.length ? " · " + L(s.oks.length + " ya aprobadas", s.oks.length + " already approved") : "") + "</p>" +
    '<div class="cp-card" id="cp-card" tabindex="0" aria-label="' + escapeHTML(m.title) + '"><img alt="" src="https://image.tmdb.org/t/p/w780' + escapeHTML(m.bg) + '" decoding="async"><div class="cp-info"><strong data-i18n="skip">' + escapeHTML(m.title) + "</strong><span>" + (m.type === "tv" ? L("Serie", "Series") : L("Película", "Movie")) + (m.year ? " · " + escapeHTML(m.year) : "") + '</span></div></div>' +
    '<div class="cp-btns"><button type="button" class="cp-no" data-cp="no" aria-label="' + L("No", "No") + '"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button><button type="button" class="cp-info-btn" data-cp="info" aria-label="Info"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></button><button type="button" class="cp-yes" data-cp="yes" aria-label="' + L("Sí", "Yes") + '"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></button></div>' +
    '<p class="tc-qr-hint">' + L("Flecha izquierda: no · Flecha derecha: sí", "Left arrow: no · Right arrow: yes") + "</p>";
  var card = $("cp-card"), x0 = null;
  function answer(yes) { if (yes) s.oks.push(m); else s.noes.push(m); s.i++; cpSave(); cpShowCard(); }
  qrBody().querySelector('[data-cp="no"]').onclick = function () { answer(false); };
  qrBody().querySelector('[data-cp="yes"]').onclick = function () { answer(true); };
  qrBody().querySelector('[data-cp="info"]').onclick = function () { cpOpenInfo(m); };
  card.addEventListener("pointerdown", function (e) { x0 = e.clientX; card.setPointerCapture(e.pointerId); card.classList.add("drag"); });
  card.addEventListener("pointermove", function (e) { if (x0 == null) return; var dx = e.clientX - x0; card.style.transform = "translateX(" + dx + "px) rotate(" + dx / 22 + "deg)"; card.style.boxShadow = dx > 40 ? "0 0 0 3px #fff" : dx < -40 ? "0 0 0 3px #bdbdbd" : ""; });
  card.addEventListener("pointerup", function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; card.classList.remove("drag"); if (Math.abs(dx) > 90) answer(dx > 0); else { card.style.transform = ""; card.style.boxShadow = ""; } });
  card.focus({ preventScroll: true });
}
// En `window` y en fase de captura (antes que cualquier otro escuchador): la navegación por flechas de la TV no debe «robar» las flechas.
window.addEventListener("keydown", function (e) {
  if (!cpState || !$("cp-card") || !$("tc-qr-overlay").classList.contains("open") || document.body.classList.contains("cp-details")) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); qrBody().querySelector('[data-cp="' + (e.key === "ArrowRight" ? "yes" : "no") + '"]').click(); }
}, true);
var CP_I = {
  play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4l10 8-10 8V4zM19 5v14"/></svg>',
  table: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/></svg>',
  back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>'
};
function cpBtn(act, ico, label, primary) { return '<button type="button" class="cp-btn' + (primary ? " primary" : "") + '" data-cp="' + act + '">' + ico + "<span>" + label + "</span></button>"; }
function cpResults() {
  document.body.classList.remove("cp-active");
  var s = cpState, both = s.oks || [];
  if (!both.length) {
    qrBody().innerHTML = '<h4 class="tour-title">' + L("Sin coincidencias", "No matches") + '</h4><p class="tc-qr-note">' + L("Ningún título quedó aprobado. ¡Prueben otra ronda!", "No title was approved. Try another round!") + '</p><div class="cp-actions">' + cpBtn("again", DICE, L("Otra ronda", "Another round"), true) + cpBtn("table", CP_I.table, L("Ver resultados", "See results")) + "</div>";
    qrBody().querySelector('[data-cp="again"]').onclick = function () { cpClear(); cpState = null; cpSetupScreen(); };
    qrBody().querySelector('[data-cp="table"]').onclick = cpTable;
    return;
  }
  var ri = (s.ri || 0) % both.length, cur = both[ri];
  qrBody().innerHTML = '<h4 class="tour-title">' + L("¡Aprobaron " + both.length + (both.length === 1 ? " título!" : " títulos!"), "You approved " + both.length + (both.length === 1 ? " title!" : " titles!")) + "</h4>" +
    '<div class="cp-card cp-win"><img alt="" src="https://image.tmdb.org/t/p/w780' + escapeHTML(cur.bg) + '"><div class="cp-info"><strong data-i18n="skip">' + escapeHTML(cur.title) + "</strong><span>" + (ri === 0 ? L("La mejor opción para los dos", "The best pick for both of you") : L("Opción ", "Option ") + (ri + 1) + "/" + both.length) + "</span></div></div>" +
    '<div class="cp-actions">' + cpBtn("play", CP_I.play, L("Ver", "Watch"), true) + cpBtn("detail", CP_I.info, "Info") + (both.length > 1 ? cpBtn("skip", CP_I.next, L("Siguiente", "Next")) : "") + cpBtn("table", CP_I.table, L("Ver resultados", "See results")) + cpBtn("again", DICE, L("Otra ronda", "Another round")) + "</div>";
  qrBody().querySelector('[data-cp="play"]').onclick = function () { closeQr(); openPlayer(cur.id, cur.type, cur.title, null, null, cur.bg || null); };
  qrBody().querySelector('[data-cp="detail"]').onclick = function () { cpOpenInfo(cur); };
  var sk = qrBody().querySelector('[data-cp="skip"]'); if (sk) sk.onclick = function () { s.ri = ri + 1; cpResults(); };
  qrBody().querySelector('[data-cp="table"]').onclick = cpTable;
  qrBody().querySelector('[data-cp="again"]').onclick = function () { cpClear(); cpState = null; cpSetupScreen(); };
}
/** Tabla con todos los títulos de la ronda: quién lo eligió y qué pasó con él. */
function cpTable() {
  var s = cpState, k0 = s.picks[0].map(cpKey), k1 = s.picks[1].map(cpKey), oks = (s.oks || []).map(cpKey), seen = {}, rows = [];
  (s.oks || []).concat(s.noes || [], s.picks[0], s.picks[1]).forEach(function (m) {
    var k = cpKey(m); if (seen[k]) return; seen[k] = 1;
    var a = k0.includes(k), b = k1.includes(k), approved = oks.includes(k);
    rows.push({ m: m, by: a && b ? L("Ambos", "Both") : a ? cpName(0) : cpName(1), status: a && b ? "match" : approved ? "voted" : "no" });
  });
  var label = { match: L("Coincidencia", "Match"), voted: L("Aprobada", "Approved"), no: L("Descartada", "Dropped") };
  qrBody().innerHTML = '<h4 class="tour-title">' + L("Resultados", "Results") + '</h4><div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>#</th><th>' + L("Título", "Title") + "</th><th>" + L("Elegida por", "Picked by") + "</th><th>" + L("Resultado", "Result") + '</th><th></th></tr></thead><tbody>' +
    rows.map(function (r, i) { return '<tr class="cp-' + r.status + '"><td data-l="#">' + (i + 1) + '</td><td data-l="' + L("Título", "Title") + '"><strong data-i18n="skip">' + escapeHTML(r.m.title) + "</strong><small>" + (r.m.type === "tv" ? L("Serie", "Series") : L("Película", "Movie")) + (r.m.year ? " · " + escapeHTML(r.m.year) : "") + '</small></td><td data-l="' + L("Elegida por", "Picked by") + '" data-i18n="skip">' + escapeHTML(r.by) + '</td><td data-l="' + L("Resultado", "Result") + '"><span class="cp-pill">' + label[r.status] + '</span></td><td><button type="button" class="cp-icon-btn" data-row="' + i + '" aria-label="' + L("Ver", "Watch") + '">' + CP_I.play + "</button></td></tr>"; }).join("") +
    '</tbody></table></div><div class="cp-actions">' + cpBtn("back", CP_I.back, L("Volver", "Back"), true) + cpBtn("again", DICE, L("Otra ronda", "Another round")) + "</div>";
  qrBody().querySelectorAll("[data-row]").forEach(function (b) { b.onclick = function () { var m = rows[Number(b.getAttribute("data-row"))].m; closeQr(); openPlayer(m.id, m.type, m.title, null, null, m.bg || null); }; });
  qrBody().querySelector('[data-cp="back"]').onclick = cpResults;
  qrBody().querySelector('[data-cp="again"]').onclick = function () { cpClear(); cpState = null; cpSetupScreen(); };
}
registerCommand({ id: "couple", es: "Decidir en pareja (qué ver juntos)", en: "Decide as a couple (what to watch together)", keys: "pareja decidir juntos amigos votar", run: openCouplePicker });
registerAction("open-couple", openCouplePicker);
if (typeof i18nAdd === "function") i18nAdd({ "Decidir en pareja": "Decide as a couple" });
registerAction("wizard-couple", function () { closeWizard(); openCouplePicker(); });
/* Info: la ficha se abre ENCIMA del diálogo, que sigue ahí (con su ronda intacta) y queda inerte hasta que se cierre la ficha
   por cualquier vía (✕, Esc, atrás, deslizar). Nada se reconstruye ni se pierde. */
function cpOpenInfo(m) {
  var overlay = $("tc-qr-overlay"), modal = $("details-modal"), seenOpen = false, done = false;
  document.body.classList.add("cp-details");
  overlay.inert = true;
  function finish() {
    if (done) return;
    done = true; obs.disconnect(); clearTimeout(guard);
    document.body.classList.remove("cp-details");
    overlay.inert = false;
    var c = $("cp-card"); if (c) c.focus({ preventScroll: true });
  }
  var obs = new MutationObserver(function () { var open = modal.classList.contains("open"); if (open) seenOpen = true; else if (seenOpen) finish(); });
  obs.observe(modal, { attributes: true, attributeFilter: ["class"] });
  var guard = setTimeout(function () { if (!seenOpen) finish(); }, 5000);          // la ficha no llegó a abrirse (p. ej. contenido bloqueado)
  openDetails(m.id, m.type);
}
decorate("closeQr", function (original) { return function () { document.body.classList.remove("cp-active"); var o = $("tc-qr-overlay"); if (o) o.classList.remove("cp-mode"); return original.apply(this, arguments); }; });

// Si la página se recarga con una ronda sin terminar, se ofrece retomarla.
(function offerResume() {
  var saved = cpLoad();
  if (!saved || saved.phase === "result") return;
  var tries = 0;
  (function wait() {
    if (document.body.classList.contains("app-ready") && !document.getElementById("tc-profile-overlay").classList.contains("open")) {
      setTimeout(function () { showToastAction(L("Tienes una ronda de «Decidir en pareja» sin terminar", "You have an unfinished “Decide as a couple” round"), L("Retomar", "Resume"), function () { openCouplePicker(); qrBody().querySelector('[data-cp="resume"]').click(); }, 12000); }, 1500);
      return;
    }
    if (tries++ < 60) setTimeout(wait, 1000);
  })();
})();

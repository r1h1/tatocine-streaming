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
/* ---- La ronda se guarda en la sesión del navegador (sessionStorage): sobrevive a cerrar el diálogo, a ver una ficha y a recargar ---- */
var CP_KEY = "tatoPairV1", CP_TTL = 3 * 3600 * 1000;
function cpSave() {
  if (!cpState) return;
  try {
    var idx = function (arr) { return arr.map(function (m) { return cpState.pool.indexOf(m); }).filter(function (i) { return i >= 0; }); };
    sessionStorage.setItem(CP_KEY, JSON.stringify({ t: Date.now(), names: cpState.names, turn: cpState.turn, i: cpState.i, yes: [idx(cpState.yes[0]), idx(cpState.yes[1])],
      pool: cpState.pool.map(function (m) { return { id: m.id, type: m.type, title: m.title, bg: m.bg, year: m.year, rating: m.rating }; }) }));
  } catch (e) { }
}
function cpClear() { try { sessionStorage.removeItem(CP_KEY); } catch (e) { } }
/** Devuelve la ronda guardada (validada) o null. */
function cpLoad() {
  var raw = null;
  try { raw = JSON.parse(sessionStorage.getItem(CP_KEY) || "null"); } catch (e) { }
  if (!raw || typeof raw !== "object" || Date.now() - (raw.t || 0) > CP_TTL || !Array.isArray(raw.pool) || raw.pool.length < 4 || raw.pool.length > 24 || !Array.isArray(raw.names) || !Array.isArray(raw.yes)) return null;
  var pool = [];
  for (var k = 0; k < raw.pool.length; k++) {
    var m = bkMedia(raw.pool[k]);
    if (!m) return null;
    m.year = bkYear(String(raw.pool[k].year || "")) || ""; m.rating = bkNum(Number(raw.pool[k].rating), 0, 10, 0);
    pool.push(m);
  }
  var turn = raw.turn === 1 ? 1 : 0, i = Number.isInteger(raw.i) && raw.i >= 0 && raw.i <= pool.length ? raw.i : 0;
  function pick(a) { return (Array.isArray(a) ? a : []).filter(function (n) { return Number.isInteger(n) && n >= 0 && n < pool.length; }).map(function (n) { return pool[n]; }); }
  return { pool: pool, names: [bkText(String(raw.names[0] || ""), 20) || L("Persona 1", "Person 1"), bkText(String(raw.names[1] || ""), 20) || L("Persona 2", "Person 2")], turn: turn, i: i, yes: [pick(raw.yes[0]), pick(raw.yes[1])] };
}
function openCouplePicker() {
  var saved = cpLoad();
  if (!saved) return cpSetupScreen();
  var done = saved.turn === 1 && saved.i >= saved.pool.length;
  qrOpen(L("Decidir en pareja", "Decide as a couple"));
  qrBody().innerHTML = '<p class="tc-qr-note">' + (done ? L("Tienes un resultado de la última ronda.", "You have a result from the last round.") : L("Tienes una ronda sin terminar: turno de ", "You have an unfinished round: turn of ") + "<strong>" + escapeHTML(saved.names[saved.turn]) + "</strong> · " + Math.min(saved.i + 1, saved.pool.length) + "/" + saved.pool.length + ".") + '</p>' +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-cp="resume">' + (done ? L("Ver resultado", "See result") : L("Continuar", "Continue")) + '</button><button type="button" class="tc-profile-cancel-btn" data-cp="fresh">' + L("Nueva ronda", "New round") + "</button></div>";
  qrBody().querySelector('[data-cp="resume"]').onclick = function () { cpState = saved; cpShowCard(); };
  qrBody().querySelector('[data-cp="fresh"]').onclick = function () { cpClear(); cpState = null; cpSetupScreen(); };
}
function cpSetupScreen() {
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
    cpSave();
    cpShowCard();
  };
}
function cpShowCard() {
  var s = cpState, m = s.pool[s.i];
  document.body.classList.toggle("cp-active", !!m);
  if (!m) { if (s.turn === 0) return cpPass(); return cpResults(); }
  qrBody().innerHTML = '<p class="tc-qr-meta">' + L("Turno de ", "Turn: ") + escapeHTML(cpName(s.turn)) + ' · ' + (s.i + 1) + "/" + s.pool.length + "</p>" +
    '<div class="cp-card" id="cp-card" tabindex="0" aria-label="' + escapeHTML(m.title) + '"><img alt="" src="https://image.tmdb.org/t/p/w780' + escapeHTML(m.bg) + '" decoding="async"><div class="cp-info"><strong data-i18n="skip">' + escapeHTML(m.title) + "</strong><span>" + (m.type === "tv" ? L("Serie", "Series") : L("Película", "Movie")) + (m.year ? " · " + escapeHTML(String(m.year)) : "") + (m.rating ? " · ★ " + Number(m.rating).toFixed(1) : "") + "</span></div></div>" +
    '<div class="cp-btns"><button type="button" class="cp-no" data-cp="no" aria-label="' + L("No me interesa", "Not interested") + '"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button><button type="button" class="cp-info-btn" data-cp="info" aria-label="' + L("Más información", "More info") + '"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></button><button type="button" class="cp-yes" data-cp="yes" aria-label="' + L("Me interesa", "Interested") + '"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></button></div>' +
    '<p class="tc-qr-hint">' + L("Flecha izquierda: no · Flecha derecha: sí", "Left arrow: no · Right arrow: yes") + "</p>";
  var card = $("cp-card"), x0 = null;
  function answer(yes) { if (yes) s.yes[s.turn].push(m); s.i++; cpSave(); cpShowCard(); }
  qrBody().querySelector('[data-cp="no"]').onclick = function () { answer(false); };
  qrBody().querySelector('[data-cp="yes"]').onclick = function () { answer(true); };
  qrBody().querySelector('[data-cp="info"]').onclick = function () { cpOpenInfo(m); };
  card.addEventListener("pointerdown", function (e) { x0 = e.clientX; card.setPointerCapture(e.pointerId); card.classList.add("drag"); });
  card.addEventListener("pointermove", function (e) { if (x0 == null) return; var dx = e.clientX - x0; card.style.transform = "translateX(" + dx + "px) rotate(" + dx / 22 + "deg)"; card.style.boxShadow = dx > 40 ? "0 0 0 3px #3ddc84" : dx < -40 ? "0 0 0 3px #ff5c5c" : ""; });
  card.addEventListener("pointerup", function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; card.classList.remove("drag"); if (Math.abs(dx) > 90) answer(dx > 0); else { card.style.transform = ""; card.style.boxShadow = ""; } });
  card.focus({ preventScroll: true });
}
// En `window` y en fase de captura (antes que cualquier otro escuchador): la navegación por flechas de la TV no debe «robar» las flechas.
window.addEventListener("keydown", function (e) {
  if (!cpState || !$("cp-card") || !$("tc-qr-overlay").classList.contains("open") || document.body.classList.contains("cp-details")) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); qrBody().querySelector('[data-cp="' + (e.key === "ArrowRight" ? "yes" : "no") + '"]').click(); }
}, true);
function cpPass() {
  var s = cpState;
  document.body.classList.remove("cp-active");
  qrBody().innerHTML = '<div class="tour-icon tour-num" aria-hidden="true">2</div><h4 class="tour-title">' + L("Pasa el dispositivo", "Pass the device") + '</h4><p class="tc-qr-note">' + L("Ahora es el turno de ", "Now it's ") + "<strong>" + escapeHTML(cpName(1)) + "</strong>" + L(". Tus respuestas quedan ocultas.", ". Your answers stay hidden.") + '</p><div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-cp="go">' + L("Estoy listo", "I'm ready") + "</button></div>";
  qrBody().querySelector('[data-cp="go"]').onclick = function () { s.turn = 1; s.i = 0; cpSave(); cpShowCard(); };
}
function cpResults() {
  document.body.classList.remove("cp-active");
  var s = cpState, ids = s.yes[0].map(function (m) { return m.type + m.id; });
  var both = s.yes[1].filter(function (m) { return ids.indexOf(m.type + m.id) > -1; });
  if (!both.length) {
    qrBody().innerHTML = '<h4 class="tour-title">' + L("Sin coincidencias", "No matches") + '</h4><p class="tc-qr-note">' + L("No coincidieron en ningún título. ¡Prueben otra ronda!", "You didn't agree on any title. Try another round!") + '</p><div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-cp="again">' + L("Otra ronda", "Another round") + "</button></div>";
    qrBody().querySelector('[data-cp="again"]').onclick = openCouplePicker;
    return;
  }
  var best = both[0];
  qrBody().innerHTML = '<h4 class="tour-title">' + L("¡Coinciden en " + both.length + (both.length === 1 ? " título!" : " títulos!"), "You match on " + both.length + (both.length === 1 ? " title!" : " titles!")) + "</h4>" +
    '<div class="cp-card cp-win"><img alt="" src="https://image.tmdb.org/t/p/w780' + escapeHTML(best.bg) + '"><div class="cp-info"><strong data-i18n="skip">' + escapeHTML(best.title) + "</strong><span>" + L("La mejor opción para los dos", "The best pick for both of you") + "</span></div></div>" +
    '<div class="tc-profile-create-actions"><button type="button" class="hero-btn cp-res-btn" data-cp="play"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>Ver</button><button type="button" class="hero-btn secondary cp-res-btn" data-cp="detail"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Info</button></div>' +
    (both.length > 1 ? '<p class="wk-top">' + L("También coinciden: ", "Also matching: ") + both.slice(1).map(function (m) { return escapeHTML(m.title); }).join(" · ") + "</p>" : "");
  qrBody().querySelector('[data-cp="play"]').onclick = function () { closeQr(); openPlayer(best.id, best.type, best.title, null, null, best.bg || null); };
  qrBody().querySelector('[data-cp="detail"]').onclick = function () { cpOpenInfo(best); };
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
decorate("closeQr", function (original) { return function () { document.body.classList.remove("cp-active"); return original.apply(this, arguments); }; });

// Si la página se recarga con una ronda sin terminar, se ofrece retomarla.
(function offerResume() {
  var saved = cpLoad();
  if (!saved || (saved.turn === 1 && saved.i >= saved.pool.length)) return;
  var tries = 0;
  (function wait() {
    if (document.body.classList.contains("app-ready") && !document.getElementById("tc-profile-overlay").classList.contains("open")) {
      setTimeout(function () { showToastAction(L("Tienes una ronda de «Decidir en pareja» sin terminar", "You have an unfinished “Decide as a couple” round"), L("Retomar", "Resume"), function () { openCouplePicker(); qrBody().querySelector('[data-cp="resume"]').click(); }, 12000); }, 1500);
      return;
    }
    if (tries++ < 60) setTimeout(wait, 1000);
  })();
})();

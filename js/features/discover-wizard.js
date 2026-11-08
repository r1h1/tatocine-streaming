/**
 * TatoCine · js/features/discover-wizard.js
 * «¿Qué ver hoy?»: cuatro preguntas (ambiente, tiempo, compañía, qué evitar) y tres recomendaciones
 * con el motivo de cada una. Usa los filtros de `discover` de TMDB y los gustos locales del perfil.
 *
 * Responsabilidades (SRP):
 *   - WIZARD_OPTIONS ........ datos de las preguntas (sin lógica)
 *   - wizardQuery/wizardScore  reglas de negocio (consulta y puntuación)
 *   - renderWizard*, delegación: interfaz dentro de #tc-wizard-overlay
 */
var WIZARD_OPTIONS = {
  moods: [
    { k: "suspense", es: "Suspenso", en: "Suspense", movie: "53|9648", tv: "9648|80" },
    { k: "fun", es: "Diversión", en: "Fun", movie: "35", tv: "35" },
    { k: "adrenaline", es: "Adrenalina", en: "Adrenaline", movie: "28|12", tv: "10759" },
    { k: "romance", es: "Romance", en: "Romance", movie: "10749", tv: "18|10766" },
    { k: "fantasy", es: "Fantasía", en: "Fantasy", movie: "14|878", tv: "10765" },
    { k: "drama", es: "Drama", en: "Drama", movie: "18", tv: "18" }
  ],
  kidMoods: ["fun", "adrenaline", "fantasy"],      // ánimos permitidos en perfiles Niño
  times: [30, 60, 90, 120, "120+"],
  who: [
    { k: "solo", es: "Solo", en: "Alone" },
    { k: "couple", es: "Pareja", en: "As a couple" },
    { k: "family", es: "Familia", en: "Family" },
    { k: "friends", es: "Amigos", en: "Friends" }
  ],
  avoid: [
    { k: "horror", es: "Terror", en: "Horror", movie: 27, tv: null },
    { k: "romance", es: "Romance", en: "Romance", movie: 10749, tv: null },
    { k: "animation", es: "Animación", en: "Animation", movie: 16, tv: 16 },
    { k: "war", es: "Bélica", en: "War", movie: 10752, tv: 10768 },
    { k: "crime", es: "Crimen", en: "Crime", movie: 80, tv: 80 }
  ]
};
/** Iconos del asistente: los mismos trazos que el resto de la app (corazón de favoritos incluido). */
var WIZ_ICONS = (function () {
  function svg(inner, fill) { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="' + (fill || "none") + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>"; }
  var heart = '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>';
  return {
    play: svg('<path d="M8 5v14l11-7z"/>', "currentColor"),
    info: svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
    heart: svg(heart), heartFilled: svg(heart, "currentColor")
  };
})();
var wizardState = { mood: null, time: null, who: null, avoid: [] };
var wizardPool = [], wizardShown = {}, wizardRun = 0, wizardCurrent = [], wizardRelaxed = false, wizardRandom = false;

function wizardOptionLabel(o) { return L(o.es, o.en); }
function wizardFindMood() { return WIZARD_OPTIONS.moods.find(function (m) { return m.k === wizardState.mood; }) || null; }

/** Construye la consulta de `discover` ("movie" o "tv"). `relax` quita condiciones para garantizar siempre 3 resultados. */
function wizardQuery(kind, page, relax) {
  relax = relax || {};
  var mood = relax.noMood ? null : wizardFindMood(), kids = kidsContext();
  var time = relax.noTime ? null : wizardState.time;
  if (time === "120+" && kind === "tv") return null;          // «Más de 120 min» solo aplica a películas
  var q = "&sort_by=popularity.desc&include_adult=false&vote_count.gte=" + (kind === "movie" ? 200 : 100) + "&page=" + page;
  // Niños: mismas reglas que la pestaña Niños (clasificación US apta, sin terror/suspenso/crimen/bélico)
  if (kids) q += kind === "movie" ? "&certification_country=US&certification=G" : "&certification_country=US&certification=TV-Y|TV-Y7|TV-G";
  if (mood && mood[kind]) q += "&with_genres=" + encodeURIComponent(mood[kind]);
  var without = [];
  if (!relax.noAvoid) WIZARD_OPTIONS.avoid.forEach(function (a) { if (wizardState.avoid.includes(a.k) && a[kind]) without.push(a[kind]); });
  if (kids) without.push(27, 53, 80, 10752, 9648, 10768);
  else if (wizardState.who === "family" && !relax.noAvoid) { without.push(27, 80); if (kind === "movie") q += "&certification_country=US&certification.lte=PG"; }
  if (without.length) q += "&without_genres=" + encodeURIComponent(without.join(","));
  if (time === "120+") q += "&with_runtime.gte=121";
  else if (time) {
    q += "&with_runtime.lte=" + time;
    if (kind === "movie") q += "&with_runtime.gte=" + Math.max(60, time - 40);
  }
  return q;
}

/** Puntuación: calidad + popularidad + gustos del perfil + compañía; `jitter` da variedad al pedir otras tres. */
function wizardScore(item, weights, maxWeight) {
  var taste = (item.genre_ids || []).reduce(function (s, id) { return s + (weights[id] || 0); }, 0) / (maxWeight * 2);
  var boost = 0, g = item.genre_ids || [];
  if (wizardState.who === "couple" && g.includes(10749)) boost = 0.12;
  if (wizardState.who === "friends" && (g.includes(35) || g.includes(28) || g.includes(12))) boost = 0.1;
  if (wizardState.who === "family" && (g.includes(10751) || g.includes(16))) boost = 0.15;
  return 0.6 * ((item.rating || 0) / 10) + 0.25 * Math.min(1, Math.log10((item._pop || 0) + 1) / 3) + 0.3 * Math.min(1.2, taste) + boost + Math.random() * 0.06;
}

function wizardReason(item, topTaste) {
  var parts = [], mood = wizardFindMood();
  if (mood) parts.push(L("Va con tu ánimo: ", "Fits your mood: ") + wizardOptionLabel(mood));
  if (wizardState.time === "120+") parts.push(L("dura más de 120 min", "runs over 120 min"));
  else if (wizardState.time) parts.push(item.type === "movie"
    ? L("dura menos de " + wizardState.time + " min", "runs under " + wizardState.time + " min")
    : L("episodios de menos de " + wizardState.time + " min", "episodes under " + wizardState.time + " min"));
  if (item.rating >= 7.5) parts.push(L("muy bien valorada (", "highly rated (") + Number(item.rating).toFixed(1) + " ★)");
  if ((item.genre_ids || []).some(function (id) { return topTaste.includes(id); })) parts.push(L("coincide con lo que sueles ver", "matches what you usually watch"));
  if (wizardState.who === "family") parts.push(L("apta para ver en familia", "suitable for family viewing"));
  return parts.slice(0, 3).join(" · ");
}

function wizardPickThree() {
  var weights = {}, profile = getTasteProfile();
  profile.forEach(function (p) { weights[p.id] = p.score; });
  var maxWeight = (profile[0] && profile[0].score) || 1;
  var topTaste = profile.slice(0, 3).map(function (p) { return p.id; });
  var fresh = function () { return wizardPool.filter(function (m) { return !wizardShown[m.type + ":" + m.id]; }); };
  if (fresh().length < 3) wizardShown = {};                          // se agotaron: se vuelve a empezar para no quedarse con menos de 3
  var scored = fresh().map(function (m) { return { m: m, s: wizardScore(m, weights, maxWeight) }; }).sort(function (a, b) { return b.s - a.s; });
  var picks = [], counts = { movie: 0, tv: 0 }, used = {};
  scored.forEach(function (x) {                                     // primero, mezcla de películas y series
    if (picks.length >= 3 || (counts[x.m.type] >= 2 && scored.length > 5)) return;
    counts[x.m.type]++; used[x.m.type + ":" + x.m.id] = true; picks.push(x.m);
  });
  scored.forEach(function (x) {                                     // si faltan, se completa con los mejores restantes
    if (picks.length >= 3 || used[x.m.type + ":" + x.m.id]) return;
    used[x.m.type + ":" + x.m.id] = true; picks.push(x.m);
  });
  picks.forEach(function (m) { wizardShown[m.type + ":" + m.id] = true; m._reason = wizardReason(m, topTaste); });
  return picks;
}

/** Reúne candidatos; si con tus respuestas salen menos de 3 se relajan (tiempo → ánimo → lo que evitas) hasta tener 3 como mínimo. */
var WIZARD_RELAX = [{}, { noTime: true }, { noTime: true, noMood: true }, { noTime: true, noMood: true, noAvoid: true }];
function wizardCollect(relax, run) {
  var jobs = [];
  [1, 2, 3].forEach(function (page) {
    ["movie", "tv"].forEach(function (kind) {
      var q = wizardQuery(kind, page, relax);
      if (q) jobs.push(fetchTMDB("/discover/" + kind, q).then(function (d) { return { kind: kind, data: d }; }).catch(function () { return null; }));
    });
  });
  return Promise.all(jobs).then(function (r) {
    var avoidIds = {}, pool = [], seen = {}, ok = r.some(Boolean);
    (typeof watchedList === "function" ? watchedList() : []).forEach(function (x) { avoidIds[x.type + ":" + x.id] = true; });
    completedTitles().forEach(function (x) { avoidIds[x.type + ":" + x.id] = true; });
    r.forEach(function (res) {
      if (!res) return;
      ((res.data && res.data.results) || []).forEach(function (raw) {
        var m = res.kind === "tv" ? mapTvResult(raw) : mapMovieResult(raw), key = m.type + ":" + m.id;
        m._pop = raw.popularity;
        if (m.isUpcoming || !m.bg || avoidIds[key] || seen[key]) return;
        if (wizardState.who === "family" && res.kind === "tv" && !(m.genre_ids.includes(10751) || m.genre_ids.includes(16) || m.genre_ids.includes(10762))) return;
        seen[key] = true;
        pool.push(m);
      });
    });
    // En Niños cada candidato se verifica con su clasificación real antes de mostrarse (falla cerrado).
    return (kidsContext() ? kidsFilterSearch(pool, 48) : Promise.resolve(pool)).then(function (safe) { return { pool: safe, ok: ok }; });
  });
}
function runWizard() {
  var run = ++wizardRun;
  var body = $("tc-wizard-body");
  body.innerHTML = '<p class="wiz-loading" role="status">' + L("Buscando lo mejor para ti…", "Finding the best picks for you…") + "</p>" + skeletonResults(3);
  var level = 0, anyOk = false;
  (function attempt() {
    wizardCollect(WIZARD_RELAX[level], run).then(function (res) {
      if (run !== wizardRun) return;
      anyOk = anyOk || res.ok;
      if (res.pool.length < 3 && level < WIZARD_RELAX.length - 1) { level++; attempt(); return; }
      wizardPool = res.pool;
      wizardShown = {};
      wizardRelaxed = level > 0;
      renderWizardResults(anyOk);
    });
  })();
}

/** «Random»: UNA recomendación al azar, parecida a tus gustos y a lo que viste hace poco, de estrenos recientes y sin repetir lo que ya viste. */
function wizardRandomPick() {
  var weights = {}, profile = getTasteProfile();
  profile.forEach(function (p) { weights[p.id] = p.score; });
  var maxWeight = (profile[0] && profile[0].score) || 1;
  var ranked = wizardPool.filter(function (m) { return !wizardShown[m.type + ":" + m.id]; });
  if (!ranked.length) { wizardShown = {}; ranked = wizardPool.slice(); }
  ranked = ranked.map(function (m) { return { m: m, s: wizardScore(m, weights, maxWeight) + Math.random() * 0.9 }; }).sort(function (a, b) { return b.s - a.s; });
  var pick = ranked.length ? ranked[0].m : null;
  if (pick) { wizardShown[pick.type + ":" + pick.id] = true; pick._reason = L("Parecida a lo que te gusta y aún no la has visto.", "Similar to what you like, and you haven't seen it yet."); }
  return pick;
}
function runWizardRandom() {
  var run = ++wizardRun, kids = kidsContext();
  wizardRandom = true;
  $("tc-wizard-body").innerHTML = '<p class="wiz-loading" role="status">' + L("Tirando el dado…", "Rolling the dice…") + "</p>" + skeletonResults(1);
  var since = new Date(Date.now() - 3 * 365 * 86400000).toISOString().slice(0, 10), page = 1 + Math.floor(Math.random() * 2);
  var top = getTasteProfile().slice(0, 4).map(function (p) { return p.id; }), gq = !kids && top.length ? "&with_genres=" + top.join("|") : "";
  var jobs;
  if (kids) {
    var base = "&without_genres=27,53,80,10752&sort_by=popularity.desc&include_adult=false&page=" + page;
    jobs = [fetchTMDB("/discover/movie", "&certification_country=US&certification=G" + base), fetchTMDB("/discover/tv", "&certification_country=US&certification=TV-Y|TV-Y7|TV-G" + base)];
  } else {
    jobs = [fetchTMDB("/discover/movie", gq + "&primary_release_date.gte=" + since + "&sort_by=popularity.desc&vote_count.gte=150&include_adult=false&page=" + page),
      fetchTMDB("/discover/tv", (top.length ? "&with_genres=" + top.join("|") : "") + "&first_air_date.gte=" + since + "&sort_by=popularity.desc&vote_count.gte=80&include_adult=false&page=" + page)];
    var seeds = engagedTitles().slice().sort(function (a, b) { return (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0); }).slice(0, 3);
    seeds.forEach(function (sd) { jobs.push(fetchTMDB("/" + (sd.type === "tv" ? "tv" : "movie") + "/" + sd.id + "/recommendations")); });
  }
  Promise.all(jobs.map(function (j) { return j.catch(function () { return null; }); })).then(function (r) {
    if (run !== wizardRun) return;
    var avoid = {};
    (localAnalytics.items || []).forEach(function (x) { avoid[x.type + ":" + x.id] = true; });
    myList.forEach(function (x) { avoid[x.type + ":" + x.id] = true; });
    (typeof watchedList === "function" ? watchedList() : []).forEach(function (x) { avoid[x.type + ":" + x.id] = true; });
    var pool = [], seen = {};
    r.forEach(function (res, idx) {
      ((res && res.results) || []).forEach(function (raw) {
        var type = idx === 1 && !kids ? "tv" : (kids && idx === 1) ? "tv" : (idx >= 2 ? (raw.media_type || (raw.first_air_date ? "tv" : "movie")) : "movie");
        var m = type === "tv" ? mapTvResult(raw) : mapMovieResult(raw), k = m.type + ":" + m.id;
        if (!m.bg || m.isUpcoming || raw.adult || seen[k] || avoid[k]) return;
        seen[k] = 1; m.genre_ids = raw.genre_ids || []; pool.push(m);
      });
    });
    wizardPool = pool; wizardShown = {}; wizardRelaxed = false;
    var pick = pool.length ? wizardRandomPick() : null;
    wizardCurrent = pick ? [pick] : [];
    renderWizardResults(r.some(Boolean) && !!pick, true);
  });
}

function renderWizardResults(requestOk, reuse) {
  // `reuse`: volver a pintar las mismas tres (p. ej. tras guardar un favorito) sin elegir otras.
  var picks = reuse ? wizardCurrent : wizardRandom ? [wizardRandomPick()].filter(Boolean) : (requestOk === false ? [] : wizardPickThree());
  wizardCurrent = picks;
  var body = $("tc-wizard-body");
  if (!picks.length) {
    body.innerHTML = '<p class="wiz-empty">' + (requestOk === false
      ? L("No se pudo conectar con el catálogo. Revisa tu conexión e inténtalo de nuevo.", "Could not reach the catalog. Check your connection and try again.")
      : L("No encontramos nada con esas condiciones. Prueba con menos filtros.", "We found nothing with those conditions. Try fewer filters.")) +
      '</p><div class="wiz-actions"><button type="button" class="tc-profile-create-btn" data-wiz="back">' + L("Cambiar respuestas", "Change answers") + "</button></div>";
    return;
  }
  body.innerHTML = (wizardRelaxed ? '<p class="wiz-note">' + L("Con tus respuestas había pocas opciones: ampliamos un poco la búsqueda para mostrarte 3.", "There were few matches for your answers, so we widened the search to show you 3.") + "</p>" : "") + '<div class="wiz-results">' + picks.map(function (m, i) {
    var saved = isSaved(m);
    return '<article class="wiz-result" data-i="' + i + '"><img loading="lazy" decoding="async" alt="" src="' + escapeHTML(IMG_CARD + m.bg) + '" data-fb="card">' +
      '<div class="wiz-info"><h4 class="wiz-title" data-i18n="skip">' + escapeHTML(m.title) + '</h4>' +
      '<div class="wiz-meta">' + (m.type === "tv" ? L("Serie", "Series") : L("Película", "Movie")) + (m.year ? " · " + m.year : "") + (m.rating ? " · ★ " + Number(m.rating).toFixed(1) : "") + "</div>" +
      '<p class="wiz-reason">' + escapeHTML(m._reason) + '</p>' +
      '<div class="wiz-btns"><button type="button" class="wiz-btn primary" data-wiz="play" data-i="' + i + '">' + WIZ_ICONS.play + L("Ver", "Watch") + '</button>' +
      '<button type="button" class="wiz-btn" data-wiz="info" data-i="' + i + '">' + WIZ_ICONS.info + 'Info</button>' +
      '<button type="button" class="wiz-btn icon-only' + (saved ? " active" : "") + '" data-wiz="fav" data-i="' + i + '" aria-pressed="' + saved + '" aria-label="' + (saved ? L("Quitar de favoritos", "Remove from favorites") : L("Agregar a favoritos", "Add to favorites")) + '" title="' + (saved ? L("Quitar de favoritos", "Remove from favorites") : L("Agregar a favoritos", "Add to favorites")) + '">' + (saved ? WIZ_ICONS.heartFilled : WIZ_ICONS.heart) + "</button></div></div></article>";
  }).join("") + '</div><div class="wiz-actions"><button type="button" class="tc-profile-cancel-btn" data-wiz="back">' + L("Cambiar respuestas", "Change answers") + '</button>' +
    '<button type="button" class="tc-profile-create-btn" data-wiz="more">' + L("Ver otras 3", "Show 3 more") + "</button></div>";
  body.__picks = picks;
}

var DICE_ICO = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" ry="3"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/></svg>';
function renderWizardForm() {
  var kids = kidsContext();
  var moods = kids ? WIZARD_OPTIONS.moods.filter(function (m) { return WIZARD_OPTIONS.kidMoods.includes(m.k); }) : WIZARD_OPTIONS.moods;
  function chips(group, items, labelFn, valueFn, multi) {
    return '<div class="wiz-chips' + (items.length === 4 ? " wiz-4" : "") + '" role="group">' + items.map(function (o) {
      var value = valueFn(o), on = multi ? wizardState.avoid.includes(value) : wizardState[group] === value;
      return '<button type="button" class="wiz-chip' + (on ? " active" : "") + '" data-wiz="chip" data-group="' + group + '" data-value="' + value + '" aria-pressed="' + on + '">' + labelFn(o) + "</button>";
    }).join("") + "</div>";
  }
  $("tc-wizard-body").innerHTML =
    '<p class="wiz-q">' + L("¿Qué ambiente tienes?", "What mood are you in?") + "</p>" + chips("mood", moods, wizardOptionLabel, function (o) { return o.k; }) +
    '<p class="wiz-q">' + L("¿Cuánto tiempo tienes?", "How much time do you have?") + "</p>" + chips("time", WIZARD_OPTIONS.times, function (t) { return t === "120+" ? L("Más de 120 min", "Over 120 min") : t + " min"; }, function (t) { return t; }) +
    '<p class="wiz-q">' + L("¿Con quién vas a ver?", "Who are you watching with?") + "</p>" + chips("who", WIZARD_OPTIONS.who, wizardOptionLabel, function (o) { return o.k; }) +
    (kids ? "" : '<p class="wiz-q">' + L("¿Qué prefieres evitar?", "What would you rather avoid?") + "</p>" + chips("avoid", WIZARD_OPTIONS.avoid, wizardOptionLabel, function (o) { return o.k; }, true)) +
    '<div class="wiz-actions"><button type="button" class="tc-profile-create-btn" data-wiz="go"' + (wizardState.mood ? "" : " disabled") + ">" + L("Mostrar recomendaciones", "Show recommendations") + '</button><button type="button" class="tc-profile-cancel-btn wiz-pair" data-act="wizard-random">' + DICE_ICO + '<span>Random</span></button><button type="button" class="tc-profile-cancel-btn wiz-pair" data-act="wizard-couple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>' + L("Decidir en pareja", "Decide as a couple") + "</span></button></div>";
}

function openWizard() {
  wizardRandom = false;
  wizardState = { mood: null, time: null, who: null, avoid: [] };
  renderWizardForm();
  openOverlay("tc-wizard-overlay");
}
function closeWizard() { wizardRun++; closeOverlay("tc-wizard-overlay"); }

(function bindWizard() {
  var overlay = $("tc-wizard-overlay");
  if (!overlay) return;
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) { closeWizard(); return; }
    var el = e.target.closest("[data-wiz]");
    if (!el) return;
    var act = el.getAttribute("data-wiz"), picks = $("tc-wizard-body").__picks || [];
    var m = picks[Number(el.getAttribute("data-i"))];
    if (act === "close") closeWizard();
    else if (act === "chip") {
      var g = el.getAttribute("data-group"), v = el.getAttribute("data-value");
      if (g === "avoid") { var i = wizardState.avoid.indexOf(v); if (i > -1) wizardState.avoid.splice(i, 1); else wizardState.avoid.push(v); }
      else { var val = g === "time" && v !== "120+" ? Number(v) : v; wizardState[g] = val === wizardState[g] ? null : val; }
      renderWizardForm();
      var again = overlay.querySelector('[data-group="' + g + '"][data-value="' + v + '"]'); if (again) again.focus();
    }
    else if (act === "go") runWizard();
    else if (act === "back") { wizardRandom = false; renderWizardForm(); }
    else if (act === "more") { if (!wizardPool.some(function (x) { return !wizardShown[x.type + ":" + x.id]; })) wizardShown = {}; renderWizardResults(true); }
    else if (act === "play" && m) { closeWizard(); openPlayer(m.id, m.type, m.title, null, null, m.bg); }
    else if (act === "info" && m) { closeWizard(); openDetails(m.id, m.type); }
    else if (act === "fav" && m) {
      toggleFavoriteMedia({ id: m.id, type: m.type, title: m.title, bg: m.bg, rating: m.rating, year: m.year }, function () { renderWizardResults(true, true); });
    }
  });
  if (typeof i18nAdd === "function") i18nAdd({ "¿Qué ver hoy?": "What to watch today?", "Vistas": "Watched" });
})();

registerAction("wizard-random", runWizardRandom);

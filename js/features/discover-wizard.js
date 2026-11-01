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
  times: [30, 60, 90, 120],
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
var wizardPool = [], wizardShown = {}, wizardRun = 0, wizardCurrent = [];

function wizardOptionLabel(o) { return L(o.es, o.en); }
function wizardFindMood() { return WIZARD_OPTIONS.moods.find(function (m) { return m.k === wizardState.mood; }) || null; }

/** Construye la consulta de `discover` para películas ("movie") o series ("tv"). */
function wizardQuery(kind, page) {
  var mood = wizardFindMood(), kids = kidsContext();
  var q = "&sort_by=popularity.desc&include_adult=false&vote_count.gte=" + (kind === "movie" ? 200 : 100) + "&page=" + page;
  // Niños: mismas reglas que la pestaña Niños (clasificación US apta, sin terror/suspenso/crimen/bélico)
  if (kids) q += kind === "movie" ? "&certification_country=US&certification=G" : "&certification_country=US&certification=TV-Y|TV-Y7|TV-G";
  if (mood && mood[kind]) q += "&with_genres=" + encodeURIComponent(mood[kind]);
  var without = [];
  WIZARD_OPTIONS.avoid.forEach(function (a) { if (wizardState.avoid.indexOf(a.k) > -1 && a[kind]) without.push(a[kind]); });
  if (kids) without.push(27, 53, 80, 10752, 9648, 10768);
  else if (wizardState.who === "family") { without.push(27, 80); if (kind === "movie") q += "&certification_country=US&certification.lte=PG"; }
  if (without.length) q += "&without_genres=" + encodeURIComponent(without.join(","));
  if (wizardState.time) {
    q += "&with_runtime.lte=" + wizardState.time;
    if (kind === "movie") q += "&with_runtime.gte=" + Math.max(60, wizardState.time - 40);
  }
  return q;
}

/** Puntuación: calidad + popularidad + gustos del perfil + compañía; `jitter` da variedad al pedir otras tres. */
function wizardScore(item, weights, maxWeight) {
  var taste = (item.genre_ids || []).reduce(function (s, id) { return s + (weights[id] || 0); }, 0) / (maxWeight * 2);
  var boost = 0, g = item.genre_ids || [];
  if (wizardState.who === "couple" && g.indexOf(10749) > -1) boost = 0.12;
  if (wizardState.who === "friends" && (g.indexOf(35) > -1 || g.indexOf(28) > -1 || g.indexOf(12) > -1)) boost = 0.1;
  if (wizardState.who === "family" && (g.indexOf(10751) > -1 || g.indexOf(16) > -1)) boost = 0.15;
  return 0.6 * ((item.rating || 0) / 10) + 0.25 * Math.min(1, Math.log10((item._pop || 0) + 1) / 3) + 0.3 * Math.min(1.2, taste) + boost + Math.random() * 0.06;
}

function wizardReason(item, topTaste) {
  var parts = [], mood = wizardFindMood();
  if (mood) parts.push(L("Va con tu ánimo: ", "Fits your mood: ") + wizardOptionLabel(mood));
  if (wizardState.time) parts.push(item.type === "movie"
    ? L("dura menos de " + wizardState.time + " min", "runs under " + wizardState.time + " min")
    : L("episodios de menos de " + wizardState.time + " min", "episodes under " + wizardState.time + " min"));
  if (item.rating >= 7.5) parts.push(L("muy bien valorada (", "highly rated (") + Number(item.rating).toFixed(1) + " ★)");
  if ((item.genre_ids || []).some(function (id) { return topTaste.indexOf(id) > -1; })) parts.push(L("coincide con lo que sueles ver", "matches what you usually watch"));
  if (wizardState.who === "family") parts.push(L("apta para ver en familia", "suitable for family viewing"));
  return parts.slice(0, 3).join(" · ");
}

function wizardPickThree() {
  var weights = {}, profile = getTasteProfile();
  profile.forEach(function (p) { weights[p.id] = p.score; });
  var maxWeight = (profile[0] && profile[0].score) || 1;
  var topTaste = profile.slice(0, 3).map(function (p) { return p.id; });
  var scored = wizardPool.filter(function (m) { return !wizardShown[m.type + ":" + m.id]; })
    .map(function (m) { return { m: m, s: wizardScore(m, weights, maxWeight) }; })
    .sort(function (a, b) { return b.s - a.s; });
  var picks = [], counts = { movie: 0, tv: 0 };
  scored.forEach(function (x) {
    if (picks.length >= 3) return;
    if (counts[x.m.type] >= 2 && scored.length > 5) return;     // mezcla de películas y series
    counts[x.m.type]++;
    picks.push(x.m);
  });
  picks.forEach(function (m) { wizardShown[m.type + ":" + m.id] = true; m._reason = wizardReason(m, topTaste); });
  return picks;
}

function runWizard() {
  var run = ++wizardRun;
  var body = $("tc-wizard-body");
  body.innerHTML = '<p class="wiz-loading" role="status">' + L("Buscando lo mejor para ti…", "Finding the best picks for you…") + "</p>" + skeletonResults(3);
  var requests = [
    fetchTMDB("/discover/movie", wizardQuery("movie", 1)), fetchTMDB("/discover/movie", wizardQuery("movie", 2)),
    fetchTMDB("/discover/tv", wizardQuery("tv", 1)), fetchTMDB("/discover/tv", wizardQuery("tv", 2))
  ].map(function (p) { return p.catch(function () { return null; }); });
  Promise.all(requests).then(function (r) {
    if (run !== wizardRun) return;
    var ok = r.some(Boolean);
    var avoidIds = {};
    (typeof watchedList === "function" ? watchedList() : []).forEach(function (x) { avoidIds[x.type + ":" + x.id] = true; });
    completedTitles().forEach(function (x) { avoidIds[x.type + ":" + x.id] = true; });
    var pool = [];
    [[r[0], "movie"], [r[1], "movie"], [r[2], "tv"], [r[3], "tv"]].forEach(function (pair) {
      ((pair[0] && pair[0].results) || []).forEach(function (raw) {
        var m = pair[1] === "tv" ? mapTvResult(raw) : mapMovieResult(raw);
        m._pop = raw.popularity;
        if (m.isUpcoming || !m.bg || avoidIds[m.type + ":" + m.id]) return;
        if (wizardState.who === "family" && pair[1] === "tv" && !(m.genre_ids.indexOf(10751) > -1 || m.genre_ids.indexOf(16) > -1 || m.genre_ids.indexOf(10762) > -1)) return;
        pool.push(m);
      });
    });
    // En Niños cada candidato se verifica con su clasificación real antes de mostrarse (falla cerrado).
    var ready = kidsContext() ? kidsFilterSearch(pool.slice(0, 24)) : Promise.resolve(pool);
    ready.then(function (safe) {
      if (run !== wizardRun) return;
      wizardPool = safe;
      wizardShown = {};
      renderWizardResults(ok);
    });
  });
}

function renderWizardResults(requestOk, reuse) {
  // `reuse`: volver a pintar las mismas tres (p. ej. tras guardar un favorito) sin elegir otras.
  var picks = reuse ? wizardCurrent : (requestOk === false ? [] : wizardPickThree());
  wizardCurrent = picks;
  var body = $("tc-wizard-body");
  if (!picks.length) {
    body.innerHTML = '<p class="wiz-empty">' + (requestOk === false
      ? L("No se pudo conectar con el catálogo. Revisa tu conexión e inténtalo de nuevo.", "Could not reach the catalog. Check your connection and try again.")
      : L("No encontramos nada con esas condiciones. Prueba con menos filtros.", "We found nothing with those conditions. Try fewer filters.")) +
      '</p><div class="wiz-actions"><button type="button" class="tc-profile-create-btn" data-wiz="back">' + L("Cambiar respuestas", "Change answers") + "</button></div>";
    return;
  }
  body.innerHTML = '<div class="wiz-results">' + picks.map(function (m, i) {
    var saved = isSaved(m);
    return '<article class="wiz-result" data-i="' + i + '"><img loading="lazy" decoding="async" alt="" src="' + escapeHTML(IMG_CARD + m.bg) + '" onerror="this.onerror=null;this.src=FALLBACK_IMG">' +
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

function renderWizardForm() {
  var kids = kidsContext();
  var moods = kids ? WIZARD_OPTIONS.moods.filter(function (m) { return WIZARD_OPTIONS.kidMoods.indexOf(m.k) > -1; }) : WIZARD_OPTIONS.moods;
  function chips(group, items, labelFn, valueFn, multi) {
    return '<div class="wiz-chips" role="group">' + items.map(function (o) {
      var value = valueFn(o), on = multi ? wizardState.avoid.indexOf(value) > -1 : wizardState[group] === value;
      return '<button type="button" class="wiz-chip' + (on ? " active" : "") + '" data-wiz="chip" data-group="' + group + '" data-value="' + value + '" aria-pressed="' + on + '">' + labelFn(o) + "</button>";
    }).join("") + "</div>";
  }
  $("tc-wizard-body").innerHTML =
    '<p class="wiz-q">' + L("¿Qué ambiente tienes?", "What mood are you in?") + "</p>" + chips("mood", moods, wizardOptionLabel, function (o) { return o.k; }) +
    '<p class="wiz-q">' + L("¿Cuánto tiempo tienes?", "How much time do you have?") + "</p>" + chips("time", WIZARD_OPTIONS.times, function (t) { return t + " min"; }, function (t) { return t; }) +
    '<p class="wiz-q">' + L("¿Con quién vas a ver?", "Who are you watching with?") + "</p>" + chips("who", WIZARD_OPTIONS.who, wizardOptionLabel, function (o) { return o.k; }) +
    (kids ? "" : '<p class="wiz-q">' + L("¿Qué prefieres evitar?", "What would you rather avoid?") + "</p>" + chips("avoid", WIZARD_OPTIONS.avoid, wizardOptionLabel, function (o) { return o.k; }, true)) +
    '<div class="wiz-actions"><button type="button" class="tc-profile-create-btn" data-wiz="go"' + (wizardState.mood ? "" : " disabled") + ">" + L("Mostrar 3 recomendaciones", "Show 3 recommendations") + "</button></div>";
}

function openWizard() {
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
      else wizardState[g] = (g === "time" ? Number(v) : v) === wizardState[g] ? null : (g === "time" ? Number(v) : v);
      renderWizardForm();
      var again = overlay.querySelector('[data-group="' + g + '"][data-value="' + v + '"]'); if (again) again.focus();
    }
    else if (act === "go") runWizard();
    else if (act === "back") renderWizardForm();
    else if (act === "more") { if (!wizardPool.some(function (x) { return !wizardShown[x.type + ":" + x.id]; })) wizardShown = {}; renderWizardResults(true); }
    else if (act === "play" && m) { closeWizard(); openPlayer(m.id, m.type, m.title, null, null, m.bg); }
    else if (act === "info" && m) { closeWizard(); openDetails(m.id, m.type); }
    else if (act === "fav" && m) {
      toggleFavoriteMedia({ id: m.id, type: m.type, title: m.title, bg: m.bg, rating: m.rating, year: m.year }, function () { renderWizardResults(true, true); });
    }
  });
  if (typeof i18nAdd === "function") i18nAdd({ "¿Qué ver hoy?": "What to watch today?", "Vistas": "Watched" });
})();

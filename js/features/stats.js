/**
 * TatoCine · js/features/stats.js
 * Estadísticas de visualización y ranking de perfiles.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Estadísticas de visualización ----
    function fmtDur(sec) {
      sec = Math.round(sec || 0);
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
      return h > 0 ? h + " h " + (m < 10 ? "0" : "") + m + " min" : m + " min";
    }
    function profileItems(pid) {
      if (pid === activeProfileId) return localAnalytics.items || [];
      var d = readLocalJSON("tatoProfile_" + pid + "_" + LOCAL_ANALYTICS_KEY, { items: [] });
      return d && Array.isArray(d.items) ? d.items : [];
    }
    function sumSecs(items) { return items.reduce(function (s, x) { return s + (x.secs || 0); }, 0); }
    function openStats() {
      if (isKidProfile()) return;
      var items = (localAnalytics.items || []).slice();
      var totalSecs = sumSecs(items);
      var finished = completedTitles().length;
      var byCat = { movie: 0, tv: 0, anime: 0, doc: 0 }, byCatCount = { movie: 0, tv: 0, anime: 0, doc: 0 };
      items.forEach(function (x) {
        var c = x.cat || categoryOf(x);
        byCat[c] += x.secs || 0;
        byCatCount[c] += 1;
      });
      var useTime = totalSecs > 0;
      var catTotal = Object.keys(byCat).reduce(function (s, k) { return s + (useTime ? byCat[k] : byCatCount[k]); }, 0) || 1;
      var catKeys = Object.keys(byCat).sort(function (a, b) { return (useTime ? byCat[b] - byCat[a] : byCatCount[b] - byCatCount[a]); });
      var topCat = catKeys[0];
      var hasData = items.length > 0;
      var top = items.slice().sort(function (a, b) { return (b.secs || 0) - (a.secs || 0) || (b.done || 0) - (a.done || 0) || (b.plays || 0) - (a.plays || 0); }).slice(0, 3);
      var genres = getTasteProfile().slice(0, 3);
      var html = '<div class="stats-wrap">';
      html += '<div class="stats-grid">' +
        '<div class="stat-tile"><span class="stat-value">' + fmtDur(totalSecs) + '</span><span class="stat-label">Tiempo de visualización</span></div>' +
        '<div class="stat-tile"><span class="stat-value">' + items.length + '</span><span class="stat-label">Títulos reproducidos</span></div>' +
        '<div class="stat-tile"><span class="stat-value">' + finished + '</span><span class="stat-label">Títulos finalizados</span></div>' +
        '<div class="stat-tile"><span class="stat-value">' + (hasData ? CAT_LABELS[topCat] : "—") + '</span><span class="stat-label">Lo que más ves</span></div>' +
        '<div class="stat-tile"><span class="stat-value">' + currentStreak() + '</span><span class="stat-label">' + L("Racha actual (días)", "Current streak (days)") + '</span></div>' +
        '<div class="stat-tile"><span class="stat-value">' + Math.max(streakData.best || 0, currentStreak()) + '</span><span class="stat-label">' + L("Mejor racha (días)", "Best streak (days)") + '</span></div></div>';
      if (!hasData) html += '<p class="stats-hint">Aún no hay datos. Reproduce títulos y aquí verás tu tiempo, tu ranking y tus preferencias.</p>';
      html += '<div class="stats-cards"><section class="stats-card stats-cat"><h3 class="stats-title">Qué ves más</h3><div class="stat-bars">';
      catKeys.forEach(function (k) {
        var v = useTime ? byCat[k] : byCatCount[k];
        var pct = Math.round(v / catTotal * 100);
        html += '<div class="stat-bar"><div class="stat-bar-head"><span>' + CAT_LABELS[k] + '</span><span>' + pct + '% · ' + (useTime ? fmtDur(byCat[k]) : byCatCount[k] + " títulos") + '</span></div><div class="stat-bar-track"><span style="width:' + pct + '%"></span></div></div>';
      });
      html += "</div></section>";
      html += '<section class="stats-card stats-top3"><h3 class="stats-title">Tu Top 3</h3>';
      if (top.length) {
        html += '<div class="stat-top">';
        top.forEach(function (x, i) {
          var img = x.bg ? IMG_W185 + x.bg : FALLBACK_IMG;
          html += '<div class="stat-top-item"><span class="stat-rank">' + (i + 1) + '</span><img loading="lazy" decoding="async" alt="" src="' + escapeHTML(img) + '" data-lc="loaded" data-fb="stat"><div><div class="stat-top-title">' + escapeHTML(x.title || "Contenido") + '</div><div class="stat-top-sub">' + (x.secs ? fmtDur(x.secs) + " · " : "") + (x.plays || 1) + ((x.plays || 1) === 1 ? " reproducción" : " reproducciones") + "</div></div></div>";
        });
        html += "</div>";
      } else html += '<p class="stats-hint">Todavía no hay títulos en tu ranking.</p>';
      html += "</section>";
      if (genres.length) {
        html += '<section class="stats-card stats-genres"><h3 class="stats-title">Géneros favoritos</h3><div class="stat-chips">' + genres.map(function (g, i) { return '<span class="stat-chip">' + (i + 1) + ". " + escapeHTML(g.name) + "</span>"; }).join("") + "</div></section>";
      }
      if (localProfiles.length > 1) {
        var ranking = localProfiles.map(function (p) {
          var its = profileItems(p.id);
          return { name: profileDisplayName(p), id: p.id, secs: sumSecs(its), titles: its.length };
        }).sort(function (a, b) { return b.secs - a.secs || b.titles - a.titles; });
        var maxSecs = ranking[0].secs || 1;
        html += '<section class="stats-card stats-rank"><h3 class="stats-title">Ranking de perfiles</h3>';
        if (ranking[0].secs > 0 || ranking[0].titles > 0) html += '<p class="stats-hint stats-winner">Quien más ha visto: <strong>' + escapeHTML(ranking[0].name) + "</strong> · " + fmtDur(ranking[0].secs) + "</p>";
        html += '<div class="stat-bars">';
        ranking.forEach(function (r, i) {
          html += '<div class="stat-bar"><div class="stat-bar-head"><span>' + (i + 1) + ". " + escapeHTML(r.name) + (r.id === activeProfileId ? " (tú)" : "") + '</span><span>' + fmtDur(r.secs) + " · " + r.titles + ' títulos</span></div><div class="stat-bar-track"><span style="width:' + Math.round(r.secs / maxSecs * 100) + '%"></span></div></div>';
        });
        html += "</div></section>";
      }
      html += '</div><p class="stats-note">Todo se calcula en este dispositivo; no se envía a ningún servidor.</p></div>';
      $("stats-body").innerHTML = html;
      $("stats-modal").classList.add("open");
    }
    function closeStats() { $("stats-modal").classList.remove("open"); }

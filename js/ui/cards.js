/**
 * TatoCine · js/ui/cards.js
 * Tarjetas, filas (carruseles) y cuadrículas.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function getCardHTML(i) {
      var s = isSaved(i);
      var st = String(i.title || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      var sb = (i.bg || "").replace(/'/g, "\\'");
      var b = i.bg ? (i.bg.startsWith("http") ? i.bg : IMG_CARD + i.bg) : "";
      var upcomingClass = (i.isUpcoming ? "upcoming" : "") + (i.topRank ? " top-ranked" + (Number(i.topRank) >= 10 ? " rank-wide" : "") : "");
      var upcomingBadge = i.isUpcoming
        ? '<div class="badge-upcoming">PRÓXIMAMENTE</div>'
        : "";
      var topRankBadge = i.topRank
        ? '<div class="top10-rank-badge" aria-label="Puesto ' + Number(i.topRank) + '">' + Number(i.topRank) + '</div>'
        : "";
      var ratingBadge =
        !i.isUpcoming && i.rating
          ? '<div class="rating-badge">' +
          icons.star +
          Number(i.rating).toFixed(1) +
          "</div>"
          : "";
      var statusBadge =
        !i.isUpcoming && i.status
          ? '<div class="status-badge ' +
          (isEndedStatus(i.status) ? "ended" : "") +
          (i.rating ? " has-rating" : "") +
          '">' +
          getStatusText(i.status).toUpperCase() +
          "</div>"
          : "";
      return (
        '<div class="card ' +
        upcomingClass +
        '" tabindex="0" role="group" aria-label="' + escapeHTML(i.title) + '" onclick="openDetails(' +
        i.id +
        ",'" +
        i.type +
        '\')" onmouseenter="prefetchDetails(' +
        i.id +
        ",'" +
        i.type +
        '\')"><img alt="' + escapeHTML(i.title) + '" src="' +
        (b || FALLBACK_IMG) +
        '" loading="lazy" decoding="async" onload="this.classList.add(\'loaded\')" onerror="this.onerror=null;this.src=\'' +
        FALLBACK_IMG +
        "'\"/>" +
        ratingBadge +
        statusBadge +
        upcomingBadge +
        topRankBadge +
        '<button class="share-card-btn" onclick="shareCard(event,{id:' +
        i.id +
        ",type:'" +
        i.type +
        "',title:'" +
        st +
        '\'})" title="Compartir" aria-label="Compartir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button><button class="save-btn ' +
        (s ? "saved" : "") +
        '" title="Favoritos" aria-label="Favoritos" onclick="toggleSave(event,{id:' +
        i.id +
        ",type:'" +
        i.type +
        "',title:'" +
        st +
        "',bg:'" +
        sb +
        "',rating:" +
        (i.rating || 0) +
        ",year:'" +
        (i.year || "") +
        '\'})"><svg width="14" height="14" viewBox="0 0 24 24" fill="' +
        (s ? "currentColor" : "none") +
        '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button><div class="card-overlay"><div class="card-title">' +
        escapeHTML(i.title) +
        "</div></div></div>"
      );
    }
    function renderRow(t, m) {
      if (!m || m.length === 0) return;
      var d = document.createElement("div");
      d.className = "row catalog-row";
      var h = m.map(getCardHTML).join("");
      d.innerHTML =
        '<div class="row-header"><h2 class="row-title">' +
        escapeHTML(t) +
        '</h2></div><button class="row-nav prev" onclick="scrollRow(this,-1)" aria-label="Anterior">‹</button><button class="row-nav next" onclick="scrollRow(this,1)" aria-label="Siguiente">›</button><div class="row-scroll">' +
        h +
        "</div>";
      $rowsContainer.appendChild(d);
    }
    function scrollRow(b, d) {
      var r = b.closest(".row"),
        s = r.querySelector(".row-scroll"),
        a = s.clientWidth * 0.85;
      s.scrollBy({ left: a * d, behavior: "smooth" });
    }
    function scrollCast(b, d) {
      var w = b.closest(".cast-wrapper"),
        s = w.querySelector(".details-cast"),
        a = s.clientWidth * 0.85;
      s.scrollBy({ left: a * d, behavior: "smooth" });
    }
    function scrollSimilar(b, d) {
      var w = b.closest(".cast-wrapper"),
        s = w.querySelector(".details-cast"),
        a = s.clientWidth * 0.85;
      s.scrollBy({ left: a * d, behavior: "smooth" });
    }

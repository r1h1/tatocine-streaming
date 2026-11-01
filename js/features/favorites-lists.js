/**
 * TatoCine · js/features/favorites-lists.js
 * Favoritos con listas: selector, vista de favoritos y administración de listas.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Favoritos con listas ----
    var favLists = readLocalJSON(profileStorageKey("tatoFavLists"), []);
    if (!Array.isArray(favLists)) favLists = [];
    favLists = favLists.filter(function (l) { return l && l.id && l.name; });
    var favFilter = "all", favPickerMedia = null, favPickerAfter = null, editingListId = null;
    function saveFavLists() { return safeStorageSet(profileStorageKey("tatoFavLists"), JSON.stringify(favLists)); }
    function saveMyList() { return safeStorageSet(profileStorageKey("tatoList"), JSON.stringify(myList)); }
    function favListById(id) { return favLists.find(function (l) { return l.id === id; }) || null; }
    function favCount(listId) { return myList.filter(function (m) { return (m.list || null) === (listId || null); }).length; }
    function openOverlay(id) { var o = $(id); o.classList.add("open"); o.setAttribute("aria-hidden", "false"); }
    function closeOverlay(id) { var o = $(id); o.classList.remove("open"); o.setAttribute("aria-hidden", "true"); }
    function renderFavOptions() {
      var html = '<button type="button" class="tc-fav-option" data-list="">General <span>' + favCount(null) + '</span></button>';
      favLists.forEach(function (l) {
        html += '<button type="button" class="tc-fav-option" data-list="' + escapeHTML(l.id) + '" data-i18n="skip">' + escapeHTML(l.name) + ' <span>' + favCount(l.id) + '</span></button>';
      });
      if (favLists.length < 12) html += '<button type="button" class="tc-fav-option tc-fav-option-new" data-new="1">+ Nueva lista</button>';
      $("tc-fav-options").innerHTML = html;
      $("tc-fav-new").hidden = true;
    }
    function openFavPicker(item, after) {
      favPickerMedia = item;
      favPickerAfter = after;
      $("tc-fav-subtitle").textContent = "¿Dónde quieres guardar «" + (item.title || "este título") + "»?";
      renderFavOptions();
      openOverlay("tc-fav-overlay");
      window.setTimeout(function () { var f = $("tc-fav-options").querySelector("button"); if (f) f.focus(); }, 80);
    }
    function closeFavPicker() { closeOverlay("tc-fav-overlay"); favPickerMedia = null; favPickerAfter = null; }
    function commitFavorite(item, listId) {
      var copy = { id: item.id, type: item.type, title: item.title || "Sin título", bg: item.bg || "", rating: Number(item.rating) || 0, year: item.year || "" };
      if (listId) copy.list = listId;
      myList.push(copy);
      saveMyList();
      var l = listId ? favListById(listId) : null;
      showToast(l ? "Guardado en «" + l.name + "»" : "Guardado en Favoritos");
    }
    function pickFavList(listId) {
      var item = favPickerMedia, after = favPickerAfter;
      if (!item) return;
      closeFavPicker();
      commitFavorite(item, listId);
      if (after) after();
    }
    function createFavListNamed(name) {
      name = String(name || "").trim().slice(0, 24);
      if (!name) { showToast("Escribe un nombre para la lista"); return null; }
      if (/^general$/i.test(name) || favLists.some(function (l) { return l.name.toLowerCase() === name.toLowerCase() && l.id !== editingListId; })) {
        showToast("Ya existe una lista con ese nombre");
        return null;
      }
      var l = { id: "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name };
      favLists.push(l);
      saveFavLists();
      return l;
    }
    (function bindFavPicker() {
      $("tc-fav-options").addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        if (b.getAttribute("data-new")) {
          $("tc-fav-new").hidden = false;
          var inp = $("tc-fav-new-name");
          inp.value = "";
          inp.focus();
          return;
        }
        pickFavList(b.getAttribute("data-list") || null);
      });
    })();
    function submitFavNew() {
      var l = createFavListNamed($("tc-fav-new-name").value);
      if (l) pickFavList(l.id);
    }
    function afterFavChange(btn, saved, media) {
      if (media && currentHeroMedia && currentHeroMedia.id === media.id && currentHeroMedia.type === media.type) updateHeroSaveButton(currentHeroMedia);
      if (currentView === "list") { renderFavoritesView(); return; }
      if (btn && btn.isConnected) {
        btn.classList.toggle("saved", saved);
        var svg = btn.querySelector("svg");
        if (svg) svg.setAttribute("fill", saved ? "currentColor" : "none");
      }
    }
    function toggleSave(e, i) {
      e.stopPropagation();
      var btn = e.currentTarget;
      var x = myList.findIndex(function (m) { return m.id === i.id && m.type === i.type; });
      if (x > -1) {
        myList.splice(x, 1);
        saveMyList();
        afterFavChange(btn, false, i);
        return;
      }
      openFavPicker(i, function () { afterFavChange(btn, true, i); });
    };
    function toggleHeroSave(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var media = currentHeroMedia;
      if (!media || !media.id || !media.type) return;
      var index = myList.findIndex(function (m) { return m.id === media.id && m.type === media.type; });
      if (index > -1) {
        myList.splice(index, 1);
        saveMyList();
        showToast("Eliminado de favoritos");
        afterFavChange(null, false, media);
        return;
      }
      openFavPicker({ id: media.id, type: media.type, title: media.title, bg: media.bg || "", rating: media.rating, year: media.year }, function () {
        afterFavChange(null, true, media);
      });
    };
    // Alta/baja de un favorito desde cualquier superficie (asistente, detalle...). `done(saved)` se llama al terminar.
    function toggleFavoriteMedia(media, done) {
      var index = myList.findIndex(function (m) { return m.id === media.id && m.type === media.type; });
      if (index > -1) {
        myList.splice(index, 1);
        saveMyList();
        showToast("Eliminado de favoritos");
        if (done) done(false);
        return;
      }
      openFavPicker(media, function () { if (done) done(true); });
    }
    function markFavTruncated() { favTruncated = true; return ""; }
    function setFavFilter(id) {
      favLimit = FAV_PAGE; favFilter = id; renderFavoritesView(); }
    function favSection(title, listId, editable) {
      var items = myList.filter(function (m) { return (m.list || null) === (listId || null); });
      var head = '<div class="row-header"><h2 class="row-title"' + (listId ? ' data-i18n="skip"' : "") + '>' + escapeHTML(title) + ' <span class="fav-count">(' + items.length + ')</span></h2>' +
        (listId && favFilter === listId ? '<button type="button" class="fav-close-btn" onclick="setFavFilter(\'all\')" aria-label="Cerrar lista" title="Cerrar lista"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg><span>Cerrar lista</span></button>' : "") +
        (editable ? '<button type="button" class="fav-edit-btn" title="Editar lista" aria-label="Editar lista" onclick="openListModal(\'' + escapeHTML(listId) + '\')"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>' : "") + "</div>";
      if (!items.length) return '<section class="fav-section">' + head + '<p class="fav-empty">Esta lista aún no tiene títulos. Usa el corazón en cualquier título y elige esta lista.</p></section>';
      return '<section class="fav-section">' + head + '<div class="grid-container">' + items.slice(0, favLimit).map(getCardHTML).join("") + "</div></section>" + (items.length > favLimit ? markFavTruncated() : "");
    }
    var FAV_PAGE = 36, favLimit = FAV_PAGE, favTruncated = false;
    var PENCIL_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>';

    /** Portada de una lista: póster del primer título guardado en ella (se obtiene de TMDB una vez y se recuerda). */
    function listFirstItem(l) { return myList.find(function (m) { return m.list === l.id; }) || null; }
    /** Lista vacía: portada automática según su nombre (género por palabras clave; si no, búsqueda en TMDB; si no, tendencias). */
    var LIST_COVER_HINTS = [
      [/terror|horror|miedo|susto/i, 27], [/comedia|comedy|risa|diver|funny/i, 35], [/romance|amor|love|pareja/i, 10749],
      [/ciencia|sci[- ]?fi|futur|espacio|space/i, 878], [/acci[oó]n|action|pelea/i, 28], [/aventur/i, 12],
      [/animaci|anime|dibujos|cartoon/i, 16], [/drama/i, 18], [/fantas|magia|magic/i, 14], [/misterio|suspen|thriller|intriga/i, 9648],
      [/famil|ni[ñn]os|kids|infantil/i, 10751], [/document/i, 99], [/crimen|crime|polic|mafia/i, 80], [/guerra|war|b[eé]lic/i, 10752],
      [/western|vaquero/i, 37], [/m[uú]sica|music|musical/i, 10402], [/histori/i, 36]
    ];
    function autoListCover(l, el) {
      var tag = "auto:" + l.name.toLowerCase();
      if (l.cover && l.coverFor === tag) { if (el) paintListCover(el, l.cover); return; }
      var genre = null;
      LIST_COVER_HINTS.forEach(function (h) { if (!genre && h[0].test(l.name)) genre = h[1]; });
      var source = genre
        ? fetchTMDB("/discover/movie", "&with_genres=" + genre + "&sort_by=popularity.desc&vote_count.gte=1500&include_adult=false")
        : fetchTMDB("/search/multi", "&include_adult=false&query=" + encodeURIComponent(l.name));
      source.then(function (d) {
        var pool = ((d && d.results) || []).filter(function (x) { return x.poster_path && (!x.media_type || x.media_type === "movie" || x.media_type === "tv"); });
        return pool.length ? pool : fetchTMDB("/trending/movie/week").then(function (t) { return ((t && t.results) || []).filter(function (x) { return x.poster_path; }); });
      }).then(function (pool) {
        if (!pool.length) return;
        var hash = 0; for (var i = 0; i < l.id.length; i++) hash = (hash + l.id.charCodeAt(i)) % 997;
        var pick = pool[hash % Math.min(5, pool.length)];
        l.cover = pick.poster_path;
        l.coverFor = tag;
        saveFavLists();
        if (el && el.isConnected) paintListCover(el, l.cover);
      }).catch(function () { });
    }
    function ensureListCover(l, el) {
      var first = listFirstItem(l);
      if (!first) { autoListCover(l, el); return; }
      var tag = first.type + ":" + first.id;
      if (l.cover && l.coverFor === tag) return;
      fetchTMDB((first.type === "tv" ? "/tv/" : "/movie/") + first.id).then(function (d) {
        var path = d && (d.poster_path || d.backdrop_path);
        if (!path) return;
        l.cover = path;
        l.coverFor = tag;
        saveFavLists();
        if (el && el.isConnected) paintListCover(el, path);
      }).catch(function () { });
    }
    function paintListCover(card, path) {
      var cover = card.querySelector(".list-cover");
      if (!cover) return;
      var img = new Image();
      img.onload = function () { cover.style.backgroundImage = "url('" + IMG_CARD + path + "')"; card.classList.add("has-cover"); };
      img.src = IMG_CARD + path;
    }
    function listCardHTML(l) {
      var count = favCount(l.id), active = favFilter === l.id;
      return '<div class="list-card' + (active ? " active" : "") + '" tabindex="0" role="button" data-list="' + escapeHTML(l.id) + '" onclick="setFavFilter(favFilter === \'' + escapeHTML(l.id) + '\' ? \'all\' : \'' + escapeHTML(l.id) + '\')" aria-pressed="' + active + '" aria-label="' + escapeHTML(l.name) + '">' +
        '<div class="list-cover"></div><div class="list-shade"></div>' +
        '<button type="button" class="fav-edit-btn list-edit" title="Editar lista" aria-label="Editar lista" onclick="event.stopPropagation();openListModal(\'' + escapeHTML(l.id) + '\')">' + PENCIL_SVG + '</button>' +
        '<div class="list-info"><div class="list-name" data-i18n="skip">' + escapeHTML(l.name) + ' <span class="list-qty">(' + count + ")</span></div></div></div>";
    }
    function renderFavoritesView() {
      favTruncated = false;
      if (favFilter !== "all" && favFilter !== "general" && favFilter !== "watched" && !favListById(favFilter)) favFilter = "all";
      var chip = function (id, label, primary) { return '<button class="genre-chip ' + (primary ? "chip-primary " : "") + (favFilter === id ? "active" : "") + '" onclick="setFavFilter(\'' + id + '\')">' + label + "</button>"; };
      var toolbar = '<div class="fav-toolbar">' + chip("all", "Todos", true) + chip("general", "General") + chip("watched", "Vistas") +
        '<span class="fav-toolbar-gap"></span>' +
        (favLists.length < 12 ? '<button class="genre-chip chip-primary" onclick="openListModal()">+ Nueva lista</button>' : "") +
        '<button class="genre-chip" onclick="openStats()">Estadísticas</button></div>';
      var cards = favLists.length ? '<section class="fav-lists"><div class="row-header"><h2 class="row-title">Mis listas</h2></div><div class="list-cards">' + favLists.map(listCardHTML).join("") + "</div></section>" : "";
      var body = "";
      if (!myList.length && !favLists.length) {
        body = '<div class="empty-state"><h2>Tus favoritos está vacío</h2><p>Haz clic en el corazón de cualquier película, anime o serie para guardarla aquí. También puedes crear listas para organizarlos.</p></div>';
      } else if (favFilter === "all") {
        if (favCount(null) || !favLists.length) body += favSection("General", null, false);
        // Las listas se ven una sola vez, como tarjetas; al tocar una se abre su contenido.
      } else if (favFilter === "watched") body = watchedSection();
      else if (favFilter === "general") body = favSection("General", null, false);
      else body = favSection(favListById(favFilter).name, favFilter, false);
      $rowsContainer.innerHTML = toolbar + cards + body;
      $rowsContainer.querySelectorAll(".list-card").forEach(function (el) {
        var l = favListById(el.getAttribute("data-list"));
        if (!l) return;
        if (l.cover) paintListCover(el, l.cover);
        ensureListCover(l, el);
      });
    }
    function openListModal(id) {
      if (!id && favLists.length >= 12) { showToast("Puedes crear hasta 12 listas"); return; }
      editingListId = id || null;
      var l = id ? favListById(id) : null;
      $("tc-list-title").textContent = l ? "Editar lista" : "Nueva lista";
      $("tc-list-name").value = l ? l.name : "";
      $("tc-list-save-btn").querySelector(".btn-label").textContent = l ? "Guardar" : "Crear";
      $("tc-list-delete-btn").hidden = !l;
      openOverlay("tc-list-overlay");
      window.setTimeout(function () { $("tc-list-name").focus(); }, 80);
    }
    function closeListModal() { closeOverlay("tc-list-overlay"); editingListId = null; }
    function saveListFromModal() {
      var name = $("tc-list-name").value;
      if (!editingListId) {
        var created = createFavListNamed(name);
        if (!created) return;
        closeListModal();
        favFilter = created.id;
        showToast("Lista «" + created.name + "» creada");
        if (currentView === "list") renderFavoritesView();
        return;
      }
      var l = favListById(editingListId);
      if (!l) { closeListModal(); return; }
      var clean = String(name || "").trim().slice(0, 24);
      if (!clean) { showToast("Escribe un nombre para la lista"); return; }
      if (/^general$/i.test(clean) || favLists.some(function (x) { return x.id !== l.id && x.name.toLowerCase() === clean.toLowerCase(); })) { showToast("Ya existe una lista con ese nombre"); return; }
      l.name = clean;
      saveFavLists();
      closeListModal();
      showToast("Lista actualizada");
      if (currentView === "list") renderFavoritesView();
    }
    function deleteListFromModal() {
      var l = favListById(editingListId);
      if (!l) return;
      var moved = 0;
      myList.forEach(function (m) { if (m.list === l.id) { delete m.list; moved++; } });   // los favoritos pasan a General
      favLists = favLists.filter(function (x) { return x.id !== l.id; });
      saveMyList();
      saveFavLists();
      if (favFilter === l.id) favFilter = "all";
      closeListModal();
      showToast("Lista eliminada" + (moved ? " · " + moved + " favorito" + (moved === 1 ? "" : "s") + " pasaron a General" : ""));
      if (currentView === "list") renderFavoritesView();
    }

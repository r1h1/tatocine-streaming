/**
 * TatoCine · js/features/recent-searches.js
 * Búsquedas recientes por perfil.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Búsquedas recientes (por perfil) ----
    var recentSearches = readLocalJSON(profileStorageKey("tatoRecentSearches"), []);
    if (!Array.isArray(recentSearches)) recentSearches = [];
    function rememberSearch(q) {
      q = String(q || "").trim().slice(0, 60);
      if (!q) return;
      recentSearches = [q].concat(recentSearches.filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); })).slice(0, 8);
      safeStorageSet(profileStorageKey("tatoRecentSearches"), JSON.stringify(recentSearches));
    }
    function hideRecentSearches() { var p = $("recent-searches"); if (p) p.classList.remove("open"); }
    function showRecentSearches() {
      if (window.__tcNoRecentOnce) { window.__tcNoRecentOnce = false; return; }       // Atrás del mando cerró la lista y devolvió el foco al buscador: no se reabre
      var p = $("recent-searches");
      if (!p || !recentSearches.length || $searchInput.value.trim()) { hideRecentSearches(); return; }
      p.innerHTML = '<div class="recent-head"><span>Búsquedas recientes</span><button type="button" data-clear="1">Borrar</button></div>' +
        recentSearches.map(function (q) { return '<button type="button" class="recent-item" data-q="' + escapeHTML(q) + '">' + escapeHTML(q) + "</button>"; }).join("");
      p.classList.add("open");
    }
    (function bindRecentSearches() {
      var wrap = document.querySelector(".hero-content .search-wrap");
      if (!wrap) return;
      var panel = document.createElement("div");
      panel.id = "recent-searches";
      panel.className = "recent-searches";
      wrap.appendChild(panel);
      panel.addEventListener("mousedown", function (e) { e.preventDefault(); });
      panel.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        if (b.getAttribute("data-clear")) {
          recentSearches = [];
          safeStorageRemove(profileStorageKey("tatoRecentSearches"));
          hideRecentSearches();
          return;
        }
        var q = b.getAttribute("data-q");
        $searchInput.value = q;
        hideRecentSearches();
        performSearch(q);
      });
      $searchInput.addEventListener("focus", showRecentSearches);
      // Se ocultan cuando el foco sale del buscador Y de la lista (con el mando de TV se baja del buscador a las búsquedas recientes)
      function hideIfFocusLeft() { setTimeout(function () { var a = document.activeElement; if (a && (a === $searchInput || panel.contains(a))) return; hideRecentSearches(); }, 120); }
      $searchInput.addEventListener("blur", hideIfFocusLeft);
      panel.addEventListener("focusout", hideIfFocusLeft);
      $searchInput.addEventListener("input", function () { if ($searchInput.value.trim()) hideRecentSearches(); else showRecentSearches(); });
    })();
    decorate("performSearch", function (original) { return function (q) { rememberSearch(q); hideRecentSearches(); return original(q); }; });

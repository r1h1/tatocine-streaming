/**
 * TatoCine · js/features/details-favorite.js
 * Corazón de favoritos dentro del modal de detalle.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Favoritos desde el modal Info + sincronía de corazones ----
    function syncCardHearts() {
      document.querySelectorAll(".save-btn").forEach(function (btn) {
        var id = Number(btn.getAttribute("data-id")), type = btn.getAttribute("data-type");
        if (!id || !type) return;
        var saved = isSaved({ id: id, type: type });
        btn.classList.toggle("saved", saved);
        var svg = btn.querySelector("svg");
        if (svg) svg.setAttribute("fill", saved ? "currentColor" : "none");
      });
    }
    function updateDetailsFavButton() {
      var btn = $("details-fav-btn");
      if (!btn || !detailsMedia) return;
      var saved = isSaved(detailsMedia);
      btn.classList.toggle("saved", saved);
      btn.setAttribute("aria-pressed", saved ? "true" : "false");
      btn.title = btn.ariaLabel = saved ? "Quitar de favoritos" : "Agregar a favoritos";
      btn.setAttribute("aria-label", btn.title);
      var svg = btn.querySelector("svg");
      if (svg) svg.setAttribute("fill", saved ? "currentColor" : "none");
      var label = btn.querySelector(".details-fav-label");
      if (label) label.textContent = saved ? "En favoritos" : "Favoritos";
    }
    function toggleDetailsFav() {
      if (!detailsMedia) return;
      var media = detailsMedia;
      toggleFavoriteMedia(media, function (saved) {
        afterFavChange(null, saved, media);
        updateDetailsFavButton();
        syncCardHearts();
      });
    }
    decorate("closeDetails", function (original) { return function () { var r = original.apply(this, arguments); syncCardHearts(); return r; }; });

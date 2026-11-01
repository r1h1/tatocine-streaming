/**
 * TatoCine · js/features/favorites.js
 * Favoritos: botón corazón de tarjetas y portada.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function updateHeroSaveButton(media) {
      var btn = $("hero-save-btn");
      if (!btn) return;
      var saved = !!(media && isSaved(media));
      var label = saved ? "Quitar" : "Agregar";
      btn.classList.toggle("saved", saved);
      btn.setAttribute("aria-pressed", saved ? "true" : "false");
      btn.setAttribute("aria-label", label);
      btn.title = label;
      var svg = btn.querySelector("svg");
      if (svg) svg.setAttribute("fill", saved ? "currentColor" : "none");
    }

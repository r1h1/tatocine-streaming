/**
 * TatoCine · js/core/events.js
 * Eventos globales: scroll, historial del navegador y teclado.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    var scrollTicking = false;
    window.addEventListener("scroll", function () {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(function () {
        scrollTicking = false;
        $topBar.classList.toggle("scrolled", window.scrollY > 20);
      });
    }, { passive: true });
    window.addEventListener("popstate", function () {
      if ($detailsModal.classList.contains("open")) closeDetails(true);
      if ($modal.classList.contains("open")) closePlayer();
      if ($settingsModal.classList.contains("open")) closeSettings();
      if ($actorModal.classList.contains("open")) closeActor();
      if ($filtersModal.classList.contains("open")) closeFilters();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (document.getElementById("tc-pin-overlay").classList.contains("open")) {
          closePinModal();
          return;
        }
        if ($actorModal.classList.contains("open")) {
          closeActor();
          return;
        }
        if (document.getElementById("tc-profile-create-overlay").classList.contains("open")) {
          closeProfileCreateModal();
          return;
        }
        if (document.getElementById("tc-profile-overlay").classList.contains("open")) {
          closeProfiles();
          return;
        }
        if ($filtersModal.classList.contains("open")) {
          closeFilters();
          return;
        }
        if ($settingsModal.classList.contains("open")) {
          closeSettings();
          return;
        }
        if ($detailsModal.classList.contains("open")) {
          closeDetails();
          return;
        }
        if ($modal.classList.contains("open")) {
          closePlayer();
          return;
        }
        if ($disclaimerModal.classList.contains("open")) {
          acceptDisclaimer();
          return;
        }
        if ($("mobile-menu").classList.contains("open")) {
          toggleMenu();
          return;
        }
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(document.activeElement)) {
        if (e.key === "f" || e.key === "F") {
          e.preventDefault();
          if ($modal.classList.contains("open")) togglePlayerFullscreen();
          else toggleAppFullscreen();
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          var scroller = pickKeyboardScroller();
          if (scroller) {
            e.preventDefault();
            scroller.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * scroller.clientWidth * 0.85, behavior: "smooth" });
          }
          return;
        }
      }
      if (e.key === "/" && document.activeElement !== $searchInput) {
        var tag = document.activeElement.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          $searchInput.focus();
        }
      }
    });

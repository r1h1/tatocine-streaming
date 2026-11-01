/**
 * TatoCine · js/features/share.js
 * Compartir títulos (Web Share o ventana propia con enlace).
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function buildMediaShareUrl(media) {
      var targetUrl;
      try {
        targetUrl = new URL(location.pathname, location.origin);
      } catch (e) {
        targetUrl = new URL(location.href);
        targetUrl.search = "";
        targetUrl.hash = "";
      }
      targetUrl.searchParams.set("id", String(media.id));
      targetUrl.searchParams.set("type", String(media.type));
      return targetUrl.toString();
    }

    function openShareFallback(media, shareUrl) {
      var previous = document.getElementById("tato-share-overlay");
      if (previous) previous.remove();

      var title = media.title || "este contenido";
      var text = UI_EN ? "Check out " + title + " on TatoCine" : "Mira " + title + " en TatoCine";
      var overlay = document.createElement("div");
      overlay.id = "tato-share-overlay";
      overlay.className = "tato-share-overlay";
      overlay.innerHTML =
        '<section class="tato-share-dialog" role="dialog" aria-modal="true" aria-labelledby="tato-share-title">' +
        '<button type="button" class="tato-share-close" aria-label="Cerrar">×</button>' +
        '<div class="tato-share-kicker">TATOCINE · COMPARTIR</div>' +
        '<h2 id="tato-share-title" class="tato-share-title"></h2>' +
        '<p class="tato-share-description">Comparte este título con quien quieras.</p>' +
        '<label class="tato-share-label" for="tato-share-url">ENLACE DIRECTO</label>' +
        '<div class="tato-share-link-row"><input id="tato-share-url" class="tato-share-input" type="text" readonly spellcheck="false"><button type="button" class="tato-share-copy">Copiar</button></div>' +
        '<div class="tato-share-options">' +
        '<a class="tato-share-option tato-share-whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a>' +
        '<a class="tato-share-option tato-share-telegram" target="_blank" rel="noopener noreferrer">Telegram</a>' +
        '</div>' +
        '<p class="tato-share-feedback" aria-live="polite"></p>' +
        '</section>';

      document.body.appendChild(overlay);
      var dialog = overlay.querySelector(".tato-share-dialog");
      var field = overlay.querySelector(".tato-share-input");
      var copyButton = overlay.querySelector(".tato-share-copy");
      var feedback = overlay.querySelector(".tato-share-feedback");
      var closeButton = overlay.querySelector(".tato-share-close");

      overlay.querySelector(".tato-share-title").textContent = title;
      field.value = shareUrl;
      overlay.querySelector(".tato-share-whatsapp").href =
        "https://wa.me/?text=" + encodeURIComponent(text + " " + shareUrl);
      overlay.querySelector(".tato-share-telegram").href =
        "https://t.me/share/url?url=" + encodeURIComponent(shareUrl) +
        "&text=" + encodeURIComponent(text);

      function closeDialog() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.removeEventListener("keydown", onKeyDown);
      }
      function onKeyDown(event) {
        if (event.key === "Escape") closeDialog();
      }
      closeButton.addEventListener("click", closeDialog);
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) closeDialog();
      });
      document.addEventListener("keydown", onKeyDown);

      function legacyCopy() {
        field.focus();
        field.select();
        field.setSelectionRange(0, field.value.length);
        var copied = false;
        try {
          copied = !!document.execCommand("copy");
        } catch (e) {
          copied = false;
        }
        if (copied) {
          feedback.textContent = "Enlace copiado al portapapeles.";
          copyButton.textContent = "Copiado ✓";
        } else {
          feedback.textContent = "Enlace seleccionado. Mantén pulsado o usa Ctrl+C para copiarlo.";
        }
      }

      copyButton.addEventListener("click", function () {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function" && window.isSecureContext) {
          navigator.clipboard.writeText(shareUrl).then(function () {
            feedback.textContent = "Enlace copiado al portapapeles.";
            copyButton.textContent = "Copiado ✓";
          }).catch(legacyCopy);
        } else {
          legacyCopy();
        }
      });

      // El enlace queda visible y seleccionable aunque el navegador bloquee el portapapeles.
      field.addEventListener("click", function () {
        field.select();
        field.setSelectionRange(0, field.value.length);
      });
      closeButton.focus();
    }

    function shareMedia(media) {
      if (!media || media.id == null || !media.type) {
        showToast("No se pudo generar el enlace");
        return;
      }

      var shareUrl;
      try {
        shareUrl = buildMediaShareUrl(media);
      } catch (error) {
        showToast("No se pudo generar el enlace de este contenido");
        return;
      }

      var title = media.title || "TatoCine";
      var shareData = {
        title: title,
        text: UI_EN ? "Check out " + title + " on TatoCine" : "Mira " + title + " en TatoCine",
        url: shareUrl,
      };

      // Invocar Web Share en el mismo gesto del usuario. Si no está disponible,
      // o el navegador rechaza la operación, se abre una hoja de compartir propia.
      if (typeof navigator.share === "function") {
        try {
          var result = navigator.share(shareData);
          if (result && typeof result.catch === "function") {
            result.catch(function (error) {
              if (error && error.name === "AbortError") return;
              openShareFallback(media, shareUrl);
            });
          }
          return;
        } catch (error) {
          if (error && error.name === "AbortError") return;
        }
      }

      openShareFallback(media, shareUrl);
    }

    window.shareDetailsFromModal = function (event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      var button = event && event.currentTarget
        ? event.currentTarget
        : document.getElementById("details-share-btn");
      if (!button) {
        showToast("No se encontró el botón para compartir");
        return false;
      }
      var mediaId = button.getAttribute("data-media-id");
      var mediaType = button.getAttribute("data-media-type");
      var mediaTitle = button.getAttribute("data-media-title") || "TatoCine";
      if (!mediaId || !mediaType) {
        showToast("No se pudieron cargar los datos del contenido");
        return false;
      }
      shareMedia({ id: mediaId, type: mediaType, title: mediaTitle });
      return false;
    };

    function shareCard(e, media) {
      e.stopPropagation();
      shareMedia(media);
    }

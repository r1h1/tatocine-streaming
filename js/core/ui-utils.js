/**
 * TatoCine · js/core/ui-utils.js
 * Utilidades de interfaz: avisos (toast), menú móvil, aviso legal y estado de conexión.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function showToast(msg) {
      var c = $("toast-container");
      var t = document.createElement("div");
      t.className = "toast";
      t.textContent = msg;
      c.appendChild(t);
      setTimeout(function () {
        t.classList.add("removing");
        setTimeout(function () {
          if (t.parentNode) t.parentNode.removeChild(t);
        }, 300);
      }, 3000);
    }
    function toggleMenu() {
      $("mobile-menu").classList.toggle("open");
    }
    function showDisclaimer() {
      $disclaimerModal.classList.add("open");
    }
    function acceptDisclaimer() {
      try { localStorage.setItem("tatoLegalAcceptedV2", "true"); localStorage.setItem("tatoDisclaimerAccepted", "true"); } catch (e) { }          // V2 = aceptación explícita con el botón; la antigua se conserva solo para reconocer usuarios existentes
      $disclaimerModal.classList.remove("open");
      document.dispatchEvent(new CustomEvent("tc:legal-accepted"));       // js/ui/legal-gate.js libera la app
    }
    /** Cerrar el descargo SOLO es posible si ya se aceptó (al releerlo desde Legal). Mientras no se acepte, no hay forma de cerrarlo. */
    function closeDisclaimer() {
      var ok = false; try { ok = localStorage.getItem("tatoLegalAcceptedV2") === "true"; } catch (e) { }
      if (ok) $disclaimerModal.classList.remove("open");
    }
    // El aviso legal lo programa js/ui/welcome.js: sale DESPUÉS de la bienvenida y de elegir perfil (y solo hasta que se acepte).
    window.addEventListener("online", () => {
      $offlineBanner.style.transform = "translateY(100%)";
      showToast("Conexión restaurada");
    });
    window.addEventListener("offline", () => {
      $offlineBanner.style.transform = "translateY(0)";
    });

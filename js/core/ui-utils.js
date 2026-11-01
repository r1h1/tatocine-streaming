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
      localStorage.setItem("tatoDisclaimerAccepted", "true");
      $disclaimerModal.classList.remove("open");
    }
    localStorage.getItem("tatoDisclaimerAccepted") ||
      setTimeout(showDisclaimer, 1000);
    window.addEventListener("online", () => {
      $offlineBanner.style.transform = "translateY(100%)";
      showToast("Conexión restaurada");
    });
    window.addEventListener("offline", () => {
      $offlineBanner.style.transform = "translateY(0)";
    });

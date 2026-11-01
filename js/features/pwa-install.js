/**
 * TatoCine · js/features/pwa-install.js
 * Instalación de la app (diálogo nativo o guía por dispositivo) y almacenamiento en Ajustes.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Instalación PWA y almacenamiento en Ajustes ----
    var deferredInstall = null;
    var IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; updateInstallRow(); });
    window.addEventListener("appinstalled", function () { deferredInstall = null; updateInstallRow(); showToast("TatoCine instalada"); });
    decorate("showSettings", function (original) { return function () { original(); updateInstallRow(); updateStorageInfo(); }; });

    // ---- Instalar aplicación: botón junto a pantalla completa (Android/escritorio con diálogo nativo; iOS, Mac, Firefox y TV con guía) ----
    function updateInstallRow() {
      var hide = IS_STANDALONE;
      var row = $("install-option"), btn = $("app-install-btn");
      if (row) row.hidden = hide;
      if (btn) btn.hidden = hide;
      var sub = $("install-sub");
      if (sub) sub.textContent = deferredInstall ? "Instala TatoCine como app en este dispositivo." : "Te mostramos cómo instalarla en este dispositivo.";
    };
    function installSteps() {
      var ua = navigator.userAgent;
      if (IS_TV) return { sub: "Smart TV", steps: ["Los navegadores de TV normalmente no permiten instalar aplicaciones web.", "En el menú del navegador de tu TV usa «Añadir a favoritos» o «Fijar en inicio» para entrar rápido a TatoCine.", "En Android TV / Google TV con Chrome, usa el menú ⋮ → «Instalar aplicación» si aparece."] };
      if (IS_IOS) return { sub: "iPhone / iPad", steps: ["Abre TatoCine en Safari (también funciona en Chrome o Edge con iOS 16.4 o superior).", "Toca el botón Compartir (cuadrado con una flecha hacia arriba).", "Elige «Añadir a pantalla de inicio» y confirma con «Añadir»."] };
      if (/Android/i.test(ua)) return { sub: "Android", steps: ["Toca el menú ⋮ del navegador.", "Elige «Instalar aplicación» o «Añadir a la pantalla de inicio».", "Confirma con «Instalar»."] };
      if (/Firefox/i.test(ua)) return { sub: "Escritorio (Firefox)", steps: ["Firefox de escritorio no permite instalar aplicaciones web.", "Abre TatoCine en Chrome o Edge para instalarla, o guárdala en tus marcadores."] };
      if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)) return { sub: "Mac (Safari)", steps: ["En el menú Archivo, elige «Añadir al Dock…».", "Confirma el nombre y pulsa «Añadir»."] };
      return { sub: "Escritorio", steps: ["Busca el icono de instalar en la barra de direcciones (a la derecha) y haz clic en «Instalar».", "Si no aparece: en Chrome, menú ⋮ → «Guardar y compartir» → «Instalar TatoCine»; en Edge, menú ··· → «Aplicaciones» → «Instalar este sitio como una aplicación».", "La instalación requiere HTTPS (o localhost)."] };
    }
    function openInstallHelp() {
      var info = installSteps();
      $("tc-install-sub").textContent = info.sub + " · sigue estos pasos para instalar TatoCine:";
      $("tc-install-steps").innerHTML = info.steps.map(function (t) { return "<li>" + escapeHTML(t) + "</li>"; }).join("");
      openOverlay("tc-install-overlay");
      window.setTimeout(function () { var b = document.querySelector("#tc-install-overlay .tc-profile-create-btn"); if (b) b.focus(); }, 80);
    }
    function closeInstallHelp() { closeOverlay("tc-install-overlay"); }
    function installApp() {
      if (deferredInstall) {
        var evt = deferredInstall;
        deferredInstall = null;              // el aviso solo se puede usar una vez
        updateInstallRow();
        evt.prompt();
        evt.userChoice.then(function (c) { if (c && c.outcome === "accepted") showToast("Instalando TatoCine…"); }).catch(function () { });
        return;
      }
      openInstallHelp();
    };
    updateInstallRow();

/**
 * TatoCine · js/player/servers.js
 * Servidor de reproducción preferido por perfil.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function setPreferredServer(name) {
      preferredServer = name;
      safeStorageSet(profileStorageKey("tatoServer"), name);
      updateSettingsUI();
    }
    function updateSettingsUI() {
      var el = $("preferred-server-label");
      if (el) el.textContent = preferredServer || "Ninguno";
    }
    function resetPreferredServer() {
      preferredServer = defaultServerFor(UI_LANG);
      safeStorageSet(profileStorageKey("tatoServer"), preferredServer);
      updateSettingsUI();
      showToast("Servidor reseteado");
    }

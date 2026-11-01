/**
 * TatoCine · js/ui/settings.js
 * Ajustes.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function showSettings() {
      // En perfiles infantiles Ajustes solo muestra la copia de seguridad y el QR (el resto es data-adult-only).
      $settingsModal.classList.add("open");
      updateSettingsUI();
      updateLocalAnalyticsUI();
    }
    function closeSettings() {
      $settingsModal.classList.remove("open");
    }
    function clearFavorites() {
      if (confirm("¿Borrar toda tu lista de favoritos?")) {
        safeStorageRemove(profileStorageKey("tatoList"));
        myList = [];
        updateHeroSaveButton(currentHeroMedia);
        closeSettings();
        switchView(currentView, false);
        showToast("Lista borrada");
      }
    }

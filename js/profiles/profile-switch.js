/**
 * TatoCine · js/profiles/profile-switch.js
 * Limpieza de búsqueda y URL al cambiar de perfil.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Cambio de perfil: no arrastrar la búsqueda ni enlaces del perfil anterior ----
    function resetSearchForProfileChange() {
      try { if ($searchInput) $searchInput.value = ""; } catch (e) { }
      try {
        var u = new URL(location.href);
        ["q", "id", "type"].forEach(function (k) { u.searchParams.delete(k); });
        history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
      } catch (e) { }
    }
    ["proceedSwitchProfile", "createLocalProfile", "deleteProfileFromModal"].forEach(function (name) {
      decorate(name, function (original) { return function () { resetSearchForProfileChange(); return original.apply(this, arguments); }; });
    });
    window.addEventListener("pageshow", function (e) { if (e.persisted) resetSearchForProfileChange(); });

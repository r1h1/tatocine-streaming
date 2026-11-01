/**
 * TatoCine · js/profiles/profile-ui.js
 * Perfiles: modales de crear/editar/eliminar, selector «¿Quién está viendo?» y cambio de perfil.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function getProfileInitial(profile) {
      var name = String(profile && profileDisplayName(profile) || "U").trim();
      return name ? Array.from(name)[0].toLocaleUpperCase("es") : "U";
    }
    function updateProfileTrigger() {
      var p = getActiveProfile();
      var initial = document.getElementById("profile-button-avatar");
      var name = document.getElementById("profile-button-name");
      if (initial && p) initial.textContent = getProfileInitial(p);
      if (name && p) name.textContent = profileDisplayName(p);
      document.body.classList.toggle("kid-mode", !!p && p.kind === "kid");
      var trigger = document.querySelector(".tc-profile-trigger");
      if (trigger && p) trigger.setAttribute("aria-label", "Perfil actual: " + p.name + ". Cambiar perfil");
    }
    var profileFormKind = "adult", profileFormRemovePin = false;
    var KIND_HELP = {
      adult: "",
      kid: "Solo verá la sección Niños. La búsqueda también se limita a contenido infantil."
    };
    function setProfileFormKind(kind) {
      profileFormKind = kind === "kid" ? "kid" : "adult";
      document.querySelectorAll("#tc-profile-create-overlay .tc-kind-btn").forEach(function (b) {
        var on = b.getAttribute("data-kind") === profileFormKind;
        b.classList.toggle("active", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
      var help = document.getElementById("tc-kind-help");
      if (help) { help.textContent = KIND_HELP[profileFormKind]; help.hidden = !KIND_HELP[profileFormKind]; }
    }
    var profileFormLang = "es";
    function setProfileFormLang(lang) {
      profileFormLang = lang === "en" ? "en" : "es";
      document.querySelectorAll("#tc-profile-create-overlay .tc-lang-btn").forEach(function (b) {
        var on = b.getAttribute("data-lang") === profileFormLang;
        b.classList.toggle("active", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
    }
    function markPinForRemoval() {
      profileFormRemovePin = true;
      var pinInput = document.getElementById("tc-new-profile-pin");
      var btn = document.getElementById("tc-remove-pin-btn");
      if (pinInput) pinInput.value = "";
      showToast("El PIN se quitará al guardar los cambios.");
      if (btn) btn.hidden = true;
    }
    function setProfileModalMode(mode, profile) {
      var title = document.getElementById("tc-profile-create-title");
      var subtitle = document.getElementById("tc-profile-create-subtitle");
      var button = document.getElementById("tc-create-profile-btn");
      var input = document.getElementById("tc-new-profile-name");
      var isEdit = mode === "edit";
      if (title) title.textContent = isEdit ? "Editar perfil" : "Agregar perfil";
      if (subtitle) { subtitle.textContent = ""; subtitle.hidden = true; }
      if (button) { var lbl = button.querySelector(".btn-label"); if (lbl) lbl.textContent = isEdit ? "Guardar" : "Crear"; button.disabled = false; }
      if (input) { input.value = isEdit && profile ? profile.name : ""; input.disabled = false; }
      profileFormRemovePin = false;
      setProfileFormKind(isEdit && profile ? profile.kind : "adult");
      setProfileFormLang(isEdit && profile ? profile.lang : "es");
      var pinInput = document.getElementById("tc-new-profile-pin");
      var removeBtn = document.getElementById("tc-remove-pin-btn");
      var hasPin = isEdit && profileHasPin(profile);
      if (pinInput) pinInput.value = "";
      if (removeBtn) removeBtn.hidden = !hasPin;
      var delBtn = document.getElementById("tc-delete-profile-btn");
      if (delBtn) {
        var canDelete = isEdit && profile && localProfiles.length > 1 && (profile.kind === "kid" || adultProfileCount(profile.id) > 0);
        delBtn.hidden = !canDelete;
      }
    }
    function openProfileCreateModal() {
      if (!canManageProfiles()) { showToast("Solo un perfil de adulto puede administrar perfiles"); return; }
      if (localProfiles.length >= 6) { showToast("Puedes crear hasta 6 perfiles"); return; }
      editingLocalProfileId = null;
      setProfileModalMode("create", null);
      var overlay = document.getElementById("tc-profile-create-overlay");
      var input = document.getElementById("tc-new-profile-name");
      if (!overlay) {
        console.error("TatoCine: no se encontró el modal para crear perfiles (#tc-profile-create-overlay).");
        showToast("No se pudo abrir el formulario de perfiles");
        return;
      }
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      window.setTimeout(function () {
        if (input) { input.disabled = false; input.focus(); }
      }, 90);
    }
    function openProfileEditModal(profileId) {
      if (!canManageProfiles()) { showToast("Solo un perfil de adulto puede administrar perfiles"); return; }
      var profile = localProfiles.find(function (p) { return p.id === profileId; });
      if (!profile) { showToast("No se encontró el perfil"); return; }
      if (profile.guest) { showToast("El perfil Invitado no se puede editar"); return; }
      if (profileHasPin(profile)) { askProfilePin(profile, function () { openProfileEditModalUnlocked(profile); }); return; }
      openProfileEditModalUnlocked(profile);
    }
    function openProfileEditModalUnlocked(profile) {
      editingLocalProfileId = profile.id;
      setProfileModalMode("edit", profile);
      var overlay = document.getElementById("tc-profile-create-overlay");
      var input = document.getElementById("tc-new-profile-name");
      if (!overlay) {
        console.error("TatoCine: no se encontró el modal de perfiles.");
        showToast("No se pudo abrir el formulario de perfiles");
        return;
      }
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      window.setTimeout(function () { if (input) { input.disabled = false; input.focus(); input.select(); } }, 90);
    }
    function closeProfileCreateModal() {
      var overlay = document.getElementById("tc-profile-create-overlay");
      if (overlay) {
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
      }
      var input = document.getElementById("tc-new-profile-name");
      if (input) input.value = "";
      var pinInput = document.getElementById("tc-new-profile-pin");
      if (pinInput) pinInput.value = "";
      editingLocalProfileId = null;
    }
    function readProfileFormPin() {
      var el = document.getElementById("tc-new-profile-pin");
      var raw = String(el && el.value || "").trim();
      if (!raw) return { ok: true, value: "" };
      if (!/^\d{4}$/.test(raw)) {
        showToast("El PIN debe tener exactamente 4 números");
        if (el) el.focus();
        return { ok: false };
      }
      return { ok: true, value: raw };
    }
    function deleteProfileFromModal() {
      var id = editingLocalProfileId;
      var profile = localProfiles.find(function (p) { return p.id === id; });
      if (!profile || profile.guest) return;
      if (localProfiles.length <= 1) { showToast("Debe existir al menos un perfil"); return; }
      if (profile.kind !== "kid" && adultProfileCount(id) === 0) { showToast("Debe existir al menos un perfil de adulto"); return; }
      var wasActive = id === activeProfileId;
      localProfiles = localProfiles.filter(function (p) { return p.id !== id; });
      if (!saveLocalProfiles()) { showToast("No se pudo eliminar el perfil en este navegador"); return; }
      // Borra solo los datos de ese perfil (favoritos, historial, preferencias, servidor).
      try {
        var prefix = "tatoProfile_" + id + "_";
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf(prefix) === 0) localStorage.removeItem(k); });
        if (id === "main") ["tatoList", "tatoContinue", "tatoLocalAnalyticsV1", "tatoServer", "tatoAutoNextEpisode"].forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) { }
      closeProfileCreateModal();
      if (wasActive) {
        var next = localProfiles.find(function (p) { return p.kind !== "kid"; }) || localProfiles[0];
        safeStorageSet(ACTIVE_PROFILE_STORAGE_KEY, next.id);
        try { sessionStorage.removeItem(PROFILE_SESSION_STORAGE_KEY); } catch (e) { }
        location.reload();
        return;
      }
      renderProfilesPanel();
      showToast("Perfil eliminado");
    }
    function saveProfileFromModal() {
      var input = document.getElementById("tc-new-profile-name");
      var name = String(input && input.value || "").trim().slice(0, 24);
      if (!name) { showToast("Escribe un nombre para el perfil"); if (input) input.focus(); return; }
      if (!editingLocalProfileId) { createLocalProfile(); return; }
      var profile = localProfiles.find(function (p) { return p.id === editingLocalProfileId; });
      if (!profile) { showToast("No se encontró el perfil que quieres editar"); closeProfileCreateModal(); return; }
      var pinResult = readProfileFormPin();
      if (!pinResult.ok) return;
      if (profile.kind !== "kid" && profileFormKind === "kid" && adultProfileCount(profile.id) === 0) {
        showToast("Debe existir al menos un perfil de adulto");
        return;
      }
      var previous = { name: profile.name, kind: profile.kind, lang: profile.lang || "es", pin: profile.pin };
      profile.name = name;
      profile.kind = profileFormKind;
      profile.lang = profileFormLang;
      if (pinResult.value) profile.pin = makePin(pinResult.value);
      else if (profileFormRemovePin) delete profile.pin;
      if (!saveLocalProfiles()) {
        profile.name = previous.name; profile.kind = previous.kind; profile.lang = previous.lang;
        if (previous.pin) profile.pin = previous.pin; else delete profile.pin;
        showToast("No se pudieron guardar los cambios en este navegador");
        return;
      }
      var kindChanged = previous.kind !== profile.kind || previous.lang !== profile.lang;
      // Al cambiar de idioma el servidor por defecto cambia: ESP1 (español) / ENG1 (inglés).
      if (previous.lang !== profile.lang) safeStorageSet("tatoProfile_" + profile.id + "_tatoServer", defaultServerFor(profile.lang));
      var editedId = profile.id;
      closeProfileCreateModal();
      if (kindChanged && editedId === activeProfileId) { location.reload(); return; }
      renderProfilesPanel();
      updateProfileTrigger();
      showToast("Perfil actualizado");
    }
    function renderProfilesPanel() {
      var grid = document.getElementById("tc-profile-grid");
      if (!grid) return;

      var cards = localProfiles.map(function (p) {
        var active = p.id === activeProfileId;
        var safeId = escapeHTML(p.id);
        var safeName = escapeHTML(profileDisplayName(p));
        var blockedForKid = p.guest && isKidProfile();
        var editButton = p.guest ? "" : '<button type="button" class="tc-profile-edit-btn" data-profile-action="edit" data-profile-id="' + safeId + '" aria-label="Editar nombre de ' + safeName + '" title="Editar nombre"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>';
        return '<div class="tc-profile-card tc-profile-card-editable ' + (active ? "active" : "") + (blockedForKid ? " is-blocked" : "") + '">' +
          '<button type="button" class="tc-profile-select-btn" data-profile-action="select"' + (blockedForKid ? ' aria-disabled="true"' : "") + ' data-profile-id="' + safeId + '" aria-label="Seleccionar perfil ' + safeName + '">' +
          '<span class="tc-profile-card-avatar" aria-hidden="true">' + escapeHTML(getProfileInitial(p)) + '</span>' +
          '<span class="tc-profile-card-name">' + safeName + '</span>' +
          '<span class="tc-profile-active-label">' + (active ? "Actual" : "Seleccionar") + (p.guest ? " · Sin historial" : "") + (p.kind === "kid" ? " · Niño" : "") + (p.lang === "en" && !p.guest ? " · ENG" : "") + (profileHasPin(p) ? " · PIN" : "") + '</span>' +
          '</button>' +
          editButton +
          '</div>';
      });

      if (localProfiles.length < 6) {
        cards.push('<button type="button" class="tc-profile-card tc-profile-add-card" data-profile-action="create" aria-label="Agregar perfil"><span class="tc-profile-card-avatar tc-profile-add-initial" aria-hidden="true">+</span><span class="tc-profile-card-name">Agregar perfil</span><span class="tc-profile-active-label">Crear nuevo</span></button>');
      }

      grid.innerHTML = cards.join("");

      // Delegación de eventos: los botones dinámicos no dependen de onclick inline.
      // Así cada acción queda separada y nunca se confunde seleccionar con crear.
      if (grid.dataset.profileActionsBound !== "true") {
        grid.addEventListener("click", function (event) {
          var target = event.target;
          if (!target || typeof target.closest !== "function") return;

          var createButton = target.closest('[data-profile-action="create"]');
          if (createButton && grid.contains(createButton)) {
            event.preventDefault();
            event.stopPropagation();
            openProfileCreateModal();
            return;
          }

          var editButton = target.closest('[data-profile-action="edit"]');
          if (editButton && grid.contains(editButton)) {
            event.preventDefault();
            event.stopPropagation();
            openProfileEditModal(editButton.getAttribute("data-profile-id"));
            return;
          }

          var selectButton = target.closest('[data-profile-action="select"]');
          if (selectButton && grid.contains(selectButton)) {
            event.preventDefault();
            event.stopPropagation();
            switchLocalProfile(selectButton.getAttribute("data-profile-id"));
          }
        });
        grid.dataset.profileActionsBound = "true";
      }

      var count = document.getElementById("tc-profile-count");
      if (count) count.textContent = localProfiles.length + " de 6 perfiles locales";
      var create = document.getElementById("tc-create-profile-btn");
      if (create) create.disabled = localProfiles.length >= 6;
    }
    function showProfiles(isStartup) {
      renderProfilesPanel();
      var panel = document.getElementById("tc-profile-overlay");
      if (panel) {
        document.body.classList.add("tc-profile-screen-open");
        panel.classList.toggle("startup", !!isStartup);
        panel.classList.add("open");
        startProfileBackdropCarousel();
      }
    }
    function closeProfiles() {
      if (profilePickerRequired) return;
      var panel = document.getElementById("tc-profile-overlay");
      if (panel) panel.classList.remove("open", "startup");
      document.body.classList.remove("tc-profile-screen-open");
      stopProfileBackdropCarousel();
    }
    function confirmProfileForSession(profileId) {
      try { sessionStorage.setItem(PROFILE_SESSION_STORAGE_KEY, profileId); } catch (e) { }
      profilePickerRequired = false;
    }
    function switchLocalProfile(profileId) {
      var selectedProfile = localProfiles.find(function (p) { return p.id === profileId; });
      if (!selectedProfile) return;
      // Un perfil Niño nunca puede cambiar al Invitado (sin PIN y de adultos): primero debe entrar un perfil de adulto.
      if (selectedProfile.guest && isKidProfile()) { showToast("Desde un perfil Niño no se puede entrar como Invitado"); return; }

      // Si se vuelve a elegir el perfil actual, solo se cierra el selector.
      // No se abre el formulario de creación ni el de edición.
      // Un perfil con PIN exige el PIN al entrar (también al iniciar una sesión nueva con ese perfil).
      if (profileHasPin(selectedProfile) && (profileId !== activeProfileId || profilePickerRequired)) {
        askProfilePin(selectedProfile, function () { proceedSwitchProfile(profileId); });
        return;
      }
      proceedSwitchProfile(profileId);
    }
    function proceedSwitchProfile(profileId) {
      if (profileId === activeProfileId) {
        confirmProfileForSession(profileId);
        closeProfiles();
        return;
      }

      if (!safeStorageSet(ACTIVE_PROFILE_STORAGE_KEY, profileId)) {
        showToast("No se pudo cambiar de perfil en este dispositivo");
        return;
      }
      confirmProfileForSession(profileId);
      location.reload();
    }
    function createLocalProfile() {
      if (localProfiles.length >= 6) { showToast("Puedes crear hasta 6 perfiles"); return; }
      var input = document.getElementById("tc-new-profile-name");
      var name = String(input && input.value || "").trim().slice(0, 24);
      if (!name) { showToast("Escribe un nombre para el perfil"); if (input) input.focus(); return; }
      if (!canManageProfiles()) { showToast("Solo un perfil de adulto puede administrar perfiles"); return; }
      var pinResult = readProfileFormPin();
      if (!pinResult.ok) return;
      var id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      var newProfile = { id: id, name: name, kind: profileFormKind, lang: profileFormLang, createdAt: Date.now() };
      if (pinResult.value) newProfile.pin = makePin(pinResult.value);
      localProfiles.push(newProfile);
      saveLocalProfiles();
      [
        ["tatoList", "[]"], ["tatoContinue", "[]"],
        ["tatoLocalAnalyticsV1", '{"items":[]}'], ["tatoServer", '"ESP1"'],
        ["tatoAutoNextEpisode", "true"]
      ].forEach(function (pair) { safeStorageSet("tatoProfile_" + id + "_" + pair[0], pair[1]); });
      safeStorageSet("tatoProfile_" + id + "_tatoServer", defaultServerFor(profileFormLang));
      safeStorageSet(ACTIVE_PROFILE_STORAGE_KEY, id);
      confirmProfileForSession(id);
      closeProfileCreateModal();
      location.reload();
    }

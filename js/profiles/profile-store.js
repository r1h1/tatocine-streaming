/**
 * TatoCine · js/profiles/profile-store.js
 * Perfiles: modelo, almacenamiento, idioma, PIN (hash con sal) y reglas de perfil infantil.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    const PROFILE_STORAGE_KEY = "tatoProfilesV1";
    const ACTIVE_PROFILE_STORAGE_KEY = "tatoActiveProfileV1";
    const PROFILE_SESSION_STORAGE_KEY = "tatoProfileSelectedForSessionV1";
    function initializeLocalProfiles() {
      var stored = readLocalJSON(PROFILE_STORAGE_KEY, null);
      if (!Array.isArray(stored) || !stored.length) {
        stored = [{ id: "main", name: "Yo", createdAt: Date.now() }];
        safeStorageSet(PROFILE_STORAGE_KEY, JSON.stringify(stored));
      }
      stored = stored.filter(function (p) { return p && p.id && p.name; });
      if (!stored.length) stored = [{ id: "main", name: "Yo", createdAt: Date.now() }];
      // Retira los antiguos emojis guardados como avatar sin borrar perfiles ni su actividad.
      stored.forEach(function (p) { if (Object.prototype.hasOwnProperty.call(p, "avatar")) delete p.avatar; });
      // Tipo de perfil (adulto/niño) y PIN opcional; los perfiles antiguos pasan a "adulto" sin PIN.
      stored.forEach(function (p) {
        if (p.kind !== "kid") p.kind = "adult";
        if (p.lang !== "en") p.lang = "es";
        if (p.name === "Mi perfil") p.name = "Yo";
        if (!p.pin || typeof p.pin.h !== "string" || typeof p.pin.s !== "string") delete p.pin;
      });
      // «Invitado» existe siempre (no se edita ni se elimina y no guarda nada). El orden es: Yo, Invitado y los demás.
      var guest = stored.find(function (p) { return p.id === "guest"; }) || { id: "guest", createdAt: Date.now() };
      guest.name = "Invitado";
      guest.kind = "adult";
      guest.guest = true;
      guest.lang = "es";                                  // Invitado siempre en español
      delete guest.pin;
      var others = stored.filter(function (p) { return p.id !== "guest"; }).slice(0, 5);   // 6 en total contando al Invitado
      stored = others.slice(0, 1).concat([guest], others.slice(1));
      safeStorageSet(PROFILE_STORAGE_KEY, JSON.stringify(stored));
      var active = "";
      try { active = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY) || ""; } catch (e) { }
      if (!stored.some(function (p) { return p.id === active; })) active = stored[0].id;
      safeStorageSet(ACTIVE_PROFILE_STORAGE_KEY, active);
      var prefix = "tatoProfile_" + active + "_";
      var legacy = [
        ["tatoList", "[]"],
        ["tatoContinue", "[]"],
        ["tatoLocalAnalyticsV1", '{"items":[]}'],
        ["tatoServer", '"ESP1"'],
        ["tatoAutoNextEpisode", "true"]
      ];
      legacy.forEach(function (pair) {
        try {
          if (localStorage.getItem(prefix + pair[0]) === null) {
            var oldValue = active === "main" ? localStorage.getItem(pair[0]) : null;
            safeStorageSet(prefix + pair[0], oldValue === null ? pair[1] : oldValue);
          }
        } catch (e) { safeStorageSet(prefix + pair[0], pair[1]); }
      });
      return { profiles: stored, activeId: active };
    }
    var localProfileSetup = initializeLocalProfiles();
    let localProfiles = localProfileSetup.profiles;
    let activeProfileId = localProfileSetup.activeId;
    var editingLocalProfileId = null;
    var profileBackdropItems = [];
    var profileBackdropIndex = 0;
    var profileBackdropNextIndex = 0;
    var profileBackdropTimer = null;
    var profileBackdropLayerIndex = 0;
    var profileBackdropImageRequest = 0;
    var profileBackdropStarted = false;
    var profileBackdropHasVisibleImage = false;
    var profileBackdropLoading = false;
    var profileBackdropFetchPending = false;
    // El selector se muestra al abrir una sesión nueva (pestaña nueva). Al recargar la página con el perfil ya elegido (y su PIN
    // ya escrito) no se vuelve a pedir; `confirmProfileForSession` guarda esa elección en sessionStorage.
    var profilePickerRequired = (function () {
      try { return sessionStorage.getItem(PROFILE_SESSION_STORAGE_KEY) !== activeProfileId; }
      catch (e) { return true; }
    })();
    function reloadApp(delay) { if (delay) setTimeout(function () { location.reload(); }, delay); else location.reload(); }
    function profileStorageKey(key) { return "tatoProfile_" + activeProfileId + "_" + key; }
    function saveLocalProfiles() { return safeStorageSet(PROFILE_STORAGE_KEY, JSON.stringify(localProfiles)); }
    function getActiveProfile() { return localProfiles.find(function (p) { return p.id === activeProfileId; }) || localProfiles[0]; }
    // ---- Idioma del perfil activo (ESP / ENG) ----
    var UI_LANG = (function () { var p = getActiveProfile(); return p && p.lang === "en" ? "en" : "es"; })();
    var UI_EN = UI_LANG === "en";
    var TMDB_LANG = UI_EN ? "en-US" : "es-MX";
    function defaultServerFor(lang) { return lang === "en" ? "ENG1" : "ESP1"; }
    // ---- Perfiles infantiles, PIN y seguridad local ----
    function isGuestProfile() { var p = getActiveProfile(); return !!p && !!p.guest; }
    /** Solo un perfil adulto (no Niño ni Invitado) administra perfiles. */
    function canManageProfiles() { var p = getActiveProfile(); return !!p && p.kind !== "kid" && !p.guest; }
    function profileDisplayName(p) { return p ? p.name : ""; }
    function isKidProfile() { var p = getActiveProfile(); return !!p && p.kind === "kid"; }
    function adultProfileCount(excludeId) {
      return localProfiles.filter(function (p) { return p.id !== excludeId && p.kind !== "kid" && !p.guest; }).length;
    }
    // Hash simple (cyrb53) con sal: evita guardar el PIN en texto plano. Es una barrera local, no cifrado fuerte.
    function hashPin(pin, salt) {
      var str = salt + ":" + pin, h1 = 0xdeadbeef ^ 7, h2 = 0x41c6ce57 ^ 7;
      for (var i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    }
    function makePin(pin) {
      var salt = Math.random().toString(36).slice(2, 10);
      return { s: salt, h: hashPin(pin, salt) };
    }
    function profileHasPin(p) { return !!(p && p.pin && p.pin.h); }
    var pinCallback = null, pinProfile = null, pinFailures = 0, pinLockedUntil = 0;
    function askProfilePin(profile, callback) {
      if (!profileHasPin(profile)) { callback(); return; }
      pinCallback = callback;
      pinProfile = profile;
      var overlay = document.getElementById("tc-pin-overlay");
      var input = document.getElementById("tc-pin-input");
      var sub = document.getElementById("tc-pin-subtitle");
      var err = document.getElementById("tc-pin-error");
      if (sub) sub.textContent = "Ingresa el PIN de \u201C" + profile.name + "\u201D para continuar.";
      if (err) err.textContent = "";
      if (input) input.value = "";
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      window.setTimeout(function () { if (input) input.focus(); }, 90);
    }
    function closePinModal() {
      var overlay = document.getElementById("tc-pin-overlay");
      if (overlay) { overlay.classList.remove("open"); overlay.setAttribute("aria-hidden", "true"); }
      var input = document.getElementById("tc-pin-input");
      if (input) input.value = "";
      pinCallback = null;
      pinProfile = null;
    }
    function submitPinModal() {
      var input = document.getElementById("tc-pin-input");
      var err = document.getElementById("tc-pin-error");
      if (!pinProfile || !input) return;
      var wait = pinLockedUntil - Date.now();
      if (wait > 0) { if (err) err.textContent = "Demasiados intentos. Espera " + Math.ceil(wait / 1000) + " s."; return; }
      var value = String(input.value || "").trim();
      if (hashPin(value, pinProfile.pin.s) === pinProfile.pin.h) {
        var cb = pinCallback;
        pinFailures = 0;
        closePinModal();
        if (cb) cb();
        return;
      }
      pinFailures++;
      input.value = "";
      if (pinFailures >= 5) {
        pinFailures = 0;
        pinLockedUntil = Date.now() + 30000;
        if (err) err.textContent = "Demasiados intentos. Espera 30 s.";
      } else if (err) err.textContent = "PIN incorrecto.";
      input.focus();
    }

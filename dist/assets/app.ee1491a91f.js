/* ==== js/core/config.js ==== */
/**
 * TatoCine · js/core/config.js
 * Configuración global: clave de TMDB, bases de imágenes, iconos y servidores de reproducción.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // PON TU API KEY AQUÍ
    const TMDB_API_KEY = "e97af3e0f298d66e3b0fc0a5a1e5ffa3";
    var IMG_BG = "https://image.tmdb.org/t/p/w1280";
    var IMG_CARD = "https://image.tmdb.org/t/p/w342";
    const IMG_W185 = "https://image.tmdb.org/t/p/w185";

    const icons = {
      lightning:
        '<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
      play: '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
      server:
        '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
      disc: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
      star: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    };
    const SERVERS = [
      {
        name: "ESP1",
        icon: icons.lightning,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://api.moviemaster.lat/e/tv/${i}/${s}/${e}?skin=minimal&color=000000&lang=LAT&autoplay=1`
            : `https://api.moviemaster.lat/e/movie/${i}?skin=minimal&color=000000&lang=LAT&autoplay=1`,
      },
      {
        name: "ESP2",
        icon: icons.disc,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://tukiplay.com/embed/tv/${i}/${s}/${e}?autoplay=1`
            : `https://tukiplay.com/embed/movie/${i}?autoplay=1`,
      },
      {
        name: "ESP3",
        icon: icons.play,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://unlimplay.com/f/embed/tv/${i}/${s}/${e}`
            : `https://unlimplay.com/f/embed/movie/${i}`,
      },
      {
        name: "ENG1",
        icon: icons.server,
        url: (i, t, s, e) =>
          t === "tv"
            ? `https://vidsrc.sh/embed/tv/${i}/${s}/${e}`
            : `https://vidsrc.sh/embed/movie/${i}`,
      },
    ];
;
/* ==== js/core/storage.js ==== */
/**
 * TatoCine · js/core/storage.js
 * Acceso seguro a localStorage (lectura JSON, escritura y borrado con manejo de errores).
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // Perfil Invitado: todo lo que cuelga de «tatoProfile_guest_» vive solo en memoria y se pierde al cerrar o recargar.
    // Se intercepta Storage (solo localStorage) para que ningún módulo escriba por error datos del invitado en disco.
    var GUEST_PREFIX = "tatoProfile_guest_", guestMemory = {};
    (function isolateGuestStorage() {
      try {
        var proto = Storage.prototype, rawGet = proto.getItem, rawSet = proto.setItem, rawRemove = proto.removeItem;
        function isGuestKey(store, key) { return store === window.localStorage && typeof key === "string" && key.indexOf(GUEST_PREFIX) === 0; }
        proto.getItem = function (key) {
          if (isGuestKey(this, key)) return Object.prototype.hasOwnProperty.call(guestMemory, key) ? guestMemory[key] : null;
          return rawGet.call(this, key);
        };
        proto.setItem = function (key, value) {
          if (isGuestKey(this, key)) { guestMemory[key] = String(value); return; }
          return rawSet.call(this, key, value);
        };
        proto.removeItem = function (key) {
          if (isGuestKey(this, key)) { delete guestMemory[key]; return; }
          return rawRemove.call(this, key);
        };
      } catch (e) { }
    })();
    function readLocalJSON(key, fallback) {
      try {
        var raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        var parsed = JSON.parse(raw);
        return parsed == null ? fallback : parsed;
      } catch (e) {
        return fallback;
      }
    }
    function safeStorageSet(key, value) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    }
    function safeStorageRemove(key) {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }
;
/* ==== js/core/extend.js ==== */
/**
 * TatoCine · js/core/extend.js
 * Punto de extensión de la app (principio abierto/cerrado): una capa nueva "decora" una función
 * existente sin editar su código. Las capas se aplican en el orden de carga (ver index.html).
 *
 *   decorate("closePlayer", function (original) {
 *     return function () { limpiar(); return original.apply(this, arguments); };
 *   });
 *
 * Funciona porque las funciones globales viven en `window`, de modo que los manejadores inline
 * (onclick="...") y las llamadas internas usan siempre la versión decorada.
 */
function decorate(name, factory) {
  var original = window[name];
  if (typeof original !== "function") {
    if (window.console) console.warn("TatoCine: no se puede decorar «" + name + "» (no existe).");
    return null;
  }
  var wrapped = factory(original);
  window[name] = wrapped;
  return wrapped;
}
;
/* ==== js/core/env.js ==== */
/**
 * TatoCine · js/core/env.js
 * Detección de entorno (TV, standalone, desarrollo), utilidades de arranque y aviso de consola.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    var IDLE = window.requestIdleCallback
      ? function (fn) { window.requestIdleCallback(fn, { timeout: 2500 }); }
      : function (fn) { setTimeout(fn, 400); };
    var IS_LOCAL_DEV = /^(localhost|127\.0\.0\.1|\[::1\]|.*\.localhost)$/.test(location.hostname) || location.protocol === "file:";
    var IS_TV = /SmartTV|Tizen|Web0S|WebOS|HbbTV|NetCast|BRAVIA|VIDAA|Android TV|AFT[A-Z]|CrKey|GoogleTV|SMART-TV|Xbox|PlayStation|Roku|Hisense|Philips|SonyDTV|Toshiba/i.test(navigator.userAgent) || /[?&]tv=1/.test(location.search);
    var IS_STANDALONE = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
    if (IS_TV) document.body.classList.add("tv-mode");
    if (IS_STANDALONE) document.body.classList.add("standalone");

    // ---- Consola: aviso para evitar engaños (self-XSS) ----
    (function consoleWarning() {
      try {
        console.log("%c¡CUIDADO!", "color:#fff;background:#c62828;font-size:34px;font-weight:800;padding:6px 14px;border-radius:8px");
        console.log("%cEsta consola es solo para desarrolladores. No puedes acceder aquí.\nSi alguien te pidió copiar y pegar algo en esta ventana, es un intento de engaño: pueden robar tus perfiles y tus datos.\nNo pegues ni ejecutes código que no entiendas.", "font-size:15px;line-height:1.7");
      } catch (e) { }
    })();
;
/* ==== js/profiles/profile-store.js ==== */
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
      guest.lang = /^en/i.test(navigator.language || "") ? "en" : "es";
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
    var profilePickerRequired = (function () {
      try { return sessionStorage.getItem(PROFILE_SESSION_STORAGE_KEY) !== activeProfileId; }
      catch (e) { return true; }
    })();
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
    function profileDisplayName(p) { return p && p.guest ? L("Invitado", "Guest") : (p ? p.name : ""); }
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
;
/* ==== js/profiles/profile-ui.js ==== */
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
;
/* ==== js/core/state.js ==== */
/**
 * TatoCine · js/core/state.js
 * Estado global de la app, caché de TMDB, imagen de respaldo y referencias al DOM.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    const LOCAL_ANALYTICS_KEY = "tatoLocalAnalyticsV1";
    let currentView = "home";
    let myList = readLocalJSON(profileStorageKey("tatoList"), []);
    let continueWatching = readLocalJSON(profileStorageKey("tatoContinue"), []);
    let localAnalytics = readLocalJSON(profileStorageKey(LOCAL_ANALYTICS_KEY), { items: [] });
    if (!localAnalytics || !Array.isArray(localAnalytics.items)) localAnalytics = { items: [] };
    let autoNextEpisode = readLocalJSON(profileStorageKey("tatoAutoNextEpisode"), true) !== false;
    let preferredServer = (function () {
      var def = defaultServerFor(UI_LANG), v = def;
      try { v = String(localStorage.getItem(profileStorageKey("tatoServer")) || def).replace(/"/g, ""); } catch (e) { }
      return SERVERS.some(function (sv) { return sv.name === v; }) ? v : def;
    })();

    let currentMedia = null,
      currentHeroMedia = null;
    let heroInterval = null,
      heroMoviesList = [],
      currentHeroIndex = 0,
      autoScrollInterval = null;
    let isSearching = false,
      currentGenreFilter = "",
      cachedDetails = {};
    let currentPage = 1,
      isLoadingMore = false,
      hasMorePages = false,
      currentMaxPage = 500;
    let filtersState = { year: "", rating: "", sort: "popularity.desc" };
    let searchRequestId = 0,
      heroRequestId = 0,
      searchDebounceTimer = null,
      catalogRequestId = 0;
    let loadMoreObserver = null,
      loadMoreScrollFallback = false,
      autoScrollPaused = false;
    let activePlayerFrame = null,
      currentTvSeasons = [],
      currentTvEpisodes = [],
      isAdvancingEpisode = false,
      similarQueue = [],
      similarQueuePromise = Promise.resolve([]),
      playerEndedHandled = false,
      isAdvancingSimilar = false;

    const tmdbCache = new Map();
    const tmdbPending = new Map();
    const CACHE_TTL = 10 * 60 * 1000;
    const CACHE_MAX_ENTRIES = 180;
    const MAX_TMDB_PAGE = 500;
    const FALLBACK_IMG =
      "data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 225%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22225%22/%3E%3Cpath d=%22M180 90v45l40-22.5z%22 fill=%22%23ffffff%22/%3E%3C/svg%3E";

    const $ = (id) => document.getElementById(id);
    const $heroSection = $("hero-section"),
      $heroVideoWrap = $("hero-video-wrap"),
      $heroBg = $("hero-bg"),
      $heroTitle = $("hero-title"),
      $heroYear = $("hero-year"),
      $heroMeta = $("hero-meta"),
      $heroDesc = $("hero-desc"),
      $heroContent = $("hero-content"),
      $heroActions = $("hero-actions"),
      $heroPlayBtn = $("hero-play-btn"),
      $heroDetailsBtn = $("hero-details-btn"),
      $rowsContainer = $("rows-container"),
      $searchInput = $("search-input"),
      $genreContainer = $("genre-filters-container"),
      $loadMoreContainer = $("load-more-container"),
      $modal = $("player-modal"),
      $modalTitle = $("modal-title"),
      $playerView = $("player-view"),
      $serverSwitcher = $("server-switcher"),
      $topBar = $("top-bar"),
      $tvControls = $("tv-controls"),
      $seasonSelect = $("season-select"),
      $episodeSelect = $("episode-select"),
      $disclaimerModal = $("disclaimer-modal"),
      $detailsModal = $("details-modal"),
      $settingsModal = $("settings-modal"),
      $actorModal = $("actor-modal"),
      $filtersModal = $("filters-modal"),
      $offlineBanner = $("offline-banner");
;
/* ==== js/core/ui-utils.js ==== */
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
;
/* ==== js/core/tmdb.js ==== */
/**
 * TatoCine · js/core/tmdb.js
 * Cliente de TMDB: caché en memoria, peticiones deduplicadas, tiempo límite e idioma por perfil.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function fetchTMDB(e, q) {
      return new Promise(function (resolve, reject) {
        if (
          !TMDB_API_KEY ||
          TMDB_API_KEY.includes("TU_CLAVE") ||
          TMDB_API_KEY === "xxx" ||
          TMDB_API_KEY === "xx" ||
          TMDB_API_KEY === "xxxx"
        )
          return reject(new Error("Sin API Key"));
        var key = e + "|" + (q || "");
        var now = Date.now();
        var cached = tmdbCache.get(key);
        if (cached && now - cached.ts < CACHE_TTL)
          return resolve(cached.data);
        if (tmdbPending.has(key)) {
          tmdbPending.get(key).then(resolve, reject);
          return;
        }
        var u;
        try {
          u = new URL("https://api.themoviedb.org/3" + e);
          u.searchParams.set("api_key", TMDB_API_KEY);
          u.searchParams.set("language", TMDB_LANG);
          if (activeProfileId === "guest") u.searchParams.set("_g", "1");   // el Service Worker no guarda estas respuestas
          var x = new URLSearchParams((q || "").replace(/^[?&]/, ""));
          x.forEach(function (v, k) {
            u.searchParams.set(k, v);
          });
        } catch (err) {
          return reject(err);
        }
        var controller =
          typeof window.AbortController === "function"
            ? new AbortController()
            : null;
        var options = {
          method: "GET",
          headers: { Accept: "application/json" },
        };
        if (controller) options.signal = controller.signal;
        var timeout = setTimeout(function () {
          if (controller) controller.abort();
        }, 18000);
        var request = fetch(u.toString(), options)
          .then(function (r) {
            if (!r.ok) throw new Error("TMDB HTTP " + r.status);
            return r.json();
          })
          .then(function (d) {
            if (d && !d.error) {
              tmdbCache.set(key, { data: d, ts: Date.now() });
              if (tmdbCache.size > CACHE_MAX_ENTRIES) {
                var oldest = tmdbCache.keys().next().value;
                if (oldest) tmdbCache.delete(oldest);
              }
            }
            return d;
          });
        tmdbPending.set(key, request);
        request.then(
          function (data) {
            clearTimeout(timeout);
            tmdbPending.delete(key);
            resolve(data);
          },
          function (err) {
            clearTimeout(timeout);
            tmdbPending.delete(key);
            reject(err);
          },
        );
      });
    }
;
/* ==== js/profiles/profile-backdrop.js ==== */
/**
 * TatoCine · js/profiles/profile-backdrop.js
 * Fondos cinematográficos rotativos del selector de perfiles.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ==========================================================
    // Selector de perfiles: fondos cinematográficos curados TMDB
    // Orden solicitado; las búsquedas conservan ese orden.
    // ==========================================================
    var PROFILE_BACKDROP_FEATURED = [
      { label: "Stranger Things", type: "tv", queries: ["Stranger Things"] },
      { label: "Ratatouille", type: "movie", queries: ["Ratatouille"] },
      { label: "Batman: El caballero de la noche", type: "movie", queries: ["The Dark Knight", "Batman: El caballero de la noche"] },
      { label: "Yo, él y Raquel", type: "movie", queries: ["Me and Earl and the Dying Girl", "Yo, él y Raquel"] },
      { label: "Loki", type: "tv", queries: ["Loki"] },
      { label: "Game of Thrones", type: "tv", queries: ["Game of Thrones"] },
      { label: "Pulp Fiction", type: "movie", queries: ["Pulp Fiction"] },
      { label: "Star Wars: Episodio III", type: "movie", queries: ["Star Wars: Episode III - Revenge of the Sith", "Revenge of the Sith"] },
      { label: "Naruto Shippuden", type: "tv", queries: ["Naruto Shippuden", "Naruto: Shippuden"] },
      { label: "Avengers: Doomsday", type: "movie", year: 2026, queries: ["Avengers: Doomsday", "Avengers Doomsday"] },
      { label: "Spider-Man: Brand New Day", type: "movie", year: 2026, queries: ["Spider-Man: Brand New Day", "Spider-Man Brand New Day", "Spider-Man: No Way Home"] },
      { label: "1917", type: "movie", queries: ["1917"] },
      { label: "El Padrino", type: "movie", queries: ["The Godfather", "El Padrino"] },
      { label: "Volver al futuro", type: "movie", queries: ["Back to the Future", "Volver al futuro"] },
      { label: "American Psycho", type: "movie", queries: ["American Psycho", "American Psyco"] },
      { label: "Spider-Man: A través del Spider-Verso", type: "movie", queries: ["Spider-Man: Across the Spider-Verse", "Spider-Man Across the Spider Verse"] },
      { label: "Dune: Parte uno", type: "movie", year: 2021, queries: ["Dune: Part One", "Dune"] },
      { label: "Gravity Falls", type: "tv", queries: ["Gravity Falls"] },
      { label: "Coco", type: "movie", queries: ["Coco"] },
      { label: "Toy Story", type: "movie", queries: ["Toy Story"] }
    ];

    function profileBackdropEndpoint(entry) {
      return entry.type === "tv" ? "/search/tv" : "/search/movie";
    }

    function chooseProfileBackdropResult(entry, results) {
      var valid = (Array.isArray(results) ? results : []).filter(function (item) {
        return item && typeof item.backdrop_path === "string" && item.backdrop_path.charAt(0) === "/";
      });
      if (!valid.length) return null;

      // Si se indicó año, prioriza el título de ese año sin descartar un resultado válido.
      if (entry.year) {
        var dateField = entry.type === "tv" ? "first_air_date" : "release_date";
        var exactYear = valid.find(function (item) {
          return String(item[dateField] || "").slice(0, 4) === String(entry.year);
        });
        if (exactYear) return exactYear;
      }
      return valid[0];
    }

    function fetchProfileBackdropEntry(entry, queryIndex) {
      var index = queryIndex || 0;
      if (index >= entry.queries.length) return Promise.resolve(null);

      var params = "query=" + encodeURIComponent(entry.queries[index]) + "&include_adult=false&page=1";
      if (entry.year) params += "&year=" + encodeURIComponent(entry.year);

      return fetchTMDB(profileBackdropEndpoint(entry), params)
        .then(function (data) {
          var selected = chooseProfileBackdropResult(entry, data && data.results);
          if (selected) {
            selected._tcProfileLabel = entry.label;
            selected._tcProfileType = entry.type;
            return selected;
          }
          return fetchProfileBackdropEntry(entry, index + 1);
        })
        .catch(function (error) {
          console.warn("TatoCine: búsqueda de fondo fallida para " + entry.label + ".", error);
          return fetchProfileBackdropEntry(entry, index + 1);
        });
    }

    function loadProfileBackdropCollection() {
      var results = new Array(PROFILE_BACKDROP_FEATURED.length);
      var cursor = 0;
      var workerCount = Math.min(4, PROFILE_BACKDROP_FEATURED.length);

      function worker() {
        var current = cursor++;
        if (current >= PROFILE_BACKDROP_FEATURED.length) return Promise.resolve();
        return fetchProfileBackdropEntry(PROFILE_BACKDROP_FEATURED[current], 0)
          .then(function (item) {
            results[current] = item;
            return worker();
          });
      }

      var workers = [];
      for (var w = 0; w < workerCount; w++) workers.push(worker());

      return Promise.all(workers).then(function () {
        var curated = results.filter(Boolean);
        var missing = PROFILE_BACKDROP_FEATURED.filter(function (entry, index) {
          return !results[index];
        }).map(function (entry) { return entry.label; });

        if (missing.length) {
          console.warn("TatoCine: TMDB no devolvió fondos para:", missing.join(" · "));
        }

        // Conserva los 20 títulos en el orden solicitado. Solo añade tendencias
        // al final como respaldo cuando TMDB no encuentre suficientes fondos.
        if (curated.length >= 2) return shuffleInPlace(curated);   // orden aleatorio en cada carga
        return fetchTMDB("/trending/all/week")
          .then(function (data) {
            var seen = Object.create(null);
            curated.forEach(function (item) { seen[item.backdrop_path] = true; });
            (data && Array.isArray(data.results) ? data.results : []).forEach(function (item) {
              if (curated.length >= 6) return;
              if (!item || !item.backdrop_path || seen[item.backdrop_path]) return;
              seen[item.backdrop_path] = true;
              item._tcProfileLabel = item.title || item.name || "Tendencia";
              curated.push(item);
            });
            return curated;
          })
          .catch(function () { return curated; });
      });
    }

    function preloadProfileBackdropImage(item) {
      if (!item || !item.backdrop_path) return Promise.resolve(null);
      if (item._tcBackdropImage && item._tcBackdropImage.complete && item._tcBackdropImage.naturalWidth > 0) {
        return Promise.resolve(item._tcBackdropImage);
      }
      if (item._tcBackdropPromise) return item._tcBackdropPromise;

      item._tcBackdropPromise = new Promise(function (resolve) {
        var image = new Image();
        var settled = false;
        var timeout = window.setTimeout(function () { finish(null); }, 12000);

        function finish(result) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          image.onload = null;
          image.onerror = null;
          if (result) item._tcBackdropImage = image;
          else item._tcBackdropPromise = null;
          resolve(result);
        }

        image.decoding = "async";
        image.onload = function () { finish(image.naturalWidth > 0 ? image : null); };
        image.onerror = function () { finish(null); };
        item._tcBackdropUrl = IMG_BG + item.backdrop_path;
        image.src = item._tcBackdropUrl;
        if (image.complete && image.naturalWidth > 0) finish(image);
      });

      return item._tcBackdropPromise;
    }

    function scheduleNextProfileBackdrop() {
      if (profileBackdropTimer) {
        window.clearTimeout(profileBackdropTimer);
        profileBackdropTimer = null;
      }

      var overlay = document.getElementById("tc-profile-overlay");
      if (!overlay || !overlay.classList.contains("open") || profileBackdropItems.length < 2) return;

      // El cambio de imagen NO depende de prefers-reduced-motion. Esa preferencia
      // solo afecta al fundido CSS, no al funcionamiento del carrusel.
      profileBackdropTimer = window.setTimeout(function () {
        profileBackdropTimer = null;
        if (!overlay.classList.contains("open")) return;
        if (document.hidden || profileBackdropLoading) {
          scheduleNextProfileBackdrop();
          return;
        }
        setProfileBackdrop(profileBackdropNextIndex, 0);
      }, 6000);
    }

    function setProfileBackdrop(index, attempts) {
      var overlay = document.getElementById("tc-profile-overlay");
      var layers = overlay ? overlay.querySelectorAll(".tc-profile-backdrop-layer") : [];
      var total = profileBackdropItems.length;
      if (!overlay || !overlay.classList.contains("open") || !layers || layers.length < 2 || !total || profileBackdropLoading) return;

      var currentAttempt = attempts || 0;
      if (currentAttempt >= total) {
        profileBackdropLoading = false;
        console.warn("TatoCine: no quedan fondos de perfil disponibles para mostrar.");
        return;
      }

      var normalizedIndex = ((index % total) + total) % total;
      var item = profileBackdropItems[normalizedIndex];
      if (!item || !item.backdrop_path) {
        profileBackdropNextIndex = (normalizedIndex + 1) % total;
        setProfileBackdrop(profileBackdropNextIndex, currentAttempt + 1);
        return;
      }

      profileBackdropLoading = true;
      var requestId = ++profileBackdropImageRequest;

      preloadProfileBackdropImage(item).then(function (image) {
        if (requestId !== profileBackdropImageRequest) return;
        if (!overlay.classList.contains("open")) {
          profileBackdropLoading = false;
          return;
        }

        if (!image) {
          item._tcBackdropFailed = true;
          profileBackdropLoading = false;
          profileBackdropNextIndex = (normalizedIndex + 1) % total;
          setProfileBackdrop(profileBackdropNextIndex, currentAttempt + 1);
          return;
        }

        var currentLayers = overlay.querySelectorAll(".tc-profile-backdrop-layer");
        if (!currentLayers || currentLayers.length < 2) {
          profileBackdropLoading = false;
          return;
        }

        var targetLayerIndex = profileBackdropLayerIndex === 0 ? 1 : 0;
        currentLayers[targetLayerIndex].style.backgroundImage = "url(\"" + (item._tcBackdropUrl || IMG_BG + item.backdrop_path) + "\")";
        currentLayers[targetLayerIndex].style.backgroundPosition = "center 35%";
        currentLayers[targetLayerIndex].classList.add("visible");
        currentLayers[profileBackdropLayerIndex].classList.remove("visible");

        profileBackdropLayerIndex = targetLayerIndex;
        profileBackdropIndex = normalizedIndex;
        profileBackdropNextIndex = (normalizedIndex + 1) % total;
        profileBackdropHasVisibleImage = true;
        profileBackdropLoading = false;

        // Prepara el próximo fondo antes de que llegue el siguiente intervalo.
        preloadProfileBackdropImage(profileBackdropItems[profileBackdropNextIndex]);
        scheduleNextProfileBackdrop();
      }).catch(function (error) {
        if (requestId !== profileBackdropImageRequest) return;
        profileBackdropLoading = false;
        console.warn("TatoCine: no se pudo aplicar el fondo de " + (item._tcProfileLabel || "TMDB") + ".", error);
        profileBackdropNextIndex = (normalizedIndex + 1) % total;
        setProfileBackdrop(profileBackdropNextIndex, currentAttempt + 1);
      });
    }

    function stopProfileBackdropCarousel() {
      if (profileBackdropTimer) {
        window.clearTimeout(profileBackdropTimer);
        profileBackdropTimer = null;
      }
      // Cada vez que se vuelve a abrir el selector el orden es distinto.
      if (profileBackdropItems.length > 1) {
        shuffleInPlace(profileBackdropItems);
        profileBackdropNextIndex = Math.floor(Math.random() * profileBackdropItems.length);
      }
      // Invalida cualquier descarga de imagen pendiente al cerrar el selector.
      profileBackdropImageRequest++;
      profileBackdropLoading = false;
    }

    function startProfileBackdropCarousel() {
      var overlay = document.getElementById("tc-profile-overlay");
      if (!overlay || !overlay.classList.contains("open")) return;

      if (profileBackdropItems.length) {
        if (!profileBackdropStarted || !profileBackdropHasVisibleImage) {
          profileBackdropStarted = true;
          if (!profileBackdropLoading) setProfileBackdrop(profileBackdropNextIndex, 0);
        } else if (!profileBackdropTimer && !profileBackdropLoading) {
          scheduleNextProfileBackdrop();
        }
        return;
      }

      if (profileBackdropFetchPending) return;
      profileBackdropFetchPending = true;
      loadProfileBackdropCollection()
        .then(function (items) {
          profileBackdropItems = items;
          profileBackdropNextIndex = items.length ? Math.floor(Math.random() * items.length) : 0;
          profileBackdropFetchPending = false;
          if (profileBackdropItems.length) {
            console.info("TatoCine: fondos del selector listos en el orden solicitado (" + profileBackdropItems.length + "/" + PROFILE_BACKDROP_FEATURED.length + ").");
            if (overlay.classList.contains("open")) startProfileBackdropCarousel();
          } else {
            console.warn("TatoCine: TMDB no devolvió fondos utilizables para el selector.");
          }
        })
        .catch(function (error) {
          profileBackdropFetchPending = false;
          console.warn("TatoCine: no se pudieron obtener los fondos del selector desde TMDB.", error);
        });
    }

    if (!window.__tcProfileBackdropVisibilityListener) {
      window.__tcProfileBackdropVisibilityListener = true;
      document.addEventListener("visibilitychange", function () {
        var overlay = document.getElementById("tc-profile-overlay");
        if (!overlay || !overlay.classList.contains("open")) return;
        if (!document.hidden && !profileBackdropTimer && !profileBackdropLoading && profileBackdropItems.length >= 2) {
          scheduleNextProfileBackdrop();
        }
      });
    }
;
/* ==== js/features/analytics.js ==== */
/**
 * TatoCine · js/features/analytics.js
 * Analítica local base: reproducciones, géneros y perfil de gustos.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function getDistinctPlayedCount() {
      var seen = {};
      (localAnalytics.items || []).forEach(function (x) {
        seen[x.type + ":" + x.id] = true;
      });
      return Object.keys(seen).length;
    }
    function saveLocalAnalytics() {
      safeStorageSet(profileStorageKey(LOCAL_ANALYTICS_KEY), JSON.stringify(localAnalytics));
      updateLocalAnalyticsUI();
    }
    function recordMediaStart(media, genreIds) {
      if (!media || !media.id || !media.type) return;
      var key = media.type + ":" + media.id;
      var now = Date.now();
      var item = (localAnalytics.items || []).find(function (x) {
        return x.type + ":" + x.id === key;
      });
      if (!item) {
        item = {
          id: media.id,
          type: media.type,
          title: media.title || "Contenido",
          genreIds: [],
          plays: 0,
          firstPlayedAt: now,
          lastPlayedAt: now,
        };
        localAnalytics.items.push(item);
      }
      item.plays = (item.plays || 0) + 1;
      item.lastPlayedAt = now;
      item.title = media.title || item.title;
      (genreIds || media.genre_ids || []).forEach(function (id) {
        var n = Number(id);
        if (n && item.genreIds.indexOf(n) === -1) item.genreIds.push(n);
      });
      localAnalytics.items = localAnalytics.items.slice(-120);
      saveLocalAnalytics();
    }
    function updateMediaGenres(media, genreIds) {
      if (!media || !media.id || !media.type) return;
      var key = media.type + ":" + media.id;
      var item = (localAnalytics.items || []).find(function (x) {
        return x.type + ":" + x.id === key;
      });
      if (!item) return;
      (genreIds || []).forEach(function (id) {
        var n = Number(id);
        if (n && item.genreIds.indexOf(n) === -1) item.genreIds.push(n);
      });
      saveLocalAnalytics();
    }
    function getTasteProfile() {
      var counts = {};
      var names = {};
      var source = localAnalytics.items || [];
      source.forEach(function (item) {
        (item.genreIds || []).forEach(function (id) {
          // Los gustos recientes pesan más; los antiguos se atenúan sin desaparecer.
          var ageDays = Math.max(0, (Date.now() - (item.lastPlayedAt || Date.now())) / 86400000);
          var recency = 0.4 + 0.6 * Math.pow(0.5, ageDays / 45);
          counts[id] =
            (counts[id] || 0) + tasteWeight(item) * recency;
        });
      });
      // Señales extra (valoraciones 👍/👎 del usuario) definidas en features/watched.js
      if (typeof tasteExtras === "function") {
        tasteExtras().forEach(function (x) {
          x.genres.forEach(function (id) { counts[id] = Math.max(0, (counts[id] || 0) + x.weight); });
        });
      }
      var genreNames = {
        28: "Acción",
        12: "Aventura",
        16: "Animación",
        35: "Comedia",
        80: "Crimen",
        99: "Documental",
        18: "Drama",
        10751: "Familia",
        14: "Fantasía",
        36: "Historia",
        27: "Terror",
        10402: "Música",
        9648: "Misterio",
        10749: "Romance",
        878: "Ciencia ficción",
        10770: "Película para televisión",
        53: "Suspenso",
        10752: "Bélica",
        37: "Western",
        10759: "Acción y aventura",
        10762: "Infantil",
        10763: "Noticias",
        10764: "Reality",
        10765: "Ciencia ficción y fantasía",
        10766: "Telenovela",
        10767: "Talk show",
        10768: "Guerra y política",
      };
      return Object.keys(counts)
        .map(function (id) {
          return {
            id: Number(id),
            score: Math.round(counts[id] * 100) / 100,
            name: genreNames[id] || "Otros",
          };
        })
        .sort(function (a, b) {
          return b.score - a.score;
        });
    }
    function clearLocalAnalytics() {
      if (
        !confirm(
          "¿Borrar el historial local que utiliza TatoCine para personalizar las recomendaciones?",
        )
      )
        return;
      localAnalytics = { items: [] };
      safeStorageRemove(profileStorageKey(LOCAL_ANALYTICS_KEY));
      document.querySelectorAll(".personalized-row").forEach(function (row) {
        if (row.parentNode) row.parentNode.removeChild(row);
      });
      updateLocalAnalyticsUI();
      closeSettings();
      showToast("Preferencias locales borradas");
    }
;
/* ==== js/core/utils.js ==== */
/**
 * TatoCine · js/core/utils.js
 * Utilidades compartidas: escape de HTML, favoritos y fechas de estreno.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    /** Mezcla un arreglo en el sitio (Fisher-Yates) y lo devuelve. */
    function shuffleInPlace(list) {
      for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
      }
      return list;
    }
    function escapeHTML(value) {
      return String(value == null ? "" : value).replace(
        /[&<>\"']/g,
        function (ch) {
          return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '\"': "&quot;",
            "'": "&#39;",
          }[ch];
        },
      );
    }
    function isSaved(i) {
      return myList.some(function (m) {
        return m.id === i.id && m.type === i.type;
      });
    }
    function isUpcoming(releaseDate, status, type) {
      var currentStatus = String(status || "").toLowerCase();

      // Si TMDB confirma que ya se estrenó, prevalece ese estado.
      var alreadyReleased =
        currentStatus === "released" ||
        (type === "tv" &&
          ["returning series", "ended", "canceled"].includes(currentStatus));

      if (alreadyReleased) return false;

      // Evita errores de zona horaria al interpretar YYYY-MM-DD.
      var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(releaseDate || ""));

      if (!match) return true;

      var year = Number(match[1]);
      var month = Number(match[2]);
      var day = Number(match[3]);

      var release = new Date(year, month - 1, day);

      if (
        release.getFullYear() !== year ||
        release.getMonth() !== month - 1 ||
        release.getDate() !== day
      ) {
        return true;
      }

      var releaseKey = year * 10000 + month * 100 + day;
      var today = new Date();

      var todayKey =
        today.getFullYear() * 10000 +
        (today.getMonth() + 1) * 100 +
        today.getDate();

      return releaseKey >= todayKey;
    }
;
/* ==== js/ui/skeletons.js ==== */
/**
 * TatoCine · js/ui/skeletons.js
 * Marcadores de carga (skeletons) reutilizables: una sola fuente para filas, tarjetas, listas de episodios y resultados.
 * Son bloques con un pulso suave de opacidad (barato para GPU y desactivado con «reducir movimiento» y modo ligero).
 */
function skeletonCards(n) { var h = ""; for (var i = 0; i < n; i++) h += '<div class="skeleton-card"></div>'; return h; }
function skeletonRow(n) {
  return '<div class="row skeleton-row" aria-hidden="true"><div class="row-header"><span class="skel skel-title"></span></div><div class="row-scroll">' + skeletonCards(n || 5) + "</div></div>";
}
function skeletonRows(rows, cards) { var h = ""; for (var i = 0; i < (rows || 3); i++) h += skeletonRow(cards); return h; }
function skeletonEpisodes(n) {
  var h = '<div class="ep-skeletons" aria-hidden="true">';
  for (var i = 0; i < (n || 4); i++) h += '<div class="ep-item ep-skel"><div class="ep-thumb skel"></div><div class="ep-info"><span class="skel skel-line"></span><span class="skel skel-line short"></span></div></div>';
  return h + "</div>";
}
function skeletonResults(n) {
  var h = '<div class="wiz-results" aria-hidden="true">';
  for (var i = 0; i < (n || 3); i++) h += '<div class="wiz-result wiz-skel"><div class="skel skel-thumb"></div><div class="wiz-info"><span class="skel skel-line"></span><span class="skel skel-line short"></span><span class="skel skel-line"></span></div></div>';
  return h + "</div>";
}
/** La portada muestra un esqueleto hasta que llega el primer título. */
function setHeroLoading(on) { if ($heroSection) $heroSection.classList.toggle("hero-loading", !!on); }
;
/* ==== js/features/favorites.js ==== */
/**
 * TatoCine · js/features/favorites.js
 * Favoritos: botón corazón de tarjetas y portada.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function updateHeroSaveButton(media) {
      var btn = $("hero-save-btn");
      if (!btn) return;
      var saved = !!(media && isSaved(media));
      var label = saved ? "Quitar" : "Agregar";
      btn.classList.toggle("saved", saved);
      btn.setAttribute("aria-pressed", saved ? "true" : "false");
      btn.setAttribute("aria-label", label);
      btn.title = label;
      var svg = btn.querySelector("svg");
      if (svg) svg.setAttribute("fill", saved ? "currentColor" : "none");
    }
;
/* ==== js/features/continue-watching.js ==== */
/**
 * TatoCine · js/features/continue-watching.js
 * Continuar viendo: guardado, progreso y fila del inicio.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function getStatusText(s) {
      if (!s) return "";
      if (s === "Ended" || s === "Canceled") return "Finalizada";
      if (s === "Returning Series" || s === "In Production")
        return "En Emisión";
      if (s === "Released") return "Estrenada";
      if (s === "Post Production") return "Próximamente";
      if (s === "Planned") return "Planeada";
      if (s === "Rumored") return "Rumoreada";
      if (s === "Pilot") return "Piloto";
      return s;
    }
    function isEndedStatus(s) {
      return s === "Ended" || s === "Canceled";
    }
    function saveContinueWatching(media, season, episode) {
      var entry = {
        id: media.id,
        type: media.type,
        title: media.title,
        bg: media.bg,
        year: media.year,
        rating: media.rating,
        season: season || null,
        episode: episode || null,
        episodeName: (currentTvEpisodes || []).find(function (item) { return Number(item.episode_number) === Number(episode); })?.name || "",
        timestamp: Date.now(),
      };
      continueWatching = continueWatching.filter(function (m) {
        return !(m.id === media.id && m.type === media.type);
      });
      continueWatching.unshift(entry);
      continueWatching = continueWatching.slice(0, 20);
      safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
    }
    function clearContinueWatching() {
      safeStorageRemove(profileStorageKey("tatoContinue"));
      continueWatching = [];
      closeSettings();
      switchView(currentView, false);
      showToast("Historial borrado");
    }
    function removeContinueWatchingItem(id, type, card) {
      var updated = continueWatching.filter(function (item) {
        return !(String(item.id) === String(id) && item.type === type);
      });

      if (updated.length === continueWatching.length) return;

      try {
        safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(updated));
      } catch (error) {
        showToast("No se pudo guardar el cambio");
        return;
      }

      // Capturar la fila ANTES de quitar la tarjeta del DOM.
      var row = card && card.closest ? card.closest(".continue-row") : null;
      continueWatching = updated;

      if (card && card.parentNode) card.parentNode.removeChild(card);

      if (row) {
        var scroller = row.querySelector(".row-scroll");
        if (!scroller || !scroller.querySelector(".continue-card")) {
          row.parentNode && row.parentNode.removeChild(row);
        }
      }

      showToast("Eliminado de Continuar Viendo");
    }

    function renderContinueRow() {
      var continueVisible = continueWatching.filter(function (m) { return !(m.type === "movie" && m.pct >= 92); });
      if (continueVisible.length === 0) return;

      var d = document.createElement("div");
      d.className = "row continue-row";

      d.innerHTML =
        '<div class="row-header">' +
        '<h2 class="row-title">Continuar Viendo</h2>' +
        '<button class="row-clear-btn" onclick="clearContinueWatching()">Limpiar</button>' +
        "</div>" +
        '<button class="row-nav prev" onclick="scrollRow(this,-1)">‹</button>' +
        '<button class="row-nav next" onclick="scrollRow(this,1)">›</button>' +
        '<div class="row-scroll"></div>';

      var scroll = d.querySelector(".row-scroll");

      continueVisible.forEach(function (m) {
        var card = document.createElement("div");
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.className = "card continue-card";

        var progressInfo = m.season
          ? "T" + m.season + " · E" + m.episode + (m.episodeName ? " · " + m.episodeName : "")
          : (m.type === "movie" ? "Película · Reanudar" : "Serie · Reanudar");

        var imageUrl = m.bg
          ? String(m.bg).startsWith("http")
            ? m.bg
            : IMG_CARD + m.bg
          : FALLBACK_IMG;

        var img = document.createElement("img");
        img.src = imageUrl;
        img.alt = m.title || "Contenido";
        img.loading = "lazy";
        img.decoding = "async";

        img.onload = function () {
          img.classList.add("loaded");
        };

        img.onerror = function () {
          img.onerror = null;
          img.src = FALLBACK_IMG;
        };

        var overlay = document.createElement("div");
        overlay.className = "card-overlay";

        var title = document.createElement("div");
        title.className = "card-title";
        title.textContent = m.title || "Sin título";

        var progress = document.createElement("div");
        progress.style.cssText = "font-size:13px;line-height:1.35;color:#d0d0d0;margin-top:5px;";
        progress.textContent = progressInfo + (m.timestamp ? " · " + (new Date(m.timestamp).toLocaleDateString(UI_EN ? "en-US" : "es-GT", { day: "numeric", month: "short" })) : "");

        overlay.appendChild(title);
        overlay.appendChild(progress);

        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "continue-remove-btn";
        removeBtn.title = "Quitar de Continuar Viendo";
        removeBtn.setAttribute(
          "aria-label",
          "Quitar " + (m.title || "contenido") + " de Continuar Viendo",
        );

        removeBtn.innerHTML =
          '<svg viewBox="0 0 24 24" width="17" height="17" ' +
          'fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5"/>' +
          "</svg>";

        removeBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation && e.stopImmediatePropagation();
          removeContinueWatchingItem(m.id, m.type, card);
        });

        card.appendChild(img);
        card.appendChild(overlay);
        card.appendChild(removeBtn);
        if (m.pct > 1 && m.pct < 100) {
          var bar = document.createElement("div");
          bar.className = "continue-progress";
          var fill = document.createElement("span");
          fill.style.width = Math.min(100, m.pct) + "%";
          bar.appendChild(fill);
          card.appendChild(bar);
          card.classList.add("has-progress");
        }

        card.addEventListener("click", function () {
          openPlayer(m.id, m.type, m.title, m.season, m.episode, m.bg);
        });

        scroll.appendChild(card);
        // Si la entrada no tiene imagen guardada, se obtiene de TMDB y se guarda para la próxima vez.
        if (!m.bg) {
          fetchTMDB((m.type === "tv" ? "/tv/" : "/movie/") + m.id).then(function (det) {
            var p = det && (det.backdrop_path || det.poster_path);
            if (!p) return;
            m.bg = p;
            img.src = IMG_CARD + p;
            safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
          }).catch(function () { });
        }
      });

      $rowsContainer.appendChild(d);
    }
;
/* ==== js/player/servers.js ==== */
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
;
/* ==== js/features/share.js ==== */
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
;
/* ==== js/ui/cards.js ==== */
/**
 * TatoCine · js/ui/cards.js
 * Tarjetas, filas (carruseles) y cuadrículas.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function getCardHTML(i) {
      var s = isSaved(i);
      var st = String(i.title || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      var sb = (i.bg || "").replace(/'/g, "\\'");
      var b = i.bg ? (i.bg.startsWith("http") ? i.bg : IMG_CARD + i.bg) : "";
      var upcomingClass = (i.isUpcoming ? "upcoming" : "") + (i.topRank ? " top-ranked" + (Number(i.topRank) >= 10 ? " rank-wide" : "") : "");
      var upcomingBadge = i.isUpcoming
        ? '<div class="badge-upcoming">PRÓXIMAMENTE</div>'
        : "";
      var topRankBadge = i.topRank
        ? '<div class="top10-rank-badge" aria-label="Puesto ' + Number(i.topRank) + '">' + Number(i.topRank) + '</div>'
        : "";
      var ratingBadge =
        !i.isUpcoming && i.rating
          ? '<div class="rating-badge">' +
          icons.star +
          Number(i.rating).toFixed(1) +
          "</div>"
          : "";
      var statusBadge =
        !i.isUpcoming && i.status
          ? '<div class="status-badge ' +
          (isEndedStatus(i.status) ? "ended" : "") +
          (i.rating ? " has-rating" : "") +
          '">' +
          getStatusText(i.status).toUpperCase() +
          "</div>"
          : "";
      return (
        '<div class="card ' +
        upcomingClass +
        '" tabindex="0" role="button" onclick="openDetails(' +
        i.id +
        ",'" +
        i.type +
        '\')" onmouseenter="prefetchDetails(' +
        i.id +
        ",'" +
        i.type +
        '\')"><img alt="' + escapeHTML(i.title) + '" src="' +
        (b || FALLBACK_IMG) +
        '" loading="lazy" decoding="async" fetchpriority="low" onload="this.classList.add(\'loaded\')" onerror="this.onerror=null;this.src=\'' +
        FALLBACK_IMG +
        "'\"/>" +
        ratingBadge +
        statusBadge +
        upcomingBadge +
        topRankBadge +
        '<button class="share-card-btn" onclick="shareCard(event,{id:' +
        i.id +
        ",type:'" +
        i.type +
        "',title:'" +
        st +
        '\'})" title="Compartir" aria-label="Compartir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button><button class="save-btn ' +
        (s ? "saved" : "") +
        '" title="Favoritos" aria-label="Favoritos" onclick="toggleSave(event,{id:' +
        i.id +
        ",type:'" +
        i.type +
        "',title:'" +
        st +
        "',bg:'" +
        sb +
        "',rating:" +
        (i.rating || 0) +
        ",year:'" +
        (i.year || "") +
        '\'})"><svg width="14" height="14" viewBox="0 0 24 24" fill="' +
        (s ? "currentColor" : "none") +
        '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button><div class="card-overlay"><div class="card-title">' +
        escapeHTML(i.title) +
        "</div></div></div>"
      );
    }
    function renderRow(t, m) {
      if (!m || m.length === 0) return;
      var d = document.createElement("div");
      d.className = "row catalog-row";
      var h = m.map(getCardHTML).join("");
      d.innerHTML =
        '<div class="row-header"><h2 class="row-title">' +
        escapeHTML(t) +
        '</h2></div><button class="row-nav prev" onclick="scrollRow(this,-1)" aria-label="Anterior">‹</button><button class="row-nav next" onclick="scrollRow(this,1)" aria-label="Siguiente">›</button><div class="row-scroll">' +
        h +
        "</div>";
      $rowsContainer.appendChild(d);
    }
    function scrollRow(b, d) {
      var r = b.closest(".row"),
        s = r.querySelector(".row-scroll"),
        a = s.clientWidth * 0.85;
      s.scrollBy({ left: a * d, behavior: "smooth" });
    }
    function scrollCast(b, d) {
      var w = b.closest(".cast-wrapper"),
        s = w.querySelector(".details-cast"),
        a = s.clientWidth * 0.85;
      s.scrollBy({ left: a * d, behavior: "smooth" });
    }
    function scrollSimilar(b, d) {
      var w = b.closest(".cast-wrapper"),
        s = w.querySelector(".details-cast"),
        a = s.clientWidth * 0.85;
      s.scrollBy({ left: a * d, behavior: "smooth" });
    }
;
/* ==== js/ui/hero.js ==== */
/**
 * TatoCine · js/ui/hero.js
 * Portada (hero): metadatos, clasificación por edad, carrusel y descripción.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // HERO: metadatos y tráiler asociados siempre al título que realmente está visible.
    function heroCategory(m) {
      if (m.category) return m.category;
      if (currentView === "anime") return "Anime";
      if (currentView === "kids")
        return m.type === "movie" ? "Película infantil" : "Serie infantil";
      if (m.type === "movie") return "Película";
      if (
        m.type === "tv" &&
        m.original_language === "ja" &&
        (m.genre_ids || []).indexOf(16) > -1
      )
        return "Anime";
      return "Serie";
    }
    function normalizeAgeRating(cert) {
      if (!cert) return "";

      var c = String(cert).trim().toUpperCase();

      var ratings = {
        G: "Todo público",
        "TV-G": "Todo público",
        "TV-Y": "Todo público",
        ALL: "Todo público",
        PG: "+7",
        "TV-PG": "+7",
        "TV-Y7": "+7",
        "TV-Y7-FV": "+7",
        "PG-13": "+13",
        "TV-14": "+14",
        12: "+12",
        "12A": "+12",
        13: "+13",
        15: "+15",
        16: "+16",
        R: "+18",
        "NC-17": "+18",
        "TV-MA": "+18",
        18: "+18",
        "18A": "+18",
      };

      if (ratings[c]) return ratings[c];

      if (/^\d{1,2}$/.test(c)) return "+" + c;

      return c;
    }

    function extractCertification(data, type) {
      // Ignorar registros sin una clasificación utilizable.
      function isUsableCertification(value) {
        var cert = String(value || "").trim();
        if (!cert) return false;
        return !/^(NR|N\/A|NA|NOT RATED|UNRATED|NOT RATED YET|-)$/i.test(
          cert,
        );
      }

      if (type === "movie") {
        var groups =
          data.release_dates && data.release_dates.results
            ? data.release_dates.results
            : [];

        function certificationsFromGroup(group) {
          return (group.release_dates || [])
            .map(function (item) {
              return item.certification;
            })
            .filter(isUsableCertification);
        }

        // Prioridad: Guatemala, Estados Unidos y después cualquier país
        // que realmente tenga una certificación. No basta con que exista
        // un registro de Guatemala si su campo certification está vacío.
        var preferredCountries = ["GT", "US"];
        for (var i = 0; i < preferredCountries.length; i++) {
          var preferredGroup = groups.find(function (group) {
            return group.iso_3166_1 === preferredCountries[i];
          });
          if (preferredGroup) {
            var preferredCertifications =
              certificationsFromGroup(preferredGroup);
            if (preferredCertifications.length) {
              return normalizeAgeRating(preferredCertifications[0]);
            }
          }
        }

        for (var j = 0; j < groups.length; j++) {
          var otherCertifications = certificationsFromGroup(groups[j]);
          if (otherCertifications.length) {
            return normalizeAgeRating(otherCertifications[0]);
          }
        }
      } else {
        var ratings =
          data.content_ratings && data.content_ratings.results
            ? data.content_ratings.results
            : [];

        function isUsableTvRating(item) {
          return item && isUsableCertification(item.rating);
        }

        // La misma prioridad se aplica a las clasificaciones de series.
        var preferredTvCountries = ["GT", "US"];
        for (var k = 0; k < preferredTvCountries.length; k++) {
          var preferredTv = ratings.find(function (item) {
            return (
              item.iso_3166_1 === preferredTvCountries[k] &&
              isUsableTvRating(item)
            );
          });
          if (preferredTv) {
            return normalizeAgeRating(preferredTv.rating);
          }
        }

        var anyTvRating = ratings.find(isUsableTvRating);
        if (anyTvRating) {
          return normalizeAgeRating(anyTvRating.rating);
        }
      }

      return "";
    }

    function formatHeroRuntime(data, type) {
      var minutes = 0;

      if (type === "movie") {
        minutes = Number(data.runtime) || 0;
      } else if (data.episode_run_time && data.episode_run_time.length) {
        minutes = Number(data.episode_run_time[0]) || 0;
      }

      if (!minutes) return "";

      if (minutes >= 60) {
        var hours = Math.floor(minutes / 60);
        var remaining = minutes % 60;

        return (
          hours +
          " h" +
          (remaining ? " " + remaining + " min" : " min") +
          (type === "tv" ? "/episodio" : "")
        );
      }

      return minutes + " min" + (type === "tv" ? "/episodio" : "");
    }

    function renderHeroMeta(m, details) {
      var rating = (details && details.vote_average) || m.rating || 0;

      var runtime = details ? formatHeroRuntime(details, m.type) : "";

      var age = details ? extractCertification(details, m.type) : m.age || "";

      var category = heroCategory(m);

      var pieces = [];

      if (rating > 0) {
        pieces.push(
          '<span class="hero-meta-item rating">' +
          icons.star +
          Number(rating).toFixed(1) +
          "</span>",
        );
      }

      if (runtime) {
        pieces.push('<span class="hero-meta-item">' + runtime + "</span>");
      }

      if (age) {
        pieces.push(
          '<span class="hero-meta-item">' + escapeHTML(age) + "</span>",
        );
      }

      if (category) {
        pieces.push(
          '<span class="hero-meta-item">' + escapeHTML(category) + "</span>",
        );
      }

      $heroMeta.innerHTML = pieces.join("");
    }

    function truncateHeroDesc(text) {
      var t = String(text || "").replace(/\s+/g, " ").trim();
      if (!t) return "Sin descripción disponible.";
      if (t.length <= 150) return t;
      return t.slice(0, 150).replace(/[\s.,;:!?¡¿-]+$/, "") + "...";
    }
    function setHero(m) {
      if (!m) return;

      var request = ++heroRequestId;
      setHeroLoading(false);

      currentHeroMedia = m;
      updateHeroSaveButton(m);
      updateHeroDots(m);

      $heroSection.classList.remove("empty-search");
      $heroActions.style.display = "";

      $heroVideoWrap.classList.remove("active");
      $heroVideoWrap.innerHTML = "";
      $heroVideoWrap.dataset.key = "";

      $heroContent.classList.add("fading");

      setTimeout(function () {
        if (request !== heroRequestId) return;

        if (m.bg) {
          var u = m.bg.startsWith("http") ? m.bg : IMG_BG + m.bg;

          // Fundido: se espera a que la imagen esté lista para que el cambio sea limpio
          $heroBg.style.opacity = "0";
          var heroImg = new Image();
          heroImg.onload = heroImg.onerror = function () {
            if (request !== heroRequestId) return;
            $heroBg.style.backgroundImage = "url('" + u + "')";
            $heroBg.style.opacity = "1";
          };
          heroImg.src = u;
        } else {
          $heroBg.style.backgroundImage = "none";
        }

        $heroTitle.textContent = m.title || "Sin título";

        $heroYear.textContent = m.year || "Año no disponible";

        $heroDesc.textContent = truncateHeroDesc(m.desc);

        renderHeroMeta(m, null);

        if (m.isUpcoming) {
          $heroPlayBtn.disabled = true;
          $heroPlayBtn.classList.add("upcoming");
          $heroPlayBtn.innerHTML = "PRÓXIMAMENTE";
          $heroPlayBtn.style.cursor = "default";
          $heroPlayBtn.onclick = null;
        } else {
          $heroPlayBtn.disabled = false;
          $heroPlayBtn.classList.remove("upcoming");
          $heroPlayBtn.style.cursor = "pointer";

          $heroPlayBtn.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
            '<path d="M8 5v14l11-7z"/>' +
            "</svg>Ver";

          $heroPlayBtn.onclick = function () {
            openPlayer(m.id, m.type, m.title, null, null, m.bg);
          };
        }

        $heroContent.classList.remove("fading");
      }, 180);

      // Consultar únicamente los metadatos necesarios.
      // No solicita vídeos ni tráileres de YouTube.

      var endpoint = m.type === "tv" ? "/tv/" + m.id : "/movie/" + m.id;

      var append =
        m.type === "tv"
          ? "&append_to_response=content_ratings"
          : "&append_to_response=release_dates";

      fetchTMDB(endpoint, append)
        .then(function (data) {
          if (
            request !== heroRequestId ||
            !currentHeroMedia ||
            currentHeroMedia.id !== m.id ||
            currentHeroMedia.type !== m.type
          )
            return;

          renderHeroMeta(m, data);
        })
        .catch(function () {
          if (request === heroRequestId) renderHeroMeta(m, null);
        });
    }
    /** Indicadores del carrusel (uno por título del Top 10); tocar uno salta a ese título. */
    function renderHeroDots() {
      var box = $("hero-dots");
      if (!box) {
        box = document.createElement("div");
        box.id = "hero-dots";
        box.className = "hero-dots";
        box.setAttribute("role", "group");
        box.addEventListener("click", function (e) {
          var b = e.target.closest("[data-i]");
          if (!b) return;
          currentHeroIndex = Number(b.getAttribute("data-i"));
          setHero(heroMoviesList[currentHeroIndex]);
        });
        $heroSection.appendChild(box);
      }
      box.hidden = heroMoviesList.length < 2;
      box.innerHTML = heroMoviesList.map(function (x, i) {
        return '<button type="button" class="hero-dot' + (i === currentHeroIndex ? " active" : "") + '" data-i="' + i + '" aria-label="' + (i + 1) + '"></button>';
      }).join("");
    }
    function updateHeroDots(m) {
      var i = heroMoviesList.indexOf(m);
      if (i < 0) return;
      currentHeroIndex = i;
      document.querySelectorAll("#hero-dots .hero-dot").forEach(function (b, n) { b.classList.toggle("active", n === i); });
    }
    function startHeroCarousel(m) {
      heroMoviesList = (m || []).slice(0, 10);          // Top 10 de la semana
      currentHeroIndex = 0;
      clearInterval(heroInterval);
      renderHeroDots();
      if (heroMoviesList.length < 2) return;
      heroInterval = setInterval(function () {
        if (document.hidden || isSearching || heroSectionIsEmpty()) return;
        currentHeroIndex = (currentHeroIndex + 1) % heroMoviesList.length;
        setHero(heroMoviesList[currentHeroIndex]);
      }, 7000);
    }
    function heroSectionIsEmpty() {
      return $heroSection.classList.contains("empty-search");
    }
    function prefetchDetails(id, type) {
      var key = type + "_" + id;
      if (cachedDetails[key]) return;
      var endpoint = type === "tv" ? "/tv/" + id : "/movie/" + id;
      fetchTMDB(
        endpoint,
        "&append_to_response=credits,videos,similar,recommendations",
      )
        .then(function (d) {
          cachedDetails[key] = d;
        })
        .catch(function () { });
    }
    function openHeroDetails() {
      var media = currentHeroMedia;
      if (!media) {
        showToast("No hay un título destacado disponible");
        return;
      }

      var mediaId = Number(media.id);
      var mediaType = media.type || media.media_type;

      if (!Number.isSafeInteger(mediaId) || mediaId <= 0 ||
        (mediaType !== "movie" && mediaType !== "tv")) {
        console.error("TatoCine: datos inválidos del título destacado", media);
        showToast("No se pudieron identificar los detalles de este título");
        return;
      }

      openDetails(mediaId, mediaType);
    }
;
/* ==== js/core/seo.js ==== */
/**
 * TatoCine · js/core/seo.js
 * SEO dinámico: metaetiquetas, datos estructurados y título por pantalla.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function setMetaByName(name, content) {
      var el = document.querySelector('meta[name="' + name + '"]');
      if (el) el.setAttribute("content", content);
    }
    function setMetaByProperty(property, content) {
      var el = document.querySelector('meta[property="' + property + '"]');
      if (el) el.setAttribute("content", content);
    }
    function updatePageSEO(title, description, type, data) {
      document.title = title + " — TatoCine";
      var shortDesc = String(
        description || "Explora películas, series y anime en TatoCine.",
      )
        .replace(/\s+/g, " ")
        .slice(0, 160);
      setMetaByName("description", shortDesc);
      setMetaByProperty("og:title", title + " — TatoCine");
      setMetaByProperty("og:description", shortDesc);
      setMetaByProperty(
        "og:type",
        type === "tv" ? "video.tv_show" : "video.movie",
      );
      setMetaByName("twitter:title", title + " — TatoCine");
      setMetaByName("twitter:description", shortDesc);
      var canonical = $("canonical-link");
      var pageUrl =
        location.origin +
        location.pathname +
        (data && data.id ? "?id=" + data.id + "&type=" + type : "");
      if (canonical) canonical.href = pageUrl;
      var ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute("content", pageUrl);
      var schema = $("media-structured-data");
      if (!schema) {
        schema = document.createElement("script");
        schema.type = "application/ld+json";
        schema.id = "media-structured-data";
        document.head.appendChild(schema);
      }
      var date = data && (data.release_date || data.first_air_date);
      var payload = {
        "@context": "https://schema.org",
        "@type": type === "tv" ? "TVSeries" : "Movie",
        name: title,
        description: shortDesc,
        inLanguage: "es",
      };
      if (date) payload.datePublished = date;
      if (data && data.vote_average > 0 && Number(data.vote_count) > 0)
        payload.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: Number(data.vote_average).toFixed(1),
          bestRating: "10",
          worstRating: "0",
          ratingCount: Number(data.vote_count),
        };
      if (data && data.genres && data.genres.length)
        payload.genre = data.genres.map(function (g) {
          return g.name;
        });
      schema.textContent = JSON.stringify(payload);
    }
    function resetPageSEO() {
      document.title = "TatoCine | Películas, series y anime";
      setMetaByName(
        "description",
        "Explora películas, series y anime en TatoCine. Descubre estrenos, títulos populares y recomendaciones basadas en tus preferencias locales.",
      );
      setMetaByProperty("og:title", "TatoCine | Películas, series y anime");
      setMetaByProperty(
        "og:description",
        "Explora películas, series y anime. Descubre títulos populares y recomendaciones personalizadas.",
      );
      setMetaByProperty("og:type", "website");
      setMetaByName("twitter:title", "TatoCine | Películas, series y anime");
      setMetaByName(
        "twitter:description",
        "Explora películas, series y anime en TatoCine.",
      );
      var canonical = $("canonical-link");
      if (canonical) canonical.href = location.origin + location.pathname;
      var ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl)
        ogUrl.setAttribute("content", location.origin + location.pathname);
      var schema = $("media-structured-data");
      if (schema && schema.parentNode) schema.parentNode.removeChild(schema);
    }

    // ---- SEO: datos estructurados del sitio (buscador interno) ----
    (function injectStructuredData() {
      try {
        if (location.protocol.indexOf("http") !== 0) return;
        var base = location.origin + location.pathname;
        var tag = document.createElement("script");
        tag.type = "application/ld+json";
        tag.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "TatoCine",
          url: base,
          inLanguage: "es",
          description: "Explora películas, series y anime. Descubre estrenos, títulos populares y recomendaciones basadas en tus preferencias locales.",
          potentialAction: {
            "@type": "SearchAction",
            target: base + "?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        });
        document.head.appendChild(tag);
      } catch (e) { }
    })();

    // ==========================================================
    // V4 · Analítica de visualización, listas de favoritos, estadísticas,
    //      estudios/plataformas, búsquedas recientes, navegación TV,
    //      PWA y almacenamiento local optimizado.
;
/* ==== js/ui/details.js ==== */
/**
 * TatoCine · js/ui/details.js
 * Modal de detalle del título y ficha de actor.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    var detailsMedia = null;
    function openDetails(id, type) {
      id = Number(id);
      if (!Number.isSafeInteger(id) || id <= 0 || (type !== "movie" && type !== "tv")) {
        showToast("No se pudieron identificar los detalles de este título");
        return;
      }
      var key = type + "_" + id;
      closeDetailsTrailer();
      var detailsPanel = document.querySelector(
        "#details-modal .details-content",
      );
      var trailerPanel = $("details-trailer");
      if (
        detailsPanel &&
        trailerPanel &&
        trailerPanel.parentNode !== detailsPanel
      )
        detailsPanel.appendChild(trailerPanel);
      $detailsModal.dataset.mediaKey = key;
      $detailsModal.classList.add("open");
      document.body.style.overflow = "hidden";
      try {
        history.pushState(
          { modal: "details" },
          "",
          "?id=" + id + "&type=" + type,
        );
      } catch (e) { }
      $("details-skeleton").style.display = "block";
      $("details-real-content").style.display = "none";
      $("details-backdrop").style.backgroundImage = "none";
      $("details-similar-container").style.display = "none";
      function renderDetails(data) {
        $("details-skeleton").style.display = "none";
        $("details-real-content").style.display = "block";
        var title = data.title || data.name || "Sin título";
        var year = (data.release_date || data.first_air_date || "").split(
          "-",
        )[0];
        var rating = data.vote_average ? data.vote_average.toFixed(1) : "N/A";
        var runtime = data.runtime
          ? data.runtime + " min"
          : data.number_of_seasons
            ? data.number_of_seasons + " temporadas"
            : "";
        var status = data.status || "";
        var statusText = getStatusText(status);
        var statusClass = isEndedStatus(status) ? "ended" : "";
        var genres = (data.genres || []).map(function (g) {
          return g.name;
        });
        var overview = data.overview || "Sin descripción disponible.";
        var backdrop = data.backdrop_path
          ? IMG_BG + data.backdrop_path
          : data.poster_path
            ? IMG_BG + data.poster_path
            : FALLBACK_IMG;
        var cast = data.credits && data.credits.cast ? data.credits.cast : [];
        var similar =
          data.recommendations &&
            data.recommendations.results &&
            data.recommendations.results.length > 0
            ? data.recommendations.results
            : data.similar && data.similar.results
              ? data.similar.results
              : [];
        var trailer = null;
        if (data.videos && data.videos.results) {
          var candidates = data.videos.results.filter(function (v) {
            return (
              v.site === "YouTube" &&
              (v.type === "Trailer" || v.type === "Teaser")
            );
          });
          var spanish = candidates.filter(function (v) {
            return UI_EN ? v.iso_639_1 === "en" : (v.iso_639_1 === "es" || v.iso_639_1 === "es-MX");
          });
          if (spanish.length > 0) trailer = spanish[0];
          else if (candidates.length > 0) trailer = candidates[0];
        }
        $("details-backdrop").style.backgroundImage =
          "url('" + backdrop + "')";
        $("details-title").textContent = title;
        updatePageSEO(title, overview, type, data);
        $("details-meta").innerHTML =
          (year ? "<span>" + year + "</span>" : "") +
          (rating !== "N/A"
            ? '<span class="rating-meta">' + icons.star + rating + "</span>"
            : "") +
          (runtime ? "<span>" + runtime + "</span>" : "") +
          (statusText
            ? '<span class="status ' +
            statusClass +
            '">' +
            statusText +
            "</span>"
            : "");
        $("details-genres").innerHTML = genres
          .map(function (g) {
            return '<span class="details-genre">' + escapeHTML(g) + "</span>";
          })
          .join("");
        $("details-overview").textContent = overview;
        if (cast.length > 0) {
          $("details-cast-container").style.display = "block";
          $("details-cast").innerHTML = cast
            .map(function (c) {
              return (
                '<div class="cast-item" tabindex="0" role="button" onclick="openActor(' +
                c.id +
                ')"><img class="cast-photo" loading="lazy" decoding="async" src="' +
                (c.profile_path
                  ? IMG_W185 + c.profile_path
                  : "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%2240%22 fill=%22%23333%22/%3E%3C/svg%3E") +
                '" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%2240%22 fill=%22%23333%22/%3E%3C/svg%3E\'"/><div class="cast-name">' +
                escapeHTML(c.name) +
                '</div><div class="cast-char">' +
                escapeHTML(c.character || "") +
                "</div></div>"
              );
            })
            .join("");
        } else $("details-cast-container").style.display = "none";
        if (similar.length > 0) {
          $("details-similar-container").style.display = "block";
          $("details-similar").innerHTML = similar
            .slice(0, 20)
            .map(function (s) {
              var sTitle = escapeHTML(s.title || s.name || "");
              var sBg = s.poster_path
                ? IMG_CARD + s.poster_path
                : "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%23222%22 width=%22200%22 height=%22300%22/%3E%3C/svg%3E";
              return (
                '<div class="similar-card" tabindex="0" role="button" onclick="openDetails(' +
                s.id +
                ",'" +
                type +
                '\')"><img class="similar-poster" src="' +
                sBg +
                '" loading="lazy" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%23222%22 width=%22200%22 height=%22300%22/%3E%3C/svg%3E\'"/><div class="similar-title">' +
                sTitle +
                "</div></div>"
              );
            })
            .join("");
        }
        var trailerBtn = $("details-trailer-btn");
        if (trailer) {
          trailerBtn.style.display = "inline-flex";
          trailerBtn.onclick = function () {
            var t = $("details-trailer");
            if (t.classList.contains("active")) {
              closeDetailsTrailer();
              return;
            }
            var panel = document.querySelector(
              "#details-modal .details-content",
            );
            if (panel && t.parentNode !== panel) panel.appendChild(t);
            t.classList.add("active");
            var trailerUrl =
              "https://www.youtube.com/embed/" +
              encodeURIComponent(trailer.key) +
              "?autoplay=1&rel=0&modestbranding=1";
            var watchUrl =
              "https://www.youtube.com/watch?v=" +
              encodeURIComponent(trailer.key);
            t.innerHTML =
              '<iframe title="Tráiler de ' +
              escapeHTML(title) +
              '" src="' +
              trailerUrl +
              '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="origin"></iframe><a class="details-trailer-external" href="' +
              watchUrl +
              '" target="_blank" rel="noopener noreferrer">Abrir en YouTube</a><button class="details-trailer-close" type="button" onclick="closeDetailsTrailer()" aria-label="Cerrar tráiler">✕</button>';
            trailerBtn.querySelector("span").textContent = "Ocultar Tráiler";
          };
        } else trailerBtn.style.display = "none";
        var playBtn = $("details-play-btn");
        var releaseDate = type === "tv" ? data.first_air_date : data.release_date;
        // Una sola regla de disponibilidad para el modal: estado Released o fecha anterior al día local.
        var isAvailable = !isUpcoming(releaseDate, data.status, type);

        if (playBtn) {
          playBtn.disabled = !isAvailable;
          playBtn.setAttribute("aria-disabled", String(!isAvailable));
          playBtn.style.opacity = isAvailable ? "1" : "0.45";
          playBtn.style.cursor = isAvailable ? "pointer" : "not-allowed";
          playBtn.title = isAvailable
            ? "Reproducir contenido"
            : "Este contenido todavía no está disponible";
          playBtn.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
            (isAvailable ? "Ver" : "Próximamente");
          playBtn.onclick = function () {
            if (!isAvailable) return;
            closeDetails(true);
            var bgUrl = data.backdrop_path || data.poster_path || null;
            openPlayer(id, type, title, null, null, bgUrl);
          };
        }

        var detailsShareButton = $("details-share-btn");
        if (detailsShareButton) {
          detailsShareButton.type = "button";
          detailsShareButton.setAttribute("data-media-id", String(id));
          detailsShareButton.setAttribute("data-media-type", String(type));
          detailsShareButton.setAttribute("data-media-title", title);
          detailsShareButton.onclick = window.shareDetailsFromModal;
        }
        detailsMedia = {
          id: id,
          type: type,
          title: title,
          bg: data.backdrop_path || data.poster_path || "",
          rating: Number(data.vote_average) || 0,
          year: year || ""
        };
        updateDetailsFavButton();
        if (typeof renderDetailsExtras === "function") renderDetailsExtras(data, type, id, title);
      }
      function showDetailsLoadError(error) {
        if ($detailsModal.dataset.mediaKey !== key) return;
        console.error("TatoCine: no se pudieron renderizar los detalles", error);
        $("details-skeleton").style.display = "none";
        $("details-real-content").style.display = "block";
        $("details-title").textContent = "Error al cargar";
        $("details-overview").textContent =
          "No se pudieron cargar los detalles. Comprueba tu conexión e inténtalo de nuevo.";
      }

      function renderDetailsSafely(data) {
        if ($detailsModal.dataset.mediaKey !== key) return;
        if (!data || data.success === false) {
          showDetailsLoadError(new Error("Respuesta de TMDB no válida"));
          return;
        }
        try {
          renderDetails(data);
        } catch (error) {
          showDetailsLoadError(error);
        }
      }

      if (cachedDetails[key]) {
        renderDetailsSafely(cachedDetails[key]);
      } else {
        var endpoint = type === "tv" ? "/tv/" + id : "/movie/" + id;
        fetchTMDB(
          endpoint,
          "&append_to_response=credits,videos,similar,recommendations",
        )
          .then(function (data) {
            if ($detailsModal.dataset.mediaKey !== key) return;
            cachedDetails[key] = data;
            renderDetailsSafely(data);
          })
          .catch(showDetailsLoadError);
      }
    }
    function closeDetailsTrailer() {
      var t = $("details-trailer");
      if (t) {
        t.classList.remove("active");
        t.innerHTML = "";
      }
      var btn = $("details-trailer-btn");
      if (btn) {
        var label = btn.querySelector("span");
        if (label) label.textContent = "Ver Tráiler";
      }
    }
    function closeDetails(fromPlay) {
      closeDetailsTrailer();
      $detailsModal.classList.remove("open");
      document.body.style.overflow = "";
      resetPageSEO();
      if (
        !fromPlay &&
        location.search &&
        location.search.indexOf("id=") > -1
      ) {
        try {
          history.replaceState(null, "", location.pathname);
        } catch (e) { }
      }
    }

    function openActor(actorId) {
      $actorModal.classList.add("open");
      $actorModal.classList.add("is-loading");
      $("actor-name").textContent = "Cargando...";
      $("actor-meta").textContent = "";
      $("actor-bio").textContent = "";
      $("actor-photo").src = FALLBACK_IMG;
      $("actor-photo").alt = "Fotografía de perfil";
      function fetchAndRender(lang) {
        var q = lang ? "&language=" + lang : "";
        fetchTMDB("/person/" + actorId, q)
          .then(function (d) {
            $actorModal.classList.remove("is-loading");
            $("actor-name").textContent = d.name || "Sin nombre";
            var meta = [];
            if (d.known_for_department) meta.push(d.known_for_department);
            if (d.birthday) {
              var age = d.deathday
                ? null
                : Math.floor(
                  (Date.now() - new Date(d.birthday).getTime()) /
                  31557600000,
                );
              meta.push(
                new Date(d.birthday).getFullYear() +
                (age ? " (" + age + " años)" : ""),
              );
            }
            if (d.deathday)
              meta.push("† " + new Date(d.deathday).getFullYear());
            if (d.place_of_birth) meta.push(d.place_of_birth);
            $("actor-meta").textContent = meta.join(" · ");
            if (d.profile_path)
              $("actor-photo").src = IMG_W185 + d.profile_path;
            if (d.biography && d.biography.trim().length > 20)
              $("actor-bio").textContent = d.biography;
            else if (lang !== "en-US") {
              fetchAndRender("en-US");
              return;
            } else
              $("actor-bio").textContent =
                "Este actor no tiene biografía disponible en TMDB.";
          })
          .catch(function () {
            if (lang !== "en-US") {
              fetchAndRender("en-US");
              return;
            }
            $actorModal.classList.remove("is-loading");
            $("actor-name").textContent = "Error al cargar";
            $("actor-bio").textContent = "No se pudo obtener la biografía.";
          });
      }
      fetchAndRender(null);
    }
    function closeActor() {
      $actorModal.classList.remove("is-loading");
      $actorModal.classList.remove("open");
    }
;
/* ==== js/ui/filters.js ==== */
/**
 * TatoCine · js/ui/filters.js
 * Géneros, filtros avanzados y estados vacíos/errores de búsqueda.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    var GENRES = {
      movies: [
        { id: 28, name: "Acción" },
        { id: 12, name: "Aventura" },
        { id: 16, name: "Animación" },
        { id: 35, name: "Comedia" },
        { id: 80, name: "Crimen" },
        { id: 18, name: "Drama" },
        { id: 10751, name: "Familia" },
        { id: 14, name: "Fantasía" },
        { id: 27, name: "Terror" },
        { id: 9648, name: "Misterio" },
        { id: 10749, name: "Romance" },
        { id: 878, name: "Sci-Fi" },
        { id: 53, name: "Suspense" },
      ],
      series: [
        { id: 10759, name: "Acción y Aventura" },
        { id: 16, name: "Animación" },
        { id: 35, name: "Comedia" },
        { id: 80, name: "Crimen" },
        { id: 18, name: "Drama" },
        { id: 9648, name: "Misterio" },
        { id: 10765, name: "Sci-Fi & Fantasy" },
      ],
      anime: [
        { id: 10759, name: "Acción y Aventura" },
        { id: 16, name: "Animación" },
        { id: 35, name: "Comedia" },
        { id: 18, name: "Drama" },
        { id: 14, name: "Fantasía" },
        { id: 10749, name: "Romance" },
        { id: 10765, name: "Sci-Fi & Fantasy" },
      ],
      kids: [
        { id: 16, name: "Animación" },
        { id: 10751, name: "Familia" },
        { id: 35, name: "Comedia" },
        { id: 12, name: "Aventura" },
        { id: 14, name: "Fantasía" },
      ],
    };
    function renderGenreFilters(view) {
      $genreContainer.innerHTML = "";
      if (!GENRES[view]) return;
      var div = document.createElement("div");
      div.className = "genre-filters";
      var allActive = currentGenreFilter === "" ? "active" : "";
      div.innerHTML =
        '<button class="genre-chip ' +
        allActive +
        '" onclick="filterByGenre(\'\',this)">Todos</button>';
      GENRES[view].forEach(function (g) {
        var active = currentGenreFilter === String(g.id) ? "active" : "";
        div.innerHTML +=
          '<button class="genre-chip ' +
          active +
          '" onclick="filterByGenre(\'' +
          g.id +
          "',this)\">" +
          g.name +
          "</button>";
      });
      var filterBtn = document.createElement("button");
      filterBtn.className = "genre-chip";
      filterBtn.style.marginLeft = "auto";
      filterBtn.innerHTML = "⚙ Filtros";
      filterBtn.onclick = openFilters;
      div.appendChild(filterBtn);
      $genreContainer.appendChild(div);
    }
    function filterByGenre(genreId, btn) {
      currentGenreFilter = genreId;
      document.querySelectorAll(".genre-chip").forEach(function (c) {
        c.classList.remove("active");
      });
      if (btn) btn.classList.add("active");
      currentPage = 1;
      currentMaxPage = MAX_TMDB_PAGE;
      hasMorePages = false;
      if (currentView === "movies") loadMoviesView();
      else if (currentView === "series") loadSeriesView();
      else if (currentView === "anime") loadAnimeView();
      else if (currentView === "kids") loadKidsView();
    }
    function openFilters() {
      $filtersModal.classList.add("open");
      var years = [""];
      var currentYear = new Date().getFullYear();
      for (var y = currentYear; y >= currentYear - 10; y--)
        years.push(String(y));
      $("filter-year-options").innerHTML = years
        .map(function (y) {
          return (
            '<button class="filter-option ' +
            (filtersState.year === y ? "active" : "") +
            "\" onclick=\"setFilter('year','" +
            y +
            "',this)\">" +
            (y || "Todos") +
            "</button>"
          );
        })
        .join("");
      var ratings = [
        { v: "", l: "Todos" },
        { v: "6", l: "6+" },
        { v: "7", l: "7+" },
        { v: "8", l: "8+" },
        { v: "9", l: "9+" },
      ];
      $("filter-rating-options").innerHTML = ratings
        .map(function (r) {
          return (
            '<button class="filter-option ' +
            (filtersState.rating === r.v ? "active" : "") +
            "\" onclick=\"setFilter('rating','" +
            r.v +
            "',this)\">" +
            r.l +
            "</button>"
          );
        })
        .join("");
      var sorts = [
        { v: "popularity.desc", l: "Popularidad" },
        { v: "vote_average.desc", l: "Mejor puntuadas" },
        { v: "primary_release_date.desc", l: "Más recientes" },
      ];
      $("filter-sort-options").innerHTML = sorts
        .map(function (s) {
          return (
            '<button class="filter-option ' +
            (filtersState.sort === s.v ? "active" : "") +
            "\" onclick=\"setFilter('sort','" +
            s.v +
            "',this)\">" +
            s.l +
            "</button>"
          );
        })
        .join("");
    }
    function closeFilters() {
      $filtersModal.classList.remove("open");
    }
    function setFilter(key, val, btn) {
      filtersState[key] = val;
      btn.parentElement
        .querySelectorAll(".filter-option")
        .forEach(function (b) {
          b.classList.remove("active");
        });
      btn.classList.add("active");
      currentPage = 1;
      currentMaxPage = MAX_TMDB_PAGE;
      hasMorePages = false;
      setTimeout(function () {
        closeFilters();
        if (currentView === "movies") loadMoviesView();
        else if (currentView === "series") loadSeriesView();
        else if (currentView === "anime") loadAnimeView();
        else if (currentView === "kids") loadKidsView();
      }, 200);
    }
;
/* ==== js/features/search.js ==== */
/**
 * TatoCine · js/features/search.js
 * Búsqueda de películas y series.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function setSearchEmptyState(q) {
      clearInterval(heroInterval);
      heroRequestId++;
      currentHeroMedia = null;
      heroHovered = false;
      $heroSection.classList.add("empty-search");
      $heroVideoWrap.classList.remove("active");
      $heroVideoWrap.innerHTML = "";
      $heroVideoWrap.dataset.key = "";
      $heroBg.style.backgroundImage = "none";
      $heroTitle.textContent = "No encontramos resultados";
      $heroYear.textContent = 'Búsqueda: "' + q + '"';
      $heroMeta.innerHTML = "";
      $heroDesc.textContent =
        "No encontramos películas, series o anime con ese nombre. Prueba con otro título o revisa la escritura.";
      $heroActions.style.display = "none";
      $rowsContainer.innerHTML = "";
      $loadMoreContainer.innerHTML = "";
      $genreContainer.innerHTML = "";
    }
    function setSearchErrorState() {
      clearInterval(heroInterval);
      heroRequestId++;
      currentHeroMedia = null;
      $heroSection.classList.add("empty-search");
      $heroVideoWrap.classList.remove("active");
      $heroVideoWrap.innerHTML = "";
      $heroBg.style.backgroundImage = "none";
      $heroTitle.textContent = "No se pudo completar la búsqueda";
      $heroYear.textContent = "Comprueba tu conexión";
      $heroMeta.innerHTML = "";
      $heroDesc.textContent =
        "TatoCine no pudo consultar el catálogo en este momento. Inténtalo de nuevo.";
      $heroActions.style.display = "none";
      $rowsContainer.innerHTML = "";
      $loadMoreContainer.innerHTML = "";
    }
    function performSearch(q) {
      var myId = ++searchRequestId;
      catalogRequestId++;
      isSearching = true;
      try {
        var url = new URL(location.href);
        url.searchParams.set("q", q);
        url.searchParams.delete("id");
        url.searchParams.delete("type");
        history.replaceState(null, "", url.toString());
      } catch (e) { }
      clearInterval(heroInterval);
      $genreContainer.innerHTML = "";
      $loadMoreContainer.innerHTML = "";
      $rowsContainer.innerHTML = skeletonRows(2);
      fetchTMDB("/search/multi", "&include_adult=false&query=" + encodeURIComponent(q))
        .then(function (d) {
          if (myId !== searchRequestId) return;
          var m = (d.results || [])
            .filter(function (i) {
              return i.media_type === "movie" || i.media_type === "tv";
            })
            .map(function (i) {
              var date = i.release_date || i.first_air_date;
              return {
                id: i.id,
                title: i.title || i.name,
                bg: i.backdrop_path || i.poster_path,
                type: i.media_type,
                desc: i.overview,
                rating: i.vote_average,
                year: date ? date.split("-")[0] : "",
                isUpcoming: isUpcoming(date, i.status, i.media_type),
                status: i.status,
                original_language: i.original_language,
                genre_ids: i.genre_ids || [],
                adult: !!i.adult,
              };
            });
          var showSearchResults = function (list) {
            if (myId !== searchRequestId) return;
            if (list.length > 0) {
              $rowsContainer.innerHTML = "";
              setHero(list[0]);
              renderRow('Resultados para "' + q + '"', list);
              startHeroCarousel(list);
            } else setSearchEmptyState(q);
          };
          // En la sección Niños (o en un perfil infantil) solo se muestra contenido apto: se verifica la clasificación de TMDB.
          if (kidsContext()) kidsFilterSearch(m).then(showSearchResults).catch(function () { showSearchResults([]); });
          else showSearchResults(m);
        })
        .catch(function () {
          if (myId !== searchRequestId) return;
          setSearchErrorState();
        });
    }
    $searchInput.addEventListener("change", function (e) {
      var q = e.target.value.trim();
      if (q.length === 0) {
        isSearching = false;
        try {
          var url = new URL(location.href);
          url.searchParams.delete("q");
          history.replaceState(null, "", url.toString());
        } catch (err) { }
        switchView(currentView, false);
        return;
      }
      performSearch(q);
    });
    $searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var q = $searchInput.value.trim();
        if (q.length) {
          clearTimeout(searchDebounceTimer);
          performSearch(q);
        }
      }
    });
    $searchInput.addEventListener("search", function () {
      if (!$searchInput.value.trim()) {
        isSearching = false;
        try {
          var url = new URL(location.href);
          url.searchParams.delete("q");
          history.replaceState(null, "", url.toString());
        } catch (err) { }
        switchView(currentView, false);
      }
    });
;
/* ==== js/ui/views.js ==== */
/**
 * TatoCine · js/ui/views.js
 * Navegación entre vistas y carga de catálogos (inicio, películas, series, anime, niños).
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function buildSkeletonRows() { return skeletonRows(3, 5); }
    function switchView(v, r) {
      if (r === undefined) r = true;
      // Perfil infantil: la única sección disponible es Niños.
      if (isKidProfile() && v !== "kids") v = "kids";
      document.body.classList.toggle("kids-view", v === "kids");
      document.body.classList.toggle("brand-view", v.indexOf("brand:") === 0);
      // Al cambiar de pestaña, la vista empieza siempre desde arriba (no donde se quedó el scroll).
      if (r !== false || v !== currentView) {
        try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); }
        var focused = document.activeElement;
        if (focused && focused !== document.body && focused.blur) focused.blur();
      }
      searchRequestId++;
      catalogRequestId++;
      clearTimeout(searchDebounceTimer);
      clearInterval(heroInterval);
      currentView = v;
      isSearching = false;
      currentGenreFilter = "";
      currentPage = 1;
      currentMaxPage = MAX_TMDB_PAGE;
      isLoadingMore = false;
      hasMorePages = false;
      filtersState = { year: "", rating: "", sort: "popularity.desc" };
      if (r) $searchInput.value = "";
      resetPageSEO();
      $heroSection.classList.remove("empty-search");
      $heroActions.style.display = "";
      document.querySelectorAll(".nav-item").forEach(function (b) {
        b.classList.remove("active");
      });
      document
        .querySelectorAll('.nav-item[data-view="' + v + '"]')
        .forEach(function (btn) {
          btn.classList.add("active");
        });
      $genreContainer.innerHTML = "";
      $loadMoreContainer.innerHTML = "";
      $rowsContainer.innerHTML = buildSkeletonRows();
      if (v !== "list") { setHeroLoading(true); setTimeout(function () { setHeroLoading(false); }, 12000); }
      if (v === "list") {
        $heroSection.style.display = "none";
        $rowsContainer.style.paddingTop = "110px";
        renderFavoritesView();
        return;
      }
      $heroSection.style.display = "flex";
      $rowsContainer.style.paddingTop = "0px";
      if (v === "home") loadHomeView();
      else if (v === "movies") {
        renderGenreFilters("movies");
        loadMoviesView();
      } else if (v === "series") {
        renderGenreFilters("series");
        loadSeriesView();
      } else if (v === "anime") {
        renderGenreFilters("anime");
        loadAnimeView();
      } else if (v === "kids") {
        renderGenreFilters("kids");
        loadKidsView();
      } else if (v.indexOf("brand:") === 0) {
        loadBrandView(v.slice(6));
      }
    }
    function buildDiscoverQuery() {
      var parts = [];
      parts.push("&sort_by=" + filtersState.sort);
      if (currentGenreFilter)
        parts.push("&with_genres=" + currentGenreFilter);
      if (filtersState.year)
        parts.push("&primary_release_year=" + filtersState.year);
      if (filtersState.rating)
        parts.push("&vote_average.gte=" + filtersState.rating);
      return parts.join("");
    }

    // Paginación progresiva. TMDB limita la paginación a 500 páginas por consulta.
    function requestMoreWhenNearBottom() {
      if (
        !isLoadingMore &&
        hasMorePages &&
        currentView !== "list" &&
        !isSearching
      )
        loadMore();
    }
    if ("IntersectionObserver" in window) {
      loadMoreObserver = new IntersectionObserver(
        function (entries) {
          if (entries[0] && entries[0].isIntersecting)
            requestMoreWhenNearBottom();
        },
        { root: null, rootMargin: "700px 0px", threshold: 0 },
      );
      loadMoreObserver.observe(document.getElementById("sentinel"));
    } else {
      loadMoreScrollFallback = true;
      var scrollCheckPending = false;
      window.addEventListener(
        "scroll",
        function () {
          if (scrollCheckPending) return;
          scrollCheckPending = true;
          setTimeout(function () {
            scrollCheckPending = false;
            var sentinel = $("sentinel");
            if (!sentinel) return;
            var rect = sentinel.getBoundingClientRect();
            if (
              rect.top <
              (window.innerHeight || document.documentElement.clientHeight) +
              700
            )
              requestMoreWhenNearBottom();
          }, 120);
        },
        false,
      );
    }
    function renderLoadMore(totalPages) {
      if (typeof totalPages === "number" && totalPages > 0)
        currentMaxPage = Math.min(MAX_TMDB_PAGE, totalPages);
      else
        currentMaxPage = Math.min(
          MAX_TMDB_PAGE,
          currentMaxPage || MAX_TMDB_PAGE,
        );
      hasMorePages = currentPage < currentMaxPage;
      if (!hasMorePages) {
        $loadMoreContainer.innerHTML = "";
        return;
      }
      $loadMoreContainer.innerHTML =
        '<button class="load-more-btn" onclick="loadMore()">Cargar más</button>';
    }

    function mapMovieResult(i) {
      var date = i.release_date;
      return {
        id: i.id,
        title: i.title,
        bg: i.backdrop_path || i.poster_path,
        type: "movie",
        desc: i.overview,
        rating: i.vote_average,
        year: date ? date.split("-")[0] : "",
        isUpcoming: isUpcoming(date, i.status, "movie"),
        status: i.status,
        original_language: i.original_language,
        genre_ids: i.genre_ids || [],
      };
    }
    function mapTvResult(i, category) {
      var date = i.first_air_date;
      return {
        id: i.id,
        title: i.name,
        bg: i.backdrop_path || i.poster_path,
        type: "tv",
        desc: i.overview,
        rating: i.vote_average,
        year: date ? date.split("-")[0] : "",
        isUpcoming: isUpcoming(date, i.status, "tv"),
        status: i.status,
        original_language: i.original_language,
        genre_ids: i.genre_ids || [],
        category: category || undefined,
      };
    }
    function loadMore() {
      if (isLoadingMore || !hasMorePages || currentPage >= MAX_TMDB_PAGE)
        return;
      isLoadingMore = true;
      currentPage++;
      var requestedView = currentView;
      var requestedPage = currentPage;
      var requestedCatalogId = catalogRequestId;
      var btn = $loadMoreContainer.querySelector(".load-more-btn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Cargando...";
      }
      if (currentView === "kids") {
        var movieQ =
          "&certification_country=US&certification=G&without_genres=27,53,80,10752&sort_by=popularity.desc&page=" +
          currentPage;
        var tvQ =
          "&certification_country=US&certification=TV-Y|TV-Y7|TV-G&without_genres=27,53,80,10752&sort_by=popularity.desc&page=" +
          currentPage;
        if (currentGenreFilter) {
          movieQ += "&with_genres=" + currentGenreFilter;
          tvQ += "&with_genres=" + currentGenreFilter;
        }
        Promise.all([
          fetchTMDB("/discover/movie", movieQ),
          fetchTMDB("/discover/tv", tvQ),
        ])
          .then(function (res) {
            if (
              requestedView !== currentView ||
              requestedCatalogId !== catalogRequestId
            )
              return;
            var mv = res[0],
              tv = res[1];
            if (mv.results && mv.results.length)
              renderRow(
                "Películas para Niños · página " + currentPage,
                mv.results.map(mapMovieResult),
              );
            if (tv.results && tv.results.length)
              renderRow(
                "Series para Niños · página " + currentPage,
                tv.results.map(function (i) {
                  return mapTvResult(i, "Serie infantil");
                }),
              );
            var max = Math.max(mv.total_pages || 1, tv.total_pages || 1);
            isLoadingMore = false;
            renderLoadMore(max);
          })
          .catch(function () {
            currentPage = Math.max(1, currentPage - 1);
            isLoadingMore = false;
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Reintentar";
            }
          });
        return;
      }
      var endpoint = "",
        query = "",
        title = "Página " + currentPage;
      if (currentView === "home") {
        endpoint = "/trending/movie/week";
        query = "&page=" + currentPage;
        title = "Más tendencias";
      } else if (currentView === "movies") {
        endpoint = "/discover/movie";
        query = buildDiscoverQuery() + "&page=" + currentPage;
      } else if (currentView === "series") {
        endpoint = "/discover/tv";
        query = buildDiscoverQuery() + "&page=" + currentPage;
      } else if (currentView === "anime") {
        endpoint = "/discover/tv";
        query =
          "&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=" +
          currentPage;
        if (filtersState.year)
          query += "&first_air_date_year=" + filtersState.year;
        if (filtersState.rating)
          query += "&vote_average.gte=" + filtersState.rating;
        if (filtersState.sort !== "popularity.desc")
          query = query.replace(
            "sort_by=popularity.desc",
            "sort_by=" + filtersState.sort,
          );
      }
      if (!endpoint) {
        isLoadingMore = false;
        return;
      }
      fetchTMDB(endpoint, query)
        .then(function (d) {
          if (
            requestedView !== currentView ||
            requestedCatalogId !== catalogRequestId
          )
            return;
          if (d.results && d.results.length) {
            var m = d.results.map(function (i) {
              return currentView === "movies" || currentView === "home"
                ? mapMovieResult(i)
                : mapTvResult(
                  i,
                  currentView === "anime" ? "Anime" : undefined,
                );
            });
            renderRow(
              currentView === "home"
                ? title
                : currentView === "movies"
                  ? "Películas · página " + currentPage
                  : currentView === "series"
                    ? "Series · página " + currentPage
                    : "Anime · página " + currentPage,
              m,
            );
          } else {
            currentMaxPage = currentPage;
          }
          isLoadingMore = false;
          renderLoadMore(d.total_pages || currentMaxPage);
        })
        .catch(function () {
          currentPage = Math.max(1, currentPage - 1);
          isLoadingMore = false;
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Reintentar";
          }
        });
    }

    function loadTop10AndCollections(snapshot) {
      var collections = [
        { title: "Colección · Acción y aventura", query: "&with_genres=28|12&sort_by=popularity.desc&vote_count.gte=80&page=1" },
        { title: "Colección · Ciencia ficción y fantasía", query: "&with_genres=878|14&sort_by=popularity.desc&vote_count.gte=60&page=1" },
        { title: "Colección · Misterio, suspenso y terror", query: "&with_genres=9648|53|27&sort_by=popularity.desc&vote_count.gte=50&page=1" }
      ];
      var requests = [fetchTMDB("/trending/all/week")].concat(collections.map(function (item) {
        return fetchTMDB("/discover/movie", item.query);
      }));
      Promise.all(requests).then(function (results) {
        if (snapshot !== catalogRequestId || currentView !== "home") return;
        var ranked = (results[0].results || []).filter(function (item) {
          return item && item.id && (item.media_type === "movie" || item.media_type === "tv" || item.title || item.name);
        }).slice(0, 10).map(function (item, index) {
          var media = item.media_type === "tv" ? mapTvResult(item) : mapMovieResult(item);
          media.topRank = index + 1;
          return media;
        });
        if (ranked.length) renderRow("Top 10 de la semana", ranked);
        collections.forEach(function (collection, index) {
          var data = results[index + 1];
          if (!data || !data.results || !data.results.length) return;
          renderRow(collection.title, data.results.map(mapMovieResult));
        });
      }).catch(function () { });
    }

    function loadHomeView() {
      var snapshot = catalogRequestId;
      Promise.all([
        fetchTMDB("/trending/movie/week"),
        fetchTMDB("/movie/upcoming", "&region=" + (UI_EN ? "US" : "GT")),
        fetchTMDB("/movie/popular"),
        fetchTMDB("/tv/popular"),
      ])
        .then(function (res) {
          if (snapshot !== catalogRequestId || currentView !== "home") return;
          var t = res[0],
            u = res[1],
            p = res[2],
            s = res[3];
          $rowsContainer.innerHTML = "";
          var h = null;
          renderContinueRow();
          if (t.results && t.results.length) {
            var m = t.results.map(mapMovieResult);
            h = m[0];
            renderRow("Tendencias de la semana", m);
            startHeroCarousel(m);
          }
          if (u.results && u.results.length)
            renderRow("Próximos Estrenos", u.results.map(mapMovieResult));
          if (p.results && p.results.length)
            renderRow("Películas Populares", p.results.map(mapMovieResult));
          if (s.results && s.results.length)
            renderRow("Series Populares", s.results.map(mapTvResult));
            renderBrandRow();
          if (h) setHero(h);
          renderLoadMore(t.total_pages || 1);
          // Las filas no esenciales se escalonan para mostrar primero el catálogo principal.
          // Cada tarea comprueba el identificador de vista para no insertar resultados obsoletos.
          window.setTimeout(function () {
            if (snapshot === catalogRequestId && currentView === "home") loadPersonalizedHomeRow();
          }, 250);
          window.setTimeout(function () {
            IDLE(function () { if (snapshot === catalogRequestId && currentView === "home") loadTop10AndCollections(snapshot); });
          }, 650);
          window.setTimeout(function () {
            if (snapshot !== catalogRequestId || currentView !== "home") return;
            fetchTMDB("/discover/movie", "&sort_by=vote_average.desc&vote_count.gte=300&page=1")
              .then(function (d) {
                if (snapshot !== catalogRequestId || currentView !== "home" || !d.results || !d.results.length) return;
                var top = d.results.map(mapMovieResult).sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
                renderRow("Películas mejor calificadas", top);
              }).catch(function () { });
          }, 1250);
          window.setTimeout(function () {
            if (snapshot !== catalogRequestId || currentView !== "home") return;
            fetchTMDB("/discover/tv", "&sort_by=vote_average.desc&vote_count.gte=150&page=1")
              .then(function (d) {
                if (snapshot !== catalogRequestId || currentView !== "home" || !d.results || !d.results.length) return;
                var top = d.results.map(mapTvResult).sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
                renderRow("Series mejor calificadas", top);
              }).catch(function () { });
          }, 1750);
        })
        .catch(function () {
          if (snapshot !== catalogRequestId || currentView !== "home") return;
          $rowsContainer.innerHTML =
            '<div class="empty-state"><h2>Error de conexión</h2><p>No se pudo cargar el catálogo.</p></div>';
        });
    }

    function loadMoviesView() {
      var snapshot = ++catalogRequestId;
      isLoadingMore = false;
      $loadMoreContainer.innerHTML = "";
      var query = buildDiscoverQuery() + "&page=1";
      fetchTMDB("/discover/movie", query)
        .then(function (d) {
          if (snapshot !== catalogRequestId || currentView !== "movies")
            return;
          $rowsContainer.innerHTML = "";
          if (d.results && d.results.length) {
            var m = d.results.map(mapMovieResult);
            setHero(m[0]);
            renderRow("Películas", m);
            startHeroCarousel(m);
            renderLoadMore(d.total_pages || 1);
          } else {
            $rowsContainer.innerHTML =
              '<div class="empty-state"><h2>Sin resultados</h2><p>Prueba con otros filtros.</p></div>';
          }
        })
        .catch(function () {
          if (snapshot === catalogRequestId && currentView === "movies")
            $rowsContainer.innerHTML =
              '<div class="empty-state"><h2>Error de conexión</h2></div>';
        });
    }
    function loadSeriesView() {
      var snapshot = ++catalogRequestId;
      isLoadingMore = false;
      $loadMoreContainer.innerHTML = "";
      var query = buildDiscoverQuery() + "&page=1";
      fetchTMDB("/discover/tv", query)
        .then(function (d) {
          if (snapshot !== catalogRequestId || currentView !== "series")
            return;
          $rowsContainer.innerHTML = "";
          if (d.results && d.results.length) {
            var m = d.results.map(mapTvResult);
            setHero(m[0]);
            renderRow("Series", m);
            startHeroCarousel(m);
            renderLoadMore(d.total_pages || 1);
          } else {
            $rowsContainer.innerHTML =
              '<div class="empty-state"><h2>Sin resultados</h2></div>';
          }
        })
        .catch(function () {
          if (snapshot === catalogRequestId && currentView === "series")
            $rowsContainer.innerHTML =
              '<div class="empty-state"><h2>Error de conexión</h2></div>';
        });
    }
    function loadAnimeView() {
      var snapshot = ++catalogRequestId;
      isLoadingMore = false;
      $loadMoreContainer.innerHTML = "";
      var query =
        "&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1";
      if (filtersState.year)
        query += "&first_air_date_year=" + filtersState.year;
      if (filtersState.rating)
        query += "&vote_average.gte=" + filtersState.rating;
      if (filtersState.sort !== "popularity.desc")
        query = query.replace(
          "sort_by=popularity.desc",
          "sort_by=" + filtersState.sort,
        );
      fetchTMDB("/discover/tv", query)
        .then(function (d) {
          if (snapshot !== catalogRequestId || currentView !== "anime")
            return;
          $rowsContainer.innerHTML = "";
          if (d.results && d.results.length) {
            var m = d.results.map(function (i) {
              return mapTvResult(i, "Anime");
            });
            setHero(m[0]);
            renderRow("Anime", m);
            startHeroCarousel(m);
            renderLoadMore(d.total_pages || 1);
          } else {
            $rowsContainer.innerHTML =
              '<div class="empty-state"><h2>Sin resultados</h2></div>';
          }
        })
        .catch(function () {
          if (snapshot === catalogRequestId && currentView === "anime")
            $rowsContainer.innerHTML =
              '<div class="empty-state"><h2>Error de conexión</h2></div>';
        });
    }
    function loadKidsView() {
      var snapshot = ++catalogRequestId;
      isLoadingMore = false;
      $loadMoreContainer.innerHTML = "";
      var movieQ =
        "&certification_country=US&certification=G&without_genres=27,53,80,10752&sort_by=popularity.desc&page=1";
      var tvQ =
        "&certification_country=US&certification=TV-Y|TV-Y7|TV-G&without_genres=27,53,80,10752&sort_by=popularity.desc&page=1";
      if (currentGenreFilter) {
        movieQ += "&with_genres=" + currentGenreFilter;
        tvQ += "&with_genres=" + currentGenreFilter;
      }
      Promise.all([
        fetchTMDB("/discover/movie", movieQ),
        fetchTMDB("/discover/tv", tvQ),
      ])
        .then(function (res) {
          if (snapshot !== catalogRequestId || currentView !== "kids") return;
          var mv = res[0],
            tv = res[1];
          $rowsContainer.innerHTML = "";
          var h = null,
            combined = [];
          if (mv.results && mv.results.length) {
            var m = mv.results.map(function (i) {
              var x = mapMovieResult(i);
              x.category = "Película infantil";
              return x;
            });
            h = m[0];
            combined = combined.concat(m);
            renderRow("Películas para Niños", m);
          }
          if (tv.results && tv.results.length) {
            var m = tv.results.map(function (i) {
              return mapTvResult(i, "Serie infantil");
            });
            if (!h) h = m[0];
            combined = combined.concat(m);
            renderRow("Series para Niños", m);
          }
          if (h) {
            setHero(h);
            startHeroCarousel(combined);
            renderLoadMore(
              Math.max(mv.total_pages || 1, tv.total_pages || 1),
            );
          } else {
            $rowsContainer.innerHTML =
              '<div class="empty-state"><h2>Sin contenido</h2></div>';
            $loadMoreContainer.innerHTML = "";
          }
        })
        .catch(function () {
          if (snapshot === catalogRequestId && currentView === "kids")
            $rowsContainer.innerHTML =
              '<div class="empty-state"><h2>Error de conexión</h2></div>';
        });
    }
;
/* ==== js/ui/settings.js ==== */
/**
 * TatoCine · js/ui/settings.js
 * Ajustes.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function showSettings() {
      if (isKidProfile()) return;
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
;
/* ==== js/player/player.js ==== */
/**
 * TatoCine · js/player/player.js
 * Reproductor: servidores, temporadas y episodios, siguiente automático y pantalla completa.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function updateAutoNextButton() {
      var button = document.getElementById("auto-next-toggle");
      if (!button) return;
      button.textContent = autoNextEpisode ? "Siguiente: ACTIVADO" : "Siguiente: DESACTIVADO";
      button.classList.toggle("on", !!autoNextEpisode);
      button.setAttribute("aria-pressed", autoNextEpisode ? "true" : "false");
    }
    function toggleAutoNextEpisode() {
      autoNextEpisode = !autoNextEpisode;
      safeStorageSet(profileStorageKey("tatoAutoNextEpisode"), JSON.stringify(autoNextEpisode));
      updateAutoNextButton();
      showToast(autoNextEpisode ? "Siguiente episodio automático activado" : "Reproducción automática desactivada");
    }

    function loadEpisodes(s, n) {
      return fetchTMDB("/tv/" + s + "/season/" + n)
        .then(function (d) {
          var eps = d.episodes || [];
          currentTvEpisodes = eps.slice();
          $episodeSelect.innerHTML = eps
            .map(function (e) {
              return (
                '<option value="' +
                e.episode_number +
                '">Episodio ' +
                e.episode_number +
                ": " +
                e.name +
                "</option>"
              );
            })
            .join("");
          if (!eps.length)
            $episodeSelect.innerHTML =
              '<option value="1">Episodio 1</option>';
          return eps;
        })
        .catch(function () {
          currentTvEpisodes = [];
          $episodeSelect.innerHTML = '<option value="1">Episodio 1</option>';
          return [];
        });
    }
    function prepareSimilarQueue(media) {
      similarQueue = [];
      playerEndedHandled = false;
      isAdvancingSimilar = false;
      if (!media) {
        similarQueuePromise = Promise.resolve([]);
        return similarQueuePromise;
      }
      var endpoint =
        media.type === "tv" ? "/tv/" + media.id : "/movie/" + media.id;
      var append =
        media.type === "movie"
          ? "&append_to_response=recommendations,similar"
          : "";
      similarQueuePromise = fetchTMDB(endpoint, append)
        .then(function (d) {
          var ids = (d.genres || []).map(function (g) {
            return g.id;
          });
          media.genre_ids = ids;
          updateMediaGenres(media, ids);
          if (media.type !== "movie") return similarQueue;
          var list =
            d.recommendations &&
              d.recommendations.results &&
              d.recommendations.results.length
              ? d.recommendations.results
              : d.similar && d.similar.results
                ? d.similar.results
                : [];
          similarQueue = list
            .filter(function (x) {
              return x.id !== media.id;
            })
            .slice(0, 20)
            .map(function (x) {
              var date = x.release_date || "";
              return {
                id: x.id,
                type: "movie",
                title: x.title || "Siguiente película",
                bg: x.backdrop_path || x.poster_path,
                year: date ? date.split("-")[0] : "",
                rating: x.vote_average,
              };
            });
          return similarQueue;
        })
        .catch(function () {
          similarQueue = [];
          return similarQueue;
        });
      return similarQueuePromise;
    }
    function playNextSimilar() {
      if (
        !currentMedia ||
        currentMedia.type !== "movie" ||
        playerEndedHandled ||
        isAdvancingSimilar
      )
        return;
      playerEndedHandled = true;
      isAdvancingSimilar = true;
      similarQueuePromise.then(function () {
        var next = similarQueue.shift();
        if (!next) {
          isAdvancingSimilar = false;
          showToast(
            "La película terminó. No hay otra recomendación disponible.",
          );
          return;
        }
        showToast("Reproduciendo: " + next.title);
        openPlayer(next.id, next.type, next.title, null, null, next.bg);
      });
    }
    function playNextEpisode() {
      if (!autoNextEpisode || !currentMedia || currentMedia.type !== "tv" || isAdvancingEpisode) return;
      var seasonNumber = Number($seasonSelect.value || 0);
      var episodeNumber = Number($episodeSelect.value || 0);
      var nextEpisode = currentTvEpisodes.slice().sort(function (a, b) {
        return Number(a.episode_number) - Number(b.episode_number);
      }).find(function (episode) { return Number(episode.episode_number) > episodeNumber; });
      var serverIndex = SERVERS.findIndex(function (server) { return server.name === preferredServer; });
      if (serverIndex < 0) serverIndex = 0;
      var serverButton = function () { return document.getElementById("server-btn-" + serverIndex); };
      if (nextEpisode) {
        isAdvancingEpisode = true;
        $episodeSelect.value = String(nextEpisode.episode_number);
        showToast("Siguiente episodio: " + (nextEpisode.name || ("Episodio " + nextEpisode.episode_number)));
        var button = serverButton();
        if (button) playEmbed(serverIndex, button);
        isAdvancingEpisode = false;
        return;
      }
      var nextSeason = currentTvSeasons.slice().sort(function (a, b) {
        return Number(a.season_number) - Number(b.season_number);
      }).find(function (season) {
        return Number(season.season_number) > seasonNumber && Number(season.episode_count || 0) > 0;
      });
      if (!nextSeason) {
        showToast("Has llegado al último episodio disponible");
        return;
      }
      isAdvancingEpisode = true;
      $seasonSelect.value = String(nextSeason.season_number);
      loadEpisodes(currentMedia.id, nextSeason.season_number).then(function (episodes) {
        if (!episodes || !episodes.length) {
          isAdvancingEpisode = false;
          showToast("No se pudo cargar la siguiente temporada");
          return;
        }
        var first = episodes.slice().sort(function (a, b) {
          return Number(a.episode_number) - Number(b.episode_number);
        })[0];
        $episodeSelect.value = String(first.episode_number);
        showToast("Siguiente temporada: T" + nextSeason.season_number + " · " + (first.name || ("Episodio " + first.episode_number)));
        var button = serverButton();
        if (button) playEmbed(serverIndex, button);
        isAdvancingEpisode = false;
      }).catch(function () {
        isAdvancingEpisode = false;
        showToast("No se pudo cargar la siguiente temporada");
      });
    }

    function isEndedPlayerMessage(raw) {
      var data = raw;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          return /(^|[^a-z])(ended|video_ended|player_ended)([^a-z]|$)/i.test(
            data,
          );
        }
      }
      if (!data || typeof data !== "object") return false;
      var eventName = String(
        data.event || data.type || data.name || data.method || "",
      )
        .toLowerCase()
        .replace(/[\s-]/g, "_");
      if (
        [
          "ended",
          "video_ended",
          "player_ended",
          "on_ended",
          "onended",
          "playback_ended",
        ].indexOf(eventName) > -1
      )
        return true;
      if (
        eventName === "onstatechange" &&
        (data.info === 0 || data.data === 0 || data.playerState === 0)
      )
        return true;
      if (
        data.event === "onStateChange" &&
        (data.info === 0 || (data.info && data.info.playerState === 0))
      )
        return true;
      if (
        data.data &&
        typeof data.data === "object" &&
        isEndedPlayerMessage(data.data)
      )
        return true;
      if (
        data.payload &&
        typeof data.payload === "object" &&
        isEndedPlayerMessage(data.payload)
      )
        return true;
      return false;
    }
    window.addEventListener("message", function (event) {
      if (
        !activePlayerFrame ||
        event.source !== activePlayerFrame.contentWindow
      )
        return;
      if (isEndedPlayerMessage(event.data)) {
        if (currentMedia && currentMedia.type === "tv") playNextEpisode();
        else playNextSimilar();
      }
    });
    function updateFullscreenButton() {
      var btn = $("player-fullscreen-btn");
      if (!btn) return;
      var active = !!document.fullscreenElement && document.fullscreenElement !== document.documentElement;
      var label = btn.querySelector(".fullscreen-label");
      if (label)
        label.textContent = active
          ? "Salir de pantalla completa"
          : "Pantalla completa";
      btn.title = active ? "Salir de pantalla completa" : "Pantalla completa";
      btn.setAttribute("aria-label", btn.title);
    }
    function togglePlayerFullscreen() {
      var target = $playerView;
      if (document.fullscreenElement && document.fullscreenElement !== document.documentElement) {
        if (document.exitFullscreen)
          document.exitFullscreen().catch(function () { });
        return;
      }
      if (target && target.requestFullscreen) {
        target
          .requestFullscreen()
          .then(updateFullscreenButton)
          .catch(function () {
            if (activePlayerFrame && activePlayerFrame.requestFullscreen)
              activePlayerFrame.requestFullscreen().catch(function () {
                showToast(
                  "El navegador no permite pantalla completa en este reproductor.",
                );
              });
            else
              showToast(
                "El navegador no permite pantalla completa en este reproductor.",
              );
          });
      } else if (activePlayerFrame && activePlayerFrame.requestFullscreen)
        activePlayerFrame.requestFullscreen().catch(function () {
          showToast(
            "El navegador no permite pantalla completa en este reproductor.",
          );
        });
      else
        showToast(
          "La pantalla completa no está disponible en este navegador.",
        );
    }
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    function playEmbed(i, b) {
      var s = SERVERS[i];
      $playerView.innerHTML = "";
      activePlayerFrame = null;
      $serverSwitcher.querySelectorAll(".server-btn").forEach(function (x) {
        x.classList.remove("active");
      });
      b.classList.add("active");
      setPreferredServer(s.name);
      var u = "";
      if (currentMedia.type === "tv") {
        var se = $seasonSelect.value,
          ep = $episodeSelect.value;
        u = s.url(currentMedia.id, currentMedia.type, se, ep);
        saveContinueWatching(currentMedia, se, ep);
      } else {
        u = s.url(currentMedia.id, currentMedia.type);
        saveContinueWatching(currentMedia);
      }
      var l = document.createElement("div");
      l.className = "player-loading";
      l.textContent = "Conectando con " + s.name + "...";
      var f = document.createElement("iframe");
      f.src = u;
      f.setAttribute(
        "allow",
        "autoplay; fullscreen; picture-in-picture; encrypted-media",
      );
      f.setAttribute("referrerpolicy", "origin");
      f.onload = function () {
        l.style.display = "none";
      };
      setTimeout(function () {
        if (l.isConnected) l.style.display = "none";
      }, 4000);
      $playerView.appendChild(l);
      $playerView.appendChild(f);
      activePlayerFrame = f;
      updateFullscreenButton();
    }
    window.openPlayer = function (i, t, ti, season, episode, bg) {
      currentMedia = {
        id: i,
        type: t,
        title: ti,
        bg: bg || null,
        genre_ids: [],
      };
      currentTvSeasons = [];
      currentTvEpisodes = [];
      isAdvancingEpisode = false;
      updateAutoNextButton();
      recordMediaStart(currentMedia, []);
      $modal.classList.add("open");
      document.body.style.overflow = "hidden";
      $modalTitle.textContent = ti;
      $playerView.innerHTML = "";
      activePlayerFrame = null;
      prepareSimilarQueue(currentMedia);
      $serverSwitcher.innerHTML = SERVERS.map(function (s, x) {
        var isPref = s.name === preferredServer ? "preferred" : "";
        return (
          '<button class="server-btn ' +
          isPref +
          '" id="server-btn-' +
          x +
          '" onclick="playEmbed(' +
          x +
          ',this)">' +
          s.icon +
          s.name +
          "</button>"
        );
      }).join("");
      var preferredIdx = SERVERS.findIndex(function (s) {
        return s.name === preferredServer;
      });
      var startIdx = preferredIdx >= 0 ? preferredIdx : 0;
      if (t === "tv") {
        $tvControls.classList.add("active");
        fetchTMDB("/tv/" + i)
          .then(function (d) {
            var se = (d.seasons || []).filter(function (s) {
              return s.season_number > 0;
            });
            currentTvSeasons = se.slice();
            if (!se.length) throw new Error("No hay temporadas");
            $seasonSelect.innerHTML = se
              .map(function (s) {
                return (
                  '<option value="' +
                  s.season_number +
                  '">Temporada ' +
                  s.season_number +
                  "</option>"
                );
              })
              .join("");
            var targetSeason = season || se[0].season_number;
            $seasonSelect.value = targetSeason;
            return loadEpisodes(i, targetSeason).then(function () {
              if (episode) $episodeSelect.value = episode;
            });
          })
          .then(function () {
            $seasonSelect.onchange = function () {
              loadEpisodes(i, $seasonSelect.value).then(function () {
                playEmbed(
                  startIdx,
                  document.getElementById("server-btn-" + startIdx),
                );
              });
            };
            $episodeSelect.onchange = function () {
              playEmbed(
                startIdx,
                document.getElementById("server-btn-" + startIdx),
              );
            };
            playEmbed(
              startIdx,
              document.getElementById("server-btn-" + startIdx),
            );
          })
          .catch(function () {
            $tvControls.classList.remove("active");
            playEmbed(
              startIdx,
              document.getElementById("server-btn-" + startIdx),
            );
          });
      } else {
        $tvControls.classList.remove("active");
        playEmbed(
          startIdx,
          document.getElementById("server-btn-" + startIdx),
        );
      }
      updateFullscreenButton();
    };
    function closePlayer() {
      if (document.fullscreenElement && document.fullscreenElement !== document.documentElement && document.exitFullscreen)
        document.exitFullscreen().catch(function () { });
      $modal.classList.remove("open");
      $playerView.innerHTML = "";
      activePlayerFrame = null;
      document.body.style.overflow = "";
    }
    window.closePlayer = closePlayer;
;
/* ==== js/core/events.js ==== */
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
;
/* ==== js/ui/keyboard.js ==== */
/**
 * TatoCine · js/ui/keyboard.js
 * Teclado: atajos, desplazamiento de carruseles y pantalla completa de la app.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function isTypingTarget(el) {
      if (!el) return false;
      var tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el.isContentEditable;
    }
    // Carrusel que se mueve con las flechas: el más cercano al centro de la pantalla (o el del detalle si está abierto).
    function pickKeyboardScroller() {
      var blocking = ["tc-pin-overlay", "tc-profile-create-overlay", "tc-profile-overlay"];
      for (var i = 0; i < blocking.length; i++) {
        if (document.getElementById(blocking[i]).classList.contains("open")) return null;
      }
      if ($modal.classList.contains("open") || $settingsModal.classList.contains("open") || $filtersModal.classList.contains("open") ||
        $actorModal.classList.contains("open") || $disclaimerModal.classList.contains("open") || $("mobile-menu").classList.contains("open")) return null;
      var scope = $detailsModal.classList.contains("open") ? $detailsModal : document;
      var selector = $detailsModal.classList.contains("open") ? ".details-cast" : ".row-scroll";
      var best = null, bestDist = Infinity, mid = window.innerHeight / 2;
      scope.querySelectorAll(selector).forEach(function (el) {
        if (el.scrollWidth <= el.clientWidth + 4) return;
        var r = el.getBoundingClientRect();
        if (r.height === 0 || r.bottom < 0 || r.top > window.innerHeight) return;
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = el; }
      });
      return best;
    }
    // ---- Pantalla completa de toda la aplicación ----
    function appFullscreenSupported() {
      var el = document.documentElement;
      var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
      return !standalone && !!(el.requestFullscreen || el.webkitRequestFullscreen);
    }
    function isAppFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
    function updateAppFullscreenButton() {
      var btn = $("app-fullscreen-btn");
      if (!btn) return;
      var on = isAppFullscreen();
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.title = on ? "Salir de pantalla completa" : "Pantalla completa";
      btn.setAttribute("aria-label", btn.title);
    }
    function toggleAppFullscreen() {
      if (!appFullscreenSupported() && !isAppFullscreen()) {
        showToast("La pantalla completa no está disponible en este dispositivo");
        return;
      }
      var el = document.documentElement;
      try {
        if (isAppFullscreen()) {
          var exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) { var p = exit.call(document); if (p && p.catch) p.catch(function () { }); }
        } else {
          var req = el.requestFullscreen || el.webkitRequestFullscreen;
          var r = req.call(el);
          if (r && r.catch) r.catch(function () { showToast("El navegador no permitió la pantalla completa"); });
        }
      } catch (err) { showToast("El navegador no permitió la pantalla completa"); }
    }
    (function initAppFullscreen() {
      var btn = $("app-fullscreen-btn");
      if (btn && appFullscreenSupported()) btn.hidden = false;
      document.addEventListener("fullscreenchange", updateAppFullscreenButton);
      document.addEventListener("webkitfullscreenchange", updateAppFullscreenButton);
    })();
;
/* ==== js/features/kids.js ==== */
/**
 * TatoCine · js/features/kids.js
 * Modo infantil: filtro de contenido apto y límite de uso (8 h + descanso de 1 h).
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Contenido para niños: solo se acepta lo que TMDB clasifica como apto (mismo criterio que la pestaña Niños) ----
    var KID_BLOCKED_GENRES = [27, 53, 80, 10752];
    var KID_MOVIE_CERTS = ["G"];
    var KID_TV_CERTS = ["TV-Y", "TV-Y7", "TV-G"];
    var kidSafeCache = {};
    function kidsContext() { return isKidProfile() || currentView === "kids"; }
    // Capa extra: descarta títulos con términos explícitos aunque TMDB los clasifique como aptos.
    var KID_BLOCKED_TERMS = /\bsex|porn|\bxxx|er[oó]tic|hentai|nsfw|fetish|bdsm|desnud|\bnaked|\bnude/i;
    function hasBlockedTerms() {
      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] && KID_BLOCKED_TERMS.test(String(arguments[i]))) return true;
      }
      return false;
    }
    function kidSafeFromDetails(d, type) {
      if (!d || d.adult) return false;
      if (hasBlockedTerms(d.title, d.name, d.original_title, d.original_name, d.overview, d.tagline)) return false;
      var blocked = (d.genres || []).some(function (g) { return KID_BLOCKED_GENRES.indexOf(g.id) > -1; });
      if (blocked) return false;
      var certs = [];
      if (type === "tv") {
        ((d.content_ratings && d.content_ratings.results) || []).forEach(function (r) {
          if (r.iso_3166_1 === "US" && r.rating) certs.push(r.rating);
        });
        return certs.length > 0 && certs.every(function (c) { return KID_TV_CERTS.indexOf(c) > -1; });
      }
      ((d.release_dates && d.release_dates.results) || []).forEach(function (r) {
        if (r.iso_3166_1 !== "US") return;
        (r.release_dates || []).forEach(function (x) { if (x.certification) certs.push(x.certification); });
      });
      return certs.length > 0 && certs.every(function (c) { return KID_MOVIE_CERTS.indexOf(c) > -1; });
    }
    function isKidSafe(id, type) {
      var key = type + ":" + id;
      if (Object.prototype.hasOwnProperty.call(kidSafeCache, key)) return Promise.resolve(kidSafeCache[key]);
      var endpoint = type === "tv" ? "/tv/" + id : "/movie/" + id;
      var append = type === "tv" ? "&append_to_response=content_ratings" : "&append_to_response=release_dates";
      return fetchTMDB(endpoint, append).then(function (d) {
        var ok = kidSafeFromDetails(d, type);
        kidSafeCache[key] = ok;
        return ok;
      }).catch(function () { return false; });
    }
    function kidsFilterSearch(list, limit) {
      var candidates = list.filter(function (x) {
        return !x.adult && !hasBlockedTerms(x.title, x.desc) && !(x.genre_ids || []).some(function (g) { return KID_BLOCKED_GENRES.indexOf(g) > -1; });
      }).slice(0, limit || 16);
      return Promise.all(candidates.map(function (x) {
        return isKidSafe(x.id, x.type).then(function (ok) { return ok ? x : null; });
      })).then(function (r) { return r.filter(Boolean); });
    }
    (function guardKidContent() {
      var BLOCKED_MSG = "Este contenido no está disponible en la sección Niños";
      decorate("openDetails", function (original) { return function (id, type) {
        if (!kidsContext()) return original(id, type);
        id = Number(id);
        if (!Number.isSafeInteger(id) || id <= 0 || (type !== "movie" && type !== "tv")) return original(id, type);
        isKidSafe(id, type).then(function (ok) { if (ok) original(id, type); else showToast(BLOCKED_MSG); });
      }; });
      decorate("openPlayer", function (original) { return function (i, t, ti, season, episode, bg) {
        if (!kidsContext()) return original(i, t, ti, season, episode, bg);
        isKidSafe(i, t).then(function (ok) { if (ok) original(i, t, ti, season, episode, bg); else showToast(BLOCKED_MSG); });
      }; });
      decorate("prepareSimilarQueue", function (original) { return function (media) {
        if (!kidsContext()) return original(media);
        similarQueue = [];
        playerEndedHandled = false;
        isAdvancingSimilar = false;
        similarQueuePromise = Promise.resolve([]);
        return similarQueuePromise;
      }; });
    })();

    // ==========================================================
    // V5 · Límite de uso infantil, imágenes de plataformas, regreso a inicio
    //      y modo ligero para Smart TV y dispositivos modestos.
    // ==========================================================

    // ---- Límite de uso infantil: 8 h de uso y 1 h de descanso (local, compartido por los perfiles Niño del dispositivo) ----
    var KID_LIMIT_SECS = 8 * 3600, KID_BREAK_MS = 3600 * 1000, KID_USAGE_KEY = "tatoKidUsageV1";
    var kidUsage = readLocalJSON(KID_USAGE_KEY, null);
    if (!kidUsage || typeof kidUsage !== "object") kidUsage = { day: "", secs: 0, lockedUntil: 0 };
    var kidLastTick = Date.now(), kidWarned = false, kidSavedAt = 0, kidLockTimer = null;
    function dayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
    function saveKidUsage() { kidSavedAt = Date.now(); safeStorageSet(KID_USAGE_KEY, JSON.stringify(kidUsage)); }
    function updateKidLockTime() {
      var left = (kidUsage.lockedUntil || 0) - Date.now();
      if (left <= 0) { unlockKid(); return; }
      var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      $("tc-kid-lock-time").textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    }
    function showKidLock() {
      var el = $("tc-kid-lock");
      if (!el.classList.contains("open")) {
        el.classList.add("open");
        try { if ($modal.classList.contains("open")) closePlayer(); } catch (e) { }
        try { if ($detailsModal.classList.contains("open")) closeDetails(true); } catch (e) { }
        try { if ($actorModal.classList.contains("open")) closeActor(); } catch (e) { }
        document.body.style.overflow = "hidden";
        kidLockTimer = setInterval(updateKidLockTime, 1000);
        window.setTimeout(function () { var b = el.querySelector("button"); if (b) b.focus(); }, 80);
      }
      updateKidLockTime();
    }
    function hideKidLock() {
      var el = $("tc-kid-lock");
      if (el.classList.contains("open")) { el.classList.remove("open"); document.body.style.overflow = ""; }
      clearInterval(kidLockTimer);
    }
    function unlockKid() {
      kidUsage = { day: dayKey(), secs: 0, lockedUntil: 0 };
      kidWarned = false;
      saveKidUsage();
      hideKidLock();
      if (isKidProfile()) showToast("Descanso terminado: ya puedes volver a ver contenido");
    }
    function kidUsageTick() {
      var now = Date.now();
      var elapsed = Math.min(15, Math.max(0, (now - kidLastTick) / 1000));
      kidLastTick = now;
      if (!isKidProfile()) return;
      if (kidUsage.lockedUntil && kidUsage.lockedUntil > now) { showKidLock(); return; }
      if (kidUsage.lockedUntil) { unlockKid(); return; }
      if (kidUsage.day !== dayKey()) { kidUsage.day = dayKey(); kidUsage.secs = 0; kidWarned = false; }
      if (document.hidden) return;
      kidUsage.secs += elapsed;
      if (kidUsage.secs >= KID_LIMIT_SECS) {
        kidUsage.lockedUntil = now + KID_BREAK_MS;
        saveKidUsage();
        showKidLock();
        return;
      }
      if (!kidWarned && KID_LIMIT_SECS - kidUsage.secs <= 900) { kidWarned = true; showToast("Quedan 15 minutos de uso antes del descanso"); }
      if (now - kidSavedAt > 30000) saveKidUsage();
    }
    setInterval(kidUsageTick, 5000);
    document.addEventListener("visibilitychange", function () { if (document.hidden && isKidProfile()) saveKidUsage(); kidLastTick = Date.now(); });
    window.addEventListener("pagehide", function () { if (isKidProfile()) saveKidUsage(); });
    if (isKidProfile()) kidUsageTick();
;
/* ==== js/i18n/i18n.js ==== */
/**
 * TatoCine · js/i18n/i18n.js
 * Idioma por perfil (ESP/ENG): diccionario, reglas y traducción en vivo del DOM.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ==========================================================
    // ==========================================================
    // V8 · Idioma por perfil (ESP / ENG). El texto base de la app está en español;
    //      con un perfil en inglés se traduce toda la interfaz en tiempo real.
    // ==========================================================
    var I18N_EXACT = {
      // --- navegación, secciones y pantallas ---
      "Inicio": "Home", "Películas": "Movies", "Anime": "Anime", "Series": "Series", "Niños": "Kids", "Favoritos": "Favorites",
      "Perfiles": "Profiles", "Ajustes": "Settings", "Aviso Legal": "Legal notice", "Info": "Info", "Ver": "Watch", "Ver Tráiler": "Watch Trailer",
      "Ocultar Tráiler": "Hide Trailer", "Compartir": "Share", "Reparto": "Cast", "Recomendados para ti": "Recommended for you",
      "Regresar a inicio": "Back to home", "Pantalla completa": "Full screen", "Salir de pantalla completa": "Exit full screen",
      "Instalar aplicación": "Install app", "Instalar": "Install", "Instalar TatoCine": "Install TatoCine", "Cerrar": "Close", "Cerrar reproductor": "Close player",
      "Anterior": "Previous", "Siguiente": "Next", "Cargando...": "Loading...", "Cargando": "Loading", "Cargando descripción...": "Loading description...",
      "Todos": "All", "General": "General", "Cargar más": "Load more", "Cancelar": "Cancel", "Borrar": "Delete", "Limpiar": "Clear", "Entendido": "Got it", "Entrar": "Enter",
      "Crear": "Create", "Cambiar": "Change", "Resetear": "Reset", "Reintentar": "Retry", "Copiar": "Copy", "Copiado ✓": "Copied ✓", "Aceptar y continuar": "Accept and continue",
      "⚙ Filtros": "⚙ Filters", "Filtros Avanzados": "Advanced Filters", "Año": "Year", "Rating mínimo": "Minimum rating", "Ordenar por": "Sort by",
      "Popularidad": "Popularity", "Mejor puntuadas": "Top rated", "Más recientes": "Most recent",
      "Sin conexión a internet": "No internet connection", "Conexión restaurada": "Connection restored",
      // --- filas del inicio ---
      "Continuar Viendo": "Continue Watching", "Hecho para ti": "Made for you", "Tendencias de la semana": "Trending this week", "Próximos Estrenos": "Upcoming Releases",
      "Películas Populares": "Popular Movies", "Series Populares": "Popular Series", "Plataformas y estudios": "Platforms and studios", "Top 10 de la semana": "Top 10 this week",
      "Películas mejor calificadas": "Top Rated Movies", "Series mejor calificadas": "Top Rated Series", "Películas para Niños": "Movies for Kids", "Series para Niños": "Series for Kids",
      "Tendencia": "Trending", "Más tendencias": "More trending",
      // --- reproductor ---
      "Reproduciendo...": "Playing...", "Reproduciendo:": "Playing:", "Conectando con": "Connecting to", "Siguiente: ACTIVADO": "Next: ON", "Siguiente: DESACTIVADO": "Next: OFF",
      "Avanza cuando el reproductor externo comunica que el capítulo terminó": "Advances when the external player reports the episode ended",
      "Siguiente episodio en": "Next episode in", "Reproducir ahora": "Play now", "Reproducir contenido": "Play content",
      "Temporada": "Season", "Episodio": "Episode", "Siguiente película": "Next movie", "Abrir en YouTube": "Open on YouTube",
      "Siguiente episodio automático activado": "Autoplay next episode on", "Reproducción automática desactivada": "Autoplay turned off",
      "Has llegado al último episodio disponible": "You have reached the last available episode", "No se pudo cargar la siguiente temporada": "Could not load the next season",
      "La película terminó. No hay otra recomendación disponible.": "The movie ended. No other recommendation is available.",
      "El navegador no permite pantalla completa en este reproductor.": "The browser does not allow full screen in this player.",
      "La pantalla completa no está disponible en este navegador.": "Full screen is not available in this browser.",
      "La pantalla completa no está disponible en este dispositivo": "Full screen is not available on this device",
      "El navegador no permitió la pantalla completa": "The browser did not allow full screen",
      // --- estados / metadatos ---
      "PRÓXIMAMENTE": "COMING SOON", "Próximamente": "Coming soon", "Estrenada": "Released", "En Emisión": "On Air", "Finalizada": "Ended", "Planeada": "Planned", "Rumoreada": "Rumored", "Piloto": "Pilot",
      "Película": "Movie", "Serie": "Series", "Película infantil": "Kids movie", "Serie infantil": "Kids series", "Todo público": "All ages",
      "Película · Reanudar": "Movie · Resume", "Serie · Reanudar": "Series · Resume", "Año no disponible": "Year not available", "Sin descripción disponible.": "No description available.",
      "Sin título": "Untitled", "Sin nombre": "No name", "Contenido": "Content", "Sin contenido": "No content", "Otros": "Other",
      "Este contenido todavía no está disponible": "This content is not available yet",
      // --- géneros ---
      "Acción": "Action", "Aventura": "Adventure", "Animación": "Animation", "Comedia": "Comedy", "Crimen": "Crime", "Documental": "Documentary", "Documentales": "Documentaries", "Drama": "Drama",
      "Familia": "Family", "Fantasía": "Fantasy", "Historia": "History", "Terror": "Horror", "Música": "Music", "Misterio": "Mystery", "Romance": "Romance", "Ciencia ficción": "Science Fiction",
      "Película para televisión": "TV Movie", "Suspenso": "Thriller", "Suspense": "Thriller", "Bélica": "War", "Western": "Western", "Acción y aventura": "Action & Adventure", "Acción y Aventura": "Action & Adventure",
      "Infantil": "Kids", "Noticias": "News", "Reality": "Reality", "Ciencia ficción y fantasía": "Sci-Fi & Fantasy", "Sci-Fi": "Sci-Fi", "Sci-Fi & Fantasy": "Sci-Fi & Fantasy", "Telenovela": "Soap", "Talk show": "Talk Show",
      "Guerra y política": "War & Politics", "Misterio, suspenso y terror": "Mystery, thriller and horror",
      // --- búsqueda ---
      "Buscar películas, series, anime...": "Search movies, series, anime...", "Búsquedas recientes": "Recent searches", "No encontramos resultados": "No results found",
      "No encontramos películas, series o anime con ese nombre. Prueba con otro título o revisa la escritura.": "We couldn't find movies, series or anime with that name. Try another title or check the spelling.",
      "No se pudo completar la búsqueda": "The search could not be completed", "Comprueba tu conexión": "Check your connection", "Sin resultados": "No results", "Prueba con otros filtros.": "Try other filters.",
      "Error de conexión": "Connection error", "Error al cargar": "Loading error", "No se pudo cargar el catálogo.": "The catalog could not be loaded.",
      "TatoCine no pudo consultar el catálogo en este momento. Inténtalo de nuevo.": "TatoCine couldn't query the catalog right now. Please try again.",
      "No hay un título destacado disponible": "No featured title available", "No se pudieron cargar los datos del contenido": "Could not load the content data",
      "No se pudieron cargar los detalles. Comprueba tu conexión e inténtalo de nuevo.": "Could not load the details. Check your connection and try again.",
      "No se pudieron identificar los detalles de este título": "Could not identify this title's details", "No hay temporadas": "No seasons",
      "Este actor no tiene biografía disponible en TMDB.": "This actor has no biography available on TMDB.", "No se pudo obtener la biografía.": "Could not load the biography.",
      // --- favoritos, listas, estadísticas ---
      "Guardar en favoritos": "Save to favorites", "Agregar a favoritos": "Add to favorites", "Quitar de favoritos": "Remove from favorites", "En favoritos": "In favorites", "Eliminado de favoritos": "Removed from favorites",
      "Agregado a favoritos": "Added to favorites", "Guardado en Favoritos": "Saved to Favorites", "Agregar": "Add", "Quitar": "Remove", "Like!": "Liked!",
      "+ Nueva lista": "+ New list", "Nueva lista": "New list", "Crear lista": "Create list", "Editar lista": "Edit list", "Eliminar lista": "Delete list", "Nombre de la lista": "List name", "Guardar cambios": "Save changes",
      "Lista actualizada": "List updated", "Lista eliminada": "List deleted", "Lista borrada": "List deleted", "Ya existe una lista con ese nombre": "A list with that name already exists", "Puedes crear hasta 12 listas": "You can create up to 12 lists",
      "Escribe un nombre para la lista": "Enter a name for the list", "Estadísticas": "Statistics", "Eliminar todos los favoritos": "Remove all favorites", "Lista borrada.": "List deleted.",
      "Agrupa tus favoritos, por ejemplo «Romance» o «Para el fin de semana». Si borras una lista, sus títulos pasan a General.": "Group your favorites, e.g. “Romance” or “For the weekend”. If you delete a list, its titles move to General.",
      "Esta lista aún no tiene títulos. Usa el corazón en cualquier título y elige esta lista.": "This list has no titles yet. Use the heart on any title and choose this list.",
      "Tus favoritos está vacío": "Your favorites is empty", "Haz clic en el corazón de cualquier película, anime o serie para guardarla aquí.": "Click the heart on any movie, anime or series to save it here.",
      "Haz clic en el corazón de cualquier película, anime o serie para guardarla aquí. También puedes crear listas para organizarlos.": "Click the heart on any movie, anime or series to save it here. You can also create lists to organize them.",
      "Tiempo de visualización": "Watch time", "Títulos reproducidos": "Titles played", "Títulos finalizados": "Titles finished", "Lo que más ves": "What you watch most", "Qué ves más": "What you watch most",
      "Tu Top 3": "Your Top 3", "Géneros favoritos": "Favorite genres", "Ranking de perfiles": "Profile ranking", "Todavía no hay títulos en tu ranking.": "There are no titles in your ranking yet.",
      "Aún no hay datos. Reproduce títulos y aquí verás tu tiempo, tu ranking y tus preferencias.": "No data yet. Play titles and you'll see your time, ranking and preferences here.",
      "Todo se calcula en este dispositivo; no se envía a ningún servidor.": "Everything is calculated on this device; nothing is sent to any server.",
      "Película": "Movie", "Lista": "List",
      // --- perfiles ---
      "¿Quién está viendo?": "Who's watching?", "Elige un perfil para continuar": "Choose a profile to continue", "Agregar perfil": "Add profile", "Editar perfil": "Edit profile", "Crear perfil": "Create profile",
      "Eliminar perfil": "Delete profile", "Nombre del perfil": "Profile name", "Escribe un nombre": "Enter a name", "Tipo de perfil": "Profile type", "Adulto": "Adult", "Niño": "Kid",
      "¿Para quién es este perfil?": "Who is this profile for?", "Acceso completo a todas las secciones.": "Full access to every section.",
      "Solo verá la sección Niños. La búsqueda también se limita a contenido infantil.": "Will only see the Kids section. Search is also limited to kids' content.",
      "PIN": "PIN", "PIN de acceso (opcional)": "Access PIN (optional)", "4 dígitos": "4 digits", "Quitar PIN": "Remove PIN", "Perfil protegido": "Protected profile", "Ingresa el PIN para continuar.": "Enter the PIN to continue.",
      "PIN incorrecto.": "Incorrect PIN.", "El PIN debe tener exactamente 4 números": "The PIN must have exactly 4 digits", "El PIN se quitará al guardar los cambios.": "The PIN will be removed when you save the changes.",
      "Si defines un PIN, se pedirá cada vez que alguien intente entrar a este perfil.": "If you set a PIN, it will be requested every time someone tries to enter this profile.",
      "Este perfil tiene PIN. Déjalo vacío para conservarlo o escribe 4 dígitos nuevos para cambiarlo.": "This profile has a PIN. Leave it empty to keep it or enter 4 new digits to change it.",
      "Crea un espacio propio para tus películas, series y recomendaciones.": "Create your own space for your movies, series and recommendations.",
      "Cambia el nombre, el tipo o el PIN de este perfil. Tu historial y tus listas se conservarán.": "Change this profile's name, type or PIN. Your history and lists will be kept.",
      "Hasta 6 perfiles. Los nombres, las listas, el historial y las recomendaciones se guardan solamente en este navegador; no se crea ninguna cuenta ni se envían datos a una base de datos.": "Up to 6 profiles. Names, lists, history and recommendations are stored only in this browser; no account is created and no data is sent to a database.",
      "Perfil actual": "Current profile", "Actual": "Current", "Seleccionar": "Select", "Cambiar de perfil": "Switch profile", "Cambiar perfil local": "Switch local profile", "Perfil actualizado": "Profile updated", "Perfil eliminado": "Profile deleted",
      "Escribe un nombre para el perfil": "Enter a name for the profile", "No se encontró el perfil": "Profile not found", "Debe existir al menos un perfil": "At least one profile must exist", "Debe existir al menos un perfil de adulto": "At least one adult profile must exist",
      "Puedes crear hasta 6 perfiles": "You can create up to 6 profiles", "Solo un perfil de adulto puede administrar perfiles": "Only an adult profile can manage profiles",
      "No se pudieron guardar los cambios en este navegador": "Changes could not be saved in this browser", "No se pudo eliminar el perfil en este navegador": "The profile could not be deleted in this browser",
      "No se pudo cambiar de perfil en este dispositivo": "Could not switch profile on this device", "No se encontró el perfil que quieres editar": "The profile you want to edit was not found",
      "No se pudo abrir el formulario de perfiles": "Could not open the profiles form", "Demasiados intentos. Espera 30 s.": "Too many attempts. Wait 30 s.", "Fotografía de perfil": "Profile photo",
      "Este contenido no está disponible en la sección Niños": "This content is not available in the Kids section",
      "Hora de descansar": "Time for a break", "Se alcanzó el límite de 8 horas de uso. Podrás volver a ver contenido cuando termine el descanso de 1 hora.": "The 8-hour usage limit was reached. You can watch again when the 1-hour break ends.",
      "Descanso terminado: ya puedes volver a ver contenido": "Break over: you can watch again", "Quedan 15 minutos de uso antes del descanso": "15 minutes of use left before the break",
      // --- ajustes ---
      "Borrar historial de reproducción": "Clear watch history", "Servidor Preferido": "Preferred server", "Ninguno": "None", "Recomendaciones personalizadas": "Personalized recommendations", "Borrar preferencias": "Clear preferences",
      "Tus preferencias se calculan localmente en este navegador. No se envían a TatoCine.": "Your preferences are calculated locally in this browser. They are not sent to TatoCine.",
      "Atajos de Teclado": "Keyboard shortcuts", "/ buscar · ← ↑ → ↓ moverse · Enter abrir · F pantalla completa · Esc o Atrás cerrar": "/ search · ← ↑ → ↓ move · Enter open · F full screen · Esc or Back close",
      "Almacenamiento": "Storage", "Calculando…": "Calculating…", "Liberar espacio": "Free up space", "Espacio liberado": "Space freed", "Modo ligero": "Lite mode",
      "Automático": "Automatic", "automático": "automatic", "activado": "on", "desactivado": "off",
      "Automático: se activa en TV, conexiones lentas y equipos modestos": "Automatic: turns on for TVs, slow connections and modest devices",
      "Activado: menos efectos e imágenes más livianas": "On: fewer effects and lighter images", "Desactivado: máxima calidad visual": "Off: maximum visual quality",
      "Añade TatoCine a tu pantalla de inicio.": "Add TatoCine to your home screen.", "Instala TatoCine como app en este dispositivo.": "Install TatoCine as an app on this device.",
      "Te mostramos cómo instalarla en este dispositivo.": "We'll show you how to install it on this device.", "Instalando TatoCine…": "Installing TatoCine…", "TatoCine instalada": "TatoCine installed",
      "TatoCine se actualizó. Recarga para ver la última versión.": "TatoCine was updated. Reload to see the latest version.",
      "Historial borrado": "History cleared", "Lista borrada": "List deleted", "Preferencias locales borradas": "Local preferences cleared", "Servidor reseteado": "Server reset",
      "¿Borrar toda tu lista de favoritos?": "Delete your entire favorites list?", "¿Borrar el historial local que utiliza TatoCine para personalizar las recomendaciones?": "Delete the local history TatoCine uses to personalize recommendations?",
      "Eliminado de Continuar Viendo": "Removed from Continue Watching", "Quitar de Continuar Viendo": "Remove from Continue Watching", "No se pudo guardar el cambio": "The change could not be saved",
      // --- instalación ---
      "Smart TV": "Smart TV", "Escritorio": "Desktop", "Escritorio (Firefox)": "Desktop (Firefox)", "Mac (Safari)": "Mac (Safari)", "iPhone / iPad": "iPhone / iPad", "Android": "Android",
      "Los navegadores de TV normalmente no permiten instalar aplicaciones web.": "TV browsers usually don't allow installing web apps.",
      "En el menú del navegador de tu TV usa «Añadir a favoritos» o «Fijar en inicio» para entrar rápido a TatoCine.": "In your TV browser's menu use “Add to bookmarks” or “Pin to home” to open TatoCine quickly.",
      "En Android TV / Google TV con Chrome, usa el menú ⋮ → «Instalar aplicación» si aparece.": "On Android TV / Google TV with Chrome, use the ⋮ menu → “Install app” if it appears.",
      "Abre TatoCine en Safari (también funciona en Chrome o Edge con iOS 16.4 o superior).": "Open TatoCine in Safari (it also works in Chrome or Edge on iOS 16.4 or later).",
      "Toca el botón Compartir (cuadrado con una flecha hacia arriba).": "Tap the Share button (square with an up arrow).",
      "Elige «Añadir a pantalla de inicio» y confirma con «Añadir».": "Choose “Add to Home Screen” and confirm with “Add”.",
      "Toca el menú ⋮ del navegador.": "Tap the browser's ⋮ menu.", "Elige «Instalar aplicación» o «Añadir a la pantalla de inicio».": "Choose “Install app” or “Add to Home screen”.", "Confirma con «Instalar».": "Confirm with “Install”.",
      "Firefox de escritorio no permite instalar aplicaciones web.": "Desktop Firefox doesn't allow installing web apps.",
      "Abre TatoCine en Chrome o Edge para instalarla, o guárdala en tus marcadores.": "Open TatoCine in Chrome or Edge to install it, or save it to your bookmarks.",
      "En el menú Archivo, elige «Añadir al Dock…».": "In the File menu, choose “Add to Dock…”.", "Confirma el nombre y pulsa «Añadir».": "Confirm the name and click “Add”.",
      "Busca el icono de instalar en la barra de direcciones (a la derecha) y haz clic en «Instalar».": "Look for the install icon in the address bar (on the right) and click “Install”.",
      "Si no aparece: en Chrome, menú ⋮ → «Guardar y compartir» → «Instalar TatoCine»; en Edge, menú ··· → «Aplicaciones» → «Instalar este sitio como una aplicación».": "If it doesn't appear: in Chrome, ⋮ menu → “Save and share” → “Install TatoCine”; in Edge, ··· menu → “Apps” → “Install this site as an app”.",
      "La instalación requiere HTTPS (o localhost).": "Installation requires HTTPS (or localhost).",
      "En Safari: Compartir → Añadir a pantalla de inicio.": "In Safari: Share → Add to Home Screen.", "En Safari: toca Compartir y elige «Añadir a pantalla de inicio»": "In Safari: tap Share and choose “Add to Home Screen”",
      // --- compartir y varios ---
      "TATOCINE · COMPARTIR": "TATOCINE · SHARE", "ENLACE DIRECTO": "DIRECT LINK", "Comparte este título con quien quieras.": "Share this title with anyone.", "Enlace copiado al portapapeles.": "Link copied to the clipboard.",
      "Enlace seleccionado. Mantén pulsado o usa Ctrl+C para copiarlo.": "Link selected. Press and hold or use Ctrl+C to copy it.", "No se pudo generar el enlace": "Could not generate the link", "No se pudo generar el enlace de este contenido": "Could not generate this content's link",
      "No se encontró el botón para compartir": "Share button not found", "este título": "this title", "este contenido": "this content", "Mira": "Check out",
      "Aviso Legal y Descargo de Responsabilidad": "Legal Notice and Disclaimer",
      "TatoCine solo es una página de reproducción multimedia que busca en sitios de terceros y externos material audiovisual en base a un API gratuito de TMDB. TatoCine no almacena datos de búsqueda de las personas, no almacena ni aloja ningún tipo de material audiovisual todo se consulta on-demand a través de terceros. No lucra ni busca lucrar. Algunos reproductores pueden tener anuncios de terceros por lo que TatoCine no se hace responsable por material indebido o con derecho de autor porque los anuncios no están en nuestro código fuente. TatoCine es un proyecto totalmente gratuito y de código abierto: se distribuye bajo una licencia gratuita (MIT), sin costo ni suscripciones, y puede usarse, copiarse y modificarse libremente respetando los términos de esa licencia.":
        "TatoCine is only a media playback page that searches third-party and external sites for audiovisual material using TMDB's free API. TatoCine does not store people's search data and does not store or host any kind of audiovisual material; everything is queried on demand through third parties. It does not profit and does not seek to profit. Some players may show third-party ads, so TatoCine is not responsible for improper or copyrighted material because the ads are not in our source code. TatoCine is a completely free and open-source project: it is distributed under a free license (MIT), at no cost and with no subscriptions, and it may be used, copied and modified freely under the terms of that license.",
      "TatoCine | Películas, series y anime": "TatoCine | Movies, series and anime",
      "Explora películas, series y anime en TatoCine.": "Explore movies, series and anime on TatoCine.",
      "Explora películas, series y anime en TatoCine. Descubre estrenos, títulos populares y recomendaciones basadas en tus preferencias locales.": "Explore movies, series and anime on TatoCine. Discover new releases, popular titles and recommendations based on your local preferences.",
      "Explora películas, series y anime. Descubre estrenos, títulos populares y recomendaciones basadas en tus preferencias locales.": "Explore movies, series and anime. Discover new releases, popular titles and recommendations based on your local preferences.",
      "Explora películas, series y anime. Descubre títulos populares y recomendaciones personalizadas.": "Explore movies, series and anime. Discover popular titles and personalized recommendations.",
      "TatoCine - Streaming Gratis": "TatoCine - Free Streaming", "TatoCine: películas, anime y series gratis en streaming.": "TatoCine: free streaming movies, anime and series.",
      "Guardar": "Save", "Cerrar lista": "Close list", "Desde un perfil Niño no se puede entrar como Invitado": "Kids profiles cannot switch to the Guest profile", "Invitado": "Guest", "El perfil Invitado no se puede editar": "The Guest profile cannot be edited",
      "Todo público": "All ages"
    };
    // Reglas para textos con datos variables (aplican a fragmentos; se evalúan en orden)
    var I18N_RULES = [
      [/^Guardado en «(.+)»$/, "Saved in «$1»"],
      [/^Lista «(.+)» creada$/, "List «$1» created"],
      [/^Resultados para "(.*)"$/, "Results for \"$1\""],
      [/^Búsqueda: "(.*)"$/, "Search: \"$1\""],
      [/^No encontramos contenido para (.+)\.$/, "We couldn't find content for $1."],
      [/^Porque viste (.+)$/, "Because you watched $1"],
      [/^¿Dónde quieres guardar «(.+)»\?$/, "Where do you want to save «$1»?"],
      [/^Colección · (.+)$/, function (m, a) { return "Collection · " + trText(a); }],
      [/^(Películas|Series|Anime|Películas para Niños|Series para Niños) · página (\d+)$/, function (m, a, n) { return trText(a) + " · page " + n; }],
      [/^(Películas|Series) · (.+)$/, function (m, a, b) { return trText(a) + " · " + b; }],
      [/^Siguiente temporada: T(\d+) · (.*)$/, "Next season: S$1 · $2"],
      [/^Siguiente episodio: (.*)$/, "Next episode: $1"],
      [/^Modo ligero: (.+)$/, function (m, a) { return "Lite mode: " + trText(a); }],
      [/^Temporada (\d+)$/, "Season $1"],
      [/^Episodio (\d+)(.*)$/, "Episode $1$2"],
      [/^Perfil actual: (.+)\. Cambiar perfil$/, "Current profile: $1. Switch profile"],
      [/^Editar nombre de (.+)$/, "Edit name of $1"],
      [/^Seleccionar perfil (.+)$/, "Select profile $1"],
      [/^Quitar (.+) de Continuar Viendo$/, "Remove $1 from Continue Watching"],
      [/^Tráiler de (.+)$/, "Trailer: $1"],
      [/^Puesto (\d+)$/, "Rank $1"],
      [/^(\d+) de 6 perfiles locales$/, "$1 of 6 local profiles"],
      [/^Quien más ha visto: (.+)$/, "Most watched: $1"],
      [/^Actual( · .*)$/, function (m, a) { return "Current" + a; }],
      [/^Seleccionar( · .*)$/, function (m, a) { return "Select" + a; }],
      // fragmentos dentro de oraciones más largas
      [/(\d+) títulos reproducidos · (\d+) finalizados\./g, "$1 titles played · $2 finished."],
      [/Termina 2 títulos para activar «Hecho para ti»\./g, "Finish 2 titles to unlock “Made for you”."],
      [/Géneros principales: /g, "Top genres: "],
      [/Los datos permanecen en este dispositivo\./g, "Data stays on this device."],
      [/Datos locales: /g, "Local data: "],
      [/· Total usado por la app: /g, "· Total used by the app: "],
      [/(\d+) reproducciones/g, "$1 plays"],
      [/(\d+) reproducción/g, "$1 play"],
      [/(\d+) títulos/g, "$1 titles"],
      [/ \(tú\)/g, " (you)"],
      [/ · (\d+) favoritos? pasaron a General/g, " · $1 favorites moved to General"],
      [/^Lista eliminada/, "List deleted"],
      [/\/episodio/g, "/episode"],
      [/ \((\d+) años\)/g, " ($1 years old)"],
      [/^T(\d+) · E(\d+)/, "S$1 · E$2"],
      [/^(Escritorio \(Firefox\)|Escritorio|Mac \(Safari\)) · /, function (m, a) { return trText(a) + " · "; }],
      [/ · sigue estos pasos para instalar TatoCine:/g, " · follow these steps to install TatoCine:"],
      [/ · Sin historial/g, " · No history"],
      [/ · Niño/g, " · Kid"],
      [/^Conectando con (.+?)\.\.\.$/, "Connecting to $1..."],
      [/^Ingresa el PIN de (.+) para continuar\.$/, "Enter the PIN for $1 to continue."]
    ];
    var I18N_LC = {};
    Object.keys(I18N_EXACT).forEach(function (k) { I18N_LC[k.toLowerCase()] = I18N_EXACT[k]; });
    // API para módulos nuevos: L() elige el texto según el idioma del perfil; i18nAdd/i18nRule amplían el diccionario.
    function L(es, en) { return UI_EN ? en : es; }
    var i18nRetranslatePending = false;
    function i18nAdd(map) {
      Object.keys(map).forEach(function (k) { I18N_EXACT[k] = map[k]; I18N_LC[k.toLowerCase()] = map[k]; });
      // Los módulos que cargan después del primer recorrido del DOM obligan a repetirlo (una sola vez por lote).
      if (UI_EN && !i18nRetranslatePending) {
        i18nRetranslatePending = true;
        setTimeout(function () { i18nRetranslatePending = false; trTree(document.body); }, 0);
      }
    }
    function i18nRule(re, replacement) { I18N_RULES.push([re, replacement]); }
    var I18N_SKIP = ".card-title,.hero-title,.hero-desc,.details-title,.details-overview,.cast-name,.cast-char,.actor-name,.actor-bio,.actor-meta,.tc-profile-card-name,.tc-profile-trigger-name,.recent-item,.stat-top-title,[data-i18n=\"skip\"],script,style,textarea,input";
    function trText(raw) {
      if (!UI_EN || raw == null) return raw;
      var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(String(raw));
      var core = m[2].replace(/\s+/g, " ");
      if (core.length < 2) return raw;
      var out = I18N_EXACT[core];
      if (out === undefined) {
        var lc = I18N_LC[core.toLowerCase()];
        if (lc !== undefined) out = (core === core.toUpperCase() && core !== core.toLowerCase()) ? lc.toUpperCase() : lc;
      }
      if (out === undefined) {
        var cur = core;
        for (var i = 0; i < I18N_RULES.length; i++) cur = cur.replace(I18N_RULES[i][0], I18N_RULES[i][1]);
        if (cur === core) return raw;
        out = cur;
      }
      return m[1] + out + m[3];
    }
    var I18N_ATTRS = ["title", "aria-label", "placeholder"];
    function trAttrs(el) {
      if (!el || el.nodeType !== 1) return;
      for (var i = 0; i < I18N_ATTRS.length; i++) {
        var v = el.getAttribute(I18N_ATTRS[i]);
        if (v) { var t = trText(v); if (t !== v) el.setAttribute(I18N_ATTRS[i], t); }
      }
      if (el.tagName === "META") {
        var c = el.getAttribute("content");
        if (c && /^(description|og:title|og:description|twitter:title|twitter:description)$/.test(el.getAttribute("name") || el.getAttribute("property") || "")) {
          var tc = trText(c); if (tc !== c) el.setAttribute("content", tc);
        }
      }
    }
    function trTextNode(node) {
      var v = node.nodeValue;
      if (!v || v.length < 2) return;
      var t = trText(v);
      if (t === v) return;
      var p = node.parentElement;
      if (p && p.closest && p.closest(I18N_SKIP)) return;
      node.nodeValue = t;
    }
    function trTree(root) {
      if (!root) return;
      if (root.nodeType === 3) { trTextNode(root); return; }
      if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
      if (root.nodeType === 1) {
        trAttrs(root);
        if (root.closest && root.closest(I18N_SKIP)) return;
      }
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      var n;
      while ((n = walker.nextNode())) trTextNode(n);
      if (root.querySelectorAll) root.querySelectorAll("[title],[aria-label],[placeholder]").forEach(trAttrs);
    }
    if (UI_EN) {
      document.documentElement.lang = "en";
      var nativeConfirm = window.confirm;
      window.confirm = function (msg) { return nativeConfirm.call(window, trText(msg)); };
      var nativeShare = navigator.share;
      if (typeof nativeShare === "function") {
        navigator.share = function (data) {
          var d = {}; for (var k in data) d[k] = typeof data[k] === "string" ? trText(data[k]) : data[k];
          return nativeShare.call(navigator, d);
        };
      }
      trTree(document.head);
      trTree(document.body);
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var mu = list[i];
          if (mu.type === "childList") { for (var j = 0; j < mu.addedNodes.length; j++) trTree(mu.addedNodes[j]); }
          else if (mu.type === "characterData") trTextNode(mu.target);
          else if (mu.type === "attributes") trAttrs(mu.target);
        }
      }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "aria-label", "placeholder", "content"] });
    }
;
/* ==== js/core/storage-maintenance.js ==== */
/**
 * TatoCine · js/core/storage-maintenance.js
 * Mantenimiento de almacenamiento: limpieza, cuota y ajustes de espacio.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Almacenamiento local: guardado compacto, limpieza y manejo de cuota ----
    var STORAGE_LEGACY_KEYS = ["tatoList", "tatoContinue", "tatoLocalAnalyticsV1", "tatoServer", "tatoAutoNextEpisode"];
    // Escritura segura (la original de storage.js). La decorada reintenta tras liberar espacio si la cuota se llena.
    var storageSetOriginal = safeStorageSet;
    decorate("safeStorageSet", function (original) {
      return function (key, value) {
        if (original(key, value)) return true;
        pruneStorage(true);             // cuota llena: libera espacio y reintenta una vez
        return original(key, value);
      };
    });
    function pruneStorage(aggressive) {
      try {
        var valid = {};
        localProfiles.forEach(function (p) { valid[p.id] = true; });
        Object.keys(localStorage).forEach(function (k) {
          var m = /^tatoProfile_([^_]+)_/.exec(k);
          if (m && !valid[m[1]]) localStorage.removeItem(k);          // datos de perfiles que ya no existen
        });
        STORAGE_LEGACY_KEYS.forEach(function (k) {                    // claves antiguas ya migradas
          if (!valid.main || localStorage.getItem("tatoProfile_main_" + k) !== null) localStorage.removeItem(k);
        });
        var now = Date.now(), day = 86400000;
        var items = (localAnalytics.items || []).filter(function (x) {
          return x && x.id && x.type && (x.done > 0 || now - (x.lastPlayedAt || now) < 365 * day);
        });
        items.sort(function (a, b) { return (a.lastPlayedAt || 0) - (b.lastPlayedAt || 0); });
        items = items.slice(-(aggressive ? 60 : 150));
        items.forEach(function (x) { if (x.genreIds && x.genreIds.length > 6) x.genreIds = x.genreIds.slice(0, 6); });
        localAnalytics.items = items;
        storageSetOriginal(profileStorageKey(LOCAL_ANALYTICS_KEY), JSON.stringify(localAnalytics));
        continueWatching = continueWatching.filter(function (m) { return !m.timestamp || now - m.timestamp < 90 * day; }).slice(0, aggressive ? 8 : 20);
        storageSetOriginal(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
        var seenFav = {};
        myList = myList.filter(function (m) {
          var k = m && m.type + ":" + m.id;
          if (!m || !m.id || seenFav[k]) return false;
          seenFav[k] = true;
          return true;
        }).map(function (m) {
          var c = { id: m.id, type: m.type, title: m.title, bg: m.bg || "", rating: m.rating || 0, year: m.year || "" };
          if (m.list) c.list = m.list;
          return c;
        });
        storageSetOriginal(profileStorageKey("tatoList"), JSON.stringify(myList));
      } catch (e) { }
    }
    function clearSwCaches() {
      return new Promise(function (resolve) {
        var done = false;
        function finish() { if (!done) { done = true; resolve(); } }
        try {
          if (window.caches) {
            window.caches.keys().then(function (names) {
              return Promise.all(names.filter(function (n) { return /^tatocine-(img|api)/.test(n); }).map(function (n) { return window.caches.delete(n); }));
            }).then(finish, finish);
          } else finish();
        } catch (e) { finish(); }
        setTimeout(finish, 2500);
      });
    }
    function localStorageBytes() {
      var total = 0;
      try { Object.keys(localStorage).forEach(function (k) { total += (k.length + (localStorage.getItem(k) || "").length) * 2; }); } catch (e) { }
      return total;
    }
    function fmtBytes(n) {
      if (n < 1024) return n + " B";
      if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
      return (n / 1048576).toFixed(1) + " MB";
    }
    function updateStorageInfo() {
      var el = $("storage-summary");
      if (!el) return;
      var local = "Datos locales: " + fmtBytes(localStorageBytes());
      el.textContent = local;
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(function (e) {
          el.textContent = local + " · Total usado por la app: " + fmtBytes(e.usage || 0);
        }).catch(function () { });
      }
    }
    function freeStorage() {
      clearSwCaches().then(function () {
        pruneStorage(true);
        updateStorageInfo();
        showToast("Espacio liberado");
      });
    }

    // Limpieza de datos obsoletos sin bloquear el arranque
    IDLE(function () { pruneStorage(false); });
;
/* ==== js/features/watch-tracking.js ==== */
/**
 * TatoCine · js/features/watch-tracking.js
 * Seguimiento del tiempo visto, títulos finalizados y categorías.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Analítica local de visualización (tiempo, finalizados, categoría) ----
    var CAT_LABELS = { movie: "Películas", tv: "Series", anime: "Anime", doc: "Documentales" };
    function analyticsItem(type, id) {
      var items = localAnalytics.items || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type === type && String(items[i].id) === String(id)) return items[i];
      }
      return null;
    }
    function categoryOf(it) {
      var g = it.genreIds || [];
      if (g.indexOf(99) > -1) return "doc";
      if (g.indexOf(16) > -1 && it.lang === "ja") return "anime";
      return it.type === "tv" ? "tv" : "movie";
    }
    function completedTitles() { return (localAnalytics.items || []).filter(function (x) { return x.done > 0; }); }
    function tasteWeight(it) {
      var d = it.done || 0;
      if (d > 0) return 1.4 + 0.5 * Math.min(3, d) + Math.min(1, (it.secs || 0) / 7200);
      return (it.secs || 0) > 600 ? 0.6 : 0.25;
    }
    var watch = null, watchTimer = null;
    decorate("recordMediaStart", function (original) { return function (media, genreIds) {
      original(media, genreIds);
      var it = analyticsItem(media.type, media.id);
      if (it) {
        if (media.bg && !it.bg) it.bg = media.bg;
        it.secs = it.secs || 0;
        it.done = it.done || 0;
      }
      watch = { type: media.type, id: media.id, epKey: null, epSecs: 0, counted: false, sinceFlush: 0 };
      captureMediaMeta(media);
    }; });
    function captureMediaMeta(media) {
      var endpoint = media.type === "tv" ? "/tv/" + media.id : "/movie/" + media.id;
      var append = media.type === "movie" ? "&append_to_response=recommendations,similar" : "";
      fetchTMDB(endpoint, append).then(function (d) {
        var it = analyticsItem(media.type, media.id);
        if (!it || !d) return;
        (d.genres || []).forEach(function (g) { if (it.genreIds.indexOf(g.id) === -1 && it.genreIds.length < 8) it.genreIds.push(g.id); });
        it.lang = d.original_language || it.lang || "";
        it.runtime = media.type === "tv"
          ? ((d.episode_run_time && d.episode_run_time[0]) || (d.last_episode_to_air && d.last_episode_to_air.runtime) || 40)
          : (d.runtime || 100);
        it.cat = categoryOf(it);
        if (watch) watch.dirty = true;
      }).catch(function () { });
    }
    function watchRuntimeSec() {
      if (!watch) return 0;
      var it = analyticsItem(watch.type, watch.id);
      if (watch.type === "tv") {
        var ep = Number($episodeSelect.value || 0);
        var e = (currentTvEpisodes || []).find(function (x) { return Number(x.episode_number) === ep; });
        return ((e && e.runtime) || (it && it.runtime) || 40) * 60;
      }
      return ((it && it.runtime) || 100) * 60;
    }
    function setContinuePct(pct) {
      for (var i = 0; i < continueWatching.length; i++) {
        var m = continueWatching[i];
        if (m.type === watch.type && String(m.id) === String(watch.id)) { m.pct = pct; return; }
      }
    }
    function markCompleted() {
      if (!watch || watch.counted) return;
      var it = analyticsItem(watch.type, watch.id);
      if (!it) return;
      watch.counted = true;
      it.done = (it.done || 0) + 1;
      if (typeof autoMarkWatched === "function") autoMarkWatched(it);
      setContinuePct(100);
      flushWatch();
    }
    function flushWatch() {
      if (!watch) return;
      watch.sinceFlush = 0;
      saveLocalAnalytics();
      safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
    }
    function watchTick() {
      if (!watch || !$modal.classList.contains("open") || document.hidden || !activePlayerFrame) return;
      var it = analyticsItem(watch.type, watch.id);
      if (!it) return;
      if (watch.type === "tv") {
        var k = $seasonSelect.value + ":" + $episodeSelect.value;
        if (k !== watch.epKey) { watch.epKey = k; watch.epSecs = 0; watch.counted = false; watch.nextPrompted = false; }
      }
      it.secs = (it.secs || 0) + 5;
      it.lastPlayedAt = Date.now();
      watch.epSecs += 5;
      var total = watchRuntimeSec();
      if (total) setContinuePct(Math.min(99, Math.round(watch.epSecs / total * 100)));
      if (!watch.counted && total && watch.epSecs >= total * 0.8) markCompleted();
      if (watch.type === "tv" && autoNextEpisode && total && watch.epSecs >= total * 0.985 && !watch.nextPrompted) {
        watch.nextPrompted = true;               // una vez por episodio; si el reproductor avisa "ended", se adelanta solo
        showNextEpisodePrompt();
      }
      watch.sinceFlush += 5;
      if (watch.sinceFlush >= 30) flushWatch();
    }
    watchTimer = setInterval(watchTick, 5000);
    window.addEventListener("message", function (event) {
      if (!watch || !activePlayerFrame || event.source !== activePlayerFrame.contentWindow) return;
      if (isEndedPlayerMessage(event.data)) markCompleted();
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden) flushWatch(); });
    window.addEventListener("pagehide", flushWatch);
    decorate("closePlayer", function (original) { return function () {
      flushWatch();
      watch = null;
      return original.apply(this, arguments);
    }; });
    decorate("saveContinueWatching", function (original) { return function (media, season, episode) {
      var old = continueWatching.find(function (m) { return m.id === media.id && m.type === media.type; });
      var pct = old && String(old.season || "") === String(season || "") && String(old.episode || "") === String(episode || "") ? old.pct : 0;
      original(media, season, episode);
      if (pct && continueWatching[0]) continueWatching[0].pct = pct;
    }; });
    function updateLocalAnalyticsUI() {
      var el = $("local-analytics-summary");
      if (!el) return;
      var done = completedTitles().length;
      var names = getTasteProfile().slice(0, 3).map(function (x) { return x.name; });
      el.textContent = getDistinctPlayedCount() + " títulos reproducidos · " + done + " finalizados. " +
        (done < 2 ? "Termina 2 títulos para activar «Hecho para ti». " : (names.length ? "Géneros principales: " + names.join(", ") + ". " : "")) +
        "Los datos permanecen en este dispositivo.";
    };
;
/* ==== js/features/recommendations.js ==== */
/**
 * TatoCine · js/features/recommendations.js
 * Recomendaciones locales («Hecho para ti» y «Porque viste…»).
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Recomendaciones locales: se activan con 2 títulos finalizados y mejoran con cada uno más ----
    function insertPersonalRow(title, picks, anchor, className) {
      var row = document.createElement("div");
      row.className = "row catalog-row personalized-row " + (className || "");
      row.innerHTML =
        '<div class="row-header"><h2 class="row-title">' + escapeHTML(title) + '</h2></div><button class="row-nav prev" onclick="scrollRow(this,-1)" aria-label="Anterior">‹</button><button class="row-nav next" onclick="scrollRow(this,1)" aria-label="Siguiente">›</button><div class="row-scroll">' +
        picks.map(getCardHTML).join("") + "</div>";
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(row, anchor.nextSibling);
      else $rowsContainer.insertBefore(row, $rowsContainer.querySelector(".catalog-row") || null);
      return row;
    }
    function loadPersonalizedHomeRow() {
      if (isKidProfile()) return;
      var items = localAnalytics.items || [];
      var done = completedTitles();
      var n = done.length;
      if (n < 2) return;                                   // mínimo 2 títulos finalizados
      var profile = getTasteProfile();
      if (!profile.length) return;
      var snapshot = catalogRequestId;
      var now = Date.now();
      var weights = {};
      profile.forEach(function (p) { weights[p.id] = p.score; });
      var maxWeight = profile[0].score || 1;
      var genreCount = n < 5 ? 3 : n < 10 ? 4 : 5;         // más datos = perfil más fino
      var topGenres = profile.slice(0, genreCount).map(function (x) { return x.id; });
      var typeScore = { movie: 0, tv: 0 }, langScore = {}, langTotal = 0;
      done.forEach(function (it) {
        var w = tasteWeight(it) * recencyOf(it);
        typeScore[it.type === "tv" ? "tv" : "movie"] += w;
        if (it.lang) { langScore[it.lang] = (langScore[it.lang] || 0) + w; langTotal += w; }
      });
      var typeTotal = typeScore.movie + typeScore.tv || 1;
      var typeShare = { movie: typeScore.movie / typeTotal, tv: typeScore.tv / typeTotal };
      var topLang = Object.keys(langScore).sort(function (a, b) { return langScore[b] - langScore[a]; })[0];
      var langShare = topLang && langTotal ? langScore[topLang] / langTotal : 0;
      var seedCount = Math.max(2, Math.min(6, 1 + Math.ceil(n / 2)));
      var seeds = done.slice().sort(function (a, b) {
        function sc(x) { return tasteWeight(x) * recencyOf(x, 30); }
        return sc(b) - sc(a);
      }).slice(0, seedCount);
      var favSeeds = myList.slice(-2).filter(function (f) {
        return !seeds.some(function (s) { return s.type === f.type && String(s.id) === String(f.id); });
      }).map(function (f) { return { type: f.type, id: f.id, title: f.title, fav: true }; });
      var liked = (typeof likedSeeds === "function" ? likedSeeds() : []).filter(function (l) {
        return !seeds.concat(favSeeds).some(function (s) { return s.type === l.type && String(s.id) === String(l.id); });
      });
      var allSeeds = seeds.concat(favSeeds, liked);
      var genreParam = encodeURIComponent(topGenres.join("|"));
      var pages = n >= 4 ? [1, 2] : [1];
      var requests = [];
      pages.forEach(function (pg) {
        requests.push(fetchTMDB("/discover/movie", "&with_genres=" + genreParam + "&sort_by=popularity.desc&vote_count.gte=60&page=" + pg));
        requests.push(fetchTMDB("/discover/tv", "&with_genres=" + genreParam + "&sort_by=popularity.desc&vote_count.gte=30&page=" + pg));
      });
      var seedOffset = requests.length;
      allSeeds.forEach(function (sd) {
        requests.push(fetchTMDB("/" + (sd.type === "tv" ? "tv" : "movie") + "/" + sd.id + "/recommendations"));
      });
      Promise.all(requests.map(function (p) { return p.catch(function () { return null; }); })).then(function (res) {
        if (snapshot !== catalogRequestId || currentView !== "home") return;
        var seen = {};
        items.forEach(function (x) { seen[x.type + ":" + x.id] = true; });
        myList.forEach(function (x) { seen[x.type + ":" + x.id] = true; });
        if (typeof watchedList === "function") watchedList().forEach(function (x) { seen[x.type + ":" + x.id] = true; });
        var pool = {};
        function add(raw, type, source, seedIdx) {
          if (!raw || !raw.id || seen[type + ":" + raw.id]) return;
          if (!(raw.backdrop_path || raw.poster_path)) return;
          var key = type + ":" + raw.id;
          if (!pool[key]) pool[key] = { raw: raw, type: type, seedHits: 0, discover: false, seeds: [] };
          if (source === "seed") { pool[key].seedHits++; pool[key].seeds.push(seedIdx); } else pool[key].discover = true;
        }
        pages.forEach(function (pg, i) {
          ((res[i * 2] && res[i * 2].results) || []).forEach(function (x) { add(x, "movie", "discover"); });
          ((res[i * 2 + 1] && res[i * 2 + 1].results) || []).forEach(function (x) { add(x, "tv", "discover"); });
        });
        allSeeds.forEach(function (sd, i) {
          var r = res[seedOffset + i];
          ((r && r.results) || []).forEach(function (x) { add(x, sd.type === "tv" ? "tv" : "movie", "seed", i); });
        });
        var scored = Object.keys(pool).map(function (key) {
          var c = pool[key];
          var g = c.raw.genre_ids || [];
          var genreScore = g.reduce(function (sum, id) { return sum + (weights[id] || 0); }, 0) / (maxWeight * 2);
          var votes = c.raw.vote_count || 0;
          var quality = votes >= 40 ? (c.raw.vote_average || 0) / 10 : 0.3;
          var pop = Math.min(1, Math.log10((c.raw.popularity || 0) + 1) / 3);
          var lang = topLang && c.raw.original_language === topLang ? 0.15 * langShare : 0;
          var score = Math.min(1.5, genreScore) + c.seedHits * 0.55 + (c.discover ? 0.1 : 0) + quality * 0.8 + pop * 0.2 + typeShare[c.type] * 0.35 + lang;
          var mapped = c.type === "tv" ? mapTvResult(c.raw) : mapMovieResult(c.raw);
          if (mapped.isUpcoming) return null;
          mapped._tasteScore = score;
          mapped._seeds = c.seeds;
          return mapped;
        }).filter(Boolean);
        scored.sort(function (a, b) { return b._tasteScore - a._tasteScore; });
        var limit = n < 4 ? 16 : n < 8 ? 20 : 24;
        var cap = {
          movie: Math.max(6, Math.ceil(limit * Math.min(0.85, typeShare.movie + 0.25))),
          tv: Math.max(6, Math.ceil(limit * Math.min(0.85, typeShare.tv + 0.25)))
        };
        var picks = [], counts = { movie: 0, tv: 0 }, used = {};
        scored.forEach(function (m) {
          if (picks.length >= limit || counts[m.type] >= cap[m.type]) return;
          counts[m.type]++;
          used[m.type + ":" + m.id] = true;
          picks.push(m);
        });
        if (!picks.length) return;
        var main = insertPersonalRow("Hecho para ti", picks, null, "");
        // "Porque viste X": recomendaciones directas del título finalizado más relevante.
        var because = scored.filter(function (m) { return m._seeds.indexOf(0) > -1 && !used[m.type + ":" + m.id]; }).slice(0, 16);
        if (because.length >= 6 && seeds[0]) insertPersonalRow("Porque viste " + seeds[0].title, because, main, "because-row");
      }).catch(function () { });
    };
    function recencyOf(it, half) {
      var age = Math.max(0, (Date.now() - (it.lastPlayedAt || Date.now())) / 86400000);
      return 0.4 + 0.6 * Math.pow(0.5, age / (half || 45));
    }
;
/* ==== js/features/favorites-lists.js ==== */
/**
 * TatoCine · js/features/favorites-lists.js
 * Favoritos con listas: selector, vista de favoritos y administración de listas.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Favoritos con listas ----
    var favLists = readLocalJSON(profileStorageKey("tatoFavLists"), []);
    if (!Array.isArray(favLists)) favLists = [];
    favLists = favLists.filter(function (l) { return l && l.id && l.name; });
    var favFilter = "all", favPickerMedia = null, favPickerAfter = null, editingListId = null;
    function saveFavLists() { return safeStorageSet(profileStorageKey("tatoFavLists"), JSON.stringify(favLists)); }
    function saveMyList() { return safeStorageSet(profileStorageKey("tatoList"), JSON.stringify(myList)); }
    function favListById(id) { return favLists.find(function (l) { return l.id === id; }) || null; }
    function favCount(listId) { return myList.filter(function (m) { return (m.list || null) === (listId || null); }).length; }
    function openOverlay(id) { var o = $(id); o.classList.add("open"); o.setAttribute("aria-hidden", "false"); }
    function closeOverlay(id) { var o = $(id); o.classList.remove("open"); o.setAttribute("aria-hidden", "true"); }
    function renderFavOptions() {
      var html = '<button type="button" class="tc-fav-option" data-list="">General <span>' + favCount(null) + '</span></button>';
      favLists.forEach(function (l) {
        html += '<button type="button" class="tc-fav-option" data-list="' + escapeHTML(l.id) + '" data-i18n="skip">' + escapeHTML(l.name) + ' <span>' + favCount(l.id) + '</span></button>';
      });
      if (favLists.length < 12) html += '<button type="button" class="tc-fav-option tc-fav-option-new" data-new="1">+ Nueva lista</button>';
      $("tc-fav-options").innerHTML = html;
      $("tc-fav-new").hidden = true;
    }
    function openFavPicker(item, after) {
      favPickerMedia = item;
      favPickerAfter = after;
      $("tc-fav-subtitle").textContent = "¿Dónde quieres guardar «" + (item.title || "este título") + "»?";
      renderFavOptions();
      openOverlay("tc-fav-overlay");
      window.setTimeout(function () { var f = $("tc-fav-options").querySelector("button"); if (f) f.focus(); }, 80);
    }
    function closeFavPicker() { closeOverlay("tc-fav-overlay"); favPickerMedia = null; favPickerAfter = null; }
    function commitFavorite(item, listId) {
      var copy = { id: item.id, type: item.type, title: item.title || "Sin título", bg: item.bg || "", rating: Number(item.rating) || 0, year: item.year || "" };
      if (listId) copy.list = listId;
      myList.push(copy);
      saveMyList();
      var l = listId ? favListById(listId) : null;
      showToast(l ? "Guardado en «" + l.name + "»" : "Guardado en Favoritos");
    }
    function pickFavList(listId) {
      var item = favPickerMedia, after = favPickerAfter;
      if (!item) return;
      closeFavPicker();
      commitFavorite(item, listId);
      if (after) after();
    }
    function createFavListNamed(name) {
      name = String(name || "").trim().slice(0, 24);
      if (!name) { showToast("Escribe un nombre para la lista"); return null; }
      if (/^general$/i.test(name) || favLists.some(function (l) { return l.name.toLowerCase() === name.toLowerCase() && l.id !== editingListId; })) {
        showToast("Ya existe una lista con ese nombre");
        return null;
      }
      var l = { id: "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name };
      favLists.push(l);
      saveFavLists();
      return l;
    }
    (function bindFavPicker() {
      $("tc-fav-options").addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        if (b.getAttribute("data-new")) {
          $("tc-fav-new").hidden = false;
          var inp = $("tc-fav-new-name");
          inp.value = "";
          inp.focus();
          return;
        }
        pickFavList(b.getAttribute("data-list") || null);
      });
    })();
    function submitFavNew() {
      var l = createFavListNamed($("tc-fav-new-name").value);
      if (l) pickFavList(l.id);
    }
    function afterFavChange(btn, saved, media) {
      if (media && currentHeroMedia && currentHeroMedia.id === media.id && currentHeroMedia.type === media.type) updateHeroSaveButton(currentHeroMedia);
      if (currentView === "list") { renderFavoritesView(); return; }
      if (btn && btn.isConnected) {
        btn.classList.toggle("saved", saved);
        var svg = btn.querySelector("svg");
        if (svg) svg.setAttribute("fill", saved ? "currentColor" : "none");
      }
    }
    function toggleSave(e, i) {
      e.stopPropagation();
      var btn = e.currentTarget;
      var x = myList.findIndex(function (m) { return m.id === i.id && m.type === i.type; });
      if (x > -1) {
        myList.splice(x, 1);
        saveMyList();
        afterFavChange(btn, false, i);
        return;
      }
      openFavPicker(i, function () { afterFavChange(btn, true, i); });
    };
    function toggleHeroSave(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var media = currentHeroMedia;
      if (!media || !media.id || !media.type) return;
      var index = myList.findIndex(function (m) { return m.id === media.id && m.type === media.type; });
      if (index > -1) {
        myList.splice(index, 1);
        saveMyList();
        showToast("Eliminado de favoritos");
        afterFavChange(null, false, media);
        return;
      }
      openFavPicker({ id: media.id, type: media.type, title: media.title, bg: media.bg || "", rating: media.rating, year: media.year }, function () {
        afterFavChange(null, true, media);
      });
    };
    // Alta/baja de un favorito desde cualquier superficie (asistente, detalle...). `done(saved)` se llama al terminar.
    function toggleFavoriteMedia(media, done) {
      var index = myList.findIndex(function (m) { return m.id === media.id && m.type === media.type; });
      if (index > -1) {
        myList.splice(index, 1);
        saveMyList();
        showToast("Eliminado de favoritos");
        if (done) done(false);
        return;
      }
      openFavPicker(media, function () { if (done) done(true); });
    }
    function markFavTruncated() { favTruncated = true; return ""; }
    function setFavFilter(id) {
      favLimit = FAV_PAGE; favFilter = id; renderFavoritesView(); }
    function favSection(title, listId, editable) {
      var items = myList.filter(function (m) { return (m.list || null) === (listId || null); });
      var head = '<div class="row-header"><h2 class="row-title"' + (listId ? ' data-i18n="skip"' : "") + '>' + escapeHTML(title) + ' <span class="fav-count">(' + items.length + ')</span></h2>' +
        (listId && favFilter === listId ? '<button type="button" class="fav-close-btn" onclick="setFavFilter(\'all\')" aria-label="Cerrar lista" title="Cerrar lista"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg><span>Cerrar lista</span></button>' : "") +
        (editable ? '<button type="button" class="fav-edit-btn" title="Editar lista" aria-label="Editar lista" onclick="openListModal(\'' + escapeHTML(listId) + '\')"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>' : "") + "</div>";
      if (!items.length) return '<section class="fav-section">' + head + '<p class="fav-empty">Esta lista aún no tiene títulos. Usa el corazón en cualquier título y elige esta lista.</p></section>';
      return '<section class="fav-section">' + head + '<div class="grid-container">' + items.slice(0, favLimit).map(getCardHTML).join("") + "</div></section>" + (items.length > favLimit ? markFavTruncated() : "");
    }
    var FAV_PAGE = 36, favLimit = FAV_PAGE, favTruncated = false;
    var PENCIL_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>';

    /** Portada de una lista: póster del primer título guardado en ella (se obtiene de TMDB una vez y se recuerda). */
    function listFirstItem(l) { return myList.find(function (m) { return m.list === l.id; }) || null; }
    /** Lista vacía: portada automática según su nombre (género por palabras clave; si no, búsqueda en TMDB; si no, tendencias). */
    var LIST_COVER_HINTS = [
      [/terror|horror|miedo|susto/i, 27], [/comedia|comedy|risa|diver|funny/i, 35], [/romance|amor|love|pareja/i, 10749],
      [/ciencia|sci[- ]?fi|futur|espacio|space/i, 878], [/acci[oó]n|action|pelea/i, 28], [/aventur/i, 12],
      [/animaci|anime|dibujos|cartoon/i, 16], [/drama/i, 18], [/fantas|magia|magic/i, 14], [/misterio|suspen|thriller|intriga/i, 9648],
      [/famil|ni[ñn]os|kids|infantil/i, 10751], [/document/i, 99], [/crimen|crime|polic|mafia/i, 80], [/guerra|war|b[eé]lic/i, 10752],
      [/western|vaquero/i, 37], [/m[uú]sica|music|musical/i, 10402], [/histori/i, 36]
    ];
    function autoListCover(l, el) {
      var tag = "auto:" + l.name.toLowerCase();
      if (l.cover && l.coverFor === tag) { if (el) paintListCover(el, l.cover); return; }
      var genre = null;
      LIST_COVER_HINTS.forEach(function (h) { if (!genre && h[0].test(l.name)) genre = h[1]; });
      var source = genre
        ? fetchTMDB("/discover/movie", "&with_genres=" + genre + "&sort_by=popularity.desc&vote_count.gte=1500&include_adult=false")
        : fetchTMDB("/search/multi", "&include_adult=false&query=" + encodeURIComponent(l.name));
      source.then(function (d) {
        var pool = ((d && d.results) || []).filter(function (x) { return x.poster_path && (!x.media_type || x.media_type === "movie" || x.media_type === "tv"); });
        return pool.length ? pool : fetchTMDB("/trending/movie/week").then(function (t) { return ((t && t.results) || []).filter(function (x) { return x.poster_path; }); });
      }).then(function (pool) {
        if (!pool.length) return;
        var hash = 0; for (var i = 0; i < l.id.length; i++) hash = (hash + l.id.charCodeAt(i)) % 997;
        var pick = pool[hash % Math.min(5, pool.length)];
        l.cover = pick.poster_path;
        l.coverFor = tag;
        saveFavLists();
        if (el && el.isConnected) paintListCover(el, l.cover);
      }).catch(function () { });
    }
    function ensureListCover(l, el) {
      var first = listFirstItem(l);
      if (!first) { autoListCover(l, el); return; }
      var tag = first.type + ":" + first.id;
      if (l.cover && l.coverFor === tag) return;
      fetchTMDB((first.type === "tv" ? "/tv/" : "/movie/") + first.id).then(function (d) {
        var path = d && (d.poster_path || d.backdrop_path);
        if (!path) return;
        l.cover = path;
        l.coverFor = tag;
        saveFavLists();
        if (el && el.isConnected) paintListCover(el, path);
      }).catch(function () { });
    }
    function paintListCover(card, path) {
      var cover = card.querySelector(".list-cover");
      if (!cover) return;
      var img = new Image();
      img.onload = function () { cover.style.backgroundImage = "url('" + IMG_CARD + path + "')"; card.classList.add("has-cover"); };
      img.src = IMG_CARD + path;
    }
    function listCardHTML(l) {
      var count = favCount(l.id), active = favFilter === l.id;
      return '<div class="list-card' + (active ? " active" : "") + '" tabindex="0" role="button" data-list="' + escapeHTML(l.id) + '" onclick="setFavFilter(favFilter === \'' + escapeHTML(l.id) + '\' ? \'all\' : \'' + escapeHTML(l.id) + '\')" aria-pressed="' + active + '" aria-label="' + escapeHTML(l.name) + '">' +
        '<div class="list-cover"></div><div class="list-shade"></div>' +
        '<button type="button" class="fav-edit-btn list-edit" title="Editar lista" aria-label="Editar lista" onclick="event.stopPropagation();openListModal(\'' + escapeHTML(l.id) + '\')">' + PENCIL_SVG + '</button>' +
        '<div class="list-info"><div class="list-name" data-i18n="skip">' + escapeHTML(l.name) + ' <span class="list-qty">(' + count + ")</span></div></div></div>";
    }
    function renderFavoritesView() {
      favTruncated = false;
      if (favFilter !== "all" && favFilter !== "general" && favFilter !== "watched" && !favListById(favFilter)) favFilter = "all";
      var chip = function (id, label, primary) { return '<button class="genre-chip ' + (primary ? "chip-primary " : "") + (favFilter === id ? "active" : "") + '" onclick="setFavFilter(\'' + id + '\')">' + label + "</button>"; };
      var toolbar = '<div class="fav-toolbar">' + chip("all", "Todos", true) + chip("general", "General") + chip("watched", "Vistas") +
        '<span class="fav-toolbar-gap"></span>' +
        (favLists.length < 12 ? '<button class="genre-chip chip-primary" onclick="openListModal()">+ Nueva lista</button>' : "") +
        '<button class="genre-chip" onclick="openStats()">Estadísticas</button></div>';
      var cards = favLists.length ? '<section class="fav-lists"><div class="row-header"><h2 class="row-title">Mis listas</h2></div><div class="list-cards">' + favLists.map(listCardHTML).join("") + "</div></section>" : "";
      var body = "";
      if (!myList.length && !favLists.length) {
        body = '<div class="empty-state"><h2>Tus favoritos está vacío</h2><p>Haz clic en el corazón de cualquier película, anime o serie para guardarla aquí. También puedes crear listas para organizarlos.</p></div>';
      } else if (favFilter === "all") {
        if (favCount(null) || !favLists.length) body += favSection("General", null, false);
        // Las listas se ven una sola vez, como tarjetas; al tocar una se abre su contenido.
      } else if (favFilter === "watched") body = watchedSection();
      else if (favFilter === "general") body = favSection("General", null, false);
      else body = favSection(favListById(favFilter).name, favFilter, false);
      $rowsContainer.innerHTML = toolbar + cards + body;
      $rowsContainer.querySelectorAll(".list-card").forEach(function (el) {
        var l = favListById(el.getAttribute("data-list"));
        if (!l) return;
        if (l.cover) paintListCover(el, l.cover);
        ensureListCover(l, el);
      });
    }
    function openListModal(id) {
      if (!id && favLists.length >= 12) { showToast("Puedes crear hasta 12 listas"); return; }
      editingListId = id || null;
      var l = id ? favListById(id) : null;
      $("tc-list-title").textContent = l ? "Editar lista" : "Nueva lista";
      $("tc-list-name").value = l ? l.name : "";
      $("tc-list-save-btn").querySelector(".btn-label").textContent = l ? "Guardar" : "Crear";
      $("tc-list-delete-btn").hidden = !l;
      openOverlay("tc-list-overlay");
      window.setTimeout(function () { $("tc-list-name").focus(); }, 80);
    }
    function closeListModal() { closeOverlay("tc-list-overlay"); editingListId = null; }
    function saveListFromModal() {
      var name = $("tc-list-name").value;
      if (!editingListId) {
        var created = createFavListNamed(name);
        if (!created) return;
        closeListModal();
        favFilter = created.id;
        showToast("Lista «" + created.name + "» creada");
        if (currentView === "list") renderFavoritesView();
        return;
      }
      var l = favListById(editingListId);
      if (!l) { closeListModal(); return; }
      var clean = String(name || "").trim().slice(0, 24);
      if (!clean) { showToast("Escribe un nombre para la lista"); return; }
      if (/^general$/i.test(clean) || favLists.some(function (x) { return x.id !== l.id && x.name.toLowerCase() === clean.toLowerCase(); })) { showToast("Ya existe una lista con ese nombre"); return; }
      l.name = clean;
      saveFavLists();
      closeListModal();
      showToast("Lista actualizada");
      if (currentView === "list") renderFavoritesView();
    }
    function deleteListFromModal() {
      var l = favListById(editingListId);
      if (!l) return;
      var moved = 0;
      myList.forEach(function (m) { if (m.list === l.id) { delete m.list; moved++; } });   // los favoritos pasan a General
      favLists = favLists.filter(function (x) { return x.id !== l.id; });
      saveMyList();
      saveFavLists();
      if (favFilter === l.id) favFilter = "all";
      closeListModal();
      showToast("Lista eliminada" + (moved ? " · " + moved + " favorito" + (moved === 1 ? "" : "s") + " pasaron a General" : ""));
      if (currentView === "list") renderFavoritesView();
    }
;
/* ==== js/features/stats.js ==== */
/**
 * TatoCine · js/features/stats.js
 * Estadísticas de visualización y ranking de perfiles.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Estadísticas de visualización ----
    function fmtDur(sec) {
      sec = Math.round(sec || 0);
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
      return h > 0 ? h + " h " + (m < 10 ? "0" : "") + m + " min" : m + " min";
    }
    function profileItems(pid) {
      if (pid === activeProfileId) return localAnalytics.items || [];
      var d = readLocalJSON("tatoProfile_" + pid + "_" + LOCAL_ANALYTICS_KEY, { items: [] });
      return d && Array.isArray(d.items) ? d.items : [];
    }
    function sumSecs(items) { return items.reduce(function (s, x) { return s + (x.secs || 0); }, 0); }
    function openStats() {
      if (isKidProfile()) return;
      var items = (localAnalytics.items || []).slice();
      var totalSecs = sumSecs(items);
      var finished = completedTitles().length;
      var byCat = { movie: 0, tv: 0, anime: 0, doc: 0 }, byCatCount = { movie: 0, tv: 0, anime: 0, doc: 0 };
      items.forEach(function (x) {
        var c = x.cat || categoryOf(x);
        byCat[c] += x.secs || 0;
        byCatCount[c] += 1;
      });
      var useTime = totalSecs > 0;
      var catTotal = Object.keys(byCat).reduce(function (s, k) { return s + (useTime ? byCat[k] : byCatCount[k]); }, 0) || 1;
      var catKeys = Object.keys(byCat).sort(function (a, b) { return (useTime ? byCat[b] - byCat[a] : byCatCount[b] - byCatCount[a]); });
      var topCat = catKeys[0];
      var hasData = items.length > 0;
      var top = items.slice().sort(function (a, b) { return (b.secs || 0) - (a.secs || 0) || (b.done || 0) - (a.done || 0) || (b.plays || 0) - (a.plays || 0); }).slice(0, 3);
      var genres = getTasteProfile().slice(0, 3);
      var html = '<div class="stats-wrap">';
      html += '<div class="stats-grid">' +
        '<div class="stat-tile"><span class="stat-value">' + fmtDur(totalSecs) + '</span><span class="stat-label">Tiempo de visualización</span></div>' +
        '<div class="stat-tile"><span class="stat-value">' + items.length + '</span><span class="stat-label">Títulos reproducidos</span></div>' +
        '<div class="stat-tile"><span class="stat-value">' + finished + '</span><span class="stat-label">Títulos finalizados</span></div>' +
        '<div class="stat-tile"><span class="stat-value">' + (hasData ? CAT_LABELS[topCat] : "—") + '</span><span class="stat-label">Lo que más ves</span></div>' +
        '<div class="stat-tile"><span class="stat-value">' + currentStreak() + '</span><span class="stat-label">' + L("Racha actual (días)", "Current streak (days)") + '</span></div>' +
        '<div class="stat-tile"><span class="stat-value">' + Math.max(streakData.best || 0, currentStreak()) + '</span><span class="stat-label">' + L("Mejor racha (días)", "Best streak (days)") + '</span></div></div>';
      if (!hasData) html += '<p class="stats-hint">Aún no hay datos. Reproduce títulos y aquí verás tu tiempo, tu ranking y tus preferencias.</p>';
      html += '<div class="stats-cards"><section class="stats-card stats-cat"><h3 class="stats-title">Qué ves más</h3><div class="stat-bars">';
      catKeys.forEach(function (k) {
        var v = useTime ? byCat[k] : byCatCount[k];
        var pct = Math.round(v / catTotal * 100);
        html += '<div class="stat-bar"><div class="stat-bar-head"><span>' + CAT_LABELS[k] + '</span><span>' + pct + '% · ' + (useTime ? fmtDur(byCat[k]) : byCatCount[k] + " títulos") + '</span></div><div class="stat-bar-track"><span style="width:' + pct + '%"></span></div></div>';
      });
      html += "</div></section>";
      html += '<section class="stats-card stats-top3"><h3 class="stats-title">Tu Top 3</h3>';
      if (top.length) {
        html += '<div class="stat-top">';
        top.forEach(function (x, i) {
          var img = x.bg ? IMG_W185 + x.bg : FALLBACK_IMG;
          html += '<div class="stat-top-item"><span class="stat-rank">' + (i + 1) + '</span><img loading="lazy" decoding="async" alt="" src="' + escapeHTML(img) + '" onload="this.classList.add(\'loaded\')" onerror="this.onerror=null;this.classList.add(\'loaded\');this.src=FALLBACK_IMG"><div><div class="stat-top-title">' + escapeHTML(x.title || "Contenido") + '</div><div class="stat-top-sub">' + (x.secs ? fmtDur(x.secs) + " · " : "") + (x.plays || 1) + ((x.plays || 1) === 1 ? " reproducción" : " reproducciones") + "</div></div></div>";
        });
        html += "</div>";
      } else html += '<p class="stats-hint">Todavía no hay títulos en tu ranking.</p>';
      html += "</section>";
      if (genres.length) {
        html += '<section class="stats-card stats-genres"><h3 class="stats-title">Géneros favoritos</h3><div class="stat-chips">' + genres.map(function (g, i) { return '<span class="stat-chip">' + (i + 1) + ". " + escapeHTML(g.name) + "</span>"; }).join("") + "</div></section>";
      }
      if (localProfiles.length > 1) {
        var ranking = localProfiles.map(function (p) {
          var its = profileItems(p.id);
          return { name: profileDisplayName(p), id: p.id, secs: sumSecs(its), titles: its.length };
        }).sort(function (a, b) { return b.secs - a.secs || b.titles - a.titles; });
        var maxSecs = ranking[0].secs || 1;
        html += '<section class="stats-card stats-rank"><h3 class="stats-title">Ranking de perfiles</h3>';
        if (ranking[0].secs > 0 || ranking[0].titles > 0) html += '<p class="stats-hint stats-winner">Quien más ha visto: <strong>' + escapeHTML(ranking[0].name) + "</strong> · " + fmtDur(ranking[0].secs) + "</p>";
        html += '<div class="stat-bars">';
        ranking.forEach(function (r, i) {
          html += '<div class="stat-bar"><div class="stat-bar-head"><span>' + (i + 1) + ". " + escapeHTML(r.name) + (r.id === activeProfileId ? " (tú)" : "") + '</span><span>' + fmtDur(r.secs) + " · " + r.titles + ' títulos</span></div><div class="stat-bar-track"><span style="width:' + Math.round(r.secs / maxSecs * 100) + '%"></span></div></div>';
        });
        html += "</div></section>";
      }
      html += '</div><p class="stats-note">Todo se calcula en este dispositivo; no se envía a ningún servidor.</p></div>';
      $("stats-body").innerHTML = html;
      $("stats-modal").classList.add("open");
    }
    function closeStats() { $("stats-modal").classList.remove("open"); }
;
/* ==== js/features/brands.js ==== */
/**
 * TatoCine · js/features/brands.js
 * Plataformas y estudios: fila del inicio, imágenes y catálogos.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Estudios y plataformas (estilo Disney+, Netflix, Prime, Max...) ----
    var BRANDS = [
      { key: "netflix", name: "Netflix", provider: 8 },
      { key: "disney", name: "Disney+", provider: 337 },
      { key: "max", name: "HBO Max", provider: 1899 },
      { key: "prime", name: "Prime Video", provider: 9 },
      { key: "apple", name: "Apple TV", provider: 350 },
      { key: "hulu", name: "Hulu", provider: 15 },
      { key: "crunchyroll", name: "Crunchyroll", provider: 283 },
      { key: "marvel", name: "Marvel Studios", company: 420 },
      { key: "pixar", name: "Pixar", company: 3 },
      { key: "wdp", name: "Walt Disney Pictures", company: 2 },
      { key: "lucasfilm", name: "Lucasfilm", company: 1 },
      { key: "dc", name: "DC", company: 9993 },
      { key: "warner", name: "Warner Bros.", company: 174 },
      { key: "universal", name: "Universal", company: 33 },
      { key: "paramount", name: "Paramount", company: 4 },
      { key: "ghibli", name: "Studio Ghibli", company: 10342 },
      { key: "a24", name: "A24", company: 41077 }
    ];
    function brandQuery(b, page) {
      var base = "&sort_by=popularity.desc&vote_count.gte=20&page=" + page;
      return b.provider ? "&with_watch_providers=" + b.provider + "&watch_region=US&with_watch_monetization_types=flatrate" + base : "&with_companies=" + b.company + base;
    }
    function loadBrandView(key) {
      var b = BRANDS.find(function (x) { return x.key === key; });
      var snapshot = ++catalogRequestId;
      $loadMoreContainer.innerHTML = "";
      if (!b) { switchView("home"); return; }
      var view = currentView;
      Promise.all([
        fetchTMDB("/discover/movie", brandQuery(b, 1)), fetchTMDB("/discover/movie", brandQuery(b, 2)),
        fetchTMDB("/discover/tv", brandQuery(b, 1)), fetchTMDB("/discover/tv", brandQuery(b, 2))
      ].map(function (p) { return p.catch(function () { return null; }); })).then(function (r) {
        if (snapshot !== catalogRequestId || currentView !== view) return;
        $rowsContainer.innerHTML = "";
        var movies = [].concat((r[0] && r[0].results) || [], (r[1] && r[1].results) || []).map(mapMovieResult);
        var shows = [].concat((r[2] && r[2].results) || [], (r[3] && r[3].results) || []).map(function (i) { return mapTvResult(i); });
        var seen = {};
        function uniq(list) { return list.filter(function (m) { var k = m.type + m.id; if (seen[k]) return false; seen[k] = true; return true; }); }
        movies = uniq(movies); shows = uniq(shows);
        var first = movies[0] || shows[0];
        if (!first) { $rowsContainer.innerHTML = '<div class="empty-state"><h2>Sin resultados</h2><p>No encontramos contenido para ' + escapeHTML(b.name) + ".</p></div>"; return; }
        setHero(first);
        if (movies.length) renderRow("Películas · " + b.name, movies);
        if (shows.length) renderRow("Series · " + b.name, shows);
        startHeroCarousel(movies.slice(0, 3).concat(shows.slice(0, 2)));
      });
    }

    // ---- Plataformas y estudios con imagen de fondo ----
    var brandBgStore = readLocalJSON("tatoBrandBgV1", null);
    if (!brandBgStore || typeof brandBgStore.m !== "object") brandBgStore = { ts: 0, m: {} };
    function applyBrandBg(tile, path) {
      tile.style.backgroundImage = "url('" + IMG_CARD + path + "')";
      tile.classList.add("has-bg");
    }
    function loadBrandImages(row) {
      var stale = Date.now() - (brandBgStore.ts || 0) > 7 * 86400000;
      var queue = [];
      row.querySelectorAll(".brand-tile").forEach(function (tile) {
        var key = tile.getAttribute("data-key");
        if (brandBgStore.m[key]) applyBrandBg(tile, brandBgStore.m[key]);
        if (!brandBgStore.m[key] || stale) queue.push(tile);
      });
      var active = 0, index = 0, total = queue.length, finished = 0;
      if (!total) return;
      function next() {
        while (active < 3 && index < total) {
          (function (tile) {
            active++;
            var b = BRANDS.find(function (x) { return x.key === tile.getAttribute("data-key"); });
            fetchTMDB("/discover/movie", brandQuery(b, 1)).then(function (d) {
              var r = ((d && d.results) || []).find(function (x) { return x.backdrop_path; });
              if (r) { brandBgStore.m[b.key] = r.backdrop_path; applyBrandBg(tile, r.backdrop_path); }
            }).catch(function () { }).then(function () {
              active--; finished++;
              if (finished === total) { brandBgStore.ts = Date.now(); safeStorageSet("tatoBrandBgV1", JSON.stringify(brandBgStore)); }
              next();
            });
          })(queue[index++]);
        }
      }
      next();
    }
    function renderBrandRow() {
      if (isKidProfile()) return;
      var row = document.createElement("div");
      row.className = "row brand-row";
      row.innerHTML = '<div class="row-header"><h2 class="row-title">Plataformas y estudios</h2></div>' +
        '<button class="row-nav prev" onclick="scrollRow(this,-1)" aria-label="Anterior">‹</button><button class="row-nav next" onclick="scrollRow(this,1)" aria-label="Siguiente">›</button>' +
        '<div class="row-scroll">' + BRANDS.map(function (b) {
          return '<button type="button" class="brand-tile" data-key="' + b.key + '" onclick="switchView(\'brand:' + b.key + '\')"><span>' + escapeHTML(b.name) + "</span></button>";
        }).join("") + "</div>";
      $rowsContainer.appendChild(row);
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { io.disconnect(); loadBrandImages(row); }
        }, { rootMargin: "400px" });
        io.observe(row);
      } else loadBrandImages(row);
    };
;
/* ==== js/features/recent-searches.js ==== */
/**
 * TatoCine · js/features/recent-searches.js
 * Búsquedas recientes por perfil.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Búsquedas recientes (por perfil) ----
    var recentSearches = readLocalJSON(profileStorageKey("tatoRecentSearches"), []);
    if (!Array.isArray(recentSearches)) recentSearches = [];
    function rememberSearch(q) {
      q = String(q || "").trim().slice(0, 60);
      if (!q) return;
      recentSearches = [q].concat(recentSearches.filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); })).slice(0, 8);
      safeStorageSet(profileStorageKey("tatoRecentSearches"), JSON.stringify(recentSearches));
    }
    function hideRecentSearches() { var p = $("recent-searches"); if (p) p.classList.remove("open"); }
    function showRecentSearches() {
      var p = $("recent-searches");
      if (!p || !recentSearches.length || $searchInput.value.trim()) { hideRecentSearches(); return; }
      p.innerHTML = '<div class="recent-head"><span>Búsquedas recientes</span><button type="button" data-clear="1">Borrar</button></div>' +
        recentSearches.map(function (q) { return '<button type="button" class="recent-item" data-q="' + escapeHTML(q) + '">' + escapeHTML(q) + "</button>"; }).join("");
      p.classList.add("open");
    }
    (function bindRecentSearches() {
      var wrap = document.querySelector(".hero-content .search-wrap");
      if (!wrap) return;
      var panel = document.createElement("div");
      panel.id = "recent-searches";
      panel.className = "recent-searches";
      wrap.appendChild(panel);
      panel.addEventListener("mousedown", function (e) { e.preventDefault(); });
      panel.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        if (b.getAttribute("data-clear")) {
          recentSearches = [];
          safeStorageRemove(profileStorageKey("tatoRecentSearches"));
          hideRecentSearches();
          return;
        }
        var q = b.getAttribute("data-q");
        $searchInput.value = q;
        hideRecentSearches();
        performSearch(q);
      });
      $searchInput.addEventListener("focus", showRecentSearches);
      $searchInput.addEventListener("blur", function () { setTimeout(hideRecentSearches, 120); });
      $searchInput.addEventListener("input", function () { if ($searchInput.value.trim()) hideRecentSearches(); else showRecentSearches(); });
    })();
    decorate("performSearch", function (original) { return function (q) { rememberSearch(q); hideRecentSearches(); return original(q); }; });
;
/* ==== js/profiles/profile-switch.js ==== */
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
;
/* ==== js/features/pwa-install.js ==== */
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
;
/* ==== js/ui/tv-navigation.js ==== */
/**
 * TatoCine · js/ui/tv-navigation.js
 * Navegación espacial con mando de TV y teclado, botón Atrás y protección básica del código.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Teclado, mando de TV y protección básica del código ----
    var FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';
    var LAYER_IDS = ["tc-pin-overlay", "tc-install-overlay", "tc-wizard-overlay", "tc-fav-overlay", "tc-list-overlay", "tc-profile-create-overlay", "stats-modal", "tc-profile-overlay", "actor-modal", "filters-modal", "settings-modal", "details-modal", "disclaimer-modal", "mobile-menu", "player-modal"];
    function topLayer() {
      for (var i = 0; i < LAYER_IDS.length; i++) { var el = $(LAYER_IDS[i]); if (el && el.classList.contains("open")) return el; }
      return null;
    }
    function closeV4Overlay() {
      if ($("tc-fav-overlay").classList.contains("open")) { closeFavPicker(); return true; }
      if ($("tc-list-overlay").classList.contains("open")) { closeListModal(); return true; }
      if ($("stats-modal").classList.contains("open")) { closeStats(); return true; }
      if ($("tc-wizard-overlay").classList.contains("open")) { closeWizard(); return true; }
      if ($("tc-install-overlay").classList.contains("open")) { closeInstallHelp(); return true; }
      return false;
    }
    function visibleFocusables(scope) {
      var out = [];
      scope.querySelectorAll(FOCUSABLE).forEach(function (el) {
        if (el.classList.contains("row-nav") || el.classList.contains("cast-nav") || el.classList.contains("share-card-btn") || el.classList.contains("save-btn") || el.classList.contains("continue-remove-btn") || el.getAttribute("tabindex") === "-1") return;
        var r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.bottom < -1500 || r.top > window.innerHeight + 1500) return;
        if (el.closest("[hidden]") || getComputedStyle(el).visibility === "hidden") return;
        out.push({ el: el, r: r });
      });
      return out;
    }
    function spatialMove(key) {
      var layer = topLayer();
      if (layer && layer.id === "player-modal") return false;
      var scope = layer || document;
      var ae = document.activeElement;
      if (!ae || ae === document.body || !scope.contains(ae)) {
        var start = (!layer && $heroPlayBtn && !$heroPlayBtn.disabled && $heroPlayBtn.offsetParent) ? $heroPlayBtn : (visibleFocusables(scope)[0] || {}).el;
        if (start) { start.focus(); return true; }
        return false;
      }
      var cur = ae.getBoundingClientRect(), cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2, best = null, bestScore = Infinity;
      visibleFocusables(scope).forEach(function (c) {
        if (c.el === ae) return;
        var x = c.r.left + c.r.width / 2, y = c.r.top + c.r.height / 2, dx = x - cx, dy = y - cy, score;
        if (key === "ArrowRight" && dx > 4) score = dx + 2.5 * Math.abs(dy);
        else if (key === "ArrowLeft" && dx < -4) score = -dx + 2.5 * Math.abs(dy);
        else if (key === "ArrowDown" && dy > 4) score = dy + 2.5 * Math.abs(dx);
        else if (key === "ArrowUp" && dy < -4) score = -dy + 2.5 * Math.abs(dx);
        else return;
        if (score < bestScore) { bestScore = score; best = c.el; }
      });
      if (!best) return false;
      best.focus({ preventScroll: true });
      try { best.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" }); } catch (e) { best.scrollIntoView(); }
      return true;
    }
    window.addEventListener("keydown", function (e) {
      // Protección básica: sin F12, inspector ni ver código (no aplica en localhost para poder desarrollar).
      if (!IS_LOCAL_DEV) {
        var k = String(e.key || "").toLowerCase();
        var ctrl = e.ctrlKey || e.metaKey;
        if (e.key === "F12" || (ctrl && e.shiftKey && k.length === 1 && "ijcke".indexOf(k) > -1) || (ctrl && !e.shiftKey && k === "u") || (e.metaKey && e.altKey && k.length === 1 && "ijcu".indexOf(k) > -1)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
      }
      // Escape / botón Atrás del mando
      if (e.key === "Escape" || e.key === "BrowserBack" || e.key === "GoBack" || e.keyCode === 461 || e.keyCode === 10009) {
        if (closeV4Overlay()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
        if (e.key !== "Escape") {
          e.preventDefault();
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          return;
        }
      }
      var ae = document.activeElement;
      // Enter / Espacio sobre tarjetas enfocadas
      if ((e.key === "Enter" || e.key === " ") && ae && ae.tagName === "DIV" && /(^|\s)(card|similar-card|cast-item|ep-item|suggest-item|list-card)(\s|$)/.test(ae.className)) {
        e.preventDefault();
        ae.click();
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) > -1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (isTypingTarget(ae)) return;
        var kb = false;
        try { kb = !!ae && ae !== document.body && ae.matches(":focus-visible"); } catch (err) { }
        var tvIdle = IS_TV && (!ae || ae === document.body) && (e.key === "ArrowDown" || e.key === "ArrowUp");
        if (kb || tvIdle) {
          if (spatialMove(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); }
        }
      }
    }, true);
    if (!IS_LOCAL_DEV) {
      document.addEventListener("contextmenu", function (e) { if (!isTypingTarget(e.target)) e.preventDefault(); });
    }
;
/* ==== js/core/pwa.js ==== */
/**
 * TatoCine · js/core/pwa.js
 * PWA: manifiesto, Service Worker y reintento de imágenes.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- PWA: manifiesto real, Service Worker y avisos de actualización ----
    (function setupPwa() {
      var link = document.getElementById("manifest-link");
      function fallbackManifest() {
        try {
          var blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
          link.href = URL.createObjectURL(blob);
        } catch (e) { }
      }
      if (location.protocol === "file:") fallbackManifest();
      else fetch("manifest.webmanifest", { method: "HEAD", cache: "no-store" }).then(function (r) { if (!r.ok) fallbackManifest(); }).catch(fallbackManifest);
      // Limpia cachés de imágenes de versiones anteriores (ya no se usan).
      try {
        if (window.caches) window.caches.keys().then(function (names) {
          names.forEach(function (n) { if (/^tatocine-img/.test(n)) window.caches.delete(n); });
        });
      } catch (e) { }
      if (!("serviceWorker" in navigator)) return;
      // En desarrollo (localhost / 127.0.0.1) no se usa Service Worker: así siempre se ve el último código.
      // Para probarlo allí: abre la app una vez con ?sw=1 (y ?sw=0 para volver a desactivarlo).
      var devHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
      try {
        if (/[?&]sw=1/.test(location.search)) localStorage.setItem("tatoDevSw", "1");
        if (/[?&]sw=0/.test(location.search)) localStorage.removeItem("tatoDevSw");
      } catch (e) { }
      var devSw = false;
      try { devSw = localStorage.getItem("tatoDevSw") === "1"; } catch (e) { }
      if (devHost && !devSw) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { r.unregister(); });
          if (regs.length && window.caches) window.caches.keys().then(function (names) {
            names.forEach(function (n) { if (/^tatocine-/.test(n)) window.caches.delete(n); });
          });
        }).catch(function () { });
        return;
      }
      if (location.protocol === "https:" || devHost) {
        var hadController = !!navigator.serviceWorker.controller;
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("sw.js").then(function (reg) { reg.update(); }).catch(function () { });
        });
        navigator.serviceWorker.addEventListener("controllerchange", function () {
          if (hadController) showToast("TatoCine se actualizó. Recarga para ver la última versión.");
          hadController = true;
        });
      }
    })();

    // Imágenes de TMDB: si una falla, se reintenta antes de mostrar la imagen de respaldo.
    document.addEventListener("error", function (e) {
      var img = e.target;
      if (!img || img.tagName !== "IMG" || !/image\.tmdb\.org/.test(img.src || "")) return;
      var tries = Number(img.getAttribute("data-retry") || 0);
      if (tries >= 2) return;                       // tercer fallo: sigue el manejador original (imagen de respaldo)
      e.stopImmediatePropagation();
      img.setAttribute("data-retry", String(tries + 1));
      var base = img.src.replace(/[?&]r=\d+$/, "");
      window.setTimeout(function () { img.src = base + (base.indexOf("?") > -1 ? "&" : "?") + "r=" + (tries + 1); }, 400 * (tries + 1));
    }, true);
;
/* ==== js/features/details-favorite.js ==== */
/**
 * TatoCine · js/features/details-favorite.js
 * Corazón de favoritos dentro del modal de detalle.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Favoritos desde el modal Info + sincronía de corazones ----
    function syncCardHearts() {
      document.querySelectorAll(".save-btn").forEach(function (btn) {
        var m = /id:(\d+),type:'(\w+)'/.exec(btn.getAttribute("onclick") || "");
        if (!m) return;
        var saved = isSaved({ id: Number(m[1]), type: m[2] });
        btn.classList.toggle("saved", saved);
        var svg = btn.querySelector("svg");
        if (svg) svg.setAttribute("fill", saved ? "currentColor" : "none");
      });
    }
    function updateDetailsFavButton() {
      var btn = $("details-fav-btn");
      if (!btn || !detailsMedia) return;
      var saved = isSaved(detailsMedia);
      btn.classList.toggle("saved", saved);
      btn.setAttribute("aria-pressed", saved ? "true" : "false");
      btn.title = btn.ariaLabel = saved ? "Quitar de favoritos" : "Agregar a favoritos";
      btn.setAttribute("aria-label", btn.title);
      var svg = btn.querySelector("svg");
      if (svg) svg.setAttribute("fill", saved ? "currentColor" : "none");
      var label = btn.querySelector(".details-fav-label");
      if (label) label.textContent = saved ? "En favoritos" : "Favoritos";
    }
    function toggleDetailsFav() {
      if (!detailsMedia) return;
      var media = detailsMedia;
      toggleFavoriteMedia(media, function (saved) {
        afterFavChange(null, saved, media);
        updateDetailsFavButton();
        syncCardHearts();
      });
    }
    decorate("closeDetails", function (original) { return function () { var r = original.apply(this, arguments); syncCardHearts(); return r; }; });
;
/* ==== js/features/watched.js ==== */
/**
 * TatoCine · js/features/watched.js
 * «Ya vistas» y valoraciones personales (👍 / 👎) por perfil. Alimenta las recomendaciones:
 *   - 👍 suma peso a sus géneros y aporta un título de referencia.
 *   - 👎 resta peso a sus géneros y oculta el título de las recomendaciones.
 * Los títulos finalizados en el reproductor se marcan solos como vistos (autoMarkWatched).
 */
var WATCHED_KEY = "tatoWatched";
var watchedMap = readLocalJSON(profileStorageKey(WATCHED_KEY), {});
if (!watchedMap || typeof watchedMap !== "object" || Array.isArray(watchedMap)) watchedMap = {};

function watchedKey(m) { return m.type + ":" + m.id; }
function saveWatched() { return safeStorageSet(profileStorageKey(WATCHED_KEY), JSON.stringify(watchedMap)); }

function isWatched(m) {
  var r = watchedMap[watchedKey(m)];
  if (r && r.w !== undefined) return !!r.w;          // una decisión manual (vista / no vista) manda
  var it = analyticsItem(m.type, m.id);
  return !!(it && it.done > 0);
}
function userRating(m) { var r = watchedMap[watchedKey(m)]; return r ? r.ur || 0 : 0; }

/** Registro mínimo y compacto (se guarda en el dispositivo): id, tipo, título, imagen, fecha, valoración y géneros. */
function touchWatched(m, genres) {
  var k = watchedKey(m);
  var r = watchedMap[k] || { id: m.id, type: m.type };
  r.title = m.title || r.title || "";
  r.bg = m.bg || r.bg || "";
  r.ts = Date.now();
  if (genres && genres.length) r.g = genres.slice(0, 6);
  watchedMap[k] = r;
  return r;
}
function cleanupWatched(m) {
  var k = watchedKey(m), r = watchedMap[k], it = analyticsItem(m.type, m.id);
  var finished = !!(it && it.done > 0);              // «no vista» explícita solo se conserva si el título figura como finalizado
  if (r && !r.ur && (r.w ? false : !finished)) delete watchedMap[k];
}
function setWatched(m, on, genres) {
  var r = touchWatched(m, genres);
  r.w = !!on;
  cleanupWatched(m);
  saveWatched();
}
/** Alterna 👍 (1) o 👎 (-1); al valorar, el título pasa a «visto». */
function setUserRating(m, value, genres) {
  var r = touchWatched(m, genres);
  r.ur = r.ur === value ? 0 : value;
  if (r.ur) r.w = true;
  cleanupWatched(m);
  saveWatched();
}
function autoMarkWatched(analyticsEntry) {
  var k = watchedKey(analyticsEntry);
  if (watchedMap[k] && watchedMap[k].w) return;
  var r = touchWatched(analyticsEntry, analyticsEntry.genreIds);
  r.w = true;
  saveWatched();
}

/** Lista para la sección «Vistas»: registros manuales + títulos finalizados, del más reciente al más antiguo. */
function watchedList() {
  var out = {}, list = [];
  Object.keys(watchedMap).forEach(function (k) { if (watchedMap[k].w) out[k] = watchedMap[k]; });
  completedTitles().forEach(function (it) {
    var k = watchedKey(it);
    if (!out[k] && !watchedMap[k]) out[k] = { id: it.id, type: it.type, title: it.title, bg: it.bg || "", ts: it.lastPlayedAt || 0 };
  });
  Object.keys(out).forEach(function (k) { list.push(out[k]); });
  return list.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
}

/** Señales de gusto adicionales (ver getTasteProfile en analytics.js). */
function tasteExtras() {
  var extras = [];
  Object.keys(watchedMap).forEach(function (k) {
    var r = watchedMap[k];
    if (r.ur && r.g && r.g.length) extras.push({ genres: r.g, weight: r.ur > 0 ? 1.2 : -0.8 });
  });
  return extras;
}
/** Títulos con 👍 más recientes, usados como referencia de recomendaciones. */
function likedSeeds() {
  return Object.keys(watchedMap).map(function (k) { return watchedMap[k]; })
    .filter(function (r) { return r.ur > 0; })
    .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); })
    .slice(0, 2)
    .map(function (r) { return { type: r.type, id: r.id, title: r.title }; });
}

/** Sección «Vistas» dentro de Favoritos. */
function watchedSection() {
  var items = watchedList();
  var head = '<div class="row-header"><h2 class="row-title">Ya vistas <span class="fav-count">' + items.length + "</span></h2></div>";
  if (!items.length) return '<section class="fav-section">' + head + '<p class="fav-empty">' + L("Aún no hay títulos vistos. Se agregan solos al terminar un título, o márcalos desde su ficha.", "No watched titles yet. They are added automatically when you finish one, or mark them from their page.") + "</p></section>";
  return '<section class="fav-section">' + head + '<div class="grid-container">' + items.map(getCardHTML).join("") + "</div></section>";
}

// ---- Botones de la ficha: «Marcar como vista» y 👍 / 👎 ----
var USER_ACTION_ICONS = {
  check: '<path d="M20 6L9 17l-5-5"/>',
  up: '<path d="M7 11v9H3v-9h4zM7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/>',
  down: '<path d="M17 13V4h4v9h-4zM17 13l-4 8a2 2 0 0 1-2-2v-4H5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.2 4H17"/>'
};
function userActionButton(act, label, active, pathKey, textLabel) {
  return '<button type="button" class="ua-btn' + (textLabel ? "" : " ua-icon") + (active ? " active" : "") + '" data-ua="' + act + '" aria-pressed="' + active +
    '" aria-label="' + label + '" title="' + label + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    USER_ACTION_ICONS[pathKey] + "</svg>" + (textLabel ? "<span>" + textLabel + "</span>" : "") + "</button>";
}
function renderUserActions() {
  var box = $("details-user-actions");
  if (!box || !detailsMedia) return;
  var watched = isWatched(detailsMedia), rating = userRating(detailsMedia);
  box.innerHTML =
    userActionButton("watched", watched ? L("Quitar de vistas", "Remove from watched") : L("Marcar como vista", "Mark as watched"), watched, "check", watched ? L("Vista", "Watched") : L("Marcar como vista", "Mark as watched")) +
    userActionButton("up", L("Me gusta", "I like it"), rating > 0, "up") +
    userActionButton("down", L("No me gusta", "I don't like it"), rating < 0, "down");
}
(function bindUserActions() {
  var box = $("details-user-actions");
  if (!box) return;
  box.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ua]");
    if (!b || !detailsMedia) return;
    var act = b.getAttribute("data-ua"), genres = typeof detailsGenres !== "undefined" ? detailsGenres : [];
    if (act === "watched") setWatched(detailsMedia, !isWatched(detailsMedia), genres);
    else setUserRating(detailsMedia, act === "up" ? 1 : -1, genres);
    renderUserActions();
    showToast(act === "watched" ? (isWatched(detailsMedia) ? L("Marcada como vista", "Marked as watched") : L("Quitada de vistas", "Removed from watched"))
      : (userRating(detailsMedia) ? L("Valoración guardada", "Rating saved") : L("Valoración quitada", "Rating removed")));
  });
  if (typeof i18nAdd === "function") i18nAdd({ "Ya vistas": "Already watched" });
})();
;
/* ==== js/features/details-extras.js ==== */
/**
 * TatoCine · js/features/details-extras.js
 * Extras de la ficha del título (se invoca desde ui/details.js tras pintar el detalle):
 *   - Director (películas) o creadores (series), con enlace a sus obras.
 *   - Temporadas y episodios con imagen, duración y sinopsis; al tocar un episodio se reproduce.
 *   - Botones «Marcar como vista» y 👍/👎 (ver watched.js).
 */
var detailsGenres = [];
var episodesRequest = 0;

function renderDetailsExtras(data, type, id, title) {
  detailsGenres = (data.genres || []).map(function (g) { return g.id; });
  renderCreditsLine(data, type);
  renderEpisodes(data, type, id, title);
  if (typeof renderUserActions === "function") renderUserActions();
}

function renderCreditsLine(data, type) {
  var el = $("details-credits");
  if (!el) return;
  var people, label;
  if (type === "movie") {
    people = ((data.credits && data.credits.crew) || []).filter(function (c) { return c.job === "Director"; }).slice(0, 2);
    label = L("Dirigida por", "Directed by");
  } else {
    people = (data.created_by || []).slice(0, 3);
    label = L("Creada por", "Created by");
  }
  el.hidden = !people.length;
  el.innerHTML = people.length ? "<span>" + label + "</span> " + people.map(function (p) {
    return '<button type="button" class="credit-link" data-person="' + p.id + '" data-name="' + escapeHTML(p.name) + '" data-i18n="skip">' + escapeHTML(p.name) + "</button>";
  }).join(", ") : "";
}

function renderEpisodes(data, type, id, title) {
  var box = $("details-episodes");
  if (!box) return;
  var seasons = (data.seasons || []).filter(function (s) { return s.season_number > 0 && s.episode_count > 0; });
  if (type !== "tv" || !seasons.length) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.dataset.id = String(id);
  box.dataset.title = title;
  box.dataset.bg = data.backdrop_path || data.poster_path || "";
  box.innerHTML = '<div class="details-cast-title">' + L("Temporadas y episodios", "Seasons and episodes") + "</div>" +
    '<div class="ep-seasons" role="tablist" aria-label="' + L("Temporadas", "Seasons") + '">' + seasons.map(function (s) {
      return '<button type="button" class="ep-season-chip" role="tab" data-season="' + s.season_number + '">' + L("Temporada ", "Season ") + s.season_number + "</button>";
    }).join("") + '</div><div class="ep-list" id="ep-list" aria-live="polite"></div>';
  loadSeasonEpisodes(id, seasons[0].season_number);
}

function episodeCardHTML(ep, season, isLastAired) {
  var today = new Date().toISOString().slice(0, 10);
  var upcoming = !ep.air_date || ep.air_date > today;
  var img = ep.still_path ? IMG_W185 + ep.still_path : "";
  var meta = [ep.runtime ? ep.runtime + " min" : "", ep.air_date || ""].filter(Boolean).join(" · ");
  return '<div class="ep-item' + (upcoming ? " ep-upcoming" : "") + '" tabindex="0" role="button" data-season="' + season + '" data-ep="' + ep.episode_number + '"' + (upcoming ? ' aria-disabled="true"' : "") + ">" +
    '<div class="ep-thumb">' + (img ? '<img loading="lazy" decoding="async" alt="" src="' + escapeHTML(img) + '" onerror="this.remove()">' : "") +
    '<span class="ep-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></div>' +
    '<div class="ep-info"><div class="ep-title" data-i18n="skip">' + ep.episode_number + ". " + escapeHTML(ep.name || "") + "</div>" +
    '<div class="ep-meta">' + (upcoming ? L("Próximamente", "Coming soon") + (ep.air_date ? " · " + ep.air_date : "") : escapeHTML(meta)) + "</div>" +
    (ep.overview ? '<p class="ep-overview" data-i18n="skip">' + escapeHTML(ep.overview) + "</p>" : "") + "</div></div>";
}

function loadSeasonEpisodes(id, season) {
  var list = $("ep-list"), box = $("details-episodes");
  if (!list || !box) return;
  var run = ++episodesRequest;
  box.querySelectorAll(".ep-season-chip").forEach(function (c) {
    var on = Number(c.getAttribute("data-season")) === Number(season);
    c.classList.toggle("active", on);
    c.setAttribute("aria-selected", on ? "true" : "false");
  });
  list.innerHTML = skeletonEpisodes(4);
  fetchTMDB("/tv/" + id + "/season/" + season).then(function (d) {
    if (run !== episodesRequest) return;
    var eps = (d && d.episodes) || [];
    list.innerHTML = eps.length ? eps.map(function (e) { return episodeCardHTML(e, season); }).join("") : '<div class="ep-loading">' + L("Sin episodios disponibles.", "No episodes available.") + "</div>";
  }).catch(function () {
    if (run === episodesRequest) list.innerHTML = '<div class="ep-loading">' + L("No se pudieron cargar los episodios.", "Could not load the episodes.") + ' <button type="button" class="credit-link" data-retry="1">' + L("Reintentar", "Retry") + "</button></div>";
  });
}

(function bindDetailsExtras() {
  var box = $("details-episodes"), credits = $("details-credits");
  if (box) box.addEventListener("click", function (e) {
    var chip = e.target.closest(".ep-season-chip");
    if (chip) { loadSeasonEpisodes(box.dataset.id, chip.getAttribute("data-season")); return; }
    if (e.target.closest("[data-retry]")) { var a = box.querySelector(".ep-season-chip.active"); if (a) loadSeasonEpisodes(box.dataset.id, a.getAttribute("data-season")); return; }
    var item = e.target.closest(".ep-item");
    if (!item || item.classList.contains("ep-upcoming")) return;
    closeDetails(true);
    openPlayer(Number(box.dataset.id), "tv", box.dataset.title, item.getAttribute("data-season"), item.getAttribute("data-ep"), box.dataset.bg || null);
  });
  if (credits) credits.addEventListener("click", function (e) {
    var b = e.target.closest("[data-person]");
    if (!b) return;
    closeDetails(true);
    openPersonCredits(Number(b.getAttribute("data-person")), b.getAttribute("data-name"));
  });
  if (typeof i18nAdd === "function") i18nAdd({ "Temporadas y episodios": "Seasons and episodes" });
})();

// La ✕ de la ficha cierra primero el tráiler (si está abierto) y solo después la ficha: un único botón de salir.
decorate("closeDetails", function (original) {
  return function (fromPlay) {
    var trailer = $("details-trailer");
    if (!fromPlay && trailer && trailer.classList.contains("active")) { closeDetailsTrailer(); return; }
    return original.apply(this, arguments);
  };
});
;
/* ==== js/features/search-suggest.js ==== */
/**
 * TatoCine · js/features/search-suggest.js
 * Búsqueda inteligente:
 *   - Sugerencias mientras escribes (películas, series y personas) con espera para no saturar la API.
 *   - Obras de un actor o director (`openPersonCredits`), también desde la ficha del título.
 *   - Fila «Personas» en los resultados de la búsqueda.
 * En la sección Niños y en perfiles infantiles las sugerencias están desactivadas (la búsqueda por
 * Enter sigue pasando por el filtro infantil).
 */
var SUGGEST_DELAY = 300, suggestTimer = null, suggestRun = 0;

function suggestEnabled() { return !kidsContext(); }
function hideSuggestions() { var p = $("search-suggest"); if (p) p.classList.remove("open"); }

function suggestItemHTML(r) {
  var isPerson = r.media_type === "person";
  var title = r.title || r.name || "";
  var img = isPerson ? r.profile_path : (r.poster_path || r.backdrop_path);
  var date = r.release_date || r.first_air_date || "";
  var sub = isPerson ? (r.known_for_department === "Directing" ? L("Director/a", "Director") : L("Actor / Actriz", "Actor")) :
    (r.media_type === "tv" ? L("Serie", "Series") : L("Película", "Movie")) + (date ? " · " + date.slice(0, 4) : "");
  return '<button type="button" class="suggest-item" data-type="' + r.media_type + '" data-id="' + r.id + '" data-name="' + escapeHTML(title) + '">' +
    '<span class="suggest-thumb' + (isPerson ? " round" : "") + '">' + (img ? '<img loading="lazy" decoding="async" alt="" src="' + escapeHTML(IMG_W185 + img) + '" onerror="this.remove()">' : "") + "</span>" +
    '<span class="suggest-text"><span class="suggest-title" data-i18n="skip">' + escapeHTML(title) + '</span><span class="suggest-sub">' + sub + "</span></span></button>";
}

function showSuggestions(q) {
  var panel = $("search-suggest");
  if (!panel) return;
  var run = ++suggestRun;
  fetchTMDB("/search/multi", "&include_adult=false&query=" + encodeURIComponent(q)).then(function (d) {
    if (run !== suggestRun || $searchInput.value.trim() !== q) return;
    var all = (d.results || []).filter(function (r) { return r.media_type === "movie" || r.media_type === "tv" || (r.media_type === "person" && r.profile_path); });
    var people = all.filter(function (r) { return r.media_type === "person"; }).slice(0, 2);
    var titles = all.filter(function (r) { return r.media_type !== "person"; }).slice(0, 5 - people.length + 1);
    var items = titles.concat(people).slice(0, 6);
    if (!items.length) { hideSuggestions(); return; }
    panel.innerHTML = items.map(suggestItemHTML).join("");
    panel.classList.add("open");
  }).catch(hideSuggestions);
}

/** Obras de una persona: «Con X» (actuación) y «Dirigidas por X». */
function openPersonCredits(id, name) {
  var my = ++searchRequestId;
  catalogRequestId++;
  isSearching = true;
  clearInterval(heroInterval);
  hideSuggestions();
  if ($searchInput) $searchInput.value = name || "";
  $genreContainer.innerHTML = "";
  $loadMoreContainer.innerHTML = "";
  $rowsContainer.innerHTML = skeletonRows(2);
  window.scrollTo(0, 0);
  fetchTMDB("/person/" + id + "/combined_credits").then(function (d) {
    if (my !== searchRequestId) return;
    function toCards(list) {
      var seen = {};
      return list.filter(function (x) { return (x.media_type === "movie" || x.media_type === "tv") && (x.backdrop_path || x.poster_path); })
        .sort(function (a, b) { return (b.popularity || 0) - (a.popularity || 0); })
        .filter(function (x) { var k = x.media_type + x.id; if (seen[k]) return false; seen[k] = true; return true; })
        .slice(0, 30).map(function (x) { return x.media_type === "tv" ? mapTvResult(x) : mapMovieResult(x); })
        .filter(function (m) { return !m.isUpcoming; });
    }
    var acted = toCards(d.cast || []);
    var directed = toCards((d.crew || []).filter(function (c) { return c.job === "Director"; }));
    $rowsContainer.innerHTML = "";
    if (!acted.length && !directed.length) { setSearchEmptyState(name || ""); return; }
    setHero((acted[0] || directed[0]));
    if (acted.length) renderRow(L("Con ", "With ") + name, acted);
    if (directed.length) renderRow(L("Dirigidas por ", "Directed by ") + name, directed);
    startHeroCarousel((acted.length ? acted : directed).slice(0, 5));
  }).catch(function () { if (my === searchRequestId) setSearchErrorState(); });
}

/** Fila «Personas» tras una búsqueda por Enter si el texto coincide con una persona conocida. */
function addPeopleRow(q, run) {
  fetchTMDB("/search/person", "&include_adult=false&query=" + encodeURIComponent(q)).then(function (d) {
    if (run !== searchRequestId || kidsContext()) return;
    var people = (d.results || []).filter(function (p) { return p.profile_path && (p.popularity || 0) >= 8; }).slice(0, 8);
    if (!people.length) return;
    // Espera a que los resultados de títulos estén pintados (la fila de personas va justo después).
    (function insert(tries) {
      if (run !== searchRequestId) return;
      var first = $rowsContainer.querySelector(".catalog-row");
      if (!first) { if (tries < 12) setTimeout(function () { insert(tries + 1); }, 400); return; }
      if ($rowsContainer.querySelector(".people-row")) return;
    var row = document.createElement("div");
    row.className = "row people-row";
    row.innerHTML = '<div class="row-header"><h2 class="row-title">' + L("Personas", "People") + '</h2></div><div class="row-scroll details-cast people-scroll">' + people.map(function (p) {
      return '<div class="cast-item" tabindex="0" role="button" data-person="' + p.id + '" data-name="' + escapeHTML(p.name) + '"><img class="cast-photo" loading="lazy" decoding="async" alt="" src="' + escapeHTML(IMG_W185 + p.profile_path) + '">' +
        '<div class="cast-name" data-i18n="skip">' + escapeHTML(p.name) + '</div><div class="cast-char">' + (p.known_for_department === "Directing" ? L("Dirección", "Directing") : L("Actuación", "Acting")) + "</div></div>";
    }).join("") + "</div>";
      first.parentNode.insertBefore(row, first.nextSibling);
    })(0);
  }).catch(function () { });
}

(function bindSearchSuggest() {
  var wrap = document.querySelector(".hero-content .search-wrap");
  if (!wrap || !$searchInput) return;
  var panel = document.createElement("div");
  panel.id = "search-suggest";
  panel.className = "recent-searches suggest-panel";
  panel.setAttribute("role", "listbox");
  wrap.appendChild(panel);
  panel.addEventListener("mousedown", function (e) { e.preventDefault(); });
  panel.addEventListener("click", function (e) {
    var b = e.target.closest(".suggest-item");
    if (!b) return;
    var type = b.getAttribute("data-type"), id = Number(b.getAttribute("data-id"));
    hideSuggestions();
    if (type === "person") openPersonCredits(id, b.getAttribute("data-name"));
    else openDetails(id, type);
  });
  $searchInput.addEventListener("input", function () {
    clearTimeout(suggestTimer);
    var q = $searchInput.value.trim();
    if (q.length < 2 || !suggestEnabled()) { hideSuggestions(); return; }
    suggestTimer = setTimeout(function () { showSuggestions(q); }, SUGGEST_DELAY);
  });
  $searchInput.addEventListener("blur", function () { setTimeout(hideSuggestions, 150); });
  $searchInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { clearTimeout(suggestTimer); suggestRun++; hideSuggestions(); } });
  document.addEventListener("click", function (e) {
    var p = e.target.closest("#rows-container [data-person]");
    if (p) openPersonCredits(Number(p.getAttribute("data-person")), p.getAttribute("data-name"));
  });
  // La búsqueda por Enter añade, además, la fila «Personas».
  decorate("performSearch", function (original) {
    return function (q) {
      var r = original(q);
      var run = searchRequestId;
      if (suggestEnabled()) addPeopleRow(q, run);
      return r;
    };
  });
  if (typeof i18nAdd === "function") i18nAdd({ "Personas": "People" });
})();
;
/* ==== js/features/infinite-feed.js ==== */
/**
 * TatoCine · js/features/infinite-feed.js
 * Scroll infinito en todas las pestañas que no lo tenían (Películas, Series, Anime y Niños ya cargan más solas):
 *   - Inicio ....... filas por género que continúan al bajar, empezando por tus géneros favoritos.
 *   - Búsqueda ..... páginas siguientes de resultados.
 *   - Plataformas .. más películas y series de la plataforma o el estudio.
 *   - Favoritos .... las cuadrículas largas se muestran por bloques.
 * Un único observador del elemento #sentinel; cada fuente implementa `next()` y se reinicia al cambiar de vista.
 * Perfiles Niño: sin descubrimiento infinito (solo el catálogo infantil existente y la búsqueda filtrada).
 *
 * Diseño responsable: es descubrimiento a demanda (sin temporizadores, avisos ni recompensas variables). El usuario
 * controla el ritmo y los perfiles infantiles tienen además un límite diario de uso.
 */
var FEED_GENRES = [
  { id: 28, tv: 10759, es: "Acción", en: "Action" }, { id: 35, tv: 35, es: "Comedia", en: "Comedy" },
  { id: 18, tv: 18, es: "Drama", en: "Drama" }, { id: 878, tv: 10765, es: "Ciencia ficción", en: "Science Fiction" },
  { id: 53, tv: 9648, es: "Suspenso", en: "Thriller" }, { id: 12, tv: 10759, es: "Aventura", en: "Adventure" },
  { id: 14, tv: 10765, es: "Fantasía", en: "Fantasy" }, { id: 80, tv: 80, es: "Crimen", en: "Crime" },
  { id: 10749, tv: 18, es: "Romance", en: "Romance" }, { id: 9648, tv: 9648, es: "Misterio", en: "Mystery" },
  { id: 16, tv: 16, es: "Animación", en: "Animation" }, { id: 27, tv: 9648, es: "Terror", en: "Horror" },
  { id: 99, tv: 99, es: "Documental", en: "Documentary" }, { id: 10751, tv: 10751, es: "Familia", en: "Family" },
  { id: 36, tv: 10768, es: "Historia", en: "History" }, { id: 10402, tv: null, es: "Música", en: "Music" },
  { id: 37, tv: 37, es: "Western", en: "Western" }, { id: 10752, tv: 10768, es: "Bélica", en: "War" }
];
var feed = null, feedObserver = null, feedToken = 0;

function feedSeenSet() {
  var seen = {};
  myList.forEach(function (x) { seen[x.type + ":" + x.id] = true; });
  (typeof watchedList === "function" ? watchedList() : []).forEach(function (x) { seen[x.type + ":" + x.id] = true; });
  return seen;
}
function feedAppendRow(title, items) {
  var before = $rowsContainer.querySelectorAll(".row").length;
  renderRow(title, items);
  return $rowsContainer.querySelectorAll(".row").length > before;
}
function feedShowSkeleton() { var s = document.createElement("div"); s.className = "feed-skeleton"; s.innerHTML = skeletonRow(5); $rowsContainer.appendChild(s); return s; }

/** Fuente: Inicio. Los géneros que más ves van primero (con «Para ti»), el resto después, siempre sin repetir. */
function homeFeedSource() {
  var weights = {};
  getTasteProfile().forEach(function (p) { weights[p.id] = p.score; });
  var queue = FEED_GENRES.slice().sort(function (a, b) { return (weights[b.id] || 0) - (weights[a.id] || 0) || Math.random() - 0.5; });
  var pass = 0;
  return {
    next: function () {
      if (!queue.length) { if (++pass > 2) return Promise.resolve(false); queue = shuffleInPlace(FEED_GENRES.slice()); }
      var g = queue.shift(), page = pass + 1, seen = feedSeenSet(), forYou = !!weights[g.id];
      var name = L(g.es, g.en);
      var reqs = [fetchTMDB("/discover/movie", "&with_genres=" + g.id + "&sort_by=popularity.desc&vote_count.gte=150&include_adult=false&page=" + page).catch(function () { return null; })];
      if (g.tv) reqs.push(fetchTMDB("/discover/tv", "&with_genres=" + g.tv + "&sort_by=popularity.desc&vote_count.gte=80&include_adult=false&page=" + page).catch(function () { return null; }));
      return Promise.all(reqs).then(function (r) {
        var movies = ((r[0] && r[0].results) || []).map(mapMovieResult), shows = ((r[1] && r[1].results) || []).map(function (x) { return mapTvResult(x); });
        function clean(list) { return list.filter(function (m) { return m.bg && !m.isUpcoming && !seen[m.type + ":" + m.id]; }); }
        movies = clean(movies); shows = clean(shows);
        if (movies.length >= 6) feedAppendRow((forYou ? L("Para ti: ", "For you: ") : "") + name + " · " + L("Películas", "Movies"), movies);
        if (shows.length >= 6) feedAppendRow((forYou ? L("Para ti: ", "For you: ") : "") + name + " · " + L("Series", "Series"), shows);
        return true;
      });
    }
  };
}
/** Fuente: búsqueda (páginas 2, 3…). */
function searchFeedSource(q) {
  var page = 1, total = 99;
  return {
    next: function () {
      if (page >= total) return Promise.resolve(false);
      page++;
      return fetchTMDB("/search/multi", "&include_adult=false&page=" + page + "&query=" + encodeURIComponent(q)).then(function (d) {
        total = Math.min(d.total_pages || 1, 15);
        var list = (d.results || []).filter(function (i) { return i.media_type === "movie" || i.media_type === "tv"; }).map(function (i) {
          var m = i.media_type === "tv" ? mapTvResult(i) : mapMovieResult(i);
          m.adult = !!i.adult;
          return m;
        });
        var done = function (items) { if (items.length) feedAppendRow(L("Más resultados", "More results"), items); return page < total; };
        return kidsContext() ? kidsFilterSearch(list).then(done) : done(list);
      });
    }
  };
}
/** Fuente: plataforma o estudio (páginas 3, 4…). */
function brandFeedSource(key) {
  var page = 2, b = BRANDS.find(function (x) { return x.key === key; });
  return {
    next: function () {
      if (!b || page >= 10) return Promise.resolve(false);
      page++;
      return Promise.all([fetchTMDB("/discover/movie", brandQuery(b, page)), fetchTMDB("/discover/tv", brandQuery(b, page))].map(function (p) { return p.catch(function () { return null; }); })).then(function (r) {
        var seen = feedSeenSet(), got = false;
        var movies = ((r[0] && r[0].results) || []).map(mapMovieResult).filter(function (m) { return m.bg && !m.isUpcoming; });
        var shows = ((r[1] && r[1].results) || []).map(function (x) { return mapTvResult(x); }).filter(function (m) { return m.bg; });
        if (movies.length) got = feedAppendRow(L("Más películas · ", "More movies · ") + b.name, movies) || got;
        if (shows.length) got = feedAppendRow(L("Más series · ", "More series · ") + b.name, shows) || got;
        return got;
      });
    }
  };
}
/** Fuente: Favoritos (muestra más tarjetas de las secciones largas). */
function favsFeedSource() {
  return { next: function () { if (!favTruncated) return Promise.resolve(false); favLimit += FAV_PAGE; renderFavoritesView(); return Promise.resolve(favTruncated); } };
}

function setFeed(kind, source) {
  feedToken++;
  var old = $rowsContainer.querySelector(".feed-skeleton");
  if (old) old.remove();
  feed = source ? { kind: kind, source: source, loading: false, done: false, token: feedToken } : null;
}
function homeReady() { return $rowsContainer.querySelectorAll(".row").length >= 7; }
function feedLoadNext() {
  var f = feed;
  if (!f || f.loading || f.done || document.hidden) return;
  if (f.kind === "home" && !homeReady()) { setTimeout(feedLoadNext, 1500); return; }
  f.loading = true;
  var skeleton = f.kind === "favs" ? null : feedShowSkeleton();
  f.source.next().then(function (more) { if (f.token === feedToken) f.done = !more; })
    .catch(function () { if (f.token === feedToken) f.done = true; })
    .then(function () {
      if (skeleton) skeleton.remove();
      f.loading = false;
      // Si el centinela sigue a la vista (pantallas altas), carga el siguiente bloque.
      var s = $("sentinel");
      if (f.token === feedToken && !f.done && s && s.getBoundingClientRect().top < window.innerHeight + 700) setTimeout(feedLoadNext, 250);
    });
}

(function bindInfiniteFeed() {
  var sentinel = $("sentinel");
  if (sentinel && "IntersectionObserver" in window) {
    feedObserver = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) feedLoadNext(); }, { rootMargin: "900px 0px" });
    feedObserver.observe(sentinel);
  } else window.addEventListener("scroll", function () { var s = $("sentinel"); if (s && s.getBoundingClientRect().top < window.innerHeight + 900) feedLoadNext(); }, { passive: true });
  // Reinicio según la vista
  decorate("switchView", function (original) {
    return function (v, r) {
      var out = original(v, r);
      var view = currentView;
      if (isKidProfile()) setFeed(null);
      else if (view === "home") setFeed("home", homeFeedSource());
      else if (view === "list") setFeed("favs", favsFeedSource());
      else if (view.indexOf("brand:") === 0) setFeed("brand", brandFeedSource(view.slice(6)));
      else setFeed(null);
      return out;
    };
  });
  decorate("performSearch", function (original) {
    return function (q) { var out = original(q); setFeed("search", searchFeedSource(q)); return out; };
  });
  decorate("openPersonCredits", function (original) { return function (id, name) { setFeed(null); return original(id, name); }; });
  if (typeof i18nAdd === "function") i18nAdd({ "Mis listas": "My lists" });
  if (typeof i18nRule === "function") i18nRule(/(\d+) título\b/g, "$1 title");
})();
;
/* ==== js/features/discover-wizard.js ==== */
/**
 * TatoCine · js/features/discover-wizard.js
 * «¿Qué ver hoy?»: cuatro preguntas (ambiente, tiempo, compañía, qué evitar) y tres recomendaciones
 * con el motivo de cada una. Usa los filtros de `discover` de TMDB y los gustos locales del perfil.
 *
 * Responsabilidades (SRP):
 *   - WIZARD_OPTIONS ........ datos de las preguntas (sin lógica)
 *   - wizardQuery/wizardScore  reglas de negocio (consulta y puntuación)
 *   - renderWizard*, delegación: interfaz dentro de #tc-wizard-overlay
 */
var WIZARD_OPTIONS = {
  moods: [
    { k: "suspense", es: "Suspenso", en: "Suspense", movie: "53|9648", tv: "9648|80" },
    { k: "fun", es: "Diversión", en: "Fun", movie: "35", tv: "35" },
    { k: "adrenaline", es: "Adrenalina", en: "Adrenaline", movie: "28|12", tv: "10759" },
    { k: "romance", es: "Romance", en: "Romance", movie: "10749", tv: "18|10766" },
    { k: "fantasy", es: "Fantasía", en: "Fantasy", movie: "14|878", tv: "10765" },
    { k: "drama", es: "Drama", en: "Drama", movie: "18", tv: "18" }
  ],
  kidMoods: ["fun", "adrenaline", "fantasy"],      // ánimos permitidos en perfiles Niño
  times: [30, 60, 90, 120, "120+"],
  who: [
    { k: "solo", es: "Solo", en: "Alone" },
    { k: "couple", es: "Pareja", en: "As a couple" },
    { k: "family", es: "Familia", en: "Family" },
    { k: "friends", es: "Amigos", en: "Friends" }
  ],
  avoid: [
    { k: "horror", es: "Terror", en: "Horror", movie: 27, tv: null },
    { k: "romance", es: "Romance", en: "Romance", movie: 10749, tv: null },
    { k: "animation", es: "Animación", en: "Animation", movie: 16, tv: 16 },
    { k: "war", es: "Bélica", en: "War", movie: 10752, tv: 10768 },
    { k: "crime", es: "Crimen", en: "Crime", movie: 80, tv: 80 }
  ]
};
/** Iconos del asistente: los mismos trazos que el resto de la app (corazón de favoritos incluido). */
var WIZ_ICONS = (function () {
  function svg(inner, fill) { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="' + (fill || "none") + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>"; }
  var heart = '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>';
  return {
    play: svg('<path d="M8 5v14l11-7z"/>', "currentColor"),
    info: svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
    heart: svg(heart), heartFilled: svg(heart, "currentColor")
  };
})();
var wizardState = { mood: null, time: null, who: null, avoid: [] };
var wizardPool = [], wizardShown = {}, wizardRun = 0, wizardCurrent = [], wizardRelaxed = false;

function wizardOptionLabel(o) { return L(o.es, o.en); }
function wizardFindMood() { return WIZARD_OPTIONS.moods.find(function (m) { return m.k === wizardState.mood; }) || null; }

/** Construye la consulta de `discover` ("movie" o "tv"). `relax` quita condiciones para garantizar siempre 3 resultados. */
function wizardQuery(kind, page, relax) {
  relax = relax || {};
  var mood = relax.noMood ? null : wizardFindMood(), kids = kidsContext();
  var time = relax.noTime ? null : wizardState.time;
  if (time === "120+" && kind === "tv") return null;          // «Más de 120 min» solo aplica a películas
  var q = "&sort_by=popularity.desc&include_adult=false&vote_count.gte=" + (kind === "movie" ? 200 : 100) + "&page=" + page;
  // Niños: mismas reglas que la pestaña Niños (clasificación US apta, sin terror/suspenso/crimen/bélico)
  if (kids) q += kind === "movie" ? "&certification_country=US&certification=G" : "&certification_country=US&certification=TV-Y|TV-Y7|TV-G";
  if (mood && mood[kind]) q += "&with_genres=" + encodeURIComponent(mood[kind]);
  var without = [];
  if (!relax.noAvoid) WIZARD_OPTIONS.avoid.forEach(function (a) { if (wizardState.avoid.indexOf(a.k) > -1 && a[kind]) without.push(a[kind]); });
  if (kids) without.push(27, 53, 80, 10752, 9648, 10768);
  else if (wizardState.who === "family" && !relax.noAvoid) { without.push(27, 80); if (kind === "movie") q += "&certification_country=US&certification.lte=PG"; }
  if (without.length) q += "&without_genres=" + encodeURIComponent(without.join(","));
  if (time === "120+") q += "&with_runtime.gte=121";
  else if (time) {
    q += "&with_runtime.lte=" + time;
    if (kind === "movie") q += "&with_runtime.gte=" + Math.max(60, time - 40);
  }
  return q;
}

/** Puntuación: calidad + popularidad + gustos del perfil + compañía; `jitter` da variedad al pedir otras tres. */
function wizardScore(item, weights, maxWeight) {
  var taste = (item.genre_ids || []).reduce(function (s, id) { return s + (weights[id] || 0); }, 0) / (maxWeight * 2);
  var boost = 0, g = item.genre_ids || [];
  if (wizardState.who === "couple" && g.indexOf(10749) > -1) boost = 0.12;
  if (wizardState.who === "friends" && (g.indexOf(35) > -1 || g.indexOf(28) > -1 || g.indexOf(12) > -1)) boost = 0.1;
  if (wizardState.who === "family" && (g.indexOf(10751) > -1 || g.indexOf(16) > -1)) boost = 0.15;
  return 0.6 * ((item.rating || 0) / 10) + 0.25 * Math.min(1, Math.log10((item._pop || 0) + 1) / 3) + 0.3 * Math.min(1.2, taste) + boost + Math.random() * 0.06;
}

function wizardReason(item, topTaste) {
  var parts = [], mood = wizardFindMood();
  if (mood) parts.push(L("Va con tu ánimo: ", "Fits your mood: ") + wizardOptionLabel(mood));
  if (wizardState.time === "120+") parts.push(L("dura más de 120 min", "runs over 120 min"));
  else if (wizardState.time) parts.push(item.type === "movie"
    ? L("dura menos de " + wizardState.time + " min", "runs under " + wizardState.time + " min")
    : L("episodios de menos de " + wizardState.time + " min", "episodes under " + wizardState.time + " min"));
  if (item.rating >= 7.5) parts.push(L("muy bien valorada (", "highly rated (") + Number(item.rating).toFixed(1) + " ★)");
  if ((item.genre_ids || []).some(function (id) { return topTaste.indexOf(id) > -1; })) parts.push(L("coincide con lo que sueles ver", "matches what you usually watch"));
  if (wizardState.who === "family") parts.push(L("apta para ver en familia", "suitable for family viewing"));
  return parts.slice(0, 3).join(" · ");
}

function wizardPickThree() {
  var weights = {}, profile = getTasteProfile();
  profile.forEach(function (p) { weights[p.id] = p.score; });
  var maxWeight = (profile[0] && profile[0].score) || 1;
  var topTaste = profile.slice(0, 3).map(function (p) { return p.id; });
  var fresh = function () { return wizardPool.filter(function (m) { return !wizardShown[m.type + ":" + m.id]; }); };
  if (fresh().length < 3) wizardShown = {};                          // se agotaron: se vuelve a empezar para no quedarse con menos de 3
  var scored = fresh().map(function (m) { return { m: m, s: wizardScore(m, weights, maxWeight) }; }).sort(function (a, b) { return b.s - a.s; });
  var picks = [], counts = { movie: 0, tv: 0 }, used = {};
  scored.forEach(function (x) {                                     // primero, mezcla de películas y series
    if (picks.length >= 3 || (counts[x.m.type] >= 2 && scored.length > 5)) return;
    counts[x.m.type]++; used[x.m.type + ":" + x.m.id] = true; picks.push(x.m);
  });
  scored.forEach(function (x) {                                     // si faltan, se completa con los mejores restantes
    if (picks.length >= 3 || used[x.m.type + ":" + x.m.id]) return;
    used[x.m.type + ":" + x.m.id] = true; picks.push(x.m);
  });
  picks.forEach(function (m) { wizardShown[m.type + ":" + m.id] = true; m._reason = wizardReason(m, topTaste); });
  return picks;
}

/** Reúne candidatos; si con tus respuestas salen menos de 3 se relajan (tiempo → ánimo → lo que evitas) hasta tener 3 como mínimo. */
var WIZARD_RELAX = [{}, { noTime: true }, { noTime: true, noMood: true }, { noTime: true, noMood: true, noAvoid: true }];
function wizardCollect(relax, run) {
  var jobs = [];
  [1, 2, 3].forEach(function (page) {
    ["movie", "tv"].forEach(function (kind) {
      var q = wizardQuery(kind, page, relax);
      if (q) jobs.push(fetchTMDB("/discover/" + kind, q).then(function (d) { return { kind: kind, data: d }; }).catch(function () { return null; }));
    });
  });
  return Promise.all(jobs).then(function (r) {
    var avoidIds = {}, pool = [], seen = {}, ok = r.some(Boolean);
    (typeof watchedList === "function" ? watchedList() : []).forEach(function (x) { avoidIds[x.type + ":" + x.id] = true; });
    completedTitles().forEach(function (x) { avoidIds[x.type + ":" + x.id] = true; });
    r.forEach(function (res) {
      if (!res) return;
      ((res.data && res.data.results) || []).forEach(function (raw) {
        var m = res.kind === "tv" ? mapTvResult(raw) : mapMovieResult(raw), key = m.type + ":" + m.id;
        m._pop = raw.popularity;
        if (m.isUpcoming || !m.bg || avoidIds[key] || seen[key]) return;
        if (wizardState.who === "family" && res.kind === "tv" && !(m.genre_ids.indexOf(10751) > -1 || m.genre_ids.indexOf(16) > -1 || m.genre_ids.indexOf(10762) > -1)) return;
        seen[key] = true;
        pool.push(m);
      });
    });
    // En Niños cada candidato se verifica con su clasificación real antes de mostrarse (falla cerrado).
    return (kidsContext() ? kidsFilterSearch(pool, 48) : Promise.resolve(pool)).then(function (safe) { return { pool: safe, ok: ok }; });
  });
}
function runWizard() {
  var run = ++wizardRun;
  var body = $("tc-wizard-body");
  body.innerHTML = '<p class="wiz-loading" role="status">' + L("Buscando lo mejor para ti…", "Finding the best picks for you…") + "</p>" + skeletonResults(3);
  var level = 0, anyOk = false;
  (function attempt() {
    wizardCollect(WIZARD_RELAX[level], run).then(function (res) {
      if (run !== wizardRun) return;
      anyOk = anyOk || res.ok;
      if (res.pool.length < 3 && level < WIZARD_RELAX.length - 1) { level++; attempt(); return; }
      wizardPool = res.pool;
      wizardShown = {};
      wizardRelaxed = level > 0;
      renderWizardResults(anyOk);
    });
  })();
}

function renderWizardResults(requestOk, reuse) {
  // `reuse`: volver a pintar las mismas tres (p. ej. tras guardar un favorito) sin elegir otras.
  var picks = reuse ? wizardCurrent : (requestOk === false ? [] : wizardPickThree());
  wizardCurrent = picks;
  var body = $("tc-wizard-body");
  if (!picks.length) {
    body.innerHTML = '<p class="wiz-empty">' + (requestOk === false
      ? L("No se pudo conectar con el catálogo. Revisa tu conexión e inténtalo de nuevo.", "Could not reach the catalog. Check your connection and try again.")
      : L("No encontramos nada con esas condiciones. Prueba con menos filtros.", "We found nothing with those conditions. Try fewer filters.")) +
      '</p><div class="wiz-actions"><button type="button" class="tc-profile-create-btn" data-wiz="back">' + L("Cambiar respuestas", "Change answers") + "</button></div>";
    return;
  }
  body.innerHTML = (wizardRelaxed ? '<p class="wiz-note">' + L("Con tus respuestas había pocas opciones: ampliamos un poco la búsqueda para mostrarte 3.", "There were few matches for your answers, so we widened the search to show you 3.") + "</p>" : "") + '<div class="wiz-results">' + picks.map(function (m, i) {
    var saved = isSaved(m);
    return '<article class="wiz-result" data-i="' + i + '"><img loading="lazy" decoding="async" alt="" src="' + escapeHTML(IMG_CARD + m.bg) + '" onerror="this.onerror=null;this.src=FALLBACK_IMG">' +
      '<div class="wiz-info"><h4 class="wiz-title" data-i18n="skip">' + escapeHTML(m.title) + '</h4>' +
      '<div class="wiz-meta">' + (m.type === "tv" ? L("Serie", "Series") : L("Película", "Movie")) + (m.year ? " · " + m.year : "") + (m.rating ? " · ★ " + Number(m.rating).toFixed(1) : "") + "</div>" +
      '<p class="wiz-reason">' + escapeHTML(m._reason) + '</p>' +
      '<div class="wiz-btns"><button type="button" class="wiz-btn primary" data-wiz="play" data-i="' + i + '">' + WIZ_ICONS.play + L("Ver", "Watch") + '</button>' +
      '<button type="button" class="wiz-btn" data-wiz="info" data-i="' + i + '">' + WIZ_ICONS.info + 'Info</button>' +
      '<button type="button" class="wiz-btn icon-only' + (saved ? " active" : "") + '" data-wiz="fav" data-i="' + i + '" aria-pressed="' + saved + '" aria-label="' + (saved ? L("Quitar de favoritos", "Remove from favorites") : L("Agregar a favoritos", "Add to favorites")) + '" title="' + (saved ? L("Quitar de favoritos", "Remove from favorites") : L("Agregar a favoritos", "Add to favorites")) + '">' + (saved ? WIZ_ICONS.heartFilled : WIZ_ICONS.heart) + "</button></div></div></article>";
  }).join("") + '</div><div class="wiz-actions"><button type="button" class="tc-profile-cancel-btn" data-wiz="back">' + L("Cambiar respuestas", "Change answers") + '</button>' +
    '<button type="button" class="tc-profile-create-btn" data-wiz="more">' + L("Ver otras 3", "Show 3 more") + "</button></div>";
  body.__picks = picks;
}

function renderWizardForm() {
  var kids = kidsContext();
  var moods = kids ? WIZARD_OPTIONS.moods.filter(function (m) { return WIZARD_OPTIONS.kidMoods.indexOf(m.k) > -1; }) : WIZARD_OPTIONS.moods;
  function chips(group, items, labelFn, valueFn, multi) {
    return '<div class="wiz-chips" role="group">' + items.map(function (o) {
      var value = valueFn(o), on = multi ? wizardState.avoid.indexOf(value) > -1 : wizardState[group] === value;
      return '<button type="button" class="wiz-chip' + (on ? " active" : "") + '" data-wiz="chip" data-group="' + group + '" data-value="' + value + '" aria-pressed="' + on + '">' + labelFn(o) + "</button>";
    }).join("") + "</div>";
  }
  $("tc-wizard-body").innerHTML =
    '<p class="wiz-q">' + L("¿Qué ambiente tienes?", "What mood are you in?") + "</p>" + chips("mood", moods, wizardOptionLabel, function (o) { return o.k; }) +
    '<p class="wiz-q">' + L("¿Cuánto tiempo tienes?", "How much time do you have?") + "</p>" + chips("time", WIZARD_OPTIONS.times, function (t) { return t === "120+" ? L("Más de 120 min", "Over 120 min") : t + " min"; }, function (t) { return t; }) +
    '<p class="wiz-q">' + L("¿Con quién vas a ver?", "Who are you watching with?") + "</p>" + chips("who", WIZARD_OPTIONS.who, wizardOptionLabel, function (o) { return o.k; }) +
    (kids ? "" : '<p class="wiz-q">' + L("¿Qué prefieres evitar?", "What would you rather avoid?") + "</p>" + chips("avoid", WIZARD_OPTIONS.avoid, wizardOptionLabel, function (o) { return o.k; }, true)) +
    '<div class="wiz-actions"><button type="button" class="tc-profile-create-btn" data-wiz="go"' + (wizardState.mood ? "" : " disabled") + ">" + L("Mostrar 3 recomendaciones", "Show 3 recommendations") + "</button></div>";
}

function openWizard() {
  wizardState = { mood: null, time: null, who: null, avoid: [] };
  renderWizardForm();
  openOverlay("tc-wizard-overlay");
}
function closeWizard() { wizardRun++; closeOverlay("tc-wizard-overlay"); }

(function bindWizard() {
  var overlay = $("tc-wizard-overlay");
  if (!overlay) return;
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) { closeWizard(); return; }
    var el = e.target.closest("[data-wiz]");
    if (!el) return;
    var act = el.getAttribute("data-wiz"), picks = $("tc-wizard-body").__picks || [];
    var m = picks[Number(el.getAttribute("data-i"))];
    if (act === "close") closeWizard();
    else if (act === "chip") {
      var g = el.getAttribute("data-group"), v = el.getAttribute("data-value");
      if (g === "avoid") { var i = wizardState.avoid.indexOf(v); if (i > -1) wizardState.avoid.splice(i, 1); else wizardState.avoid.push(v); }
      else { var val = g === "time" && v !== "120+" ? Number(v) : v; wizardState[g] = val === wizardState[g] ? null : val; }
      renderWizardForm();
      var again = overlay.querySelector('[data-group="' + g + '"][data-value="' + v + '"]'); if (again) again.focus();
    }
    else if (act === "go") runWizard();
    else if (act === "back") renderWizardForm();
    else if (act === "more") { if (!wizardPool.some(function (x) { return !wizardShown[x.type + ":" + x.id]; })) wizardShown = {}; renderWizardResults(true); }
    else if (act === "play" && m) { closeWizard(); openPlayer(m.id, m.type, m.title, null, null, m.bg); }
    else if (act === "info" && m) { closeWizard(); openDetails(m.id, m.type); }
    else if (act === "fav" && m) {
      toggleFavoriteMedia({ id: m.id, type: m.type, title: m.title, bg: m.bg, rating: m.rating, year: m.year }, function () { renderWizardResults(true, true); });
    }
  });
  if (typeof i18nAdd === "function") i18nAdd({ "¿Qué ver hoy?": "What to watch today?", "Vistas": "Watched" });
})();
;
/* ==== js/features/streak.js ==== */
/**
 * TatoCine · js/features/streak.js
 * Racha: días seguidos en los que el perfil reprodujo algo. Se muestra junto al perfil con un icono de fuego.
 * Es solo un contador local y discreto (sin avisos ni presión). No existe en perfiles Niño.
 * Datos por perfil: tatoStreak = { last: "YYYY-M-D", count, best }.
 */
var STREAK_KEY = "tatoStreak";
var streakData = readLocalJSON(profileStorageKey(STREAK_KEY), null);
if (!streakData || typeof streakData !== "object") streakData = { last: "", count: 0, best: 0 };

function streakDayKey(date) { return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(); }
/** Días seguidos vigentes: si el último día con actividad no es hoy ni ayer, la racha se perdió. */
function currentStreak() {
  if (!streakData.last) return 0;
  var today = streakDayKey(new Date()), yesterday = streakDayKey(new Date(Date.now() - 86400000));
  return streakData.last === today || streakData.last === yesterday ? streakData.count : 0;
}
function registerStreakDay() {
  if (isKidProfile()) return;
  var today = streakDayKey(new Date());
  if (streakData.last === today) return;
  var yesterday = streakDayKey(new Date(Date.now() - 86400000));
  streakData.count = streakData.last === yesterday ? (streakData.count || 0) + 1 : 1;
  streakData.last = today;
  streakData.best = Math.max(streakData.best || 0, streakData.count);
  safeStorageSet(profileStorageKey(STREAK_KEY), JSON.stringify(streakData));
  renderStreak();
}
function renderStreak() {
  var pill = $("streak-pill");
  if (!pill) return;
  var n = isKidProfile() ? 0 : currentStreak();
  pill.hidden = n < 1;
  if (n < 1) return;
  $("streak-count").textContent = String(n);
  var label = n === 1 ? L("Racha: 1 día seguido viendo algo", "Streak: 1 day in a row watching something") : L("Racha: " + n + " días seguidos viendo algo", "Streak: " + n + " days in a row watching something");
  pill.title = label;
  pill.setAttribute("aria-label", label);
}
decorate("recordMediaStart", function (original) {
  return function (media, genreIds) { registerStreakDay(); return original(media, genreIds); };
});
renderStreak();
;
/* ==== js/features/new-episodes.js ==== */
/**
 * TatoCine · js/features/new-episodes.js
 * Avisos de «Nuevo episodio» para las series que sigues (continuar viendo, favoritas y finalizadas).
 * Sin servidor: la comprobación ocurre al abrir el Inicio (una vez cada 6 horas) y guarda, por serie,
 * el último episodio emitido que ya conocíamos. Si aparece uno más reciente se avisa y se muestra la
 * fila «Nuevos episodios» durante 14 días (o hasta que reproduzcas la serie).
 */
var NEWEP_KEY = "tatoSeriesSeen", NEWEP_META_KEY = "tatoSeriesCheck";
var NEWEP_INTERVAL = 6 * 3600 * 1000, NEWEP_TTL = 14 * 86400000, NEWEP_MAX = 10;
var seriesSeen = readLocalJSON(profileStorageKey(NEWEP_KEY), {});
if (!seriesSeen || typeof seriesSeen !== "object" || Array.isArray(seriesSeen)) seriesSeen = {};
var newEpChecked = false;

function saveSeriesSeen() { return safeStorageSet(profileStorageKey(NEWEP_KEY), JSON.stringify(seriesSeen)); }

/** Series que sigue el perfil (sin repetir), las más recientes primero. */
function followedSeries() {
  var out = {}, list = [];
  function add(x, bg) {
    if (!x || x.type !== "tv" || out[x.id]) return;
    out[x.id] = { id: x.id, title: x.title, bg: x.bg || bg || "" };
    list.push(out[x.id]);
  }
  continueWatching.forEach(function (m) { add(m); });
  myList.forEach(function (m) { add(m); });
  completedTitles().forEach(function (m) { add(m); });
  return list.slice(0, NEWEP_MAX);
}

function checkNewEpisodes() {
  if (isKidProfile() || newEpChecked) return;
  newEpChecked = true;
  var last = Number(readLocalJSON(profileStorageKey(NEWEP_META_KEY), 0)) || 0;
  if (Date.now() - last < NEWEP_INTERVAL) return;
  var queue = followedSeries(), found = [];
  (function next() {
    var s = queue.shift();
    if (!s) {
      safeStorageSet(profileStorageKey(NEWEP_META_KEY), JSON.stringify(Date.now()));
      saveSeriesSeen();
      if (found.length) {
        showToast(found.length === 1 ? L("Nuevo episodio de ", "New episode of ") + found[0] : L(found.length + " series tienen episodios nuevos", found.length + " series have new episodes"));
        if (currentView === "home") renderNewEpisodesRow(true);
      }
      return;
    }
    fetchTMDB("/tv/" + s.id).then(function (d) {
      var ep = d && d.last_episode_to_air;
      if (!ep) return;
      var key = ep.season_number * 1000 + ep.episode_number, prev = seriesSeen[s.id];
      var entry = prev || { k: key };
      if (prev && key > prev.k) {
        entry.alert = Date.now();
        entry.label = "T" + ep.season_number + " · E" + ep.episode_number;
        found.push(s.title);
      }
      entry.k = Math.max(key, entry.k || 0);
      entry.title = s.title;
      entry.bg = (d.backdrop_path || d.poster_path || s.bg || "");
      entry.rating = d.vote_average || 0;
      entry.year = (d.first_air_date || "").slice(0, 4);
      seriesSeen[s.id] = entry;
    }).catch(function () { }).then(next);
  })();
}

function activeNewEpisodes() {
  var now = Date.now();
  return Object.keys(seriesSeen).map(function (id) { var e = seriesSeen[id]; return { id: Number(id), type: "tv", title: e.title, bg: e.bg, rating: e.rating, year: e.year, alert: e.alert, label: e.label }; })
    .filter(function (e) { return e.alert && now - e.alert < NEWEP_TTL; })
    .sort(function (a, b) { return b.alert - a.alert; });
}

function acknowledgeNewEpisode(id) {
  var e = seriesSeen[id];
  if (e && e.alert) { delete e.alert; saveSeriesSeen(); }
}

/** Pinta la fila (debajo de «Continuar viendo»); `replace` la sustituye si ya existe. */
function renderNewEpisodesRow(replace) {
  var old = $rowsContainer.querySelector(".new-ep-row");
  if (old && !replace) return;
  if (old) old.parentNode.removeChild(old);
  var items = activeNewEpisodes();
  if (!items.length || isKidProfile()) return;
  var row = document.createElement("div");
  row.className = "row new-ep-row";
  row.innerHTML = '<div class="row-header"><h2 class="row-title">' + L("Nuevos episodios", "New episodes") + '</h2></div>' +
    '<button class="row-nav prev" onclick="scrollRow(this,-1)" aria-label="Anterior">‹</button><button class="row-nav next" onclick="scrollRow(this,1)" aria-label="Siguiente">›</button>' +
    '<div class="row-scroll">' + items.map(function (m) { return getCardHTML(m).replace('<div class="card ', '<div class="card has-new-ep '); }).join("") + "</div>";
  var cont = $rowsContainer.querySelector(".continue-row");
  if (cont) cont.parentNode.insertBefore(row, cont.nextSibling);
  else $rowsContainer.insertBefore(row, $rowsContainer.firstChild);
}

// Integración: tras pintar «Continuar viendo» se muestra la fila y se programa la comprobación; al reproducir una serie se da por vista la alerta.
decorate("renderContinueRow", function (original) {
  return function () { original(); renderNewEpisodesRow(); IDLE(checkNewEpisodes); };
});
decorate("recordMediaStart", function (original) {
  return function (media, genreIds) { if (media && media.type === "tv") acknowledgeNewEpisode(media.id); return original(media, genreIds); };
});
if (typeof i18nAdd === "function") i18nAdd({ "Nuevos episodios": "New episodes" });
;
/* ==== js/features/backup.js ==== */
/**
 * TatoCine · js/features/backup.js
 * Copia de seguridad del perfil activo (archivo .json) para llevarlo a otro dispositivo o navegador.
 * Incluye favoritos, listas, vistas, valoraciones, continuar viendo, estadísticas y preferencias.
 * NO incluye el PIN. Al importar, los datos se FUSIONAN con los existentes (no se borra nada).
 *
 * Diseño (SRP / abierto-cerrado): cada clave de datos tiene su propia función de fusión en PROFILE_MERGERS;
 * añadir una clave nueva es añadir una entrada, sin tocar el resto.
 */
var BACKUP_APP = "TatoCine", BACKUP_VERSION = 1, BACKUP_MAX_BYTES = 3 * 1024 * 1024;

function mergeArrayBy(keyFn, limit, sorter) {
  return function (current, incoming) {
    var map = {}, out = [];
    (Array.isArray(current) ? current : []).concat(Array.isArray(incoming) ? incoming : []).forEach(function (x) {
      if (!x || typeof x !== "object") return;
      var k = keyFn(x);
      if (!(k in map)) { map[k] = x; out.push(x); }
      else if (sorter && sorter(x, map[k]) > 0) { out[out.indexOf(map[k])] = x; map[k] = x; }
    });
    if (sorter) out.sort(function (a, b) { return sorter(b, a); });
    return limit ? out.slice(0, limit) : out;
  };
}
function mergeObjectNewest(current, incoming) {
  var out = {}, a = current && typeof current === "object" ? current : {}, b = incoming && typeof incoming === "object" ? incoming : {};
  Object.keys(a).forEach(function (k) { out[k] = a[k]; });
  Object.keys(b).forEach(function (k) { if (!out[k] || (b[k].ts || 0) >= (out[k].ts || 0)) out[k] = b[k]; });
  return out;
}
var PROFILE_MERGERS = {
  tatoList: mergeArrayBy(function (x) { return x.type + ":" + x.id; }),
  tatoFavLists: mergeArrayBy(function (x) { return x.id; }),
  tatoContinue: mergeArrayBy(function (x) { return x.type + ":" + x.id; }, 20, function (a, b) { return (a.timestamp || 0) - (b.timestamp || 0); }),
  tatoLocalAnalyticsV1: function (current, incoming) {
    var merge = mergeArrayBy(function (x) { return x.type + ":" + x.id; }, 150, function (a, b) { return ((a.secs || 0) + (a.done || 0) * 1e5) - ((b.secs || 0) + (b.done || 0) * 1e5); });
    return { items: merge((current && current.items) || [], (incoming && incoming.items) || []) };
  },
  tatoWatched: mergeObjectNewest,
  tatoSeriesSeen: mergeObjectNewest,
  tatoRecentSearches: function (current, incoming) {
    var seen = {}, out = [];
    (Array.isArray(current) ? current : []).concat(Array.isArray(incoming) ? incoming : []).forEach(function (q) {
      if (typeof q === "string" && !seen[q.toLowerCase()]) { seen[q.toLowerCase()] = 1; out.push(q); }
    });
    return out.slice(0, 8);
  }
};
var PROFILE_REPLACE_KEYS = ["tatoServer", "tatoAutoNextEpisode"];     // preferencias: gana lo importado

function exportProfileData() {
  if (isGuestProfile()) { showToast(L("El perfil Invitado no guarda datos", "The Guest profile does not save data")); return; }
  var prefix = "tatoProfile_" + activeProfileId + "_", data = {}, p = getActiveProfile();
  try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(prefix) === 0) data[k.slice(prefix.length)] = localStorage.getItem(k); }); } catch (e) { }
  var payload = { app: BACKUP_APP, v: BACKUP_VERSION, exportedAt: new Date().toISOString(), profile: { name: p.name, kind: p.kind, lang: p.lang }, data: data };
  var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  var a = document.createElement("a");
  var safe = String(p.name || "perfil").replace(/[^\w\-]+/g, "_").slice(0, 24) || "perfil";
  a.href = URL.createObjectURL(blob);
  a.download = "tatocine-" + safe + "-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  showToast(L("Copia de seguridad descargada", "Backup downloaded"));
}

function importProfileData(file) {
  if (!file) return;
  if (isGuestProfile()) { showToast(L("El perfil Invitado no guarda datos", "The Guest profile does not save data")); return; }
  if (file.size > BACKUP_MAX_BYTES) { showToast(L("El archivo es demasiado grande", "The file is too large")); return; }
  var reader = new FileReader();
  reader.onerror = function () { showToast(L("No se pudo leer el archivo", "Could not read the file")); };
  reader.onload = function () {
    var payload;
    try { payload = JSON.parse(String(reader.result)); } catch (e) { payload = null; }
    if (!payload || payload.app !== BACKUP_APP || !payload.data || typeof payload.data !== "object") {
      showToast(L("Archivo no válido: no es una copia de TatoCine", "Invalid file: not a TatoCine backup"));
      return;
    }
    if (!confirm(L("¿Importar esta copia en el perfil «" + getActiveProfile().name + "»? Se combinará con tus datos actuales.", "Import this backup into profile “" + getActiveProfile().name + "”? It will be merged with your current data."))) return;
    var prefix = "tatoProfile_" + activeProfileId + "_", applied = 0;
    Object.keys(payload.data).forEach(function (key) {
      var raw = payload.data[key];
      if (typeof raw !== "string" || raw.length > BACKUP_MAX_BYTES) return;
      try {
        if (PROFILE_MERGERS[key]) {
          var incoming = JSON.parse(raw);
          var current = readLocalJSON(prefix + key, null);
          if (safeStorageSet(prefix + key, JSON.stringify(PROFILE_MERGERS[key](current, incoming)))) applied++;
        } else if (PROFILE_REPLACE_KEYS.indexOf(key) > -1) {
          if (safeStorageSet(prefix + key, raw)) applied++;
        }
      } catch (e) { }
    });
    showToast(applied ? L("Copia importada. Recargando…", "Backup imported. Reloading…") : L("No había datos que importar", "There was no data to import"));
    if (applied) setTimeout(function () { location.reload(); }, 900);
  };
  reader.readAsText(file);
}

(function bindBackup() {
  var input = $("backup-file");
  if (input) input.addEventListener("change", function () { importProfileData(input.files && input.files[0]); input.value = ""; });
  if (typeof i18nAdd === "function") i18nAdd({
    "Copia de seguridad": "Backup", "Exportar": "Export", "Importar": "Import",
    "Guarda o recupera favoritos, listas, vistas e historial de este perfil (sin el PIN).": "Save or restore this profile's favorites, lists, watched titles and history (without the PIN)."
  });
})();
;
/* ==== js/player/autoplay-next.js ==== */
/**
 * TatoCine · js/player/autoplay-next.js
 * Siguiente episodio automático: cuenta regresiva de respaldo.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Siguiente episodio automático: respaldo con cuenta regresiva (estilo Netflix) ----
    var nextPromptTimer = null;
    function clearNextPrompt() {
      clearInterval(nextPromptTimer);
      nextPromptTimer = null;
      var p = document.querySelector(".next-ep-prompt");
      if (p && p.parentNode) p.parentNode.removeChild(p);
    }
    function hasNextEpisode() {
      if (!currentMedia || currentMedia.type !== "tv") return false;
      var ep = Number($episodeSelect.value || 0), season = Number($seasonSelect.value || 0);
      var later = (currentTvEpisodes || []).some(function (e) { return Number(e.episode_number) > ep; });
      if (later) return true;
      return (currentTvSeasons || []).some(function (x) { return Number(x.season_number) > season && Number(x.episode_count || 0) > 0; });
    }
    function showNextEpisodePrompt() {
      if (document.querySelector(".next-ep-prompt") || !hasNextEpisode()) return;
      var left = 10;
      var p = document.createElement("div");
      p.className = "next-ep-prompt";
      p.setAttribute("role", "alert");
      p.innerHTML = '<div class="next-ep-title">Siguiente episodio en <b>10</b> s</div><div class="next-ep-actions"><button type="button" class="next-ep-play">Reproducir ahora</button><button type="button" class="next-ep-cancel">Cancelar</button></div>';
      $playerView.appendChild(p);
      p.querySelector(".next-ep-play").onclick = function () { clearNextPrompt(); playNextEpisode(); };
      p.querySelector(".next-ep-cancel").onclick = function () { clearNextPrompt(); };
      nextPromptTimer = setInterval(function () {
        left--;
        var b = p.querySelector("b");
        if (b) b.textContent = String(Math.max(left, 0));
        if (left <= 0) { clearNextPrompt(); playNextEpisode(); }
      }, 1000);
    }
    decorate("playEmbed", function (original) { return function (i, b) { clearNextPrompt(); return original(i, b); }; });
    decorate("closePlayer", function (original) { return function () { clearNextPrompt(); return original.apply(this, arguments); }; });
;
/* ==== js/ui/gestures.js ==== */
/**
 * TatoCine · js/ui/gestures.js
 * Gestos y atajos de mando, una sola capa para todos los dispositivos:
 *   - Táctil (móvil/tableta): deslizar la portada cambia de título; deslizar hacia abajo cierra ventanas
 *     (cuando están arriba del todo); deslizar desde el borde izquierdo cierra la ventana superior.
 *   - Mando de TV: canal +/- cambia el título de la portada; Atrás y flechas ya los maneja tv-navigation.js.
 *   - Escritorio: arrastrar con el ratón sobre la portada también cambia de título.
 * Los listeners son pasivos y el umbral evita confundir un gesto con el desplazamiento normal.
 */
var GESTURE = { minDistance: 70, edge: 24, closeDistance: 110, axisRatio: 1.6 };

function gestureHeroStep(dir) {
  if (!heroMoviesList || heroMoviesList.length < 2 || heroSectionIsEmpty()) return;
  currentHeroIndex = (currentHeroIndex + dir + heroMoviesList.length) % heroMoviesList.length;
  setHero(heroMoviesList[currentHeroIndex]);
}

/** Ventanas que se cierran deslizando hacia abajo: id → [zona con scroll, función de cierre]. */
var SHEETS = {
  "details-modal": [".details-body", function () { closeDetails(); }],
  "settings-modal": [".modal-body", function () { closeSettings(); }],
  "stats-modal": [".modal-body", function () { closeStats(); }],
  "filters-modal": [".modal-body", function () { closeFilters(); }],
  "actor-modal": [".actor-bio", function () { closeActor(); }]
};

(function bindGestures() {
  var start = null;
  function point(e) { var t = (e.changedTouches && e.changedTouches[0]) || e; return { x: t.clientX, y: t.clientY }; }
  function sheetAt(target) {
    for (var id in SHEETS) {
      var el = $(id);
      if (el && el.classList.contains("open") && el.contains(target)) return { el: el, scroller: el.querySelector(SHEETS[id][0]), close: SHEETS[id][1] };
    }
    return null;
  }
  function onStart(e) {
    var p = point(e), t = e.target;
    if (t.closest && t.closest("input, select, textarea, .details-cast, .row-scroll, .ep-seasons, iframe")) { start = null; return; }
    var sheet = sheetAt(t);
    start = { x: p.x, y: p.y, hero: !!(t.closest && t.closest("#hero-section") && !t.closest(".search-wrap, button, a")), sheet: sheet, atTop: !sheet || !sheet.scroller || sheet.scroller.scrollTop <= 0, edge: p.x <= GESTURE.edge };
  }
  function onEnd(e) {
    if (!start) return;
    var p = point(e), dx = p.x - start.x, dy = p.y - start.y, ax = Math.abs(dx), ay = Math.abs(dy), s = start;
    start = null;
    if (s.edge && dx > GESTURE.closeDistance && ax > ay * GESTURE.axisRatio) {           // desde el borde: cierra la ventana superior
      var layer = typeof topLayer === "function" ? topLayer() : null;
      if (layer && layer.id !== "player-modal" && layer.id !== "tc-profile-overlay") document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return;
    }
    if (s.sheet && s.atTop && dy > GESTURE.closeDistance && ay > ax * GESTURE.axisRatio) { s.sheet.close(); return; }   // hacia abajo: cierra
    if (s.hero && !s.sheet && ax > GESTURE.minDistance && ax > ay * GESTURE.axisRatio) gestureHeroStep(dx < 0 ? 1 : -1);  // portada
  }
  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchend", onEnd, { passive: true });
  var hero = $("hero-section");
  if (hero) {                                                                     // ratón: arrastrar la portada
    hero.addEventListener("mousedown", onStart);
    hero.addEventListener("mouseup", onEnd);
  }
  // Mando de TV: canal +/- cambia el título de la portada (códigos habituales de Tizen, webOS y Android TV)
  window.addEventListener("keydown", function (e) {
    if (isTypingTarget(document.activeElement) || (typeof topLayer === "function" && topLayer())) return;
    if (e.key === "ChannelUp" || e.keyCode === 427 || e.keyCode === 33 && IS_TV) gestureHeroStep(1);
    else if (e.key === "ChannelDown" || e.keyCode === 428 || e.keyCode === 34 && IS_TV) gestureHeroStep(-1);
  });
})();
;
/* ==== js/ui/a11y.js ==== */
/**
 * TatoCine · js/ui/a11y.js
 * Accesibilidad transversal (no cambia el diseño):
 *   - Semántica de diálogos (role/aria-modal/aria-labelledby) y regiones de navegación.
 *   - Foco: al abrir una ventana el foco entra en ella, Tab no se escapa y al cerrar vuelve a donde estaba.
 *   - Avisos (toast) anunciados por lectores de pantalla y enlace «Saltar al contenido».
 */
var A11Y_DIALOGS = ["details-modal", "settings-modal", "filters-modal", "actor-modal", "player-modal", "stats-modal", "disclaimer-modal"];
var a11yLastFocus = null;

function a11yFocusables(scope) {
  return Array.prototype.filter.call(scope.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'), function (el) {
    return el.offsetParent !== null && !el.closest("[hidden]") && getComputedStyle(el).visibility !== "hidden";
  });
}

(function setupA11y() {
  // 1) Semántica
  A11Y_DIALOGS.forEach(function (id) {
    var el = $(id);
    if (!el) return;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    var title = el.querySelector(".modal-title, .details-title");
    if (title) { if (!title.id) title.id = id + "-title"; el.setAttribute("aria-labelledby", title.id); }
  });
  var links = document.querySelector(".nav-links");
  if (links) { links.setAttribute("role", "navigation"); links.setAttribute("aria-label", "Principal"); }
  var menu = $("mobile-menu");
  if (menu) menu.setAttribute("aria-label", "Menú");
  var toasts = $("toast-container");
  if (toasts) { toasts.setAttribute("role", "status"); toasts.setAttribute("aria-live", "polite"); }
  var main = document.querySelector("main");
  if (main && !main.id) main.id = "main-content";
  var skip = document.createElement("a");
  skip.className = "skip-link";
  skip.href = "#rows-container";
  skip.textContent = "Saltar al contenido";
  skip.addEventListener("click", function (e) {
    e.preventDefault();
    var target = $("rows-container"), first = target && a11yFocusables(target)[0];
    if (target) target.scrollIntoView();
    if (first) first.focus();
  });
  document.body.insertBefore(skip, document.body.firstChild);

  // 2) Foco al abrir / cerrar ventanas
  var layerIds = typeof LAYER_IDS !== "undefined" ? LAYER_IDS : A11Y_DIALOGS;
  var open = {};
  var mo = new MutationObserver(function (list) {
    list.forEach(function (m) {
      var el = m.target, isOpen = el.classList.contains("open");
      if (isOpen && !open[el.id]) {
        open[el.id] = true;
        if (!a11yLastFocus || !document.contains(a11yLastFocus)) a11yLastFocus = document.activeElement;
        window.setTimeout(function () {
          if (el.contains(document.activeElement)) return;
          var f = a11yFocusables(el).filter(function (x) { return !/close|modal-close/.test(x.className); })[0] || a11yFocusables(el)[0];
          if (f) f.focus({ preventScroll: true });
        }, 60);
      } else if (!isOpen && open[el.id]) {
        open[el.id] = false;
        if (!Object.keys(open).some(function (k) { return open[k]; }) && a11yLastFocus && document.contains(a11yLastFocus)) {
          try { a11yLastFocus.focus({ preventScroll: true }); } catch (e) { }
          a11yLastFocus = null;
        }
      }
    });
  });
  layerIds.forEach(function (id) { var el = $(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ["class"] }); });

  // 3) Tab no se escapa de la ventana superior
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var layer = typeof topLayer === "function" ? topLayer() : null;
    if (!layer || layer.id === "player-modal") return;
    var items = a11yFocusables(layer);
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (!layer.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  if (typeof i18nAdd === "function") i18nAdd({ "Saltar al contenido": "Skip to content", "Principal": "Main", "Menú": "Menu" });
})();
;
/* ==== js/core/performance.js ==== */
/**
 * TatoCine · js/core/performance.js
 * Rendimiento: modo ligero para TV y equipos modestos, y precarga con espera.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Modo ligero: menos efectos e imágenes más livianas en TV y dispositivos modestos ----
    var LITE_PREF = "auto";
    try { LITE_PREF = localStorage.getItem("tatoLiteMode") || "auto"; } catch (e) { }
    var netInfo = navigator.connection || {};
    var slowNet = !!netInfo.saveData || /(^|-)(2g|3g)$/.test(netInfo.effectiveType || "");
    var lowDevice = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    var LITE_FX = LITE_PREF === "on" || (LITE_PREF === "auto" && (IS_TV || slowNet || lowDevice));
    var LITE_DATA = LITE_PREF === "on" || (LITE_PREF === "auto" && slowNet);
    if (LITE_FX) document.body.classList.add("lite");
    if (LITE_DATA) { IMG_CARD = "https://image.tmdb.org/t/p/w185"; IMG_BG = "https://image.tmdb.org/t/p/w780"; }
    var LITE_LABELS = {
      auto: "Automático: se activa en TV, conexiones lentas y equipos modestos",
      on: "Activado: menos efectos e imágenes más livianas",
      off: "Desactivado: máxima calidad visual"
    };
    function updateLiteRow() { var el = $("lite-summary"); if (el) el.textContent = LITE_LABELS[LITE_PREF] || LITE_LABELS.auto; }
    function cycleLiteMode() {
      var next = { auto: "on", on: "off", off: "auto" }[LITE_PREF] || "on";
      try { localStorage.setItem("tatoLiteMode", next); } catch (e) { }
      LITE_PREF = next;
      updateLiteRow();
      showToast("Modo ligero: " + { auto: "automático", on: "activado", off: "desactivado" }[next]);
      setTimeout(function () { location.reload(); }, 700);
    }
    decorate("showSettings", function (original) { return function () { original(); updateLiteRow(); }; });
    // Precarga al pasar el cursor: solo en equipos con puntero, con espera y una sola petición
    var prefetchTimer = null;
    decorate("prefetchDetails", function (original) { return function (id, type) {
      if (LITE_DATA || IS_TV || (window.matchMedia && window.matchMedia("(hover: none)").matches)) return;
      clearTimeout(prefetchTimer);
      prefetchTimer = setTimeout(function () { original(id, type); }, 220);
    }; });
;
/* ==== js/app.js ==== */
/**
 * TatoCine · js/app.js
 * Arranque: enlaces directos, manifiesto de respaldo y primera vista.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function checkDeepLink() {
      var params = new URLSearchParams(location.search);
      var id = params.get("id");
      var type = params.get("type");
      var tab = params.get("tab");
      var q = params.get("q");
      if (
        tab &&
        ["home", "movies", "series", "anime", "kids", "list"].indexOf(tab) >
        -1
      )
        switchView(tab, false);
      if (id && type && (type === "movie" || type === "tv"))
        setTimeout(function () {
          openDetails(parseInt(id, 10), type);
        }, 600);
      else if (q) {
        $searchInput.value = q;
        setTimeout(function () {
          performSearch(q);
        }, 450);
      }
    }

    const pwaIcon192 =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Ccircle cx="96" cy="96" r="96" fill="%23FFFFFF"/%3E%3Cpath d="M70 60l70 36-70 36z" fill="%23000000"/%3E%3C/svg%3E';
    const pwaIcon512 =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"%3E%3Ccircle cx="256" cy="256" r="256" fill="%23FFFFFF"/%3E%3Cpath d="M190 160l180 96-180 96z" fill="%23000000"/%3E%3C/svg%3E';
    const manifest = {
      name: "TatoCine - Streaming Gratis",
      short_name: "TatoCine",
      description: "TatoCine: películas, anime y series gratis en streaming.",
      lang: "es",
      dir: "ltr",
      start_url: location.href,
      scope: location.href.substring(0, location.href.lastIndexOf("/") + 1),
      display: "standalone",
      display_override: ["standalone", "minimal-ui", "browser"],
      orientation: "any",
      background_color: "#000000",
      theme_color: "#000000",
      categories: ["entertainment", "video"],
      icons: [
        {
          src: pwaIcon192,
          sizes: "192x192",
          type: "image/svg+xml",
          purpose: "any",
        },
        {
          src: pwaIcon512,
          sizes: "512x512",
          type: "image/svg+xml",
          purpose: "any",
        },
        {
          src: pwaIcon512,
          sizes: "512x512",
          type: "image/svg+xml",
          purpose: "maskable",
        },
      ],
    };
    if (!navigator.onLine) $offlineBanner.style.transform = "translateY(0)";
    $searchInput.value = "";
    updateProfileTrigger();
    if (profilePickerRequired) showProfiles(true);
    switchView("home");
    setTimeout(checkDeepLink, 300);

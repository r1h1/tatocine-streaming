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

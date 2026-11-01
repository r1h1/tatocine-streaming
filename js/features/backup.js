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

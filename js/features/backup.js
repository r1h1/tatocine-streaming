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

function backupBuildPayload() {
  var prefix = "tatoProfile_" + activeProfileId + "_", data = {}, p = getActiveProfile();
  try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(prefix) === 0) data[k.slice(prefix.length)] = localStorage.getItem(k); }); } catch (e) { }
  return { app: BACKUP_APP, v: BACKUP_VERSION, exportedAt: new Date().toISOString(), profile: { name: p.name, kind: p.kind, lang: p.lang }, data: data };
}
function backupDownload(obj, suffix) {
  var blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
  var a = document.createElement("a");
  var safe = String(getActiveProfile().name || "perfil").replace(/[^\w\-]+/g, "_").slice(0, 24) || "perfil";
  a.href = URL.createObjectURL(blob);
  a.download = "tatocine-" + safe + "-" + new Date().toISOString().slice(0, 10) + (suffix || "") + ".json";
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
/** Exportar: ofrece cifrar la copia con una contraseña (opcional). */
function exportProfileData() {
  if (isGuestProfile()) { showToast(L("El perfil Invitado no guarda datos", "The Guest profile does not save data")); return; }
  var canEncrypt = !!(window.crypto && crypto.subtle);
  qrOpen(L("Exportar copia de seguridad", "Export backup"));
  qrBody().innerHTML = '<p class="tc-qr-note">' + L("Se descarga un archivo con todo el perfil (sin el PIN).", "Downloads a file with the whole profile (without the PIN).") + "</p>" +
    (canEncrypt ? '<label class="tc-qr-label" for="tc-bk-pass">' + L("Contraseña para cifrarla (opcional)", "Password to encrypt it (optional)") + "</label>" +
      '<input type="password" id="tc-bk-pass" class="tc-qr-select" autocomplete="new-password" minlength="' + BKC_MIN_PASS + '" placeholder="' + L("Déjalo vacío para no cifrar", "Leave empty to skip encryption") + '" />' +
      '<p class="tc-qr-hint">' + L("Cifrado AES-256. Si la olvidas, no hay forma de recuperar la copia. Mínimo " + BKC_MIN_PASS + " caracteres.", "AES-256 encryption. If you forget it, the backup can't be recovered. At least " + BKC_MIN_PASS + " characters.") + "</p>" : "") +
    '<p class="tc-qr-status" id="tc-qr-status" role="status"></p>' +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-qr="go">' + L("Descargar", "Download") + '</button><button type="button" class="tc-profile-create-btn" data-qr="no">' + L("Cancelar", "Cancel") + "</button></div>";
  qrBody().querySelector('[data-qr="no"]').onclick = closeQr;
  qrBody().querySelector('[data-qr="go"]').onclick = async function () {
    var input = $("tc-bk-pass"), pass = input ? input.value : "", payload = backupBuildPayload();
    if (pass && pass.length < BKC_MIN_PASS) { qrStatus(L("La contraseña debe tener al menos " + BKC_MIN_PASS + " caracteres.", "The password must have at least " + BKC_MIN_PASS + " characters."), true); return; }
    try {
      if (pass) { backupDownload(await encryptBackup(JSON.stringify(payload), pass), "-cifrada"); showToast(L("Copia cifrada descargada", "Encrypted backup downloaded")); }
      else { backupDownload(payload); showToast(L("Copia de seguridad descargada", "Backup downloaded")); }
      closeQr();
    } catch (e) { qrStatus(L("No se pudo crear la copia.", "Could not create the backup."), true); }
  };
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
    if (isEncryptedBackup(payload)) { askBackupPassword(payload); return; }
    importBackupPayload(payload);
  };
  reader.readAsText(file);
}
/** Copia cifrada: pide la contraseña y, si descifra, sigue el mismo camino que una copia normal (con saneado). */
function askBackupPassword(encrypted) {
  qrOpen(L("Copia cifrada", "Encrypted backup"));
  qrBody().innerHTML = '<p class="tc-qr-note">' + L("Esta copia está protegida con contraseña.", "This backup is password protected.") + "</p>" +
    '<label class="tc-qr-label" for="tc-bk-pass">' + L("Contraseña", "Password") + '</label><input type="password" id="tc-bk-pass" class="tc-qr-select" autocomplete="current-password" />' +
    '<p class="tc-qr-status" id="tc-qr-status" role="status"></p>' +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-qr="go">' + L("Descifrar", "Decrypt") + '</button><button type="button" class="tc-profile-create-btn" data-qr="no">' + L("Cancelar", "Cancel") + "</button></div>";
  qrBody().querySelector('[data-qr="no"]').onclick = closeQr;
  var go = qrBody().querySelector('[data-qr="go"]'), input = $("tc-bk-pass");
  input.focus();
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") go.click(); });
  go.onclick = async function () {
    go.disabled = true;
    qrStatus(L("Descifrando…", "Decrypting…"));
    try {
      var plain = JSON.parse(await decryptBackup(encrypted, input.value));
      closeQr();
      importBackupPayload(plain);
    } catch (e) {
      go.disabled = false;
      qrStatus(e && e.message === "bad_password" ? L("Contraseña incorrecta o archivo alterado.", "Wrong password or the file was altered.") : L("El archivo cifrado no es válido.", "The encrypted file is not valid."), true);
    }
  };
}
function importBackupPayload(payload) {
  if (!payload || typeof payload !== "object" || payload.app !== BACKUP_APP || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
    showToast(L("Archivo no válido: no es una copia de TatoCine", "Invalid file: not a TatoCine backup"));
    return;
  }
  // Se reconstruye la copia solo con campos conocidos y válidos (ver backup-sanitize.js).
  var sanitized = sanitizeBackupData(payload.data, SERVERS.map(function (s) { return s.name; }));
  var kind = payload.profile && payload.profile.kind === "kid" ? "kid" : "adult";
  var from = payload.profile && typeof payload.profile.name === "string" ? bkText(payload.profile.name, 24) : "";
  if (!Object.keys(sanitized.clean).length) { showToast(L("La copia no contiene datos válidos", "The backup has no valid data")); return; }
  pickImportTarget({
    title: L("Importar copia de seguridad", "Import backup"),
    summary: from ? L("Copia del perfil «" + escapeHTML(from) + "».", "Backup of profile “" + escapeHTML(from) + "”.") : L("Copia de seguridad de TatoCine.", "TatoCine backup."),
    sourceKind: kind,
    onConfirm: async function (targetId, targetKind) {
      var clean = sanitized.clean, skipped = 0;
      if (targetKind === "kid") {
        qrStatus(L("Comprobando que todo sea apto para niños…", "Checking everything is suitable for kids…"));
        var unsafe = await kidUnsafeKeys(backupMediaKeys(clean));
        skipped = Object.keys(unsafe).length;
        backupDropKeys(clean, unsafe);
      }
      var prefix = "tatoProfile_" + targetId + "_", applied = 0;
      Object.keys(clean).forEach(function (key) {
        try {
          if (PROFILE_MERGERS[key]) {
            if (safeStorageSet(prefix + key, JSON.stringify(PROFILE_MERGERS[key](readLocalJSON(prefix + key, null), clean[key])))) applied++;
          } else if (PROFILE_REPLACE_KEYS.indexOf(key) > -1) {
            if (safeStorageSet(prefix + key, JSON.stringify(clean[key]))) applied++;
          }
        } catch (e) { }
      });
      var note = skipped ? L("Se omitieron " + skipped + " títulos que no son aptos para niños.", skipped + " titles that are not suitable for kids were skipped.") : "";
      if (applied) finishImport(targetId, L("Copia importada.", "Backup imported."), note);
      else qrBody().innerHTML = '<p class="tc-qr-warn">' + L("No había datos que importar.", "There was no data to import.") + "</p>";
    }
  });
}


(function bindBackup() {
  var input = $("backup-file");
  if (input) input.addEventListener("change", function () { importProfileData(input.files && input.files[0]); input.value = ""; });
  if (typeof i18nAdd === "function") i18nAdd({
    "Copia de seguridad": "Backup", "Copia de seguridad completa": "Full backup", "Exportar copia de seguridad": "Export backup", "Copia cifrada": "Encrypted backup", "Exportar": "Export", "Importar": "Import"
  });
})();

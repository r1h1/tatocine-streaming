/**
 * TatoCine · js/features/import-target.js
 * Elegir A QUÉ PERFIL se importan los datos (copia de seguridad en archivo o código QR).
 *   - Solo perfiles de adultos: el Invitado no guarda nada y los infantiles no admiten importar.
 *   - Si el perfil elegido no es el que estás usando y tiene PIN, se pide ese PIN (nadie escribe en un
 *     perfil protegido sin conocerlo).
 *   - Solo puede importar quien puede gestionar perfiles (no el Invitado ni un perfil infantil).
 * Usa el cuadro de diálogo común `#tc-qr-overlay` (ver qr-transfer.js: qrOpen, qrBody, closeQr).
 */
function importTargets() {
  return localProfiles.filter(function (p) { return p && !p.guest && p.kind !== "kid"; });
}
function importTargetById(id) {
  return importTargets().find(function (p) { return p.id === id; }) || null;
}
/**
 * opts: { title, summary (texto ya escapado), onConfirm(profileId, setStatus) }
 * onConfirm devuelve (o no) una promesa; el diálogo queda abierto mientras trabaja.
 */
function pickImportTarget(opts) {
  if (isGuestProfile()) { showToast(L("El perfil Invitado no guarda datos", "The Guest profile does not save data")); return; }
  if (!canManageProfiles()) { showToast(L("Importar no está disponible en un perfil infantil", "Import is not available on a kid profile")); return; }
  var targets = importTargets();
  if (!targets.length) { showToast(L("No hay un perfil de adulto donde importar", "There is no adult profile to import into")); return; }
  var def = importTargetById(activeProfileId) ? activeProfileId : targets[0].id;
  qrOpen(opts.title);
  qrBody().innerHTML = '<p class="tc-qr-note">' + opts.summary + "</p>" +
    '<label class="tc-qr-label" for="tc-import-target">' + L("Importar en el perfil", "Import into profile") + "</label>" +
    '<select id="tc-import-target" class="tc-qr-select">' + targets.map(function (p) {
      return '<option value="' + escapeHTML(p.id) + '"' + (p.id === def ? " selected" : "") + ">" + escapeHTML(p.name) + (p.id === activeProfileId ? L(" (actual)", " (current)") : "") + (profileHasPin(p) ? " 🔒" : "") + "</option>";
    }).join("") + "</select>" +
    '<p class="tc-qr-hint">' + L("Se combina con lo que ya tiene el perfil: no se borra nada.", "It is merged with what the profile already has: nothing is deleted.") + "</p>" +
    '<div class="tc-qr-bar" hidden><span></span></div><p class="tc-qr-status" id="tc-qr-status" role="status"></p>' +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-qr="go">' + L("Importar", "Import") + '</button><button type="button" class="tc-profile-create-btn" data-qr="no">' + L("Cancelar", "Cancel") + "</button></div>";
  var box = qrBody();
  box.querySelector('[data-qr="no"]').onclick = closeQr;
  box.querySelector('[data-qr="go"]').onclick = function () {
    var target = importTargetById(box.querySelector("#tc-import-target").value);
    if (!target) return;
    function run() {
      box.querySelectorAll("button, select").forEach(function (b) { b.disabled = true; });
      Promise.resolve(opts.onConfirm(target.id, qrStatus)).catch(function () { qrStatus(L("No se pudo importar.", "Could not import."), true); });
    }
    if (target.id !== activeProfileId && profileHasPin(target)) askProfilePin(target, run); else run();
  };
}
/** Tras escribir: si fue el perfil actual se recarga para verlo; si no, se avisa. */
function finishImport(targetId, message) {
  var p = importTargetById(targetId), same = targetId === activeProfileId;
  qrBody().innerHTML = '<p class="tc-qr-note">' + escapeHTML(message) + " " + (same ? L("Recargando…", "Reloading…") : L("Cámbiate al perfil «" + (p ? p.name : "") + "» para verlo.", "Switch to profile “" + (p ? p.name : "") + "” to see it.")) + "</p>" +
    (same ? "" : '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" onclick="closeQr()">' + L("Entendido", "Got it") + "</button></div>");
  if (same) setTimeout(function () { location.reload(); }, 1100);
}

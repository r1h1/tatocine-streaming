/**
 * TatoCine · js/features/import-target.js
 * Elegir A QUÉ PERFIL se importan los datos (copia de seguridad en archivo o código QR) y aplicar las reglas de rol.
 *
 * Reglas de seguridad entre roles (control de acceso):
 *   1. SOLO entre perfiles del mismo tipo: adulto → adulto y niño → niño. Nunca niño → adulto ni adulto → niño.
 *   2. El Invitado no guarda nada: ni importa ni recibe datos.
 *   3. Un perfil infantil solo puede importar datos de un perfil infantil (y solo hacia perfiles infantiles).
 *   4. Si el perfil elegido no es el actual y tiene PIN, se pide ese PIN.
 *   5. Al importar en un perfil infantil se COMPRUEBA título por título que sea apto (clasificación de TMDB); lo no
 *      apto se omite aunque el archivo diga que viene de un perfil infantil.
 * Usa el cuadro de diálogo común `#tc-qr-overlay` (ver qr-transfer.js: qrOpen, qrBody, closeQr).
 */
function profileKindOf(p) { return p && p.kind === "kid" ? "kid" : "adult"; }
function kindLabel(kind) { return kind === "kid" ? L("infantil", "kid") : L("de adulto", "adult"); }
function importTargets(sourceKind) {
  return localProfiles.filter(function (p) { return p && !p.guest && profileKindOf(p) === (sourceKind || "adult"); });
}
function importTargetById(id, sourceKind) {
  return importTargets(sourceKind).find(function (p) { return p.id === id; }) || null;
}
/** Texto de error si esta combinación no está permitida; cadena vacía si se puede continuar. */
function importBlockedReason(sourceKind) {
  if (isGuestProfile()) return L("El perfil Invitado no guarda datos", "The Guest profile does not save data");
  if (isKidProfile() && sourceKind !== "kid") return L("Este archivo es de un perfil de adulto: no se puede importar en un perfil infantil.", "This file is from an adult profile: it can't be imported into a kid profile.");
  if (!importTargets(sourceKind).length) return sourceKind === "kid" ? L("No hay un perfil infantil donde importar.", "There is no kid profile to import into.") : L("No hay un perfil de adulto donde importar.", "There is no adult profile to import into.");
  return "";
}
/**
 * opts: { title, summary (texto ya escapado), sourceKind: "adult"|"kid", onConfirm(profileId, targetKind) }
 * onConfirm devuelve (o no) una promesa; el diálogo queda abierto mientras trabaja.
 */
function pickImportTarget(opts) {
  var kind = opts.sourceKind === "kid" ? "kid" : "adult";
  var blocked = importBlockedReason(kind);
  if (blocked) {
    if ($("tc-qr-overlay").classList.contains("open")) qrBody().innerHTML = '<p class="tc-qr-warn">' + escapeHTML(blocked) + "</p>"; else showToast(blocked);
    return;
  }
  var targets = importTargets(kind), def = importTargetById(activeProfileId, kind) ? activeProfileId : targets[0].id;
  qrOpen(opts.title);
  qrBody().innerHTML = '<p class="tc-qr-note">' + opts.summary + "</p>" +
    '<p class="tc-qr-meta">' + L("Origen: perfil " + kindLabel(kind), "Source: " + kindLabel(kind) + " profile") + "</p>" +
    '<label class="tc-qr-label" for="tc-import-target">' + L("Importar en el perfil", "Import into profile") + "</label>" +
    '<select id="tc-import-target" class="tc-qr-select">' + targets.map(function (p) {
      return '<option value="' + escapeHTML(p.id) + '"' + (p.id === def ? " selected" : "") + ">" + escapeHTML(p.name) + (p.id === activeProfileId ? L(" (actual)", " (current)") : "") + (profileHasPin(p) ? " 🔒" : "") + "</option>";
    }).join("") + "</select>" +
    '<p class="tc-qr-hint">' + (kind === "kid" ? L("Solo perfiles infantiles. Se omite lo que no sea apto para niños. ", "Kid profiles only. Anything not suitable for kids is skipped. ") : L("Solo perfiles de adulto. ", "Adult profiles only. ")) + L("Se combina con lo que ya tiene el perfil: no se borra nada.", "It is merged with what the profile already has: nothing is deleted.") + "</p>" +
    '<div class="tc-qr-bar" hidden><span></span></div><p class="tc-qr-status" id="tc-qr-status" role="status"></p>' +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-qr="go">' + L("Importar", "Import") + '</button><button type="button" class="tc-profile-create-btn" data-qr="no">' + L("Cancelar", "Cancel") + "</button></div>";
  var box = qrBody();
  box.querySelector('[data-qr="no"]').onclick = closeQr;
  box.querySelector('[data-qr="go"]').onclick = function () {
    var target = importTargetById(box.querySelector("#tc-import-target").value, kind);       // se vuelve a comprobar el tipo
    if (!target || importBlockedReason(kind)) return;
    function run() {
      box.querySelectorAll("button, select").forEach(function (b) { b.disabled = true; });
      Promise.resolve(opts.onConfirm(target.id, profileKindOf(target))).catch(function () { qrStatus(L("No se pudo importar.", "Could not import."), true); });
    }
    if (target.id !== activeProfileId && profileHasPin(target)) askProfilePin(target, run); else run();
  };
}
/** Claves «tipo:id» NO aptas para niños (comprobadas una a una con TMDB; lo que no se pueda comprobar se omite). */
async function kidUnsafeKeys(keys, onProgress) {
  var list = keys.slice(0, 700), unsafe = {}, next = 0, done = 0;
  keys.slice(700).forEach(function (k) { unsafe[k] = 1; });
  async function worker() {
    while (next < list.length) {
      var k = list[next++], p = k.split(":");
      var ok = false;
      try { ok = await isKidSafe(Number(p[1]), p[0]); } catch (e) { }
      if (!ok) unsafe[k] = 1;
      done++;
      if (onProgress) onProgress(done, list.length);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  return unsafe;
}
/** Tras escribir: si fue el perfil actual se recarga para verlo; si no, se avisa. */
function finishImport(targetId, message, extra) {
  var p = localProfiles.find(function (x) { return x.id === targetId; }), same = targetId === activeProfileId;
  qrBody().innerHTML = '<p class="tc-qr-note">' + escapeHTML(message) + " " + (same ? L("Recargando…", "Reloading…") : L("Cámbiate al perfil «" + (p ? p.name : "") + "» para verlo.", "Switch to profile “" + (p ? p.name : "") + "” to see it.")) + "</p>" +
    (extra ? '<p class="tc-qr-warn">' + escapeHTML(extra) + "</p>" : "") +
    (same ? "" : '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-act="close-qr">' + L("Entendido", "Got it") + "</button></div>");
  if (same) reloadApp(extra ? 2600 : 1100);
}

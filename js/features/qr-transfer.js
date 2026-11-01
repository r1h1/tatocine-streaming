/**
 * TatoCine · js/features/qr-transfer.js
 * Pasar favoritos, listas y vistos a otro dispositivo con un código QR (interfaz).
 *   - «Mostrar QR»: dibuja el QR con un enlace al propio sitio (#tcimport=…); al escanearlo con la cámara del
 *     teléfono se abre TatoCine y ofrece importar.
 *   - «Escanear»: cámara dentro de la app o subir una captura del QR.
 *   - Todo lo leído pasa por qrValidate (qr-payload.js) antes de mostrarse; nada se abre ni se ejecuta.
 * Las librerías del QR (js/vendor/) se cargan solo al usarlas. El importado se FUSIONA (no borra nada) y se
 * bloquea en perfiles Invitado e infantiles.
 */
var qrStream = null, qrTimer = null, qrBusy = false, qrLoading = {};

function qrLoadScript(src) {
  if (qrLoading[src]) return qrLoading[src];
  qrLoading[src] = new Promise(function (resolve, reject) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = function () { delete qrLoading[src]; reject(new Error("load")); };
    document.head.appendChild(s);
  });
  return qrLoading[src];
}
function qrErrorText(code) {
  var m = {
    empty: L("El QR está vacío o no tiene datos para importar.", "The QR is empty or has no data to import."),
    too_long: L("El contenido del QR es demasiado largo.", "The QR content is too long."),
    too_big: L("El QR contiene demasiados datos.", "The QR contains too much data."),
    not_tatocine: L("Este QR no es de TatoCine. No se abrió ni se usó.", "This QR is not from TatoCine. It was not opened or used."),
    other_site: L("Este QR pertenece a otro sitio. Por seguridad no se importa.", "This QR belongs to another site. Not imported for safety."),
    unsafe_link: L("El enlace del QR no es seguro. No se importa.", "The QR link is not safe. Not imported."),
    unsafe: L("El QR contiene datos sospechosos (posible inyección o clave). Se descartó.", "The QR contains suspicious data (possible injection or key). Discarded."),
    malformed: L("El QR está dañado o no tiene el formato de TatoCine.", "The QR is damaged or not in TatoCine format.")
  };
  return m[code] || m.malformed;
}
function qrSummary(f, l, w) {
  function pl(n, one, many) { return n + " " + (n === 1 ? one : many); }
  return L(pl(f, "favorito", "favoritos") + " · " + pl(l, "lista", "listas") + " · " + pl(w, "visto", "vistos"),
    pl(f, "favorite", "favorites") + " · " + pl(l, "list", "lists") + " · " + pl(w, "watched title", "watched titles"));
}
function qrBody() { return $("tc-qr-body"); }
function qrCanTransfer() {
  if (isGuestProfile()) { showToast(L("El perfil Invitado no guarda datos", "The Guest profile does not save data")); return false; }
  return true;
}
/** Escanear/importar exige poder gestionar perfiles (no Invitado ni infantil). */
function qrCanImport() {
  if (!qrCanTransfer()) return false;
  if (!canManageProfiles()) { showToast(L("Importar no está disponible en un perfil infantil", "Import is not available on a kid profile")); return false; }
  return true;
}
function closeQr() { qrStopCamera(); qrBusy = false; closeOverlay("tc-qr-overlay"); }
function qrOpen(title) { $("tc-qr-title").textContent = title; openOverlay("tc-qr-overlay"); }

/* ---------- Mostrar ---------- */
function qrSeenList() {
  return Object.keys(watchedMap || {}).map(function (k) { return watchedMap[k]; }).filter(function (r) { return r && (r.type === "movie" || r.type === "tv") && (r.w || r.ur); })
    .map(function (r) { return [r.type === "tv" ? 1 : 0, Number(r.id), r.w ? 1 : 0, r.ur > 0 ? 1 : r.ur < 0 ? -1 : 0]; })
    .filter(function (a) { return a[1] > 0; });
}
async function openQrShow() {
  if (!qrCanTransfer()) return;
  qrOpen(L("Pasar a otro dispositivo", "Move to another device"));
  qrBody().innerHTML = '<p class="tc-qr-note">' + L("Generando QR…", "Generating QR…") + "</p>";
  try {
    var built = await qrBuildLink(location.origin + location.pathname, myList, favLists, qrSeenList());
    if (!built.counts || (!built.counts.favs && !built.counts.seen && !built.counts.lists)) {
      qrBody().innerHTML = '<p class="tc-qr-note">' + L("Aún no tienes favoritos, listas ni títulos vistos para pasar.", "You have no favorites, lists or watched titles to move yet.") + "</p>";
      return;
    }
    if (!built.fits) throw new Error("size");
    await qrLoadScript("js/vendor/qrcode.js");
    var qr = qrcode(0, "L");
    qr.addData(built.link, "Byte");
    qr.make();
    var n = qr.getModuleCount(), quiet = 4, side = Math.min(380, Math.max(220, window.innerWidth - 80));
    var cell = Math.max(2, Math.floor(side / (n + quiet * 2))), size = (n + quiet * 2) * cell;
    var canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.className = "tc-qr-canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", L("Código QR para importar tus datos en otro dispositivo", "QR code to import your data on another device"));
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#000";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
    var k = built.counts, cut = k.favs < k.totalFavs || k.seen < k.totalSeen;
    qrBody().innerHTML = "";
    qrBody().appendChild(canvas);
    var info = document.createElement("div");
    info.innerHTML = '<p class="tc-qr-note">' + L("Escanéalo con la cámara del otro dispositivo (o en TatoCine › Ajustes › Escanear).", "Scan it with the other device's camera (or in TatoCine › Settings › Scan).") + "</p>" +
      '<p class="tc-qr-meta">' + qrSummary(k.favs, k.lists, k.seen) + "</p>" +
      (cut ? '<p class="tc-qr-warn">' + L("No cupo todo en un solo QR; usa la copia de seguridad en archivo para el resto.", "Not everything fit in one QR; use the backup file for the rest.") + "</p>" : "") +
      '<p class="tc-qr-warn">' + L("Contiene tus datos: no lo publiques. No incluye PIN ni claves.", "It contains your data: do not post it. No PIN or keys included.") + "</p>" +
      '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-qr="png">' + L("Guardar imagen", "Save image") + '</button><button type="button" class="tc-profile-create-btn" data-qr="copy">' + L("Copiar enlace", "Copy link") + "</button></div>";
    qrBody().appendChild(info);
    info.querySelector('[data-qr="png"]').onclick = function () {
      var a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "tatocine-qr.png";
      document.body.appendChild(a); a.click(); a.remove();
    };
    info.querySelector('[data-qr="copy"]').onclick = function () {
      (navigator.clipboard ? navigator.clipboard.writeText(built.link) : Promise.reject()).then(function () { showToast(L("Enlace copiado", "Link copied")); }, function () { showToast(L("No se pudo copiar", "Could not copy")); });
    };
  } catch (e) {
    qrBody().innerHTML = '<p class="tc-qr-warn">' + (e && e.message === "size" ? L("Tus datos no caben en un QR. Usa la copia de seguridad en archivo.", "Your data does not fit in a QR. Use the backup file.") : L("No se pudo generar el QR.", "Could not generate the QR.")) + "</p>";
  }
}

/* ---------- Escanear / subir captura ---------- */
function openQrScan() {
  if (!qrCanImport()) return;
  qrOpen(L("Importar con QR", "Import with QR"));
  qrBody().innerHTML = '<p class="tc-qr-note">' + L("Escanea el QR de TatoCine de otro dispositivo, o sube una captura del QR.", "Scan the TatoCine QR from another device, or upload a screenshot of it.") + "</p>" +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" data-qr="cam">' + L("Usar cámara", "Use camera") + '</button><button type="button" class="tc-profile-create-btn" data-qr="img">' + L("Subir captura", "Upload screenshot") + "</button></div>" +
    '<p class="tc-qr-status" id="tc-qr-status" role="status"></p>';
  qrBody().querySelector('[data-qr="cam"]').onclick = qrStartCamera;
  qrBody().querySelector('[data-qr="img"]').onclick = function () { $("tc-qr-file").click(); };
}
function qrStatus(msg, bad) { var s = $("tc-qr-status"); if (s) { s.textContent = msg; s.className = "tc-qr-status" + (bad ? " bad" : ""); } }
function qrStopCamera() {
  clearTimeout(qrTimer); qrTimer = null;
  if (qrStream) { qrStream.getTracks().forEach(function (t) { t.stop(); }); qrStream = null; }
  var v = document.querySelector(".tc-qr-video"); if (v) { v.srcObject = null; v.remove(); }
}
async function qrStartCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { qrStatus(L("Este navegador no permite usar la cámara. Sube una captura del QR.", "This browser can't use the camera. Upload a screenshot of the QR."), true); return; }
  try {
    await qrLoadScript("js/vendor/jsQR.js");
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
  } catch (e) { qrStatus(L("No se pudo abrir la cámara (permiso denegado o no disponible). Sube una captura.", "Could not open the camera (permission denied or unavailable). Upload a screenshot."), true); return; }
  var video = document.createElement("video");
  video.className = "tc-qr-video"; video.setAttribute("playsinline", ""); video.muted = true; video.srcObject = qrStream;
  qrBody().insertBefore(video, qrBody().firstChild);
  await video.play().catch(function () { });
  qrStatus(L("Apunta al QR…", "Point at the QR…"));
  var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
  (function loop() {
    if (!qrStream) return;
    if (video.readyState >= 2 && video.videoWidth) {
      var sc = Math.min(1, 720 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * sc); canvas.height = Math.round(video.videoHeight * sc);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var res = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "dontInvert" });
      if (res && res.data) { qrStopCamera(); qrHandleText(res.data); return; }
    }
    qrTimer = setTimeout(loop, 140);
  })();
}
async function qrDecodeImageFile(file) {
  if (!file || !/^image\//.test(file.type) || file.size > 12 * 1024 * 1024) throw new Error("bad_file");
  await qrLoadScript("js/vendor/jsQR.js");
  var bmp = await createImageBitmap(file);
  var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
  var found = null, widths = [Math.min(bmp.width, 1600), 1000, 700, 450];
  for (var i = 0; i < widths.length && !found; i++) {
    var sc = Math.min(1, widths[i] / bmp.width);
    canvas.width = Math.max(1, Math.round(bmp.width * sc)); canvas.height = Math.max(1, Math.round(bmp.height * sc));
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    var r = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
    if (r && r.data) found = r.data;
  }
  if (bmp.close) bmp.close();
  return found;
}

/* ---------- Validar y confirmar ---------- */
async function qrHandleText(text) {
  if (qrBusy) return;
  qrBusy = true;
  var v = await qrValidate(text, location.origin);
  qrBusy = false;
  if (!v.ok) {
    if (!$("tc-qr-overlay").classList.contains("open")) { showToast(qrErrorText(v.error)); return; }
    qrBody().innerHTML = '<p class="tc-qr-warn">' + qrErrorText(v.error) + '</p><div class="tc-profile-create-actions"><button type="button" class="tc-profile-create-btn" onclick="openQrScan()">' + L("Intentar de nuevo", "Try again") + "</button></div>";
    return;
  }
  qrConfirm(v.data);
}
function qrConfirm(data) {
  pickImportTarget({
    title: L("Importar con QR", "Import with QR"),
    summary: L("QR verificado: ", "QR verified: ") + qrSummary(data.favs.length, data.lists.length, data.seen.length) + ".",
    onConfirm: function (targetId) { return qrApply(data, targetId); }
  });
}
async function qrApply(data, targetId) {
  var box = qrBody(), bar = box.querySelector(".tc-qr-bar"), fill = bar.firstElementChild;
  bar.hidden = false;
  var keys = {}, todo = [];
  data.favs.forEach(function (x) { keys[x.type + ":" + x.id] = 1; });
  data.seen.forEach(function (x) { keys[x.type + ":" + x.id] = 1; });
  Object.keys(keys).forEach(function (k) { var p = k.split(":"); todo.push({ type: p[0], id: Number(p[1]) }); });
  var info = {}, done = 0, next = 0;
  async function worker() {
    while (next < todo.length) {
      var t = todo[next++];
      try {
        var d = await fetchTMDB("/" + t.type + "/" + t.id);
        if (d && d.id === t.id) info[t.type + ":" + t.id] = { title: String(d.title || d.name || "").slice(0, 120), bg: d.backdrop_path || d.poster_path || "", rating: Number(d.vote_average) || 0, year: String(d.release_date || d.first_air_date || "").slice(0, 4) };
      } catch (e) { }
      done++;
      fill.style.width = Math.round(done / todo.length * 100) + "%";
      qrStatus(L("Importando " + done + " de " + todo.length + "…", "Importing " + done + " of " + todo.length + "…"));
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  var prefix = "tatoProfile_" + targetId + "_";
  var curLists = readLocalJSON(prefix + "tatoFavLists", []);
  if (!Array.isArray(curLists)) curLists = [];
  var idByName = {};
  curLists.forEach(function (l) { if (l && l.name) idByName[String(l.name).toLowerCase()] = l.id; });
  var newLists = [];
  data.lists.forEach(function (name) {
    var key = name.toLowerCase();
    if (!(key in idByName) && curLists.length + newLists.length < 12) { var id = "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); idByName[key] = id; newLists.push({ id: id, name: name }); }
  });
  var favs = [], seen = {};
  data.favs.forEach(function (x) {
    var i = info[x.type + ":" + x.id]; if (!i) return;
    var rec = { id: x.id, type: x.type, title: i.title || "Sin título", bg: i.bg, rating: i.rating, year: i.year };
    if (x.list && idByName[x.list.toLowerCase()]) rec.list = idByName[x.list.toLowerCase()];
    favs.push(rec);
  });
  data.seen.forEach(function (x) {
    var i = info[x.type + ":" + x.id]; if (!i) return;
    var rec = { id: x.id, type: x.type, title: i.title, bg: i.bg, ts: 1 };
    if (x.w) rec.w = true;
    if (x.ur) rec.ur = x.ur;
    seen[x.type + ":" + x.id] = rec;
  });
  var ok = true;
  if (newLists.length) ok = safeStorageSet(prefix + "tatoFavLists", JSON.stringify(PROFILE_MERGERS.tatoFavLists(curLists, newLists))) && ok;
  if (favs.length) ok = safeStorageSet(prefix + "tatoList", JSON.stringify(PROFILE_MERGERS.tatoList(readLocalJSON(prefix + "tatoList", []), favs))) && ok;
  if (Object.keys(seen).length) ok = safeStorageSet(prefix + "tatoWatched", JSON.stringify(PROFILE_MERGERS.tatoWatched(readLocalJSON(prefix + "tatoWatched", {}), seen))) && ok;
  var added = favs.length + Object.keys(seen).length + newLists.length;
  if (ok && added) finishImport(targetId, L("Listo. Importado: ", "Done. Imported: ") + qrSummary(favs.length, newLists.length, Object.keys(seen).length) + ".");
  else box.innerHTML = '<p class="tc-qr-warn">' + L("No se pudo importar (sin espacio o títulos no encontrados).", "Could not import (no space or titles not found).") + "</p>";
}

/* ---------- Enlace abierto desde la cámara del teléfono ---------- */
(function bindQrTransfer() {
  var file = $("tc-qr-file");
  if (file) file.addEventListener("change", async function () {
    var f = file.files && file.files[0]; file.value = "";
    if (!f) return;
    qrStatus(L("Leyendo la imagen…", "Reading the image…"));
    try {
      var text = await qrDecodeImageFile(f);
      if (!text) { qrStatus(L("No se encontró ningún QR en la imagen. Prueba con una captura más nítida y completa.", "No QR found in the image. Try a sharper, complete screenshot."), true); return; }
      qrHandleText(text);
    } catch (e) { qrStatus(L("No se pudo leer ese archivo. Usa una imagen (PNG o JPG).", "Could not read that file. Use an image (PNG or JPG)."), true); }
  });
  var m = /(?:^#|&)tcimport=(TC1\.[A-Za-z0-9_-]+)(?:&|$)/.exec(location.hash || "");
  if (m) {
    var payload = m[1];
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { }       // el código no queda en el historial
    var tries = 0;
    setTimeout(function waitReady() {
      var picker = $("tc-profile-overlay");
      if ((picker && picker.classList.contains("open")) && tries++ < 300) { setTimeout(waitReady, 400); return; }
      qrHandleText(location.origin + "/#tcimport=" + payload);
    }, 1500);
  }
  if (typeof i18nAdd === "function") i18nAdd({
    "Pasar a otro dispositivo (QR)": "Move to another device (QR)", "Mostrar QR": "Show QR", "Escanear": "Scan",
    "Lleva favoritos, listas y vistos escaneando un QR. No incluye PIN ni claves.": "Move favorites, lists and watched titles by scanning a QR. No PIN or keys included."
  });
})();

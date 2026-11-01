/**
 * TatoCine · js/features/parental.js
 * Control parental ampliado (se añade con decorate(), sin editar kids.js):
 *   1. HORA DE DORMIR por perfil infantil (opcional): entre «desde» y «hasta» el perfil queda bloqueado.
 *   2. REGISTRO DE USO por perfil y día (tiempo viendo + títulos) guardado solo en este dispositivo (`tatoUsageV1`, 28 días).
 *   3. RESUMEN SEMANAL para el adulto (Ajustes → Resumen semanal): horas por día, títulos y los más vistos de cada perfil.
 * Todo es local: nada sale del dispositivo. Los perfiles infantiles no ven el resumen.
 */
var USAGE_KEY = "tatoUsageV1", USAGE_DAYS = 28, USAGE_TICK = 10;
var usageLog = readLocalJSON(USAGE_KEY, {});
if (!usageLog || typeof usageLog !== "object" || Array.isArray(usageLog)) usageLog = {};

function usageDayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function usageEntry(pid, day) {
  var p = usageLog[pid] || (usageLog[pid] = {});
  return p[day] || (p[day] = { s: 0, t: {} });
}
function usagePrune() {
  var limit = usageDayKey(new Date(Date.now() - USAGE_DAYS * 86400000));
  Object.keys(usageLog).forEach(function (pid) {
    Object.keys(usageLog[pid] || {}).forEach(function (day) { if (day < limit) delete usageLog[pid][day]; });
    if (!Object.keys(usageLog[pid] || {}).length) delete usageLog[pid];
  });
}
function usageSave() { usagePrune(); safeStorageSet(USAGE_KEY, JSON.stringify(usageLog)); }
/** Cada 10 s con un reproductor abierto y la pestaña visible se suman 10 s de visionado al perfil activo. */
setInterval(function () {
  if (isGuestProfile() || document.hidden || !$modal.classList.contains("open") || !activePlayerFrame) return;
  usageEntry(activeProfileId, usageDayKey()).s += USAGE_TICK;
  if (Math.random() < 0.34) usageSave();
}, USAGE_TICK * 1000);
document.addEventListener("visibilitychange", function () { if (document.hidden) usageSave(); });
window.addEventListener("pagehide", usageSave);
decorate("recordMediaStart", function (original) {
  return function (media, genreIds) {
    if (media && media.id && !isGuestProfile()) {
      var e = usageEntry(activeProfileId, usageDayKey()), key = media.type + ":" + media.id;
      if (!e.t[key] && Object.keys(e.t).length < 40) { e.t[key] = String(media.title || "").replace(/[<>]/g, "").slice(0, 60); usageSave(); }
    }
    return original(media, genreIds);
  };
});

/* ---------- Hora de dormir ---------- */
function bedMinutes(hhmm) { var m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function inBedtime(profile, date) {
  var b = profile && profile.bedtime;
  if (!b || !b.on) return false;
  var f = bedMinutes(b.from), t = bedMinutes(b.to);
  if (f == null || t == null || f === t) return false;
  date = date || new Date();
  var n = date.getHours() * 60 + date.getMinutes();
  return f < t ? n >= f && n < t : n >= f || n < t;
}
var bedLockOpen = false;
function bedtimeCheck() {
  var p = getActiveProfile(), on = !!p && p.kind === "kid" && inBedtime(p);
  var el = $("tc-bed-lock");
  if (!el) return;
  if (on && !bedLockOpen) {
    bedLockOpen = true;
    el.classList.add("open");
    $("tc-bed-lock-sub").textContent = L("Es hora de dormir. Podrás volver a ver contenido a las " + p.bedtime.to + ".", "It's bedtime. You can watch again at " + p.bedtime.to + ".");
    try { if ($modal.classList.contains("open")) closePlayer(); } catch (e) { }
    try { if ($detailsModal.classList.contains("open")) closeDetails(true); } catch (e) { }
    document.body.style.overflow = "hidden";
    window.setTimeout(function () { var b = el.querySelector("button"); if (b) b.focus(); }, 80);
  } else if (!on && bedLockOpen) {
    bedLockOpen = false;
    el.classList.remove("open");
    document.body.style.overflow = "";
    showToast(L("¡Buenos días! Ya puedes volver a ver contenido", "Good morning! You can watch again"));
  }
}
setInterval(bedtimeCheck, 15000);
bedtimeCheck();

/* ---------- Campos de «Hora de dormir» en el formulario del perfil (solo para perfiles infantiles) ---------- */
decorate("setProfileFormKind", function (original) {
  return function (kind) { var r = original(kind); ["tc-bedtime-box", "tc-screen-box"].forEach(function (id) { var box = $(id); if (box) box.hidden = profileFormKind !== "kid"; }); return r; };
});
decorate("setProfileModalMode", function (original) {
  return function (mode, profile) {
    var r = original(mode, profile), b = (mode === "edit" && profile && profile.bedtime) || { on: false, from: "21:00", to: "07:00" };
    $("tc-bed-on").checked = !!b.on; $("tc-bed-from").value = b.from || "21:00"; $("tc-bed-to").value = b.to || "07:00";
    var ed = mode === "edit" && profile;
    $("tc-screen-hours").value = ed && Number(profile.screenHours) >= 0.5 ? profile.screenHours : 6.5;
    $("tc-break-hours").value = ed && Number(profile.breakHours) >= 0.25 ? profile.breakHours : 1;
    return r;
  };
});
decorate("saveProfileFromModal", function (original) {
  return function () {
    var editingId = editingLocalProfileId, before = localProfiles.length;
    var vals = { on: $("tc-bed-on").checked, from: $("tc-bed-from").value, to: $("tc-bed-to").value };
    function hrs(id, min, max, def) { var n = Number($(id).value.replace(",", ".")); return isFinite(n) && n >= min && n <= max ? Math.round(n * 4) / 4 : def; }
    var screenH = hrs("tc-screen-hours", 0.5, 12, 6.5), breakH = hrs("tc-break-hours", 0.25, 8, 1);
    return Promise.resolve(original.apply(this, arguments)).then(function (r) {
      var p = editingId ? localProfiles.find(function (x) { return x.id === editingId; }) : (localProfiles.length > before ? localProfiles[localProfiles.length - 1] : null);
      if (p) {
        if (p.kind === "kid" && vals.on && bedMinutes(vals.from) != null && bedMinutes(vals.to) != null) p.bedtime = { on: true, from: vals.from, to: vals.to };
        else delete p.bedtime;
        if (p.kind === "kid") { p.screenHours = screenH; p.breakHours = breakH; } else { delete p.screenHours; delete p.breakHours; }       // tiempo de pantalla y descanso del niño
        saveLocalProfiles();
      }
      return r;
    });
  };
});

/* ---------- Resumen semanal ---------- */
function weekDays() {
  var out = [];
  for (var i = 6; i >= 0; i--) { var d = new Date(Date.now() - i * 86400000); out.push({ key: usageDayKey(d), label: d.toLocaleDateString(UI_LANG === "en" ? "en" : "es", { weekday: "short" }).replace(".", "") }); }
  return out;
}
function fmtHours(secs) { var m = Math.round(secs / 60); return m >= 60 ? Math.floor(m / 60) + " h " + (m % 60 ? (m % 60) + " min" : "").trim() : m + " min"; }
function profileWeekSummary(pid) {
  var days = weekDays(), log = usageLog[pid] || {}, total = 0, titles = {}, bars = [];
  days.forEach(function (d) {
    var e = log[d.key] || { s: 0, t: {} };
    total += e.s; bars.push({ label: d.label, s: e.s });
    Object.keys(e.t || {}).forEach(function (k) { titles[k] = (e.t[k] || "").trim() || "—"; });
  });
  var names = Object.keys(titles).map(function (k) { return titles[k]; });
  return { total: total, bars: bars, titleCount: names.length, names: names.slice(0, 3) };
}
function openWeeklySummary() {
  if (!canManageProfiles()) { showToast(L("Solo un perfil de adulto puede ver el resumen", "Only an adult profile can see the summary")); return; }
  var profiles = localProfiles.filter(function (p) { return !p.guest; }).sort(function (a, b) { return (b.kind === "kid") - (a.kind === "kid"); });
  qrOpen(L("Resumen semanal", "Weekly summary"));
  var html = '<p class="tc-qr-note">' + L("Últimos 7 días en este dispositivo. Solo cuenta el tiempo con un reproductor abierto.", "Last 7 days on this device. Only counts time with a player open.") + "</p>";
  profiles.forEach(function (p) {
    var s = profileWeekSummary(p.id), max = Math.max.apply(null, s.bars.map(function (b) { return b.s; }).concat([1]));
    html += '<section class="wk-card"><h4>' + escapeHTML(p.name) + (p.kind === "kid" ? " · " + L("niño", "kid") : "") + "</h4>" +
      '<p class="wk-line">' + (s.total ? L(escapeHTML(p.name) + " vio " + fmtHours(s.total) + " · " + s.titleCount + (s.titleCount === 1 ? " título" : " títulos"), escapeHTML(p.name) + " watched " + fmtHours(s.total) + " · " + s.titleCount + (s.titleCount === 1 ? " title" : " titles")) : L("Sin actividad esta semana", "No activity this week")) + "</p>" +
      '<div class="wk-bars" role="img" aria-label="' + L("Horas por día", "Hours per day") + '">' + s.bars.map(function (b) {
        return '<div class="wk-bar"><span style="height:' + Math.max(b.s ? 6 : 2, Math.round(b.s / max * 100)) + '%"></span><i>' + escapeHTML(b.label) + "</i></div>";
      }).join("") + "</div>" +
      (s.names.length ? '<p class="wk-top">' + L("Más vistos: ", "Recent: ") + s.names.map(escapeHTML).join(" · ") + "</p>" : "") +
      (p.kind === "kid" && p.bedtime && p.bedtime.on ? '<p class="wk-top">' + L("Hora de dormir: ", "Bedtime: ") + escapeHTML(p.bedtime.from + " – " + p.bedtime.to) + "</p>" : "") + "</section>";
  });
  qrBody().innerHTML = html;
}
if (typeof i18nAdd === "function") i18nAdd({
  "Resumen semanal": "Weekly summary", "Hora de dormir": "Bedtime", "Hora de dormir (opcional)": "Bedtime (optional)", "Activar": "Enable",
  "Ver": "View", "Es hora de dormir": "It's bedtime", "Cambiar de perfil": "Switch profile",
  "Revisa cuánto y qué vieron en la última semana.": "See how much and what they watched in the last week."
});

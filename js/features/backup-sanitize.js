/**
 * TatoCine · js/features/backup-sanitize.js
 * Saneado ESTRICTO de una copia de seguridad (.json) antes de importarla. Es lógica pura (probada en Node).
 * No se «arregla» el archivo: se reconstruye desde cero SOLO con los campos conocidos y valores válidos
 *   (identificadores enteros, tipos movie/tv, rutas de imagen de TMDB, textos sin < > ni caracteres de control,
 *   nombres de lista con lista blanca, tamaños acotados). Cualquier otra clave o campo se descarta.
 * Así un archivo manipulado no puede inyectar HTML/scripts, claves ni objetos raros en el almacenamiento.
 */
var BK_BG = /^\/[A-Za-z0-9_.-]{4,80}$/, BK_MAX_ITEMS = 500;
var BK_cleanListName = (typeof module !== "undefined" && module.exports) ? require("./qr-payload.js").qrCleanListName : qrCleanListName;

function bkText(v, max) { return typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max || 120) : ""; }
function bkInt(v, min, max) { return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max; }
function bkNum(v, min, max, def) { return typeof v === "number" && isFinite(v) && v >= min && v <= max ? v : def; }
function bkBg(v) { return typeof v === "string" && BK_BG.test(v) ? v : ""; }
function bkYear(v) { return typeof v === "string" && /^\d{4}$/.test(v) ? v : ""; }
function bkType(v) { return v === "tv" ? "tv" : v === "movie" ? "movie" : null; }
function bkId(v) { var n = typeof v === "string" && /^\d{1,10}$/.test(v) ? Number(v) : v; return bkInt(n, 1, 2147483647) ? n : null; }
function bkArr(v) { return Array.isArray(v) ? v.slice(0, BK_MAX_ITEMS) : []; }
function bkObj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : null; }

function bkMedia(x) {
  var o = bkObj(x), id = o && bkId(o.id), type = o && bkType(o.type);
  return id && type ? { id: id, type: type, title: bkText(o.title, 120) || "Sin título", bg: bkBg(o.bg) } : null;
}
function bkLists(raw) {
  var out = [], seenNames = {};
  bkArr(raw).slice(0, 12).forEach(function (l) {
    var o = bkObj(l), name = o && BK_cleanListName(o.name);
    if (!name || typeof o.id !== "string" || !/^l[a-z0-9]{3,24}$/.test(o.id) || seenNames[name.toLowerCase()]) return;
    seenNames[name.toLowerCase()] = 1;
    out.push({ id: o.id, name: name });
  });
  return out;
}
var BK_SANITIZERS = {
  tatoList: function (raw, ctx) {
    return bkArr(raw).map(function (x) {
      var m = bkMedia(x); if (!m) return null;
      m.rating = bkNum(x.rating, 0, 10, 0); m.year = bkYear(x.year);
      if (typeof x.list === "string" && ctx.listIds[x.list]) m.list = x.list;
      return m;
    }).filter(Boolean);
  },
  tatoLater: function (raw) {
    return bkArr(raw).slice(0, 200).map(function (x) {
      var m = bkMedia(x); if (!m) return null;
      m.rating = bkNum(x.rating, 0, 10, 0); m.year = bkYear(x.year); m.addedAt = bkNum(x.addedAt, 0, 4102444800000, 0);
      return m;
    }).filter(Boolean);
  },
  tatoFavLists: function (raw, ctx) { return ctx.lists; },
  tatoContinue: function (raw) {
    return bkArr(raw).slice(0, 20).map(function (x) {
      var m = bkMedia(x); if (!m) return null;
      m.year = bkYear(x.year); m.rating = bkNum(x.rating, 0, 10, 0);
      m.season = bkInt(x.season, 1, 200) ? x.season : (typeof x.season === "string" && /^\d{1,3}$/.test(x.season) ? x.season : null);
      m.episode = bkInt(x.episode, 1, 5000) ? x.episode : (typeof x.episode === "string" && /^\d{1,4}$/.test(x.episode) ? x.episode : null);
      m.episodeName = bkText(x.episodeName, 120);
      m.timestamp = bkNum(x.timestamp, 1, 4102444800000, 1);
      return m;
    }).filter(Boolean);
  },
  tatoLocalAnalyticsV1: function (raw) {
    var items = bkObj(raw) ? bkArr(raw.items) : [];
    return { items: items.slice(0, 150).map(function (x) {
      var m = bkMedia(x); if (!m) return null;
      m.genreIds = bkArr(x.genreIds).filter(function (g) { return bkInt(g, 1, 100000); }).slice(0, 8);
      m.plays = bkNum(x.plays, 0, 1e6, 0); m.secs = bkNum(x.secs, 0, 1e8, 0); m.done = bkNum(x.done, 0, 1000, 0);
      m.firstPlayedAt = bkNum(x.firstPlayedAt, 0, 4102444800000, 0); m.lastPlayedAt = bkNum(x.lastPlayedAt, 0, 4102444800000, 0);
      m.lang = typeof x.lang === "string" && /^[a-z]{2,3}$/.test(x.lang) ? x.lang : "";
      m.runtime = bkNum(x.runtime, 0, 1000, 0);
      m.cat = ["movie", "tv", "anime", "doc"].includes(x.cat) ? x.cat : "";
      return m;
    }).filter(Boolean) };
  },
  tatoWatched: function (raw) {
    var src = bkObj(raw), out = {}, n = 0;
    if (!src) return out;
    Object.keys(src).slice(0, BK_MAX_ITEMS).forEach(function (k) {
      if (!/^(movie|tv):\d{1,10}$/.test(k)) return;
      var x = bkObj(src[k]), m = x && bkMedia(x);
      if (!m || m.type + ":" + m.id !== k || n >= BK_MAX_ITEMS) return;
      m.ts = bkNum(x.ts, 0, 4102444800000, 0);
      if (typeof x.w === "boolean") m.w = x.w;
      if (x.ur === 1 || x.ur === -1) m.ur = x.ur;
      m.g = bkArr(x.g).filter(function (g) { return bkInt(g, 1, 100000); }).slice(0, 6);
      out[k] = m; n++;
    });
    return out;
  },
  tatoSeriesSeen: function (raw) {
    var src = bkObj(raw), out = {};
    if (!src) return out;
    Object.keys(src).slice(0, BK_MAX_ITEMS).forEach(function (k) {
      var x = bkObj(src[k]);
      if (!/^\d{1,10}$/.test(k) || !x || !bkInt(x.k, 0, 1e7)) return;
      var e = { k: x.k, title: bkText(x.title, 120), bg: bkBg(x.bg), rating: bkNum(x.rating, 0, 10, 0), year: bkYear(x.year) };
      if (bkNum(x.alert, 1, 4102444800000, 0)) e.alert = x.alert;
      if (typeof x.label === "string" && /^T\d{1,3} · E\d{1,4}$/.test(x.label)) e.label = x.label;
      out[k] = e;
    });
    return out;
  },
  tatoRecentSearches: function (raw) { return bkArr(raw).map(function (q) { return bkText(q, 60); }).filter(Boolean).slice(0, 8); }
};
var BK_REPLACE = {
  tatoServer: function (raw, ctx) { return typeof raw === "string" && ctx.servers.includes(raw) ? raw : undefined; },
  tatoAutoNextEpisode: function (raw) { return typeof raw === "boolean" ? raw : undefined; }
};

/** data: { clave: "texto JSON" }. Devuelve { clean: { clave: valor saneado }, dropped } (dropped = claves ignoradas). */
function sanitizeBackupData(data, servers) {
  var clean = {}, dropped = 0, parsed = {};
  if (!bkObj(data)) return { clean: clean, dropped: 0 };
  Object.keys(data).forEach(function (key) {
    var raw = data[key];
    if (typeof raw !== "string" || raw.length > 3 * 1024 * 1024 || /__proto__|constructor|prototype/i.test(raw)) { dropped++; return; }
    try { parsed[key] = JSON.parse(raw); } catch (e) { dropped++; }
  });
  var ctx = { servers: servers || [], lists: bkLists(parsed.tatoFavLists), listIds: {} };
  ctx.lists.forEach(function (l) { ctx.listIds[l.id] = 1; });
  Object.keys(parsed).forEach(function (key) {
    var v;
    if (BK_SANITIZERS[key]) v = BK_SANITIZERS[key](parsed[key], ctx);
    else if (BK_REPLACE[key]) v = BK_REPLACE[key](parsed[key], ctx);
    else { dropped++; return; }
    if (v === undefined) { dropped++; return; }
    clean[key] = v;
  });
  return { clean: clean, dropped: dropped };
}
/** Claves «tipo:id» de todo el contenido de una copia saneada (para comprobar que es apto en perfiles infantiles). */
function backupMediaKeys(clean) {
  var keys = {};
  function add(x) { if (x && x.id && x.type) keys[x.type + ":" + x.id] = 1; }
  (clean.tatoList || []).forEach(add); (clean.tatoLater || []).forEach(add); (clean.tatoContinue || []).forEach(add);
  ((clean.tatoLocalAnalyticsV1 || {}).items || []).forEach(add);
  Object.keys(clean.tatoWatched || {}).forEach(function (k) { add(clean.tatoWatched[k]); });
  Object.keys(clean.tatoSeriesSeen || {}).forEach(function (id) { keys["tv:" + id] = 1; });
  return Object.keys(keys);
}
/** Quita de una copia saneada lo que figure en `unsafe` ({ "tipo:id": 1 }). */
function backupDropKeys(clean, unsafe) {
  function ok(x) { return !unsafe[x.type + ":" + x.id]; }
  if (clean.tatoList) clean.tatoList = clean.tatoList.filter(ok);
  if (clean.tatoLater) clean.tatoLater = clean.tatoLater.filter(ok);
  if (clean.tatoContinue) clean.tatoContinue = clean.tatoContinue.filter(ok);
  if (clean.tatoLocalAnalyticsV1) clean.tatoLocalAnalyticsV1.items = clean.tatoLocalAnalyticsV1.items.filter(ok);
  if (clean.tatoWatched) Object.keys(clean.tatoWatched).forEach(function (k) { if (unsafe[k]) delete clean.tatoWatched[k]; });
  if (clean.tatoSeriesSeen) Object.keys(clean.tatoSeriesSeen).forEach(function (id) { if (unsafe["tv:" + id]) delete clean.tatoSeriesSeen[id]; });
  return clean;
}
if (typeof module !== "undefined" && module.exports) module.exports = { sanitizeBackupData: sanitizeBackupData, backupMediaKeys: backupMediaKeys, backupDropKeys: backupDropKeys, bkText: bkText };

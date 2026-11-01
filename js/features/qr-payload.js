/**
 * TatoCine · js/features/qr-payload.js
 * Formato y VALIDACIÓN del código QR para pasar favoritos, listas y vistos a otro dispositivo.
 * Es lógica pura (sin DOM): se puede probar en Node (ver `module.exports` al final).
 *
 * El QR contiene un enlace al propio sitio: <sitio>#tcimport=TC1.<datos>. El fragmento (#…) nunca se envía a
 * ningún servidor. Los datos son JSON mínimo comprimido (deflate-raw + base64url): solo identificadores
 * numéricos de TMDB y nombres de lista; los títulos e imágenes se vuelven a pedir a TMDB al importar.
 *
 * Seguridad (se rechaza ante la duda, nunca se «arregla» lo sospechoso):
 *   - Solo enlaces del MISMO sitio (o el código TC1.… suelto); cualquier otro QR se ignora y jamás se abre.
 *   - Límites de tamaño de texto, de datos descomprimidos (anti «zip bomb») y de cantidad de elementos.
 *   - Esquema estricto: claves permitidas, enteros en rango; sin __proto__/constructor/prototype. Lleva el TIPO de
 *     perfil de origen (adulto/niño): solo se importa entre perfiles del mismo tipo (ver import-target.js).
 *   - El QR CADUCA a los 10 minutos (`e`): una captura vieja no sirve.
 *   - Los nombres de lista pasan una lista blanca de caracteres (sin < > " ` \ / ; = $ { } &) y se rechazan
 *     patrones de XSS, inyección SQL y CSP (<script, javascript:, on…=, union select, --, script-src…).
 *   - Se rechaza todo lo que parezca una clave (32 hex, api_key, tmdb, bearer, JWT) o un enlace (http, //).
 *   - El QR que genera la app NUNCA incluye la clave de TMDB ni el PIN.
 */
var QR_PREFIX = "TC1.", QR_HASH_KEY = "tcimport";
var QR_MAX_TEXT = 4000, QR_MAX_URL = 2600, QR_MAX_JSON = 60 * 1024;
var QR_TTL_MIN = 10, QR_SKEW_MIN = 3;       // el QR caduca a los 10 min (con 3 min de margen por relojes distintos)
var QR_MAX_FAVS = 300, QR_MAX_SEEN = 400, QR_MAX_CONT = 20, QR_MAX_HIST = 120, QR_MAX_LISTS = 12, QR_NAME_MAX = 24;

function qrB64urlEncode(bytes) {
  var s = "";
  for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function qrB64urlDecode(str) {
  var b = atob(str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4));
  var out = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
async function qrStreamToBytes(stream, cap) {
  var reader = stream.getReader(), chunks = [], total = 0;
  for (;;) {
    var r = await reader.read();
    if (r.done) break;
    total += r.value.length;
    if (total > cap) { try { reader.cancel(); } catch (e) { } throw new Error("too_big"); }
    chunks.push(r.value);
  }
  var out = new Uint8Array(total), pos = 0;
  chunks.forEach(function (c) { out.set(c, pos); pos += c.length; });
  return out;
}
async function qrDeflate(text) {
  var cs = new CompressionStream("deflate-raw"), w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(text)); w.close();
  return qrStreamToBytes(cs.readable, QR_MAX_JSON);
}
async function qrInflate(bytes, cap) {
  var ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter();
  w.write(bytes).catch(function () { }); w.close().catch(function () { });
  return qrStreamToBytes(ds.readable, cap);
}

/** Nombre de lista permitido (lista blanca estricta). Devuelve el nombre normalizado o null. */
function qrCleanListName(name) {
  if (typeof name !== "string") return null;
  var n = name.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!n || n.length > QR_NAME_MAX) return null;
  if (!/^[\p{L}\p{N} _\-.,'’()+!?¡¿:]+$/u.test(n)) return null;
  if (/--/.test(n)) return null;
  if (/(javascript|vbscript|data)\s*:|script|onerror|onload|union\s+select|select\s.+\sfrom|insert\s+into|drop\s+(table|database)|delete\s+from|update\s.+\sset|exec(ute)?\s|content-security-policy|script-src|default-src|unsafe-inline|unsafe-eval/i.test(n)) return null;
  return n;
}
function qrInt(v, min, max) { return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max; }

/**
 * Construye el enlace del QR con lo que quepa. parts = { kind:"adult"|"kid", favs, lists, seen, cont, hist }:
 *   favs [{type,id,list}] · lists [{id,name}] · seen [[t,id,visto,valoración]] · cont [[t,id,temporada,episodio]] · hist [[t,id,minutos,finalizados]].
 * Si no cabe, se recortan primero vistos, luego historial y favoritos; «continuar viendo» (máx. 20) se conserva.
 */
async function qrBuildLink(origin, parts) {
  var names = [], idx = {};
  (parts.lists || []).slice(0, QR_MAX_LISTS).forEach(function (l) {
    var n = qrCleanListName(l.name);
    if (n && !(l.id in idx)) { idx[l.id] = names.length; names.push(n); }
  });
  var f = (parts.favs || []).filter(function (m) { return m && (m.type === "movie" || m.type === "tv") && qrInt(Number(m.id), 1, 2147483647); })
    .map(function (m) { return [m.type === "tv" ? 1 : 0, Number(m.id), m.list && m.list in idx ? idx[m.list] : -1]; }).slice(0, QR_MAX_FAVS);
  var w = (parts.seen || []).slice(0, QR_MAX_SEEN), c = (parts.cont || []).slice(0, QR_MAX_CONT), h = (parts.hist || []).slice(0, QR_MAX_HIST);
  var expires = Math.floor(Date.now() / 60000) + QR_TTL_MIN;
  var n = { f: f.length, w: w.length, c: c.length, h: h.length }, link = "", counts;
  for (var guard = 0; guard < 60; guard++) {
    var obj = { v: 2, k: parts.kind === "kid" ? 1 : 0, e: expires, f: f.slice(0, n.f), l: names, w: w.slice(0, n.w), c: c.slice(0, n.c), h: h.slice(0, n.h) };
    var packed = QR_PREFIX + qrB64urlEncode(await qrDeflate(JSON.stringify(obj)));
    link = origin + "#" + QR_HASH_KEY + "=" + packed;
    counts = { favs: n.f, seen: n.w, cont: n.c, hist: n.h, lists: names.length, totalFavs: f.length, totalSeen: w.length, totalHist: h.length, totalCont: c.length };
    if (link.length <= QR_MAX_URL) break;
    if (n.w > 0) n.w = Math.floor(n.w * 0.8);
    else if (n.h > 0) n.h = Math.floor(n.h * 0.85);
    else if (n.f > 0) n.f = Math.floor(n.f * 0.85);
    else if (n.c > 0) n.c = 0;
    else break;
  }
  return { link: link, counts: counts, fits: link.length <= QR_MAX_URL, expiresAt: expires * 60000 };
}

/** Saca el código TC1.… de lo leído en un QR. Solo acepta el mismo sitio. */
function qrExtractPayload(text, origin) {
  var t = String(text == null ? "" : text).trim();
  if (!t) return { ok: false, error: "empty" };
  if (t.length > QR_MAX_TEXT) return { ok: false, error: "too_long" };
  if (t.indexOf(QR_PREFIX) === 0) return { ok: true, payload: t };
  var url;
  try { url = new URL(t); } catch (e) { return { ok: false, error: "not_tatocine" }; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: "not_tatocine" };
  if (url.username || url.password) return { ok: false, error: "unsafe_link" };
  if (url.origin !== origin) return { ok: false, error: "other_site" };
  var m = /^#tcimport=(TC1\.[A-Za-z0-9_-]+)$/.exec(url.hash);
  return m ? { ok: true, payload: m[1] } : { ok: false, error: "not_tatocine" };
}

/** Valida y normaliza el contenido de un QR. Devuelve { ok, data:{favs,lists,seen} } o { ok:false, error }. */
async function qrValidate(text, origin) {
  var ex = qrExtractPayload(text, origin);
  if (!ex.ok) return ex;
  if (!/^TC1\.[A-Za-z0-9_-]{6,}$/.test(ex.payload)) return { ok: false, error: "malformed" };
  var json;
  try { json = new TextDecoder("utf-8", { fatal: true }).decode(await qrInflate(qrB64urlDecode(ex.payload.slice(QR_PREFIX.length)), QR_MAX_JSON)); }
  catch (e) { return { ok: false, error: e && e.message === "too_big" ? "too_big" : "malformed" }; }
  if (/__proto__|constructor|prototype/i.test(json)) return { ok: false, error: "unsafe" };
  if (/[a-f0-9]{32}|api[_-]?key|tmdb|bearer|eyJ|https?:|\/\/|<|>|javascript:/i.test(json)) return { ok: false, error: "unsafe" };
  var o;
  try { o = JSON.parse(json); } catch (e) { return { ok: false, error: "malformed" }; }
  if (!o || typeof o !== "object" || Array.isArray(o) || o.v !== 2) return { ok: false, error: "malformed" };
  if (Object.keys(o).some(function (k) { return ["v", "k", "e", "f", "l", "w", "c", "h"].indexOf(k) < 0; })) return { ok: false, error: "malformed" };
  if (!qrInt(o.k, 0, 1) || !qrInt(o.e, 1, 100000000)) return { ok: false, error: "malformed" };
  var nowMin = Math.floor(Date.now() / 60000);
  if (o.e < nowMin - QR_SKEW_MIN) return { ok: false, error: "expired" };                       // QR caducado
  if (o.e > nowMin + QR_TTL_MIN + QR_SKEW_MIN) return { ok: false, error: "malformed" };        // fecha de caducidad imposible
  var c0 = o.c, h0 = o.h;
  if (!Array.isArray(o.f) || !Array.isArray(o.l) || !Array.isArray(o.w) || !Array.isArray(c0) || !Array.isArray(h0)) return { ok: false, error: "malformed" };
  if (o.f.length > QR_MAX_FAVS || o.w.length > QR_MAX_SEEN || o.l.length > QR_MAX_LISTS || c0.length > QR_MAX_CONT || h0.length > QR_MAX_HIST) return { ok: false, error: "too_big" };
  var lists = [];
  for (var i = 0; i < o.l.length; i++) {
    var n = qrCleanListName(o.l[i]);
    if (!n) return { ok: false, error: "unsafe" };
    lists.push(n);
  }
  var favs = [], seen = [], cont = [], hist = [];
  for (var j = 0; j < o.f.length; j++) {
    var e = o.f[j];
    if (!Array.isArray(e) || e.length !== 3 || !qrInt(e[0], 0, 1) || !qrInt(e[1], 1, 2147483647) || !qrInt(e[2], -1, lists.length - 1)) return { ok: false, error: "malformed" };
    favs.push({ type: e[0] ? "tv" : "movie", id: e[1], list: e[2] >= 0 ? lists[e[2]] : null });
  }
  for (var k = 0; k < o.w.length; k++) {
    var s = o.w[k];
    if (!Array.isArray(s) || s.length !== 4 || !qrInt(s[0], 0, 1) || !qrInt(s[1], 1, 2147483647) || !qrInt(s[2], 0, 1) || !qrInt(s[3], -1, 1)) return { ok: false, error: "malformed" };
    seen.push({ type: s[0] ? "tv" : "movie", id: s[1], w: !!s[2], ur: s[3] });
  }
  for (var m = 0; m < c0.length; m++) {
    var q = c0[m];
    if (!Array.isArray(q) || q.length !== 4 || !qrInt(q[0], 0, 1) || !qrInt(q[1], 1, 2147483647) || !qrInt(q[2], 0, 200) || !qrInt(q[3], 0, 5000)) return { ok: false, error: "malformed" };
    cont.push({ type: q[0] ? "tv" : "movie", id: q[1], season: q[2] || null, episode: q[3] || null });
  }
  for (var z = 0; z < h0.length; z++) {
    var t = h0[z];
    if (!Array.isArray(t) || t.length !== 4 || !qrInt(t[0], 0, 1) || !qrInt(t[1], 1, 2147483647) || !qrInt(t[2], 0, 600000) || !qrInt(t[3], 0, 999)) return { ok: false, error: "malformed" };
    hist.push({ type: t[0] ? "tv" : "movie", id: t[1], mins: t[2], done: t[3] });
  }
  if (!favs.length && !seen.length && !lists.length && !cont.length && !hist.length) return { ok: false, error: "empty" };
  return { ok: true, data: { kind: o.k ? "kid" : "adult", favs: favs, lists: lists, seen: seen, cont: cont, hist: hist } };
}

if (typeof module !== "undefined" && module.exports) module.exports = { qrBuildLink: qrBuildLink, qrValidate: qrValidate, qrExtractPayload: qrExtractPayload, qrCleanListName: qrCleanListName, qrDeflate: qrDeflate, qrB64urlEncode: qrB64urlEncode };

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
 *   - Esquema estricto: claves permitidas, enteros en rango; sin __proto__/constructor/prototype.
 *   - Los nombres de lista pasan una lista blanca de caracteres (sin < > " ` \ / ; = $ { } &) y se rechazan
 *     patrones de XSS, inyección SQL y CSP (<script, javascript:, on…=, union select, --, script-src…).
 *   - Se rechaza todo lo que parezca una clave (32 hex, api_key, tmdb, bearer, JWT) o un enlace (http, //).
 *   - El QR que genera la app NUNCA incluye la clave de TMDB ni el PIN.
 */
var QR_PREFIX = "TC1.", QR_HASH_KEY = "tcimport";
var QR_MAX_TEXT = 4000, QR_MAX_URL = 1700, QR_MAX_JSON = 60 * 1024;
var QR_MAX_FAVS = 300, QR_MAX_SEEN = 400, QR_MAX_LISTS = 12, QR_NAME_MAX = 24;

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

/** Construye el texto del QR (enlace) con lo que quepa; devuelve también cuántos elementos entraron. */
async function qrBuildLink(origin, favs, lists, seen) {
  var names = [], idx = {};
  (lists || []).slice(0, QR_MAX_LISTS).forEach(function (l) {
    var n = qrCleanListName(l.name);
    if (n && !(l.id in idx)) { idx[l.id] = names.length; names.push(n); }
  });
  var f = (favs || []).filter(function (m) { return m && (m.type === "movie" || m.type === "tv") && qrInt(Number(m.id), 1, 2147483647); })
    .map(function (m) { return [m.type === "tv" ? 1 : 0, Number(m.id), m.list && m.list in idx ? idx[m.list] : -1]; }).slice(0, QR_MAX_FAVS);
  var w = (seen || []).slice(0, QR_MAX_SEEN);
  var nf = f.length, nw = w.length, link = "", counts;
  for (var guard = 0; guard < 40; guard++) {
    var obj = { v: 1, f: f.slice(0, nf), l: names, w: w.slice(0, nw) };
    var packed = QR_PREFIX + qrB64urlEncode(await qrDeflate(JSON.stringify(obj)));
    link = origin + "#" + QR_HASH_KEY + "=" + packed;
    counts = { favs: nf, seen: nw, lists: names.length, totalFavs: f.length, totalSeen: w.length };
    if (link.length <= QR_MAX_URL) break;
    if (nw > 0) nw = Math.floor(nw * 0.8); else nf = Math.floor(nf * 0.85);
    if (nf === 0 && nw === 0) break;
  }
  return { link: link, counts: counts, fits: link.length <= QR_MAX_URL };
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
  if (!o || typeof o !== "object" || Array.isArray(o) || o.v !== 1) return { ok: false, error: "malformed" };
  var keys = Object.keys(o);
  if (keys.some(function (k) { return ["v", "f", "l", "w"].indexOf(k) < 0; })) return { ok: false, error: "malformed" };
  if (!Array.isArray(o.f) || !Array.isArray(o.l) || !Array.isArray(o.w)) return { ok: false, error: "malformed" };
  if (o.f.length > QR_MAX_FAVS || o.w.length > QR_MAX_SEEN || o.l.length > QR_MAX_LISTS) return { ok: false, error: "too_big" };
  var lists = [];
  for (var i = 0; i < o.l.length; i++) {
    var n = qrCleanListName(o.l[i]);
    if (!n) return { ok: false, error: "unsafe" };
    lists.push(n);
  }
  var favs = [], seen = [];
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
  if (!favs.length && !seen.length && !lists.length) return { ok: false, error: "empty" };
  return { ok: true, data: { favs: favs, lists: lists, seen: seen } };
}

if (typeof module !== "undefined" && module.exports) module.exports = { qrBuildLink: qrBuildLink, qrValidate: qrValidate, qrExtractPayload: qrExtractPayload, qrCleanListName: qrCleanListName, qrDeflate: qrDeflate, qrB64urlEncode: qrB64urlEncode };

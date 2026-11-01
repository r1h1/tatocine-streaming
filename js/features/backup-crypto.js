/**
 * TatoCine · js/features/backup-crypto.js
 * Copia de seguridad CIFRADA con contraseña (opcional): AES-256-GCM con clave derivada por PBKDF2-SHA-256
 * (250 000 vueltas, sal e IV aleatorios). GCM autentica: con la contraseña mal o el archivo alterado no descifra.
 * La contraseña nunca se guarda ni sale del dispositivo. Lógica pura (probada en Node con WebCrypto).
 */
var BKC_ITER = 250000, BKC_MIN_PASS = 6;
var BKC_crypto = typeof globalThis !== "undefined" && globalThis.crypto ? globalThis.crypto : window.crypto;
function bkcB64(bytes) { var s = ""; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
function bkcUnb64(str) { var b = atob(str), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }
async function bkcKey(password, salt, iter) {
  var base = await BKC_crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return BKC_crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: iter }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptBackup(plainText, password) {
  if (typeof password !== "string" || password.length < BKC_MIN_PASS) throw new Error("short_password");
  var salt = BKC_crypto.getRandomValues(new Uint8Array(16)), iv = BKC_crypto.getRandomValues(new Uint8Array(12));
  var key = await bkcKey(password, salt, BKC_ITER);
  var ct = new Uint8Array(await BKC_crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(plainText)));
  return { app: "TatoCine", v: 1, encrypted: true, enc: { alg: "AES-GCM-256", kdf: "PBKDF2-SHA256", i: BKC_ITER, s: bkcB64(salt), iv: bkcB64(iv), ct: bkcB64(ct) } };
}
function isEncryptedBackup(obj) {
  return !!obj && typeof obj === "object" && obj.app === "TatoCine" && obj.encrypted === true && !!obj.enc && typeof obj.enc === "object";
}
/** Devuelve el texto original o lanza Error("bad_password") (contraseña mal o archivo alterado) / Error("malformed"). */
async function decryptBackup(obj, password) {
  var e = obj && obj.enc;
  if (!isEncryptedBackup(obj) || e.alg !== "AES-GCM-256" || e.kdf !== "PBKDF2-SHA256" || typeof e.s !== "string" || typeof e.iv !== "string" || typeof e.ct !== "string" ||
    !Number.isInteger(e.i) || e.i < 100000 || e.i > 2000000 || e.ct.length > 8 * 1024 * 1024) throw new Error("malformed");
  var salt, iv, ct;
  try { salt = bkcUnb64(e.s); iv = bkcUnb64(e.iv); ct = bkcUnb64(e.ct); } catch (x) { throw new Error("malformed"); }
  if (salt.length !== 16 || iv.length !== 12) throw new Error("malformed");
  try {
    var key = await bkcKey(String(password || ""), salt, e.i);
    return new TextDecoder("utf-8", { fatal: true }).decode(await BKC_crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct));
  } catch (x) { throw new Error("bad_password"); }
}
if (typeof module !== "undefined" && module.exports) module.exports = { encryptBackup: encryptBackup, decryptBackup: decryptBackup, isEncryptedBackup: isEncryptedBackup, BKC_MIN_PASS: BKC_MIN_PASS };

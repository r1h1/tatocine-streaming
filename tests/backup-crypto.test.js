/** Pruebas de la copia cifrada: `node tests/backup-crypto.test.js` (sin dependencias). */
const assert = require("node:assert");
const C = require("../js/features/backup-crypto.js");
let n = 0;
const ok = async (name, fn) => { await fn(); n++; console.log("✓", name); };
const rejects = async (p, msg) => { try { await p; } catch (e) { assert.strictEqual(e.message, msg); return; } assert.fail("debía fallar con " + msg); };
(async () => {
  const text = JSON.stringify({ app: "TatoCine", data: { tatoList: "[]" }, acentos: "ñandú ✓" });
  await ok("cifra y descifra", async () => {
    const f = await C.encryptBackup(text, "mi clave segura");
    assert(C.isEncryptedBackup(f) && !JSON.stringify(f).includes("tatoList"));
    assert.strictEqual(await C.decryptBackup(f, "mi clave segura"), text);
  });
  await ok("dos cifrados del mismo texto son distintos (sal e IV aleatorios)", async () => {
    const a = await C.encryptBackup(text, "abcdef"), b = await C.encryptBackup(text, "abcdef");
    assert.notStrictEqual(a.enc.ct, b.enc.ct); assert.notStrictEqual(a.enc.s, b.enc.s);
  });
  await ok("contraseña incorrecta o corta", async () => {
    const f = await C.encryptBackup(text, "correcta1");
    await rejects(C.decryptBackup(f, "incorrecta"), "bad_password");
    await rejects(C.decryptBackup(f, ""), "bad_password");
    await rejects(C.encryptBackup(text, "123"), "short_password");
  });
  await ok("detecta archivos alterados o malformados", async () => {
    const f = await C.encryptBackup(text, "correcta1");
    const t = JSON.parse(JSON.stringify(f)); const raw = Buffer.from(t.enc.ct, "base64"); raw[5] ^= 1; t.enc.ct = raw.toString("base64");
    await rejects(C.decryptBackup(t, "correcta1"), "bad_password");
    for (const bad of [{ ...f, enc: { ...f.enc, i: 5 } }, { ...f, enc: { ...f.enc, alg: "AES-CBC" } }, { ...f, enc: { ...f.enc, s: "AAAA" } }, { ...f, enc: { ...f.enc, iv: "!!!" } }, { app: "TatoCine", encrypted: true }, null])
      await rejects(C.decryptBackup(bad, "correcta1"), "malformed");
  });
  console.log(`\n${n} grupos de pruebas correctos`);
})().catch((e) => { console.error("✗", e); process.exit(1); });

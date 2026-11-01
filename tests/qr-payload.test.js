/** Pruebas del QR de transferencia: `node tests/qr-payload.test.js` (sin dependencias). */
const assert = require("node:assert");
const P = require("../js/features/qr-payload.js");
const ORIGIN = "https://tcine.example";
const FAKE_KEY = "0123456789abcdef0123456789abcdef";      // 32 caracteres hexadecimales: lo que parece una clave
const enc = async (obj, raw) => "TC1." + P.qrB64urlEncode(await P.qrDeflate(raw || JSON.stringify(obj)));
const link = (payload, origin) => (origin || ORIGIN) + "/#tcimport=" + payload;
let n = 0;
const ok = async (name, fn) => { await fn(); n++; console.log("✓", name); };

(async () => {
  await ok("ida y vuelta válida", async () => {
    const favs = [{ type: "movie", id: 603, list: "l1" }, { type: "tv", id: 1399 }];
    const r = await P.qrBuildLink(ORIGIN + "/", favs, [{ id: "l1", name: "Terror" }], [[1, 1399, 1, 0]]);
    assert(r.fits && r.link.length < 400);
    const v = await P.qrValidate(r.link, ORIGIN);
    assert.strictEqual(v.ok, true);
    assert.deepStrictEqual(v.data.favs, [{ type: "movie", id: 603, list: "Terror" }, { type: "tv", id: 1399, list: null }]);
    assert.deepStrictEqual(v.data.lists, ["Terror"]);
    assert.strictEqual(v.data.seen.length, 1);
  });

  await ok("acepta el código TC1 suelto", async () => {
    assert.strictEqual((await P.qrValidate(await enc({ v: 1, f: [[0, 603, -1]], l: [], w: [] }), ORIGIN)).ok, true);
  });

  await ok("rechaza QR de otro sitio y esquemas peligrosos", async () => {
    const p = await enc({ v: 1, f: [[0, 603, -1]], l: [], w: [] });
    const bad = [link(p, "https://evil.example"), "javascript:alert(1)", "data:text/html,<script>alert(1)</script>",
      "WIFI:S:x;T:WPA;P:y;;", "tel:123", "https://user:pw@tcine.example/#tcimport=" + p, "hola", ""];
    for (const t of bad) assert.strictEqual((await P.qrValidate(t, ORIGIN)).ok, false, t);
  });

  await ok("rechaza XSS, SQL y CSP en nombres de lista", async () => {
    const bad = ["<script>alert(1)</script>", 'x"onerror=alert(1)', "javascript:alert(1)", "a'; DROP TABLE users;--",
      "1 UNION SELECT pass FROM u", "Mi--lista", "script-src *", "${7*7}", "{{constructor}}", "a`b", "a\\b", "a/b", "a&b", "a=b"];
    for (const name of bad) assert.strictEqual((await P.qrValidate(await enc({ v: 1, f: [[0, 1, 0]], l: [name], w: [] }), ORIGIN)).ok, false, name);
  });

  await ok("acepta nombres normales con tildes y signos", async () => {
    for (const name of ["Acción", "Para ver con Ana", "Terror (2024)", "¡Comedias!", "Anime 2"])
      assert.strictEqual((await P.qrValidate(await enc({ v: 1, f: [[0, 1, 0]], l: [name], w: [] }), ORIGIN)).ok, true, name);
  });

  await ok("rechaza claves, enlaces y prototipos dentro de los datos", async () => {
    const raws = [
      `{"v":1,"f":[],"l":["${FAKE_KEY}"],"w":[]}`,
      '{"v":1,"f":[],"l":["api_key"],"w":[]}',
      '{"v":1,"f":[],"l":["x"],"w":[],"u":"https://evil.example"}',
      '{"v":1,"f":[],"l":["x"],"w":[],"__proto__":{"a":1}}',
      '{"v":1,"f":[[0,1,-1]],"l":[],"w":[],"extra":1}',
    ];
    for (const raw of raws) assert.strictEqual((await P.qrValidate(await enc(null, raw), ORIGIN)).ok, false, raw);
  });

  await ok("rechaza tipos y rangos fuera de esquema", async () => {
    const objs = [
      { v: 2, f: [], l: [], w: [] }, { v: 1, f: [[2, 1, -1]], l: [], w: [] }, { v: 1, f: [[0, "1", -1]], l: [], w: [] },
      { v: 1, f: [[0, 0, -1]], l: [], w: [] }, { v: 1, f: [[0, 1.5, -1]], l: [], w: [] }, { v: 1, f: [[0, 1, 3]], l: [], w: [] },
      { v: 1, f: [[0, 1, -1, 9]], l: [], w: [] }, { v: 1, f: [], l: [], w: [[0, 1, 2, 0]] }, { v: 1, f: [], l: [1], w: [] },
      { v: 1, f: "x", l: [], w: [] }, [], null, "x", { v: 1, f: [], l: [], w: [] },
    ];
    for (const o of objs) assert.strictEqual((await P.qrValidate(await enc(o), ORIGIN)).ok, false, JSON.stringify(o));
  });

  await ok("rechaza basura, texto enorme y bomba de descompresión", async () => {
    for (const t of ["TC1.", "TC1.!!!!", "TC1." + "A".repeat(100), "TC1." + "A".repeat(5000)])
      assert.strictEqual((await P.qrValidate(t, ORIGIN)).ok, false);
    const cs = new CompressionStream("deflate-raw"), w = cs.writable.getWriter();
    w.write(new TextEncoder().encode("a".repeat(2_000_000))); w.close();
    const chunks = []; for await (const c of cs.readable) chunks.push(c);
    const big = Buffer.concat(chunks);
    assert(big.length < 2800, "la bomba comprimida cabe en un QR: " + big.length);
    const v = await P.qrValidate("TC1." + P.qrB64urlEncode(big), ORIGIN);
    assert.strictEqual(v.ok, false);
    assert.strictEqual(v.error, "too_big");
  });

  await ok("el enlace generado jamás contiene claves", async () => {
    const r = await P.qrBuildLink(ORIGIN + "/", [{ type: "movie", id: 1 }], [], []);
    assert(!/api[_-]?key|[a-f0-9]{32}/i.test(r.link));
  });

  await ok("recorta cuando no cabe en un QR", async () => {
    const favs = Array.from({ length: 300 }, (_, i) => ({ type: "movie", id: 100000 + i * 7919 }));
    const r = await P.qrBuildLink(ORIGIN + "/", favs, [], []);
    assert(r.fits && r.link.length <= 1700 && r.counts.favs > 0);
  });

  console.log(`\n${n} grupos de pruebas correctos`);
})().catch(e => { console.error("✗", e); process.exit(1); });

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
    const r = await P.qrBuildLink(ORIGIN + "/", { kind: "kid", favs, lists: [{ id: "l1", name: "Terror" }], seen: [[1, 1399, 1, 0]], cont: [[1, 1399, 2, 5]], hist: [[0, 603, 95, 1]] });
    assert(r.fits && r.link.length < 600);
    const v = await P.qrValidate(r.link, ORIGIN);
    assert.strictEqual(v.ok, true);
    assert.deepStrictEqual(v.data.favs, [{ type: "movie", id: 603, list: "Terror" }, { type: "tv", id: 1399, list: null }]);
    assert.deepStrictEqual(v.data.lists, ["Terror"]);
    assert.strictEqual(v.data.seen.length, 1);
    assert.strictEqual(v.data.kind, "kid");
    assert.deepStrictEqual(v.data.cont, [{ type: "tv", id: 1399, season: 2, episode: 5 }]);
    assert.deepStrictEqual(v.data.hist, [{ type: "movie", id: 603, mins: 95, done: 1 }]);
  });

  await ok("el tipo de perfil viaja en el QR (adulto por defecto) y las versiones antiguas siguen valiendo", async () => {
    const a = await P.qrBuildLink(ORIGIN + "/", { kind: "adult", favs: [{ type: "movie", id: 5 }], lists: [], seen: [], cont: [], hist: [] });
    assert.strictEqual((await P.qrValidate(a.link, ORIGIN)).data.kind, "adult");
    assert.strictEqual((await P.qrValidate(await enc({ v: 1, f: [[0, 603, -1]], l: [], w: [] }), ORIGIN)).data.kind, "adult");
    for (const o of [{ v: 2, k: 2, f: [[0, 1, -1]], l: [], w: [], c: [], h: [] }, { v: 2, f: [[0, 1, -1]], l: [], w: [], c: [], h: [] }, { v: 2, k: 1, f: [], l: [], w: [], c: [[0, 1, 999, 0]], h: [] }, { v: 2, k: 1, f: [], l: [], w: [], c: [], h: [[0, 1, -5, 0]] }])
      assert.strictEqual((await P.qrValidate(await enc(o), ORIGIN)).ok, false, JSON.stringify(o));
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
    const r = await P.qrBuildLink(ORIGIN + "/", { kind: "adult", favs: [{ type: "movie", id: 1 }], lists: [], seen: [], cont: [], hist: [] });
    assert(!/api[_-]?key|[a-f0-9]{32}/i.test(r.link));
  });

  await ok("recorta cuando no cabe en un QR", async () => {
    const favs = Array.from({ length: 300 }, (_, i) => ({ type: "movie", id: 100000 + i * 7919 }));
    const seen = Array.from({ length: 400 }, (_, i) => [i % 2, 200000 + i * 6007, 1, i % 3 - 1]);
    const hist = Array.from({ length: 120 }, (_, i) => [i % 2, 300000 + i * 4999, 30 + i, i % 4]);
    const cont = Array.from({ length: 20 }, (_, i) => [1, 400000 + i * 3001, 1 + i % 5, 1 + i]);
    const r = await P.qrBuildLink(ORIGIN + "/", { kind: "adult", favs, lists: [], seen, cont, hist });
    assert(r.fits && r.link.length <= 2600 && r.counts.favs > 0 && r.counts.cont === 20, JSON.stringify(r.counts));
    const small = await P.qrBuildLink(ORIGIN + "/", { kind: "adult", favs: favs.slice(0, 60), lists: [], seen: seen.slice(0, 40), cont, hist: hist.slice(0, 60) });
    assert(small.counts.favs === 60 && small.counts.hist === 60 && small.counts.cont === 20, "un perfil normal cabe entero con historial y continuar viendo: " + JSON.stringify(small.counts));
  });

  console.log(`\n${n} grupos de pruebas correctos`);
})().catch(e => { console.error("✗", e); process.exit(1); });

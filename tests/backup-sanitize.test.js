/** Pruebas del saneado de copias de seguridad: `node tests/backup-sanitize.test.js` (sin dependencias). */
const assert = require("node:assert");
const B = require("../js/features/backup-sanitize.js");
const SERVERS = ["ESP1", "ESP2", "ESP3", "ENG1"];
const clean = (data) => B.sanitizeBackupData(data, SERVERS);
const j = JSON.stringify;
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("✓", name); };

ok("una copia normal se conserva", () => {
  const r = clean({
    tatoList: j([{ id: 603, type: "movie", title: "Matrix", bg: "/abc123.jpg", rating: 8.2, year: "1999", list: "lab12" }, { id: 1399, type: "tv", title: "Juego de Tronos", bg: "/xyz987.jpg" }]),
    tatoFavLists: j([{ id: "lab12", name: "Terror" }]),
    tatoContinue: j([{ id: 1399, type: "tv", title: "GoT", bg: "/xyz987.jpg", season: "2", episode: 5, timestamp: 1700000000000 }]),
    tatoServer: j("ESP2"), tatoAutoNextEpisode: "true",
  });
  assert.strictEqual(r.clean.tatoList.length, 2);
  assert.strictEqual(r.clean.tatoList[0].list, "lab12");
  assert.strictEqual(r.clean.tatoContinue[0].season, "2");
  assert.strictEqual(r.clean.tatoServer, "ESP2");
  assert.strictEqual(r.clean.tatoAutoNextEpisode, true);
});

ok("quita HTML, scripts y caracteres de control de los textos", () => {
  const r = clean({ tatoList: j([{ id: 1, type: "movie", title: '<img src=x onerror=alert(1)>Peli\u0000\n"', bg: '/a.jpg"onload="alert(1)' }]) });
  const it = r.clean.tatoList[0];
  assert(!/[<>\u0000]/.test(it.title), it.title);
  assert.strictEqual(it.bg, "");
});

ok("descarta ids, tipos y listas no válidos", () => {
  const r = clean({
    tatoList: j([{ id: "abc", type: "movie" }, { id: -4, type: "movie" }, { id: 1.5, type: "tv" }, { id: 5, type: "person" }, { id: 7, type: "tv", list: "no-existe" }, null, 5, "x"]),
    tatoFavLists: j([{ id: "l1", name: "<script>" }, { id: "BAD ID", name: "Bien" }, { id: "labcd", name: "OK" }, { id: "labce", name: "ok" }]),
  });
  assert.strictEqual(r.clean.tatoList.length, 1);
  assert.strictEqual(r.clean.tatoList[0].list, undefined);
  assert.deepStrictEqual(r.clean.tatoFavLists.map((l) => l.name), ["OK"]);
});

ok("ignora claves desconocidas, prototipos y la clave de TMDB", () => {
  const r = clean({
    tatoPin: j({ h: "x" }), TMDB_API_KEY: j("0123456789abcdef0123456789abcdef"), pin: "1", evil: j({ a: 1 }),
    tatoRecentSearches: '{"__proto__":{"x":1}}', tatoWatched: j({ "movie:1": { id: 1, type: "movie", constructor: 1 } }),
  });
  assert.deepStrictEqual(Object.keys(r.clean), []);
  assert(r.dropped >= 5);
});

ok("servidor y preferencias solo con valores permitidos", () => {
  assert.strictEqual(clean({ tatoServer: j("evil.example") }).clean.tatoServer, undefined);
  assert.strictEqual(clean({ tatoServer: j({ a: 1 }) }).clean.tatoServer, undefined);
  assert.strictEqual(clean({ tatoAutoNextEpisode: j("yes") }).clean.tatoAutoNextEpisode, undefined);
});

ok("analítica, vistos y series se reconstruyen con rangos válidos", () => {
  const r = clean({
    tatoLocalAnalyticsV1: j({ items: [{ id: 5, type: "movie", title: "A", genreIds: [28, "x", 12, -1, 99999999], secs: 120, done: 2, lang: "ja", cat: "anime", plays: 1, evil: "<b>" }, { id: 6, type: "tv", secs: -50, cat: "<b>", runtime: 99999 }] }),
    tatoWatched: j({ "movie:5": { id: 5, type: "movie", title: "A", w: true, ur: 9, ts: 5 }, "tv:7": { id: 8, type: "tv" }, "oops": { id: 1, type: "movie" } }),
    tatoSeriesSeen: j({ 1399: { k: 2005, title: "GoT", label: "T2 · E5", alert: 1700000000000 }, abc: { k: 1 }, 55: { k: "x" } }),
    tatoRecentSearches: j(["matrix", "<script>alert(1)</script>", 5, "a".repeat(200)]),
  });
  const a = r.clean.tatoLocalAnalyticsV1.items;
  assert.deepStrictEqual(a[0].genreIds, [28, 12]);
  assert.strictEqual(a[0].evil, undefined);
  assert.strictEqual(a[1].secs, 0); assert.strictEqual(a[1].cat, ""); assert.strictEqual(a[1].runtime, 0);
  assert.deepStrictEqual(Object.keys(r.clean.tatoWatched), ["movie:5"]);
  assert.strictEqual(r.clean.tatoWatched["movie:5"].ur, undefined);
  assert.deepStrictEqual(Object.keys(r.clean.tatoSeriesSeen), ["1399"]);
  assert(r.clean.tatoRecentSearches.every((q) => !/[<>]/.test(q) && q.length <= 60));
});

ok("acota la cantidad de elementos", () => {
  const big = Array.from({ length: 5000 }, (_, i) => ({ id: i + 1, type: "movie", title: "x" }));
  assert(clean({ tatoList: j(big) }).clean.tatoList.length <= 500);
});

ok("filtrado infantil: se quitan las claves no aptas de todas las secciones", () => {
  const r = clean({
    tatoList: j([{ id: 1, type: "movie", title: "A" }, { id: 2, type: "movie", title: "B" }]),
    tatoContinue: j([{ id: 2, type: "movie", title: "B" }]),
    tatoWatched: j({ "movie:2": { id: 2, type: "movie" }, "movie:1": { id: 1, type: "movie" } }),
    tatoLocalAnalyticsV1: j({ items: [{ id: 2, type: "movie" }, { id: 1, type: "movie" }] }),
    tatoSeriesSeen: j({ 9: { k: 1 } }),
  });
  assert.deepStrictEqual(B.backupMediaKeys(r.clean).sort(), ["movie:1", "movie:2", "tv:9"]);
  B.backupDropKeys(r.clean, { "movie:2": 1, "tv:9": 1 });
  assert.deepStrictEqual(r.clean.tatoList.map((x) => x.id), [1]);
  assert.strictEqual(r.clean.tatoContinue.length, 0);
  assert.deepStrictEqual(Object.keys(r.clean.tatoWatched), ["movie:1"]);
  assert.deepStrictEqual(r.clean.tatoLocalAnalyticsV1.items.map((x) => x.id), [1]);
  assert.deepStrictEqual(Object.keys(r.clean.tatoSeriesSeen), []);
});

console.log(`\n${n} grupos de pruebas correctos`);

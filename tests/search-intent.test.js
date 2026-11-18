// Prueba del buscador por intención (js/features/search-intent.js): frases coloquiales con faltas → género/tipo; títulos → búsqueda normal.
const assert = require("assert");
const I = require("../js/features/search-intent.js");
const cases = [
  ["pelicuals de terror", { type: "movie", genre: 27 }],
  ["pelis de miedo", { type: "movie", genre: 27 }],
  ["peli de matar", { type: "movie", genre: 28 }],
  ["películas de acción", { type: "movie", genre: 28 }],
  ["series de risa", { type: "tv", genre: 35 }],
  ["las mejores de terror", { type: "movie", genre: 27, best: true }],
  ["mejores series de crimen", { type: "tv", genre: 80, best: true }],
  ["pelis de ciencia ficcion", { type: "movie", genre: 878 }],
  ["dibujos animados", { type: "movie", genre: 16 }],
  ["anime de magia", { type: "tv", anime: true, genre: 10765 }],
  ["terror 2023", { type: "movie", genre: 27, year: 2023 }],
  ["estrenos de comedia", { type: "movie", genre: 35, recent: true }],
  ["quiero ver algo de amor", { type: "movie", genre: 10749 }],
  ["horror movies", { type: "movie", genre: 27 }],
  ["peliculas de accoin", { type: "movie", genre: 28 }],          // falta de escritura (transposición)
  ["series musicales", { type: "movie", genre: 10402 }],          // ese género no existe en series: películas
];
for (const [q, exp] of cases) {
  const r = I.parse(q);
  assert.ok(r, "debía entender: " + q);
  for (const k of Object.keys(exp)) assert.strictEqual(r[k], exp[k], q + " → " + k + " = " + r[k] + " (esperado " + exp[k] + ")");
}
// Títulos y personas: búsqueda normal de siempre
for (const q of ["Matrix", "el rey leon 2019", "el terror de chucky", "brad pitt", "amores perros", "el señor de los anillos", "terrifier", "it", "coco", "peliculas", "mejores", "f1", "300"]) {
  assert.strictEqual(I.parse(q), null, "no debía secuestrar la búsqueda de título: " + q);
}
const p = I.discoverParams(I.parse("las mejores de terror"));
assert.ok(/with_genres=27/.test(p) && /sort_by=vote_average\.desc/.test(p) && /vote_count\.gte=1500/.test(p), p);
assert.ok(/with_original_language=ja/.test(I.discoverParams(I.parse("anime de accion"))));
console.log("✓ buscador por intención: " + cases.length + " frases entendidas y 13 títulos sin secuestrar");

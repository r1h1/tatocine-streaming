// Plan B del buscador (js/features/search-smart.js): limpieza de relleno y personajes famosos (TMDB no busca por personaje).
const assert = require("assert");
const S = require("../js/features/search-smart.js");
assert.strictEqual(S.clean("pelicula tony montana"), "tony montana");
assert.strictEqual(S.clean("quiero ver la pelicula de tony montana"), "tony montana");
assert.strictEqual(S.clean("la isla siniestra leonardo di caprio"), "la isla siniestra leonardo di caprio");   // «la» del título se conserva
assert.strictEqual(S.clean("Película: El Padrino"), "el padrino");
assert.strictEqual(S.character("pelicula tony montana"), "Scarface");
assert.strictEqual(S.character("Jack Sparrow"), "Piratas del Caribe");
assert.strictEqual(S.character("serie de walter white"), "Breaking Bad");
assert.strictEqual(S.character("la isla siniestra"), null);
console.log("✓ plan B del buscador: limpieza de relleno y personajes famosos");

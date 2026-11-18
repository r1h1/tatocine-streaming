/**
 * TatoCine · js/features/search-smart.js
 * Plan B del buscador cuando TMDB no encuentra ninguna película ni serie con el texto tal cual (también desde la búsqueda por voz):
 *   1. Personajes famosos → su película o serie (TMDB NO busca por personaje): «tony montana» → Scarface, «jack sparrow» → Piratas del Caribe…
 *   2. Quita palabras de relleno («película», «peli», «serie», «quiero ver»…) y vuelve a buscar.
 *   3. Título + actor o director en la misma frase: «la isla siniestra leonardo di caprio» → se reconoce a la persona (TMDB /search/person) y se
 *      buscan en sus créditos los títulos que coinciden con el resto («la isla siniestra» → La isla siniestra, 2010). Solo la persona: sus obras.
 *   4. Palabra clave de TMDB con ese nombre exacto (/search/keyword → /discover).
 * Devuelve una lista de títulos en el formato de las tarjetas ([] si nada encaja). SMART_SEARCH.clean() y .character() son puras (tests/search-smart.test.js).
 */
var SMART_SEARCH = (function () {
  var FILLER = ["pelicula", "peliculas", "peli", "pelis", "film", "films", "filme", "movie", "movies", "serie", "series", "show", "la pelicula", "el filme",
    "quiero", "ver", "busco", "buscar", "buscame", "pon", "ponme", "dame", "reproduce", "reproducir", "mira", "mirar", "watch", "play", "search", "find"];
  // Personajes muy conocidos → texto que SÍ encuentra TMDB (título en español latino o el original)
  var CHARACTERS = {
    "tony montana": "Scarface", "jack sparrow": "Piratas del Caribe", "capitan jack sparrow": "Piratas del Caribe", "rocky balboa": "Rocky",
    "hannibal lecter": "El silencio de los inocentes", "vito corleone": "El padrino", "michael corleone": "El padrino", "don corleone": "El padrino",
    "travis bickle": "Taxi Driver", "tyler durden": "El club de la pelea", "jack dawson": "Titanic", "rose dewitt": "Titanic",
    "darth vader": "Star Wars", "luke skywalker": "Star Wars", "han solo": "Star Wars", "yoda": "Star Wars", "obi wan kenobi": "Star Wars",
    "frodo": "El señor de los anillos", "gandalf": "El señor de los anillos", "aragorn": "El señor de los anillos", "gollum": "El señor de los anillos",
    "neo": "Matrix", "morfeo": "Matrix", "trinity": "Matrix", "ellen ripley": "Alien", "ripley": "Alien", "john mcclane": "Duro de matar",
    "marty mcfly": "Volver al futuro", "doc brown": "Volver al futuro", "walter white": "Breaking Bad", "heisenberg": "Breaking Bad",
    "jesse pinkman": "Breaking Bad", "saul goodman": "Better Call Saul", "tommy shelby": "Peaky Blinders", "thomas shelby": "Peaky Blinders",
    "jon snow": "Game of Thrones", "daenerys": "Game of Thrones", "tyrion lannister": "Game of Thrones", "rick grimes": "The Walking Dead",
    "eleven": "Stranger Things", "once": "Stranger Things", "el guason": "Joker", "guason": "Joker", "chucky": "Chucky", "freddy krueger": "Pesadilla en la calle Elm",
    "jason voorhees": "Viernes 13", "michael myers": "Halloween", "pennywise": "It", "ghostface": "Scream", "jigsaw": "El juego del miedo",
    "tony stark": "Iron Man", "peter parker": "Spider-Man", "bruce wayne": "Batman", "clark kent": "Superman", "wolverine": "Logan",
    "simba": "El rey león", "mufasa": "Mufasa", "nemo": "Buscando a Nemo", "dory": "Buscando a Dory", "woody": "Toy Story", "buzz lightyear": "Toy Story",
    "elsa": "Frozen", "rayo mcqueen": "Cars", "el chavo": "El Chavo del 8", "chavo del 8": "El Chavo del 8", "james bond": "007", "agente 007": "007",
    "sherlock": "Sherlock Holmes", "dexter morgan": "Dexter", "forrest": "Forrest Gump", "maximus": "Gladiador", "william wallace": "Corazón valiente",
    "jack torrance": "El resplandor", "norman bates": "Psicosis", "annabelle": "Annabelle", "samara": "El aro", "la monja": "La monja"
  };
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
  /** Quita relleno al principio y palabras de tipo en cualquier parte: «quiero ver la pelicula tony montana» → «tony montana» */
  function clean(q) {
    var s = " " + norm(q) + " ", changed = true;
    var removed = false;
    while (changed) {
      changed = false;
      for (var i = 0; i < FILLER.length; i++) { var w = " " + FILLER[i] + " "; if (s.indexOf(w) === 0) { s = " " + s.slice(w.length); changed = removed = true; } }
      if (removed) { var t = s.replace(/^ (de|del) /, " "); if (t !== s) { s = t; changed = true; } removed = false; }   // «pelicula de X» → «X»; los artículos se quedan («El Padrino»)
    }
    ["pelicula", "peliculas", "peli", "pelis", "serie", "series", "movie", "film"].forEach(function (w) { s = s.replace(new RegExp(" " + w + " ", "g"), " "); });
    return s.trim();
  }
  function character(q) {
    var c = norm(clean(q));
    if (CHARACTERS[c]) return CHARACTERS[c];
    var keys = Object.keys(CHARACTERS).filter(function (k) { return k.indexOf(" ") > 0 && (" " + c + " ").indexOf(" " + k + " ") >= 0; });   // «escena de tony montana»
    return keys.length ? CHARACTERS[keys[0]] : null;
  }
  return { clean: clean, character: character, norm: norm };
})();
if (typeof module !== "undefined" && module.exports) module.exports = SMART_SEARCH;

/** Plan B (ver arriba). → Promise de lista de tarjetas ([] si nada encaja) */
function searchSmartFallback(q) {
  var N = SMART_SEARCH.norm;
  function cards(results) {
    return (results || []).filter(function (r) { return (r.media_type === "movie" || r.media_type === "tv" || r.title || r.name) && (r.backdrop_path || r.poster_path); })
      .map(function (r) { var t = r.media_type || (r.title ? "movie" : "tv"); return t === "tv" ? mapTvResult(r) : mapMovieResult(r); })
      .filter(function (m) { return !m.isUpcoming; });
  }
  function multi(text) { return fetchTMDB("/search/multi", "&include_adult=false&query=" + encodeURIComponent(text)).then(function (d) { return cards((d.results || []).filter(function (r) { return r.media_type === "movie" || r.media_type === "tv"; })); }); }
  var core = SMART_SEARCH.clean(q), words = core.split(" ").filter(Boolean);
  if (!words.length) return Promise.resolve([]);
  // Un personaje conocido manda («serie walter white» → Breaking Bad, no documentales sueltos con ese nombre); si no, el texto sin relleno
  var ch = SMART_SEARCH.character(q);
  var step1 = ch ? multi(ch) : Promise.resolve([]);
  return step1.then(function (list) {
    if (list.length || words.length > 4 || core === N(q)) return list;
    return personWorks({ who: words, rest: [] });
  }).then(function (list) {
    if (list.length) return list;
    return core !== N(q) ? multi(core) : [];
  }).then(function (list) {
    if (list.length || words.length < 2) return list;
    // 3) persona al final o al principio (3 o 2 palabras): «la isla siniestra leonardo di caprio», «leonardo dicaprio la isla siniestra»
    var tries = [];
    [3, 2].forEach(function (k) { if (words.length >= k) { tries.push({ who: words.slice(-k), rest: words.slice(0, -k) }); tries.push({ who: words.slice(0, k), rest: words.slice(k) }); } });
    if (words.length <= 4) tries.push({ who: words, rest: [] });                    // solo la persona: «leonardo di caprio» (si no se probó ya arriba)
    return tries.reduce(function (p, t) {
      return p.then(function (found) {
        if (found.length) return found;
        return personWorks(t);
      });
    }, Promise.resolve([]));
  }).then(function (list) {
    if (list.length) return list;
    // 4) palabra clave exacta de TMDB
    return fetchTMDB("/search/keyword", "&query=" + encodeURIComponent(core)).then(function (d) {
      var k = (d.results || []).filter(function (x) { return N(x.name) === core; })[0];
      if (!k) return [];
      return fetchTMDB("/discover/movie", "&include_adult=false&sort_by=popularity.desc&with_keywords=" + k.id).then(function (r) { return cards(r.results); });
    }).catch(function () { return []; });
  });
  /** Obras de la persona t.who (si de verdad existe y es conocida) que coinciden con t.rest; sin resto, sus obras más populares */
  function personWorks(t) {
        return fetchTMDB("/search/person", "&include_adult=false&query=" + encodeURIComponent(t.who.join(" "))).then(function (d) {
          var person = (d.results || [])[0];
          if (!person || (person.popularity || 0) < 2.5) return [];
          var a = N(person.name).replace(/ /g, ""), b = t.who.join("");
          if (a !== b && SEARCH_INTENT.dist(a, b, 2) > 2) return [];                // que de verdad sea esa persona («di caprio» ≈ «dicaprio»)
          return fetchTMDB("/person/" + person.id + "/combined_credits").then(function (c) {
            var all = (c.cast || []).concat((c.crew || []).filter(function (x) { return x.job === "Director"; }));
            var seen = {}, uniq = all.filter(function (x) {
              var k = (x.media_type || "") + x.id;
              if (seen[k]) return false; seen[k] = 1;
              var g = x.genre_ids || [];                                                // sin entrevistas, noticias ni realities, ni apariciones como «él mismo»
              if (g.indexOf(10767) >= 0 || g.indexOf(10763) >= 0 || g.indexOf(10764) >= 0) return false;
              return !/^(self|himself|herself|themselves|el mismo|ella misma|si mismo)\b/i.test(String(x.character || ""));
            });
            var rest = t.rest.filter(function (w) { return w.length >= 3 && ["las", "los", "del", "una", "con", "que"].indexOf(w) < 0; });
            var scored = uniq.map(function (x) {
              var title = " " + N((x.title || x.name || "") + " " + (x.original_title || x.original_name || "")) + " ", hit = 0;
              rest.forEach(function (w) { if (title.indexOf(" " + w) >= 0) hit++; });
              return { x: x, hit: hit };
            });
            var pick = rest.length ? scored.filter(function (s) { return s.hit >= Math.max(1, Math.ceil(rest.length / 2)); }) : scored;
            pick.sort(function (u, v) { return v.hit - u.hit || (v.x.popularity || 0) - (u.x.popularity || 0); });
            return cards(pick.slice(0, 30).map(function (s) { return s.x; }));
          });
        }).catch(function () { return []; });
  }
}

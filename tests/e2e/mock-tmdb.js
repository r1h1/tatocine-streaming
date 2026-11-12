/**
 * Mock de TMDB para las pruebas E2E (sin red y determinista). Se activa con TMDB_MOCK=1 (node tests/e2e/run.js).
 * Responde a las rutas que usa la app con datos sintéticos coherentes (listas, fichas, temporadas, personas, búsqueda) e imágenes mínimas.
 * No sustituye una prueba contra la API real: comprueba NUESTRO código (rutas, estados, colas), no el comportamiento de TMDB.
 */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGNkYGD4z8DAwMDEAAEAAAMAAUsAdqIAAAAASUVORK5CYII=", "base64");
function hash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 2147483647; return h; }
const GENRES = [[28, "Acción"], [12, "Aventura"], [16, "Animación"], [35, "Comedia"], [80, "Crimen"], [18, "Drama"], [14, "Fantasía"], [27, "Terror"], [9648, "Misterio"], [10749, "Romance"], [878, "Ciencia ficción"], [53, "Suspenso"]];
function mk(kind, id, title) {
  const tv = kind === "tv", g = [GENRES[id % 12][0], GENRES[(id + 5) % 12][0]];
  const o = { id, adult: false, genre_ids: g, popularity: 100 + (id % 400), vote_average: 5 + (id % 45) / 10, vote_count: 500 + (id % 5000), poster_path: "/p" + id + ".jpg", backdrop_path: "/b" + id + ".jpg", overview: "Sinopsis de prueba del título " + id + ".", original_language: "es", media_type: kind };
  if (tv) Object.assign(o, { name: title, original_name: title, first_air_date: "2024-0" + (1 + id % 9) + "-15", origin_country: ["US"] });
  else Object.assign(o, { title, original_title: title, release_date: "2024-0" + (1 + id % 9) + "-15", video: false });
  return o;
}
function list(kind, seed, base, n) {
  const start = 2000 + hash(seed) % 40000, out = [];
  for (let i = 0; i < (n || 20); i++) out.push(mk(kind, start + i * 3, base + " " + (i + 1)));
  return out;
}
function details(kind, id) {
  const tv = kind === "tv", t = (tv ? "Serie " : "Película ") + id, base = mk(kind, id, t);
  return Object.assign(base, {
    genres: base.genre_ids.map((g) => ({ id: g, name: (GENRES.find((x) => x[0] === g) || [0, "Otros"])[1] })), tagline: "Frase de prueba", status: tv ? "Returning Series" : "Released", homepage: "",
    runtime: tv ? undefined : 110 + id % 40, episode_run_time: tv ? [42] : undefined, number_of_seasons: tv ? 2 : undefined, number_of_episodes: tv ? 16 : undefined,
    seasons: tv ? [{ season_number: 1, name: "Temporada 1", episode_count: 8, air_date: "2024-01-10" }, { season_number: 2, name: "Temporada 2", episode_count: 8, air_date: "2025-01-10" }] : undefined,
    last_episode_to_air: tv ? { season_number: 2, episode_number: 3, air_date: "2025-02-01", name: "Episodio" } : undefined,
    next_episode_to_air: tv ? { season_number: 2, episode_number: 4, air_date: "2099-01-01", name: "Siguiente" } : undefined,
    belongs_to_collection: null, production_companies: [{ id: 1, name: "Estudio de prueba", logo_path: null }],
    credits: { cast: [1, 2, 3, 4, 5, 6].map((k) => ({ id: 9000 + k + id, name: "Actor " + k, character: "Personaje " + k, profile_path: "/c" + (id + k) + ".jpg", order: k })), crew: [{ id: 8000 + id, name: "Directora Prueba", job: "Director", department: "Directing" }] },
    videos: { results: [] }, similar: { results: list(kind, "sim" + id, "Parecida", 12) }, recommendations: { results: list(kind, "rec" + id, "Recomendada", 12) },
    release_dates: { results: [{ iso_3166_1: "US", release_dates: [{ certification: "PG-13", type: 3 }] }] }, content_ratings: { results: [{ iso_3166_1: "US", rating: "TV-14" }] },
    external_ids: {}, "watch/providers": { results: {} }
  });
}
function respond(urlStr) {
  const u = new URL(urlStr), p = u.pathname.replace(/^\/3/, ""), q = u.searchParams.get("query") || "", page = Number(u.searchParams.get("page") || 1);
  let m;
  if (/\/videos$/.test(p)) return { id: 1, results: [] };
  if (/\/images$/.test(p)) return { backdrops: [], posters: [], logos: [] };
  if (/\/watch\/providers$/.test(p)) return { results: {} };
  if (/\/external_ids$/.test(p)) return {};
  if (/\/credits$/.test(p)) return details("movie", 1).credits;
  if ((m = /^\/(movie|tv)\/(\d+)\/season\/(\d+)$/.exec(p))) return { season_number: Number(m[3]), episodes: [1, 2, 3, 4, 5, 6].map((e) => ({ id: Number(m[2]) * 100 + e, episode_number: e, season_number: Number(m[3]), name: "Episodio " + e, overview: "Resumen de prueba", still_path: "/s" + e + ".jpg", air_date: "2024-01-" + (9 + e), runtime: 42 })) };
  if ((m = /^\/(movie|tv)\/(\d+)\/(recommendations|similar)$/.exec(p))) return { page: 1, total_pages: 1, results: list(m[1], p, "Relacionada", 14) };
  if ((m = /^\/(movie|tv)\/(\d+)$/.exec(p))) return details(m[1], Number(m[2]));
  if ((m = /^\/person\/(\d+)\/combined_credits$/.exec(p))) return { cast: list("movie", "pc" + m[1], "Filmografía", 10).concat(list("tv", "pt" + m[1], "Serie de reparto", 6)), crew: [] };
  if ((m = /^\/person\/(\d+)$/.exec(p))) return { id: Number(m[1]), name: "Persona " + m[1], biography: "Biografía de prueba. Segunda frase. Tercera frase.", birthday: "1980-01-01", place_of_birth: "Ciudad", known_for_department: "Acting", profile_path: "/c" + m[1] + ".jpg" };
  if ((m = /^\/collection\/(\d+)$/.exec(p))) return { id: Number(m[1]), name: "Colección de prueba", parts: list("movie", "col" + m[1], "Parte", 4) };
  if (/^\/genre\//.test(p)) return { genres: GENRES.map((g) => ({ id: g[0], name: g[1] })) };
  if (/^\/search\/multi$/.test(p)) { const r = []; for (let i = 0; i < 12; i++) r.push(mk(i % 3 === 2 ? "tv" : "movie", 3000 + hash(q) % 1000 + i, (q ? q.charAt(0).toUpperCase() + q.slice(1) : "Resultado") + " " + (i + 1))); return { page: 1, total_pages: 1, results: r }; }
  if (/^\/search\/(movie|tv)$/.test(p)) { const k = /tv$/.test(p) ? "tv" : "movie"; return { page: 1, total_pages: 1, results: list(k, "s" + q, q || "Resultado", 8) }; }
  const kind = /\/tv\b|discover\/tv|trending\/tv/.test(p) ? "tv" : "movie", multi = /trending\/all/.test(p);
  if (multi) { const a = list("movie", p + page, "Tendencia", 10), b = list("tv", p + page + "t", "Serie en tendencia", 10); const r = []; for (let i = 0; i < 10; i++) { r.push(a[i]); r.push(b[i]); } return { page, total_pages: 5, results: r }; }
  return { page, total_pages: 8, total_results: 160, results: list(kind, p + "|" + u.searchParams.get("with_genres") + "|" + u.searchParams.get("sort_by") + "|" + page, kind === "tv" ? "Serie" : "Película", 20) };
}
exports.install = async function (ctx) {
  await ctx.route("**/api.themoviedb.org/3/**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(respond(r.request().url())) }));
  await ctx.route("**/image.tmdb.org/**", (r) => r.fulfill({ status: 200, contentType: "image/png", headers: { "access-control-allow-origin": "*" }, body: PNG }));
};

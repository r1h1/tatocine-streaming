/* Prueba de inyección: TMDB y el almacenamiento local devuelven texto malicioso y se comprueba que nunca llega al DOM como HTML. */
const { chromium } = require("playwright-core");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.resolve(__dirname, "../..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/json" };
const P = '"><img src=x onerror=window.__pwn=1><b id=pwn>x</b><svg onload=window.__pwn=1>';
function item(i) { return { id: 500 + i, title: P, name: P, original_title: P, original_name: P, overview: P, tagline: P, character: P, job: P, department: P, known_for_department: P, biography: P, place_of_birth: P, status: P, poster_path: '/a"onerror="window.__pwn=1.jpg', backdrop_path: '/b"onerror="window.__pwn=1.jpg', profile_path: '/c"onerror="window.__pwn=1.jpg', logo_path: '/d"onerror="window.__pwn=1.jpg', vote_average: 7.5, release_date: "2020-01-01", first_air_date: "2020-01-01", runtime: 100, media_type: i % 2 ? "tv" : "movie", genre_ids: [28], season_number: 1, episode_number: 1, episode_count: 3, still_path: '/e"onerror="window.__pwn=1.jpg', air_date: "2020-01-01" }; }
function body() {
  const list = Array.from({ length: 12 }, (_, i) => item(i));
  return Object.assign({ page: 1, total_pages: 1, total_results: 12, results: list, cast: list, crew: list, parts: list, seasons: list, episodes: list, genres: [{ id: 28, name: P }], production_companies: [{ id: 1, name: P, logo_path: "/x.png" }], belongs_to_collection: { id: 9, name: P, poster_path: null }, credits: { cast: list, crew: list }, combined_credits: { cast: list, crew: list }, images: { logos: [], backdrops: [], posters: [] }, "watch/providers": { results: {} }, videos: { results: [] }, external_ids: {}, similar: { results: list }, recommendations: { results: list } }, item(0));
}
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const url = "http://127.0.0.1:" + srv.address().port + "/";
  const cache = path.join(os.homedir(), ".cache/ms-playwright"); let exe = process.env.CP; if (!exe) for (const d of fs.readdirSync(cache).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) for (const s of ["chrome-linux64/chrome", "chrome-linux/chrome"]) if (!exe && fs.existsSync(path.join(cache, d, s))) exe = path.join(cache, d, s);
  const b = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((P) => {
    try {
      localStorage.setItem("tatoDisclaimerAccepted", "true"); localStorage.setItem("tatoTourDone", "1");
      if (!localStorage.getItem("__seeded")) {
        localStorage.setItem("__seeded", "1");
        const it = (i) => ({ id: 700 + i, type: i % 2 ? "tv" : "movie", title: P, name: P, bg: '/x"onerror="window.__pwn=1.jpg', rating: P, year: P, list: P, secs: 4000, plays: 2, done: 1, genreIds: [28], lastPlayedAt: Date.now(), season: P, episode: P, pct: P, lang: P });
        const arr = [it(0), it(1), it(2), it(3)], K = (k) => "tatoProfile_main_" + k;
        localStorage.setItem("tatoProfilesV1", JSON.stringify([{ id: "main", name: P, kind: "adult", lang: "es" }]));
        localStorage.setItem(K("tatoList"), JSON.stringify(arr)); localStorage.setItem(K("tatoContinue"), JSON.stringify(arr));
        localStorage.setItem(K("tatoWatched"), JSON.stringify(arr)); localStorage.setItem(K("tatoLater"), JSON.stringify(arr));
        localStorage.setItem(K("tatoFavLists"), JSON.stringify([{ id: P, name: P, cover: P }]));
        localStorage.setItem(K("tatoRecentSearches"), JSON.stringify([P, P]));
        localStorage.setItem(K("tatoLocalAnalyticsV1"), JSON.stringify({ items: arr }));
        localStorage.setItem("tatoProfile_main_tatoLocalAnalyticsV1", JSON.stringify({ items: arr }));
        localStorage.setItem("tatoRecentSearches", JSON.stringify([P, P]));
      }
    } catch (e) { }
    window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective));
  }, P);
  await ctx.route("**/api.themoviedb.org/3/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(body()) }));
  await ctx.route("**/image.tmdb.org/**", (r) => r.abort());
  const page = await ctx.newPage(); const found = [];
  async function scan(tag) {
    const hits = await page.evaluate(() => { const o = []; if (window.__pwn) o.push("window.__pwn ejecutado"); if (document.getElementById("pwn")) o.push("#pwn inyectado en " + document.getElementById("pwn").parentElement.className); if (document.querySelector("[onerror],[onload]")) o.push("atributo on* en " + (function(e){var p=e.parentElement;return e.outerHTML.slice(0,40)+" PADRE "+(p?p.tagName+"."+p.className+"#"+p.id:"")+" ABUELO "+(p&&p.parentElement?p.parentElement.tagName+"."+p.parentElement.className+"#"+p.parentElement.id:"")})(document.querySelector("[onerror],[onload]"))); if (document.querySelector('img[src="x"]')) o.push("img src=x"); return o; });
    hits.forEach((h) => found.push(tag + ": " + h));
  }
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#tc-profile-overlay.open", { timeout: 15000 });
  // Perfil con nombre malicioso (almacenamiento) antes de entrar
  await page.evaluate((P) => { const k = "tatoProfilesV1"; void k; }, P);
  await scan("selector");
  await page.click('[data-profile-action="select"]');
  await page.waitForFunction(() => document.body.classList.contains("app-ready"), null, { timeout: 15000 }).catch(() => { });
  await page.waitForTimeout(2500); await scan("inicio");
  const clicks = [["card", ".card, .row .card"], ["hero", "[data-h=h19]"]];
  for (const [n, sel] of clicks) { const el = page.locator(sel).first(); if (await el.count()) { await el.click({ force: true }).catch(() => { }); await page.waitForTimeout(1500); await scan(n); await page.keyboard.press("Escape"); await page.waitForTimeout(300); } }
  for (const v of ["series", "movies", "favorites", "anime", "mylist", "list", "kids"]) { const t = page.locator('[data-view="' + v + '"], [data-nav="' + v + '"]').first(); if (await t.count()) { await t.click({ force: true }).catch(() => { }); await page.waitForTimeout(1200); await scan("vista " + v); } }
  const inp = page.locator(".search-input-large").first(); if (await inp.count()) { await page.evaluate(() => { try { document.querySelector(".search-toggle, #search-toggle, [data-act=open-search]")?.click(); } catch (e) { } }); await inp.fill(P, { force: true }).catch(() => { }); await page.waitForTimeout(1500); await scan("búsqueda"); }
  for (const sel of ["[data-act=open-stats]", "[data-act=open-wrapped]", "[data-h=h17]", "[data-h=h18]", "[data-act=open-calendar]"]) { const e = page.locator(sel).first(); if (await e.count()) { await e.click({ force: true }).catch(() => { }); await page.waitForTimeout(900); await scan(sel); await page.keyboard.press("Escape"); } }
  console.log("payload visible como texto:", await page.evaluate(() => /img src=x/.test(document.body.innerText) || /img src=x/.test(document.documentElement.innerHTML.replace(/&lt;/g, "<"))), "| perfil guardado:", await page.evaluate(() => (localStorage.getItem("tatoProfilesV1") || "").slice(0, 60)));
  console.log("CSP violations:", await page.evaluate(() => window.__csp));
  console.log(found.length ? "INYECCIONES:\n" + found.join("\n") : "Sin inyecciones detectadas"); await b.close(); srv.close(); process.exit(found.length ? 1 : 0);
})();

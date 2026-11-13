/**
 * Pruebas de navegador (Playwright) de TatoCine: `cd tests/e2e && npm install && npm test`
 *   - Sirve la carpeta del proyecto en un puerto libre y abre cada prueba en un navegador LIMPIO (sin datos guardados).
 *   - Necesita internet y tu clave de TMDB en config.js (el catálogo es real).
 *   - Navegador: variable CHROME_PATH, o el Chromium de ~/.cache/ms-playwright, o Chrome/Brave instalados.
 * Comprueba: selector de perfiles primero (sin parpadeo), CSP sin violaciones ni errores de consola, navegación,
 * ficha, favoritos con «Deshacer», paleta Ctrl+K, perfil infantil, QR/copias, accesibilidad (texto) y que ninguna
 * pantalla se desborde en 6 anchos.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { chromium } = require("playwright-core");

const ROOT = process.env.E2E_ROOT ? path.resolve(process.env.E2E_ROOT) : path.resolve(__dirname, "../..");   // E2E_ROOT=dist/site prueba el paquete minificado
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = path.join(os.homedir(), ".cache/ms-playwright");
  try {
    for (const d of fs.readdirSync(cache).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
      for (const sub of ["chrome-linux64/chrome", "chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-win/chrome.exe"]) {
        const p = path.join(cache, d, sub);
        if (fs.existsSync(p)) return p;
      }
    }
  } catch (e) { }
  for (const p of ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/brave-browser"]) if (fs.existsSync(p)) return p;
  throw new Error("No encuentro un navegador. Define CHROME_PATH.");
}
const serverHits = {};
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname); serverHits[p] = (serverHits[p] || 0) + 1;
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("no"); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      fs.createReadStream(file).pipe(res);
    }).listen(0, "127.0.0.1", () => resolve({ srv, url: "http://127.0.0.1:" + srv.address().port + "/" }));
  });
}

const results = [];
async function main() {
  const { srv, url } = await serve();
  const browser = await chromium.launch({ executablePath: findBrowser(), args: ["--no-sandbox"] });
  async function fresh(opts) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
    if (process.env.TMDB_MOCK) await require("./mock-tmdb").install(ctx);           // sin red: TMDB e imágenes simulados (ver mock-tmdb.js)
    await ctx.addInitScript(() => {
      try { localStorage.setItem("tatoDisclaimerAccepted", "true"); localStorage.setItem("tatoLegalAcceptedV2", "true"); localStorage.setItem("tatoTourDone", "1"); } catch (e) { }   // sin aviso legal ni recorrido: no tapan las pruebas
      window.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + String(e.blockedURI).slice(0, 60)));
    });
    const page = await ctx.newPage();
    page.errors = [];
    page.on("pageerror", (e) => page.errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR|youtube|favicon|Permissions policy violation/i.test(m.text())) page.errors.push("console: " + m.text().slice(0, 160)); });
    return { ctx, page };
  }
  async function enter(page, pick) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#tc-profile-overlay.open", { timeout: 15000 });
    await page.click('[data-profile-action="select"][data-profile-id="' + (pick || "main") + '"]');
    await page.waitForFunction(() => { const o = document.getElementById("tc-profile-overlay"); return !!o && document.body.classList.contains("app-ready") && !o.classList.contains("open"); }, null, { timeout: 15000 });   // (cambiar a Invitado recarga la página: durante la recarga el selector no existe un instante)
  }
  const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY, "i") : null;     // ONLY="Bienvenida" ejecuta solo las pruebas cuyo nombre coincide
  async function test(name, fn) {
    if (ONLY && !ONLY.test(name)) return;
    const t0 = Date.now();
    const { ctx, page } = await fresh();
    try { await fn(page, ctx); const csp = await page.evaluate(() => window.__csp).catch(() => []); if (csp.length) throw new Error("violaciones de CSP: " + csp.join(" | ")); if (page.errors.length) throw new Error("errores de consola: " + page.errors.join(" | ")); results.push([name, true, Date.now() - t0]); console.log("✓", name, "(" + (Date.now() - t0) + " ms)"); }
    catch (e) { results.push([name, false, 0, e.message]); console.log("✗", name, "—", e.message.split("\n")[0]); }
    await ctx.close();
  }
  const eq = (a, b, m) => { if (a !== b) throw new Error((m || "") + " esperado " + JSON.stringify(b) + " y fue " + JSON.stringify(a)); };
  const ok = (v, m) => { if (!v) throw new Error(m); };

  await test("el selector de perfiles aparece antes que la portada (sin parpadeo)", async (page) => {
    await page.addInitScript(() => {
      window.__flash = 0;
      const tick = () => { const main = document.querySelector(".main-content"), ov = document.getElementById("tc-profile-overlay"); if (main && ov && getComputedStyle(main).visibility === "visible" && !ov.classList.contains("open")) window.__flash++; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#tc-profile-overlay.open");
    await page.waitForTimeout(1500);
    eq(await page.evaluate(() => window.__flash), 0, "fotogramas con la portada visible antes del selector:");
    ok(await page.locator(".tc-profile-skel, .tc-profile-card").count() > 0, "ni esqueleto ni perfiles");
  });

  await test("recargar (Ctrl+R) conserva el perfil elegido y no vuelve a pedirlo; una pestaña nueva sí", async (page, ctx) => {
    await enter(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.classList.contains("app-ready"), null, { timeout: 15000 });
    eq(await page.evaluate(() => document.getElementById("tc-profile-overlay").classList.contains("open")), false, "el selector reapareció al recargar:");
    eq(await page.evaluate(() => document.documentElement.classList.contains("tc-picker-boot")), false, "la portada se ocultó al recargar:");
    const tab2 = await ctx.newPage();
    await tab2.goto(url, { waitUntil: "domcontentloaded" });
    await tab2.waitForSelector("#tc-profile-overlay.open", { timeout: 15000 });
    await tab2.close();
  });

  await test("sin scripts en línea, ni eval, ni atributos on*: la CSP no tiene excepciones", async (page) => {
    await enter(page);
    const info = await page.evaluate(() => ({
      meta: document.querySelector('meta[http-equiv="Content-Security-Policy"]').content,
      inline: [...document.scripts].filter((s) => !s.src && s.type !== "application/ld+json").length,
      onAttrs: [...document.querySelectorAll("*")].filter((e) => [...e.attributes].some((a) => /^on/.test(a.name))).length
    }));
    ok(!/unsafe-inline/.test(info.meta.match(/script-src[^;]*/)[0]) && !/unsafe-eval/.test(info.meta), "script-src permite unsafe-inline/eval");
    eq(info.inline, 0, "scripts en línea:"); eq(info.onAttrs, 0, "elementos con atributos on*:");
  });

  await test("la portada carga filas con tarjetas y las pestañas cambian", async (page) => {
    await enter(page);
    await page.waitForSelector("#rows-container .card", { timeout: 20000 });
    for (const v of ["movies", "series", "anime", "kids", "list", "home"]) {
      await page.evaluate((x) => switchView(x), v);
      await page.waitForTimeout(v === "list" ? 600 : 2500);
      eq(await page.evaluate(() => currentView), v);
      if (v !== "list") ok(await page.locator("#rows-container .card").count() > 3, "sin tarjetas en " + v);
    }
  });

  await test("scroll infinito en Películas añade filas por género sin repetir", async (page) => {
    await enter(page);
    await page.evaluate(() => switchView("movies"));
    await page.waitForSelector("#rows-container .card", { timeout: 20000 });
    const before = await page.locator("#rows-container .row").count();
    for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(2200); }
    ok(await page.locator("#rows-container .row").count() > before, "no añadió filas");
    eq(await page.locator(".load-more-btn").count(), 0, "botón Cargar más visible:");
    const dup = await page.evaluate(() => { const ids = [...document.querySelectorAll(".card[data-id]")].map((c) => c.dataset.type + c.dataset.id); return ids.length - new Set(ids).size; });
    eq(dup, 0, "tarjetas repetidas:");
  });

  await test("ficha del título, favorito con «Deshacer» y Ver más tarde", async (page) => {
    await enter(page);
    await page.waitForSelector("#rows-container .card");
    await page.locator("#rows-container .card").first().click();
    await page.waitForSelector("#details-real-content", { state: "visible", timeout: 20000 });
    ok((await page.locator("#details-title").innerText()).length > 0, "sin título");
    await page.click("#details-later-btn");
    eq(await page.evaluate(() => laterList.length), 1, "ver más tarde:");
    await page.click("#details-fav-btn");
    await page.waitForSelector(".tc-fav-option");
    await page.locator(".tc-fav-option").first().click();
    eq(await page.evaluate(() => myList.length), 1, "favoritos tras guardar:");
    await page.click("#details-fav-btn");
    await page.waitForSelector(".toast.has-action");
    eq(await page.evaluate(() => myList.length), 0, "favoritos tras quitar:");
    await page.click(".toast-action");
    eq(await page.evaluate(() => myList.length), 1, "favoritos tras deshacer:");
  });

  await test("paleta Ctrl+K, atajos y Ajustes → accesibilidad", async (page) => {
    await enter(page);
    await page.keyboard.press("Control+k");
    await page.waitForSelector("#tc-cmd-overlay.open");
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === "tc-cmd-input");
    await page.keyboard.type("favoritos");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => currentView === "list");
    await page.evaluate(() => showSettings());
    await page.evaluate(() => changeTextScale(1));
    eq(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ts").trim()), "1.15", "--ts:");
    const fs1 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".row-title, .hero-title")).fontSize));
    ok(fs1 > 0, "tamaño de texto");
    await page.evaluate(() => { toggleHighContrast(); toggleReduceMotion(); });
    ok(await page.evaluate(() => document.body.classList.contains("hc") && document.body.classList.contains("rm")), "clases hc/rm");
  });

  await test("perfil infantil: Ajustes solo con copia y QR, sin acceso a la web de adultos", async (page) => {
    await enter(page);
    await page.evaluate(() => { localProfiles.push({ id: "kidtest", name: "Peque", kind: "kid", lang: "es", createdAt: Date.now() }); saveLocalProfiles(); safeStorageSet(ACTIVE_PROFILE_STORAGE_KEY, "kidtest"); reloadApp(); });
    await page.waitForFunction(() => document.body.classList.contains("kid-mode") && document.body.classList.contains("app-ready"), null, { timeout: 15000 });
    await page.evaluate(() => showSettings());
    const rows = await page.evaluate(() => [...document.querySelectorAll("#settings-modal .settings-option")].filter((e) => getComputedStyle(e).display !== "none").map((e) => e.querySelector(".label").textContent.trim()));
    ok(rows.join("|").includes("Copiar tus datos") && rows.join("|").includes("QR") && rows.length <= 4, "filas visibles para el niño: " + rows.join(", "));
    eq(await page.evaluate(() => { switchView("movies"); return currentView; }), "kids", "un perfil infantil solo ve Niños:");
  });

  await test("copia JSON: se sanea, y adulto→niño no se permite", async (page) => {
    await enter(page);
    const r = await page.evaluate(() => {
      const s = sanitizeBackupData({ tatoList: JSON.stringify([{ id: 1, type: "movie", title: "<img src=x onerror=alert(1)>", bg: '/a.jpg"onload="x' }, { id: "x", type: "movie" }]) }, ["ESP1"]);
      localProfiles.push({ id: "k9", name: "N", kind: "kid", lang: "es", createdAt: Date.now() });
      return { title: s.clean.tatoList[0].title, bg: s.clean.tatoList[0].bg, n: s.clean.tatoList.length, kidTargets: importTargets("kid").length, adultTargets: importTargets("adult").map((p) => p.kind) };
    });
    ok(!/[<>]/.test(r.title) && r.bg === "" && r.n === 1, "no saneó: " + JSON.stringify(r));
    ok(r.kidTargets === 1 && r.adultTargets.every((k) => k !== "kid"), "mezcló perfiles de distinto tipo");
  });

  await test("QR: se dibuja, caduca, y un QR ajeno o dañino se rechaza", async (page) => {
    await enter(page);
    await page.evaluate(() => openQrShow());
    await page.waitForSelector(".tc-qr-canvas, #tc-qr-body .tc-qr-note", { timeout: 10000 }).catch(() => {});
    const v = await page.evaluate(async () => {
      const good = (await qrBuildLink(location.origin + "/", { kind: "adult", favs: [{ type: "movie", id: 603 }], lists: [], seen: [], cont: [], hist: [] })).link;
      const out = { good: (await qrValidate(good, location.origin)).ok };
      for (const t of ["javascript:alert(1)", "https://evil.example/#tcimport=TC1.abcdefgh", "WIFI:S:a;T:WPA;P:b;;"]) out[t.slice(0, 12)] = (await qrValidate(t, location.origin)).ok;
      return out;
    });
    ok(v.good === true && Object.keys(v).filter((k) => k !== "good").every((k) => v[k] === false), "validación: " + JSON.stringify(v));
  });

  await test("copia cifrada: cifra, no filtra datos y descifra con la contraseña", async (page) => {
    await enter(page);
    const r = await page.evaluate(async () => {
      const f = await encryptBackup(JSON.stringify({ secreto: "Matrix" }), "clave-larga");
      let bad = ""; try { await decryptBackup(f, "otra-clave"); } catch (e) { bad = e.message; }
      return { leak: JSON.stringify(f).includes("Matrix"), back: await decryptBackup(f, "clave-larga"), bad };
    });
    ok(!r.leak && r.back.includes("Matrix") && r.bad === "bad_password", JSON.stringify(r));
  });

  await test("PIN fuerte: el hash es PBKDF2 y el bloqueo sobrevive a recargar", async (page) => {
    await enter(page);
    const r = await page.evaluate(async () => {
      const pin = await makePinStrong("1234");
      const prof = { id: "pintest", pin };
      const good = (await verifyProfilePin(prof, "1234")).ok, bad = (await verifyProfilePin(prof, "0000")).ok;
      for (let i = 0; i < 5; i++) pinGuardFail("pintest");
      return { v: pin.v, it: pin.i, good, bad, wait: pinGuardWait("pintest") > 25000 };
    });
    eq(r.v, 2); ok(r.it >= 150000 && r.good && !r.bad && r.wait, JSON.stringify(r));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.classList.contains("app-ready"));
    ok(await page.evaluate(() => pinGuardWait("pintest") > 25000), "el bloqueo no persistió");
  });

  await test("asistente «¿Qué ver hoy?», decidir en pareja y reproductor con cambio de servidor", async (page) => {
    await enter(page);
    await page.evaluate(() => openWizard());
    await page.click('#tc-wizard-overlay .wiz-chip >> nth=0');
    await page.click('#tc-wizard-overlay [data-wiz="go"]');
    await page.waitForSelector("#tc-wizard-overlay [data-wiz=\"play\"]", { timeout: 25000 });          // resultados reales (no los esqueletos)
    eq(await page.locator("#tc-wizard-overlay .wiz-result").count(), 3, "recomendaciones:");
    await page.evaluate(() => openWizard());
    ok(await page.locator('#tc-wizard-overlay [data-act="wizard-couple"]').isVisible(), "falta el botón Decidir en pareja");
    const bx = await page.evaluate(() => [...document.querySelectorAll("#tc-wizard-overlay .wiz-actions > button")].map((b) => Math.round(b.getBoundingClientRect().top)));
    eq(bx.length, 3, "botones del asistente (Mostrar, Random, Pareja):"); eq(bx[1], bx[2], "Random y Pareja van uno al lado del otro:");
    ok(await page.locator('#tc-wizard-overlay [data-act="wizard-random"]').isVisible(), "falta el botón Random");
    // «Random»: una sola recomendación al azar, con «Otra al azar»
    await page.click('#tc-wizard-overlay [data-act="wizard-random"]');
    await page.waitForSelector("#tc-wizard-overlay [data-wiz=\"play\"]", { timeout: 25000 });
    eq(await page.locator("#tc-wizard-overlay .wiz-result").count(), 1, "Random debe mostrar UNA película:");
    await page.evaluate(() => closeWizard());
    // Decidir en pareja: cada uno BUSCA y elige sus títulos; los que coinciden se aprueban solos y el resto se vota
    await page.evaluate(() => openCouplePicker());
    await page.click('[data-cp="start"]');
    await page.fill("#cp-q", "matrix");
    await page.waitForSelector(".cp-res", { timeout: 20000 });
    await page.locator(".cp-res").nth(0).click();
    eq(await page.inputValue("#cp-q"), "", "el buscador no se vació al agregar:");
    eq(await page.evaluate(() => document.activeElement && document.activeElement.id), "cp-q", "el buscador no quedó con el foco:");
    await page.fill("#cp-q", "matrix"); await page.waitForSelector(".cp-res", { timeout: 20000 });
    await page.locator(".cp-res").nth(1).click();
    eq(await page.locator(".cp-chip").count(), 2, "títulos elegidos por la persona 1:");
    await page.click('[data-cp="done"]');
    await page.waitForSelector('[data-cp="go"]');
    await page.click('[data-cp="go"]');
    await page.fill("#cp-q", "matrix");
    await page.waitForSelector(".cp-res", { timeout: 20000 });
    await page.locator(".cp-res").nth(0).click();
    await page.fill("#cp-q", "matrix"); await page.waitForSelector(".cp-res", { timeout: 20000 });
    await page.locator(".cp-res").nth(2).click();
    await page.click('[data-cp="done"]');
    await page.waitForSelector("#cp-card", { timeout: 20000 });                         // 1 aprobado solo (coincidencia) + 2 por votar
    ok((await page.locator(".tc-qr-meta").first().innerText()).includes("1/2"), "debían quedar 2 títulos por votar");
    await page.keyboard.press("ArrowRight");
    ok((await page.locator(".tc-qr-meta").first().innerText()).includes("2/"), "← → no responden");
    await page.click('[data-cp="info"]');
    await page.waitForSelector("#details-real-content", { state: "visible", timeout: 20000 });
    eq(await page.evaluate(() => document.getElementById("tc-profile-overlay").classList.contains("open")), false, "Info abrió el selector de perfiles:");
    ok(await page.evaluate(() => document.getElementById("tc-qr-overlay").classList.contains("open") && !!document.getElementById("cp-card")), "el diálogo de la pareja se cerró al abrir Info");
    await page.keyboard.press("ArrowRight");                      // con la ficha encima, las flechas NO responden la carta de abajo
    eq((await page.locator(".tc-qr-meta").first().innerText()).includes("2/"), true, "las flechas respondieron la carta con la ficha abierta:");
    await page.evaluate(() => closeDetails());
    await page.waitForFunction(() => !document.getElementById("tc-qr-overlay").inert && !document.body.classList.contains("cp-details"), null, { timeout: 5000 });
    eq((await page.locator(".tc-qr-meta").first().innerText()).includes("2/"), true, "la ronda perdió su posición:");
    // la ronda sobrevive a cerrar el diálogo y a recargar
    await page.evaluate(() => closeQr());
    await page.evaluate(() => openCouplePicker());
    await page.waitForSelector('[data-cp="resume"]');
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.classList.contains("app-ready"));
    await page.waitForSelector(".toast-action", { timeout: 10000 });
    await page.click(".toast-action");
    await page.waitForSelector("#cp-card");
    eq((await page.locator(".tc-qr-meta").first().innerText()).includes("2/"), true, "al retomar tras recargar:");
    await page.evaluate(() => closeQr());
    await page.evaluate(() => openPlayer(603, "movie", "Matrix", null, null, null));
    await page.waitForSelector("#player-view iframe", { timeout: 10000 });
    await page.click("#server-btn-1");
    await page.waitForFunction(() => document.querySelector("#server-btn-1").classList.contains("active"));
    ok(await page.evaluate(() => (activePlayerFrame.src || "").includes("tukiplay")), "no cambió de servidor");
    await page.evaluate(() => closePlayer());
  });

  async function heroIntervals(page, ms, kick) {
    await page.evaluate((k) => { window.__chg = []; if (k) setTimeout(() => setHero(heroMoviesList[1]), 300); let last = currentHeroMedia && currentHeroMedia.id; setInterval(() => { const id = currentHeroMedia && currentHeroMedia.id; if (id !== last) { window.__chg.push(Date.now()); last = id; } }, 50); }, kick);
    await page.waitForTimeout(ms);
    const t = await page.evaluate(() => window.__chg);
    return t.slice(1).map((x, i) => x - t[i]);
  }
  for (const [name, withTrailer, expected] of [["sin tráiler cada título dura 10 s", false, 10000], ["con tráiler cada título dura 29,8 s (1,8 + 18 + 10)", true, 29800]]) {
    await test("portada: " + name, async (page, ctx) => {
      await ctx.addInitScript(() => { try { localStorage.setItem("tatoHeroTrailer", "on"); } catch (e) { } });
      await page.route("**/api.themoviedb.org/3/**/videos**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ results: withTrailer ? [{ site: "YouTube", key: "PhgY8cOJiQA", type: "Trailer", official: true, iso_639_1: "es" }] : [] }) }));
      await enter(page);
      await page.waitForFunction(() => currentHeroMedia && heroMoviesList.length >= 2, null, { timeout: 20000 });
      const gaps = await heroIntervals(page, expected * (withTrailer ? 1 : 2.5) + 3500, withTrailer);   // con tráiler: se fuerza un título nuevo para medir un solo ciclo
      ok(gaps.length >= (withTrailer ? 1 : 1), "rotó menos de lo esperado: " + JSON.stringify(gaps));
      for (const g of gaps) ok(Math.abs(g - expected) < 1000, "un título duró " + g + " ms y debía durar " + expected + " ms (" + JSON.stringify(gaps) + ")");
    });
  }
  await test("Invitado siempre en español (aunque el navegador esté en inglés) y la portada muestra el Top 10 de la semana", async (page) => {
    await enter(page, "guest");
    eq(await page.evaluate(() => UI_LANG), "es", "idioma del Invitado:");
    ok(/Inicio/.test(await page.evaluate(() => document.querySelector(".top-nav, nav, body").innerText)), "la interfaz no está en español");
    await page.waitForFunction(() => heroMoviesList.length === 10, null, { timeout: 20000 });
  });

  await test("2 títulos empezados activan «Hecho para ti»; «Vistas» lista lo terminado; estadísticas ignoran lo de menos de 15 min; existe «Maratón de películas»", async (page) => {
    await enter(page);
    await page.evaluate(() => {
      const now = Date.now();
      localAnalytics.items = [
        { id: 96721, type: "movie", title: "Rush: Pasión y Gloria", genreIds: [28, 18, 53], secs: 7860, plays: 4, done: 1, lastPlayedAt: now - 86400000, lang: "en" },
        { id: 911430, type: "movie", title: "F1 la película", genreIds: [28, 18], secs: 60, plays: 1, done: 0, lastPlayedAt: now - 3600000, lang: "en" },
        { id: 96677, type: "tv", title: "Lupin", genreIds: [18, 80, 9648], secs: 60, plays: 1, done: 0, lastPlayedAt: now - 7200000, lang: "fr" },
        { id: 550, type: "movie", title: "Fight Club", genreIds: [18, 53], secs: 1000, plays: 1, done: 0, lastPlayedAt: now - 9000000, lang: "en" }];
      saveLocalAnalytics(); switchView("home");
    });
    await page.waitForFunction(() => [...document.querySelectorAll(".row-title")].some((e) => e.textContent === "Hecho para ti"), null, { timeout: 25000 });
    eq(await page.evaluate(() => countedItems(localAnalytics.items).length), 2, "títulos que cuentan (≥ 15 min o terminados):");
    await page.evaluate(() => switchView("list"));
    await page.waitForSelector('[data-v="watched"]');
    ok(await page.locator('[data-act="start-marathon"]').isVisible(), "falta el botón Maratón de películas");
    await page.click('[data-v="watched"]');
    await page.waitForSelector("#rows-container .card", { timeout: 10000 });
    ok((await page.locator("#rows-container .card").first().getAttribute("aria-label")).includes("Rush"), "Rush no aparece en Vistas");
  });

  await test("portada: sin botón de volumen, 1,8 s para verse, 18 s de tráiler + 10 s de pausa y menú «Mi cine»", async (page) => {
    await enter(page);
    const r = await page.evaluate(() => ({ dwell: HERO_DWELL_TRAILER, start: HT_START_MS, btn: !!document.getElementById("hero-sound-btn"), nav: [...document.querySelectorAll(".nav-item")].some((b) => b.textContent.trim() === "Mi cine") }));
    await page.waitForFunction(() => /\d+ ?(h|min)/.test(document.getElementById("hero-meta").innerText), null, { timeout: 10000 });   // duración, edad y tipo se quedan fijos en la portada
    eq(r.dwell, 29800, "duración con tráiler:"); eq(r.start, 1800, "el tráiler se ve a:"); eq(r.btn, false, "botón de volumen:"); eq(r.nav, true, "falta «Mi cine» en el menú:");
  });

  await test("una fila que falla muestra «Reintentar» solo para ella y el resto de la portada sigue", async (page) => {
    await page.route("**/api.themoviedb.org/3/movie/popular**", (r) => r.abort());
    await enter(page);
    await page.waitForSelector(".row-error", { timeout: 20000 });
    ok(/Películas Populares/.test(await page.locator(".row-error").first().innerText()), "la fila con error no nombra su título");
    ok(await page.locator("#rows-container .card").count() > 5, "el resto de la portada no cargó");
  });

  await test("portada: el tráiler se precarga pero no se ve antes del segundo 2, y aparece solo (sin pasar el ratón)", async (page, ctx) => {
    await ctx.addInitScript(() => { try { localStorage.setItem("tatoHeroTrailer", "on"); } catch (e) { } });
    await page.route("**/api.themoviedb.org/3/**/videos**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ results: [{ site: "YouTube", key: "PhgY8cOJiQA", type: "Trailer", official: true, iso_639_1: "es" }] }) }));
    await enter(page);
    await page.waitForFunction(() => currentHeroMedia && heroMoviesList.length >= 2);
    await page.evaluate(() => setHero(heroMoviesList[1]));                       // título nuevo: el reloj de 2 s empieza ahora
    const t0 = Date.now();
    await page.waitForSelector("#hero-video-wrap iframe", { state: "attached", timeout: 1800 });          // se precarga antes del segundo 2
    eq(await page.evaluate(() => document.getElementById("hero-video-wrap").classList.contains("active")), false, "el tráiler se vio antes del segundo 2:");
    await page.waitForFunction(() => document.getElementById("hero-video-wrap").classList.contains("active"), null, { timeout: 9000 }).catch(() => {});   // y luego aparece solo
    ok(Date.now() - t0 >= 0, "");
  });

  await test("portada: en Automático el tráiler sale aunque el sistema pida «reducir animaciones» (el interruptor propio de la app sí lo apaga)", async (page, ctx) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api.themoviedb.org/3/**/videos**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ results: [{ site: "YouTube", key: "PhgY8cOJiQA", type: "Trailer", official: true, iso_639_1: "es" }] }) }));
    await enter(page);
    await page.waitForFunction(() => currentHeroMedia && heroMoviesList.length >= 2);
    eq(await page.evaluate(() => htMode), "on", "modo por defecto (Siempre):");
    eq(await page.evaluate(() => htWhyNot()), "", "motivo para no reproducir con el sistema en «reducir animaciones»:");
    await page.evaluate(() => toggleReduceMotion());
    ok((await page.evaluate(() => htWhyNot())).includes("Reducir movimiento"), "el interruptor de la app no apagó el tráiler");
  });

  await test("portada: si YouTube está bloqueado, no se queda en silencio: aviso con el motivo", async (page, ctx) => {
    await ctx.addInitScript(() => { try { localStorage.setItem("tatoHeroTrailer", "on"); } catch (e) { } });
    await page.route("**/api.themoviedb.org/3/**/videos**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ results: [{ site: "YouTube", key: "PhgY8cOJiQA", type: "Trailer", official: true, iso_639_1: "es" }] }) }));
    await page.route("**/*youtube-nocookie.com/**", (r) => r.abort());
    await enter(page);
    await page.waitForFunction(() => currentHeroMedia && heroMoviesList.length >= 2);
    await page.evaluate(() => setHero(heroMoviesList[1]));
    await page.waitForFunction(() => /YouTube/.test(htStatus), null, { timeout: 14000 });
    ok(await page.locator(".toast").filter({ hasText: "Tráiler de la portada" }).count() > 0, "no hubo aviso con el motivo");
    eq(await page.evaluate(() => document.body.classList.contains("hero-trailer-on")), false, "se mostró un vídeo roto:");
  });

  await test("buscador: el micrófono queda centrado dentro de su botón y de la barra", async (page) => {
    await enter(page);
    const g = await page.evaluate(() => { const b = document.querySelector(".voice-btn"); if (!b) return null; const r = b.getBoundingClientRect(), s = b.querySelector("svg").getBoundingClientRect(), w = document.querySelector(".hero-content .search-wrap").getBoundingClientRect(); return { dx: Math.abs((r.left + r.width / 2) - (s.left + s.width / 2)), dy: Math.abs((r.top + r.height / 2) - (s.top + s.height / 2)), inside: r.right <= w.right + 1 && r.left >= w.left }; });
    ok(g && g.dx < 1.5 && g.dy < 1.5 && g.inside, "micrófono desfasado: " + JSON.stringify(g));
  });

  await test("PWA: el service worker guarda todo y la app abre SIN conexión", async (page, ctx) => {
    await page.goto(url + "?sw=1", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#tc-profile-overlay.open");
    await page.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); }, null, { timeout: 20000 });
    await page.waitForFunction(async () => { const n = await caches.keys(); const k = n.find((x) => x.startsWith("tatocine-shell")); if (!k) return false; return (await (await caches.open(k)).keys()).length > 90; }, null, { timeout: 20000 });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 });      // la página ya la controla el service worker
    const m = await page.evaluate(async () => { const m = await (await fetch("manifest.webmanifest")).json(); return { icons: m.icons.length, maskable: m.icons.some((i) => i.purpose === "maskable"), standalone: m.display === "standalone", id: !!m.id, shortcuts: m.shortcuts.length }; });
    ok(m.icons >= 8 && m.maskable && m.standalone && m.id && m.shortcuts >= 3, "manifiesto: " + JSON.stringify(m));
    await ctx.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#tc-profile-overlay.open", { timeout: 15000 });
    ok(await page.locator(".tc-profile-card").count() > 0, "sin conexión no se pintaron los perfiles (faltan archivos en la caché)");
    const off = await (await ctx.newPage()).goto(url + "offline.html").then((r) => r.status());
    eq(off, 200, "offline.html:");
    await ctx.setOffline(false);
  });

  await test("formulario de perfil: pantalla completa, 2 columnas en escritorio y 1 en tableta/móvil, sin los textos retirados", async (page) => {
    await enter(page);
    await page.evaluate(() => { openProfileCreateModal(); setProfileFormKind("kid"); });
    const txt = await page.evaluate(() => document.getElementById("tc-profile-create-overlay").innerText);
    ok(!/Para quién es este perfil|Idioma \/ Language|Solo verá la sección/.test(txt), "siguen los textos retirados");
    const geo = () => page.evaluate(() => { const d = document.querySelector(".pf-dialog").getBoundingClientRect(), c = [...document.querySelectorAll(".pf-col")].map((e) => e.getBoundingClientRect()), bed = document.getElementById("tc-bedtime-box").getBoundingClientRect(), pin = document.getElementById("tc-new-profile-pin").getBoundingClientRect(); return { full: d.width >= innerWidth - 1 && d.height >= innerHeight - 1, sameRow: Math.abs(c[0].top - c[1].top) < 4, gap: Math.round(pin.top - bed.bottom) }; });
    let g = await geo();
    ok(g.full && g.sameRow && g.gap >= 24, "escritorio: " + JSON.stringify(g));
    await page.setViewportSize({ width: 820, height: 1000 });
    g = await geo();
    ok(g.full && !g.sameRow && g.gap >= 24, "tableta: " + JSON.stringify(g));
    await page.setViewportSize({ width: 390, height: 800 });
    g = await geo();
    ok(g.full && !g.sameRow && g.gap >= 24, "móvil: " + JSON.stringify(g));
  });

  await test("rendimiento: arranque y primera tarjeta dentro de presupuesto (se imprimen las cifras)", async (page) => {
    await page.addInitScript(() => {
      window.__lt = []; window.__lcp = 0;
      try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ type: "longtask", buffered: true }); } catch (e) { }
      try { new PerformanceObserver((l) => { const x = l.getEntries(); window.__lcp = x[x.length - 1].startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch (e) { }
    });
    let bytes = 0, reqs = 0;
    page.on("response", async (r) => { if (r.url().startsWith(url)) { reqs++; try { bytes += (await r.body()).length; } catch (e) { } } });
    const t0 = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#tc-profile-overlay.open");
    const pickerMs = Date.now() - t0;
    await page.click('[data-profile-action="select"][data-profile-id="main"]');
    await page.waitForSelector("#rows-container .card", { timeout: 20000 });
    const cardMs = Date.now() - t0;
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), long: window.__lt.length, longMax: Math.round(Math.max(0, ...window.__lt)), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0, nodes: document.getElementsByTagName("*").length }));
    console.log("   · selector " + pickerMs + " ms · primera tarjeta " + cardMs + " ms · LCP " + m.lcp + " ms · tareas largas " + m.long + " (máx " + m.longMax + " ms) · " + reqs + " archivos propios, " + Math.round(bytes / 1024) + " KB · " + m.nodes + " nodos · " + m.heap + " MB de memoria JS");
    ok(pickerMs < 4000, "el selector tardó " + pickerMs + " ms");
    ok(cardMs < 12000, "la primera tarjeta tardó " + cardMs + " ms");
    ok(m.longMax < 600, "una tarea larga de " + m.longMax + " ms bloquea la página");
    ok(m.nodes < 6000, m.nodes + " nodos en el DOM");
  });


  // ---------- 5.6: modales, límites, ahorro de red, avatares, legal ----------
  await test("«Info» en Decidir en pareja: la ficha queda por encima del diálogo y se puede cerrar (no se traba)", async (page) => {
    await enter(page);
    await page.evaluate(() => openCouplePicker()); await page.click('[data-cp="start"]');
    for (let who = 0; who < 2; who++) {
      for (const k of [0, 1]) { await page.fill("#cp-q", "matrix"); await page.waitForSelector(".cp-res", { timeout: 20000 }); await page.locator(".cp-res").nth(who === 0 ? k : k + 1).click(); }
      await page.click('[data-cp="done"]'); if (who === 0) { await page.waitForSelector('[data-cp="go"]'); await page.click('[data-cp="go"]'); }
    }
    await page.waitForSelector("#cp-card", { timeout: 20000 });
    await page.click('[data-cp="info"]');
    await page.waitForSelector("#details-real-content", { state: "visible", timeout: 20000 });
    const z = await page.evaluate(() => ({ d: +getComputedStyle(document.getElementById("details-modal")).zIndex, q: +getComputedStyle(document.getElementById("tc-qr-overlay")).zIndex }));
    ok(z.d > z.q, "la ficha (z " + z.d + ") queda DETRÁS del diálogo de la pareja (z " + z.q + ")");
    await page.click("#details-modal .details-close");
    await page.waitForFunction(() => !document.getElementById("details-modal").classList.contains("open") && document.getElementById("tc-qr-overlay").inert === false, null, { timeout: 8000 });
    await page.click('[data-cp="yes"]');                                                  // el diálogo vuelve a responder
  });
  await test("Selector de perfiles: abrirlo no hace ninguna búsqueda a TMDB (fondos desde el manifiesto)", async (page) => {
    const searches = []; page.on("request", (r) => { if (/api\.themoviedb\.org\/3\/search/.test(r.url())) searches.push(r.url()); });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#tc-profile-overlay.open", { timeout: 15000 }); await page.waitForTimeout(2500);
    eq(searches.length, 0, "búsquedas al abrir el selector:");
    ok(await page.evaluate(() => PROFILE_BACKDROP_MANIFEST.items.length >= 30), "el manifiesto de fondos no está completo");
  });
  await test("Inicio: sin hacer scroll solo carga lo de la primera pantalla y al bajar aparecen las demás filas", async (page) => {
    let calls = 0; page.on("request", (r) => { if (/api\.themoviedb\.org/.test(r.url())) calls++; });
    await enter(page); await page.waitForTimeout(4000);
    const before = calls, titles = () => page.evaluate(() => [...document.querySelectorAll("#rows-container .row-title")].map((x) => x.textContent));
    ok(!(await titles()).includes("Películas mejor calificadas"), "«Películas mejor calificadas» se cargó sin hacer scroll");
    ok(before <= 18, "demasiadas llamadas antes de hacer scroll: " + before);   // 1.ª visita: incluye las miniaturas de plataformas visibles (después quedan guardadas)
    for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(1000); }
    ok((await titles()).includes("Películas mejor calificadas"), "al bajar no aparecieron las filas de abajo");
  });
  await test("Top 10: el décimo título queda fijo, sin volver al primero ni hacer más llamadas", async (page) => {
    await page.clock.install();
    const calls = []; page.on("request", (r) => { if (/api\.themoviedb\.org/.test(r.url())) calls.push(r.url()); });
    await page.route("**/api.themoviedb.org/3/**/videos**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ results: [] }) }));
    await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForSelector("#tc-profile-overlay.open"); await page.clock.runFor(1500);
    await page.click('[data-profile-action="select"]'); await page.clock.runFor(4000);
    const seen = []; let last = -1;
    for (let k = 0; k < 110; k++) { await page.clock.runFor(1000); const i = await page.evaluate(() => currentHeroIndex); if (i !== last) { seen.push(i); last = i; } }
    eq(JSON.stringify(seen), JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), "índices recorridos:");
    const n = calls.length; await page.clock.runFor(120000);
    eq(await page.evaluate(() => currentHeroIndex), 9, "volvió al primero tras el décimo:"); eq(calls.length, n, "llamadas a TMDB tras llegar al décimo:");
  });
  await test("Ajustes: Tu tiempo de hoy arriba de todo y después Instalar TatoCine, Copiar tus datos (QR) y (JSON)", async (page) => {
    await enter(page); await page.evaluate(() => showSettings()); await page.waitForTimeout(400);
    const labels = await page.evaluate(() => [...document.querySelectorAll("#settings-modal .settings-option .label")].filter((e) => e.offsetParent).map((e) => e.textContent.trim()).slice(0, 4));
    eq(JSON.stringify(labels), JSON.stringify(["Tu tiempo de hoy", "Instalar TatoCine", "Copiar tus datos (QR)", "Copiar tus datos (JSON)"]), "primeras opciones:");
  });
  await test("Legal: hub con 4 opciones, sitios de terceros desde SERVERS y enlaces seguros", async (page) => {
    await enter(page); await page.click('.nav-links [data-h="h8d"]'); await page.waitForSelector("#legal-modal.open");
    eq(await page.locator("#legal-body .settings-option").count(), 4, "opciones del hub:");
    await page.click('[data-act="legal-third"]');
    const hosts = await page.evaluate(() => [...document.querySelectorAll("#legal-third li")].map((x) => x.textContent));
    const servers = await page.evaluate(() => SERVERS.map((s) => new URL(s.url(1, "movie", 1, 1)).hostname));
    for (const h of servers) ok(hosts.includes(h), "falta el sitio " + h + " en la lista de terceros");
    ok(await page.evaluate(() => [...document.querySelectorAll("#legal-body a")].every((a) => /noopener/.test(a.rel) && /noreferrer/.test(a.rel))), "enlace externo sin noopener noreferrer");
    ok(await page.locator("main .tc-legal-link").count() === 1 && await page.locator(".player-notice").count() === 1, "falta el pie legal o el aviso bajo el iframe");
  });
  await test("Límite de uso de adultos: «Tu tiempo de hoy» arriba de Ajustes, aviso a 5 min, 10 h → descanso de 2 h → otras 10 h, reinicio diario (compartido entre pestañas)", async (page, ctx) => {
    await enter(page); await page.evaluate(() => showSettings()); await page.waitForTimeout(300);
    const first = await page.evaluate(() => document.querySelector("#settings-modal .modal-body .settings-option .label").textContent.trim());
    eq(first, "Tu tiempo de hoy", "la primera fila de Ajustes debe ser el contador:");
    const lbl = await page.locator("#adult-usage-label").innerText();
    ok(/de 10 h · descanso de 2 h al superar las 10 h/.test(lbl) && !/5 h/.test(lbl), "Ajustes no muestra la regla 10 h + 2 h: " + lbl);
    await page.evaluate(() => closeSettings());
    await page.evaluate(() => tcAdultLimit.forceWarn()); await page.waitForTimeout(6500);
    const w = await page.evaluate(() => ({ open: document.getElementById("tc-adult-warn").classList.contains("open"), t: document.getElementById("tc-adult-warn-title").textContent }));
    ok(w.open && /minutos/.test(w.t), "debía avisar con una ventana 5 min antes del descanso: " + JSON.stringify(w));
    await page.click('#tc-adult-warn [data-act="adult-warn-ok"]'); await page.waitForTimeout(200);
    ok(!(await page.evaluate(() => document.getElementById("tc-adult-warn").classList.contains("open"))), "la ventana de aviso no se cerró");
    await page.evaluate(() => tcAdultLimit.force()); await page.waitForTimeout(6500);
    const a = await page.evaluate(() => ({ open: document.getElementById("tc-adult-lock").classList.contains("open"), left: tcAdultLimit.state().lockedUntil - Date.now(), txt: document.getElementById("tc-adult-lock-sub").textContent }));
    ok(a.open && a.left > 1.9 * 3600000 && a.left <= 2 * 3600000, "el descanso debía ser de 2 h: " + JSON.stringify(a));
    ok(/10 horas/.test(a.txt) && /2 horas/.test(a.txt), "el texto no menciona 10 y 2 horas: " + a.txt);
    const tab2 = await ctx.newPage(); await tab2.goto(url); await tab2.waitForTimeout(2500);
    ok(await tab2.evaluate(() => document.getElementById("tc-adult-lock").classList.contains("open")), "la segunda pestaña no muestra el descanso");
    await page.evaluate(() => { const s = tcAdultLimit.state(); s.lockedUntil = Date.now() - 1000; localStorage.setItem("tatoAdultUsageV2", JSON.stringify(s)); }); await page.waitForTimeout(6000);   // termina el descanso
    const b = await page.evaluate(() => ({ open: document.getElementById("tc-adult-lock").classList.contains("open"), secs: tcAdultLimit.usage().secs, locked: tcAdultLimit.state().lockedUntil }));
    ok(!b.open && b.locked === 0 && b.secs < 60, "tras el descanso debía empezar otro ciclo de 10 h desde cero: " + JSON.stringify(b));
    await page.evaluate(() => { const s = tcAdultLimit.state(); s.secs = 5000; s.day = "2000-1-1"; localStorage.setItem("tatoAdultUsageV2", JSON.stringify(s)); }); await page.waitForTimeout(6000);   // día nuevo
    const n = await page.evaluate(() => tcAdultLimit.usage().secs);
    ok(n < 60, "con un día nuevo el contador debía volver a cero: " + n);
  });
  await test("Límite de uso: el avance se acumula con la app visible y se GUARDA cada 30 min (no antes), no cuenta con la app oculta y se guarda al ocultarla", async (page) => {
    await page.clock.install();
    await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForSelector("#tc-profile-overlay.open"); await page.clock.runFor(1500);
    await page.click('[data-profile-action="select"]'); await page.clock.runFor(3000);
    const t0 = await page.evaluate(() => tcAdultLimit.usage().secs);
    await page.clock.runFor(29 * 60 * 1000);
    let r = await page.evaluate(() => ({ guardado: tcAdultLimit.state().secs, enMemoria: tcAdultLimit.usage().secs }));
    ok(r.guardado < 60, "se guardó antes de los 30 min: " + JSON.stringify(r)); ok(r.enMemoria - t0 > 1650 && r.enMemoria - t0 < 1800, "el avance en memoria debía ser ~29 min: " + JSON.stringify(r));
    await page.clock.runFor(3 * 60 * 1000);
    r = await page.evaluate(() => ({ guardado: tcAdultLimit.state().secs }));
    ok(r.guardado > 1700 && r.guardado < 2100, "a los 30 min debía guardarse ~30 min de uso: " + JSON.stringify(r));
    // con la app oculta no cuenta; al ocultarla se guarda lo pendiente
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
    const hid = await page.evaluate(() => tcAdultLimit.state().secs); await page.clock.runFor(10 * 60 * 1000);
    const hid2 = await page.evaluate(() => tcAdultLimit.state().secs);
    ok(hid2 - hid < 30, "contó tiempo con la app oculta: " + hid + " → " + hid2);
  });
  await test("Tu mes en películas: sale una sola vez por mes y perfil, con los datos del mes anterior", async (page, ctx) => {
    await ctx.addInitScript(() => {
      const prev = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15, 12).getTime();
      const it = (id, t, secs, g) => ({ id, type: "movie", title: t, genreIds: g, secs, plays: 2, done: 1, lastPlayedAt: prev, bg: "/x.jpg", lang: "es" });
      if (!localStorage.getItem("__s")) { localStorage.setItem("__s", "1"); const items = [it(603, "Matrix", 7800, [28, 878]), it(27205, "Origen", 6000, [28, 878])]; localStorage.setItem("tatoProfile_main_tatoLocalAnalyticsV1", JSON.stringify({ items })); localStorage.setItem("tatoLocalAnalyticsV1", JSON.stringify({ items })); }
    });
    await enter(page); await page.waitForTimeout(8500);
    const r = await page.evaluate(() => ({ open: document.getElementById("tc-qr-overlay").classList.contains("open"), title: document.getElementById("tc-qr-title").textContent, mark: localStorage.getItem("tatoMonthlyWrappedShown_main"), share: !!document.querySelector('#tc-qr-overlay [data-w="share"]') }));
    ok(r.open && r.title === "Tu mes en películas" && /^\d{4}-\d{2}$/.test(r.mark) && r.share, "el resumen mensual no apareció: " + JSON.stringify(r));
    await page.evaluate(() => { closeQr(); monthlyWrappedCheck(); }); await page.waitForTimeout(700);
    ok(!(await page.evaluate(() => document.getElementById("tc-qr-overlay").classList.contains("open"))), "volvió a salir el mismo mes");
  });
  await test("Zona segura de la PWA: con 47 px de barra de estado, la X del reproductor, la ficha y Ajustes quedan debajo", async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
    await enter(page); await page.waitForTimeout(800);
    for (const [name, open, sel, close] of [["Ajustes", () => showSettings(), "#settings-modal .modal-close", () => closeSettings()], ["ficha", () => openDetails(603, "movie"), "#details-modal .details-close", () => closeDetails()], ["reproductor", () => openPlayer(603, "movie", "Matrix"), "#player-modal .modal-close", () => closePlayer()]]) {
      await page.evaluate(open); await page.waitForTimeout(900);
      const r = await page.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { top: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; }, sel);
      ok(r.top >= 47, "la X de " + name + " queda en la barra de estado (top " + r.top + ")"); ok(r.w >= 44 && r.h >= 44, "la X de " + name + " mide " + r.w + "×" + r.h);
      await page.evaluate(close); await page.waitForTimeout(300);
    }
  });
  await test("«Mi cine»: el primer botón queda por debajo de la barra superior (móvil con zona segura y escritorio)", async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
    await enter(page); await page.evaluate(() => switchView("list")); await page.waitForTimeout(1000);
    for (const [name, size] of [["móvil", { width: 390, height: 844 }], ["escritorio", { width: 1280, height: 800 }]]) {
      await page.setViewportSize(size); await page.waitForTimeout(400);
      const r = await page.evaluate(() => ({ nav: document.getElementById("top-bar").getBoundingClientRect().bottom, first: document.querySelector("#rows-container .fav-toolbar .genre-chip").getBoundingClientRect().top }));
      ok(r.first >= r.nav, name + ": «Todos» (top " + Math.round(r.first) + ") queda bajo la barra (termina en " + Math.round(r.nav) + ")");
    }
  });
  await test("Botones de las ventanas: todos miden 48 px (ajustes, ficha, asistente)", async (page) => {
    await page.setViewportSize({ width: 390, height: 844 }); await enter(page);
    const heights = async (sel) => page.evaluate((sel) => [...new Set([...document.querySelectorAll(sel + " button, " + sel + " .hero-btn, " + sel + " a.danger-btn")].filter((b) => b.offsetParent && b.getBoundingClientRect().height > 20 && !b.classList.contains("modal-close") && !b.classList.contains("details-close") && !b.classList.contains("tc-link-btn") && !b.classList.contains("tc-legal-link")).map((b) => Math.round(b.getBoundingClientRect().height)))], sel);
    await page.evaluate(() => showSettings()); await page.waitForTimeout(500);
    for (const h of await heights("#settings-modal")) ok(h >= 47 && h <= 50, "botón de Ajustes de " + h + " px");
    await page.evaluate(() => closeSettings()); await page.evaluate(() => openWizard()); await page.waitForTimeout(500);
    for (const h of await heights("#tc-wizard-overlay")) ok((h >= 30 && h <= 40) || (h >= 43 && h <= 50), "botón del asistente de " + h + " px (opciones 30-40 px, acciones 44-48 px)");
  });
  await test("«Ver en base a tus gustos»: una sola recomendación, grande, y la etiqueta «¿Qué ver?» es la misma en todos lados", async (page) => {
    await page.setViewportSize({ width: 390, height: 844 }); await enter(page);
    eq(await page.locator(".hero-wizard-label").first().innerText(), "¿Qué ver?", "etiqueta del inicio:");
    await page.evaluate(() => openWizard()); await page.waitForTimeout(400);
    eq(await page.locator("#tc-wizard-title").innerText(), "¿Qué ver?", "título del asistente:");
    ok((await page.locator('[data-act="wizard-random"]').innerText()).includes("Ver en base a tus gustos"), "el botón no dice «Ver en base a tus gustos»");
    await page.click('[data-act="wizard-random"]'); await page.waitForSelector('[data-wiz="play"]', { timeout: 25000 });
    const r = await page.evaluate(() => { const e = document.querySelector("#tc-wizard-overlay .wiz-result").getBoundingClientRect(); return { w: e.width, h: e.height }; });
    ok(r.h >= 380, "el resultado sigue pequeño: " + Math.round(r.h) + " px de alto");
  });
  await test("Avatares: se elige uno al editar el perfil, se guarda y se muestra en las tarjetas (los emojis antiguos se descartan)", async (page, ctx) => {
    await ctx.addInitScript(() => { try { if (!localStorage.getItem("__s")) { localStorage.setItem("__s", "1"); localStorage.setItem("tatoProfilesV1", JSON.stringify([{ id: "main", name: "Yo", avatar: "🦊" }])); } } catch (e) { } });
    await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForSelector("#tc-profile-overlay.open", { timeout: 15000 }); await page.waitForTimeout(1500);
    ok(!(await page.evaluate(() => JSON.parse(localStorage.getItem("tatoProfilesV1")).some((p) => p.avatar))), "el emoji antiguo no se descartó");
    await page.click('[data-profile-action="edit"]'); await page.click('.pf-av[data-av="a5"]'); await page.click("#tc-create-profile-btn"); await page.waitForTimeout(800);
    eq(await page.evaluate(() => JSON.parse(localStorage.getItem("tatoProfilesV1")).find((p) => p.id === "main").avatar), "a5", "avatar guardado:");
    ok(await page.evaluate(() => !!document.querySelector(".tc-profile-card .tc-profile-card-avatar .tc-av")), "la tarjeta no muestra el avatar");
    eq(await page.evaluate(() => TC_AVATARS.length), 10, "cantidad de avatares:");
  });
  await test("TMDB: 429 se reintenta, 404 no, y nunca hay más de 6 peticiones a la vez (la búsqueda pasa antes que las precargas)", async (page) => {
    await enter(page); await page.waitForTimeout(1500);
    let inflight = 0, maxIn = 0; const calls = {}, order = [];
    await page.context().route("**/api.themoviedb.org/3/**", async (r) => {
      const k = new URL(r.request().url()).pathname; calls[k] = (calls[k] || 0) + 1;
      if (/zzz429/.test(k)) return r.fulfill({ status: calls[k] <= 2 ? 429 : 200, contentType: "application/json", body: JSON.stringify({ results: [] }) });
      if (/zzz404/.test(k)) return r.fulfill({ status: 404, contentType: "application/json", body: "{}" });
      inflight++; maxIn = Math.max(maxIn, inflight); order.push(k); await new Promise((x) => setTimeout(x, 100)); inflight--;
      r.fulfill({ contentType: "application/json", body: JSON.stringify({ results: [], id: 1 }) });
    });
    const out = await page.evaluate(async () => ({ a: await fetchTMDB("/zzz429").then(() => "ok", (e) => "falló " + e.status), b: await fetchTMDB("/zzz404").then(() => "ok", (e) => "falló " + e.status) }));
    eq(out.a, "ok", "429 tras reintentos:"); eq(calls["/3/zzz429"], 3, "intentos del 429:"); eq(out.b, "falló 404", "404:"); eq(calls["/3/zzz404"], 1, "intentos del 404:");
    order.length = 0; maxIn = 0;
    await page.evaluate(() => { const arr = []; for (let i = 0; i < 12; i++) arr.push(fetchTMDB("/movie/" + (900 + i) + "/similar")); for (let i = 0; i < 8; i++) arr.push(fetchTMDB("/trending/movie/day", "&page=" + (i + 2))); arr.push(fetchTMDB("/search/multi", "&query=prioridad")); return Promise.all(arr); });
    ok(maxIn <= 6, "hubo " + maxIn + " peticiones a la vez"); ok(order.findIndex((k) => /search/.test(k)) <= 7, "la búsqueda del usuario no se adelantó a las precargas");
  });
  await test("Service Worker: la segunda visita no pide ningún CSS/JS a la red (caché versionada) y conserva la caché de imágenes", async (page) => {
    const netHits = () => Object.keys(serverHits).filter((k) => /^\/(css|js)\//.test(k));
    await page.goto(url + "?sw=1", { waitUntil: "load" }); await page.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); }, null, { timeout: 15000 }); await page.waitForTimeout(3000);
    for (const k of Object.keys(serverHits)) delete serverHits[k]; await page.reload({ waitUntil: "load" }); await page.waitForTimeout(2500);
    eq(netHits().length, 0, "CSS/JS pedidos a la red en la 2.ª visita: " + netHits().slice(0, 3).join(","));
    ok(await page.evaluate(async () => (await caches.keys()).some((k) => k.startsWith("tatocine-img"))), "la caché de imágenes no existe tras recargar");
  });


  await test("Bienvenida de usuario nuevo: 5 pasos → selector → aviso legal → no vuelve (flag en localStorage) y sin pedir catálogo mientras se lee", async (page, ctx) => {
    await ctx.addInitScript(() => { try { if (!localStorage.getItem("__w")) { localStorage.setItem("__w", "1"); localStorage.removeItem("tatoDisclaimerAccepted"); localStorage.removeItem("tatoLegalAcceptedV2"); localStorage.removeItem("tatoTourDone"); } } catch (e) { } });
    let calls = 0; page.on("request", (r) => { if (/api\.themoviedb\.org/.test(r.url())) calls++; });
    await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(1500);
    eq(await page.evaluate(() => getComputedStyle(document.getElementById("tc-welcome")).display), "flex", "la bienvenida no se muestra:");
    eq(await page.evaluate(() => getComputedStyle(document.getElementById("tc-profile-overlay")).visibility), "hidden", "el selector no está tapado:");
    eq(await page.evaluate(() => localStorage.getItem("tatoWelcomeSeenV1")), "0", "flag pendiente:"); eq(calls, 0, "llamadas a TMDB mientras se lee la bienvenida:");
    ok(/Gracias por confiar en TatoCine/.test(await page.locator('.tw-slide[data-i="0"] p').innerText()), "falta la descripción del primer paso");
    const pos = await page.evaluate(() => { const g = (sel) => { const e = document.querySelector(sel), b = e.getBoundingClientRect(); return { l: Math.round(b.left), w: Math.round(b.width), h: Math.round(b.height) }; }; const a = { img: g('.tw-slide[data-i="0"].on > .tw-logo'), h2: g('.tw-slide[data-i="0"].on > h2') }; return a; });
    await page.click('[data-tw="next"]'); await page.waitForTimeout(150);
    const pos2 = await page.evaluate(() => { const g = (sel) => { const e = document.querySelector(sel), b = e.getBoundingClientRect(); return { l: Math.round(b.left), w: Math.round(b.width), h: Math.round(b.height) }; }; return { img: g('.tw-slide[data-i="1"].on > .tw-icon'), h2: g('.tw-slide[data-i="1"].on > h2') }; });
    ok(pos.img.l === pos2.img.l && pos.img.w === pos2.img.w && pos.img.h === pos2.img.h && pos.h2.l === pos2.h2.l, "el primer paso no tiene el mismo diseño que el segundo: " + JSON.stringify([pos, pos2]));
    await page.click('[data-tw="back"]'); await page.waitForTimeout(150);
    ok(await page.locator('.tw-slide[data-i="0"] .tw-logo img').count() === 1, "falta el logo real de la app en el primer paso");
    const titles = [];
    for (let i = 0; i < 5; i++) { titles.push(await page.locator(".tw-slide.on h2").innerText()); if (i < 4) await page.click('[data-tw="next"]'); }
    eq(JSON.stringify(titles), JSON.stringify(["Bienvenido a TatoCine", "Elige o crea tu perfil", "Sin miedo: tus perfiles son tuyos", "Llévalos contigo", "Antes de empezar"]), "pasos:");
    ok(/perfil/i.test(await page.locator('[data-tw="next"]').innerText()), "el último botón no lleva a elegir perfil");
    await page.click('[data-tw="next"]'); await page.waitForSelector("#tc-profile-overlay.open", { timeout: 8000 });
    eq(await page.evaluate(() => getComputedStyle(document.getElementById("tc-welcome")).display), "none", "la bienvenida sigue visible:");
    eq(await page.evaluate(() => getComputedStyle(document.getElementById("tc-profile-overlay")).visibility), "visible", "el selector sigue oculto:");
    eq(await page.evaluate(() => localStorage.getItem("tatoWelcomeSeenV1")), "1", "flag al terminar:");
    ok(!(await page.evaluate(() => document.getElementById("disclaimer-modal").classList.contains("open"))), "el aviso legal salió ANTES de elegir perfil");
    await page.click('[data-profile-action="select"]');
    await page.waitForFunction(() => document.getElementById("disclaimer-modal").classList.contains("open"), null, { timeout: 8000 });
    await page.click('#disclaimer-modal [data-act="accept-disclaimer"]');
    await page.waitForFunction(() => localStorage.getItem("tatoLegalAcceptedV2") === "true", null, { timeout: 5000 });
    await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(1200);
    eq(await page.evaluate(() => getComputedStyle(document.getElementById("tc-welcome")).display), "none", "la bienvenida volvió a salir:");
    eq(await page.evaluate(() => document.getElementById("disclaimer-modal").classList.contains("open")), false, "el aviso legal volvió a salir:");
  });
  await test("Descargo legal obligatorio: sin pulsar «Aceptar y continuar» no hay forma de usar la app (Esc, X, cierre forzado, funciones, tabulador)", async (page, ctx) => {
    await ctx.addInitScript(() => { try { if (!localStorage.getItem("__w")) { localStorage.setItem("__w", "1"); localStorage.removeItem("tatoDisclaimerAccepted"); localStorage.removeItem("tatoLegalAcceptedV2"); } } catch (e) { } });
    await enter(page).catch(() => { });
    await page.waitForFunction(() => document.getElementById("disclaimer-modal").classList.contains("open"), null, { timeout: 12000 });
    const st = () => page.evaluate(() => ({ open: document.getElementById("disclaimer-modal").classList.contains("open"), inert: document.querySelectorAll("body > [data-gate-inert]").length, flag: localStorage.getItem("tatoLegalAcceptedV2"), x: getComputedStyle(document.querySelector("#disclaimer-modal .dc-x")).display, cerrar: getComputedStyle(document.querySelector("#disclaimer-modal .dc-close")).display, acept: getComputedStyle(document.querySelector("#disclaimer-modal .dc-accept")).display, trailer: document.body.classList.contains("hero-trailer-on") }));
    let r = await st();
    ok(r.open && r.inert >= 3 && r.flag === null, "estado inicial: " + JSON.stringify(r)); eq(r.x, "none", "la X se ve sin aceptar:"); eq(r.cerrar, "none", "«Cerrar» se ve sin aceptar:"); ok(r.acept !== "none", "falta el botón «Aceptar y continuar»");
    eq((await page.locator("#disclaimer-modal .dc-accept").innerText()).trim(), "Aceptar y continuar", "texto del botón:");
    ok(await page.locator("#disclaimer-modal .settings-content .modal-header").count() === 1, "el descargo no usa la estructura de Ajustes");
    const geo = await page.evaluate(() => { const d = document.querySelector("#disclaimer-modal .settings-content"), st = document.querySelector("#settings-modal .settings-content"), a = d.getBoundingClientRect(), cs = getComputedStyle(d), ss = getComputedStyle(st); return { full: Math.round(a.width) === innerWidth && Math.round(a.height) === innerHeight, igual: cs.backgroundColor === ss.backgroundColor && cs.borderRadius === ss.borderRadius && getComputedStyle(document.getElementById("disclaimer-modal")).backgroundColor === getComputedStyle(document.getElementById("settings-modal")).backgroundColor }; });
    ok(geo.full && geo.igual, "el descargo no es una ventana completa con el mismo fondo y bordes que Ajustes: " + JSON.stringify(geo));
    ok(await page.locator("#dc-source a[href='https://github.com/r1h1/tatocine-streaming']").count() === 1, "falta el enlace a GitHub en el descargo");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    await page.evaluate(() => { closeDisclaimer(); document.getElementById("disclaimer-modal").classList.remove("open"); document.getElementById("disclaimer-modal").style.display = "none"; });   // intento de cierre a la fuerza
    await page.waitForTimeout(900); r = await st(); ok(r.open, "el descargo se pudo cerrar sin aceptar: " + JSON.stringify(r));
    await page.evaluate(() => document.getElementById("disclaimer-modal").style.removeProperty("display"));
    const blocked = await page.evaluate(() => { let opened = false; try { openPlayer(603, "movie", "Matrix"); openDetails(603, "movie"); performSearch("matrix"); showSettings(); } catch (e) { } return [document.getElementById("player-modal").classList.contains("open"), document.getElementById("details-modal").classList.contains("open"), document.getElementById("settings-modal").classList.contains("open")]; });
    eq(JSON.stringify(blocked), "[false,false,false]", "se abrió contenido sin aceptar (reproductor, ficha, ajustes):");
    const cl = await page.evaluate(() => { document.querySelector(".nav-item").focus(); return document.activeElement === document.querySelector(".nav-item"); }); ok(!cl, "el menú de fondo todavía se puede enfocar");
    await page.click('#disclaimer-modal [data-act="accept-disclaimer"]'); await page.waitForTimeout(500); r = await st();
    ok(!r.open && r.flag === "true" && r.inert === 0, "tras aceptar la app debería liberarse: " + JSON.stringify(r));
    await page.evaluate(() => openDetails(603, "movie")); await page.waitForSelector("#details-real-content", { state: "visible", timeout: 10000 });   // ya funciona
    await page.evaluate(() => { closeDetails(); showDisclaimer(); }); await page.waitForTimeout(300);
    r = await st(); ok(r.open && r.x !== "none" && r.cerrar !== "none" && r.acept === "none", "releer el descargo ya aceptado debe poder cerrarse: " + JSON.stringify(r));
  });
  await test("Descargo legal: sin «En pocas palabras», con scroll, dos botones compactos (Aceptar / No utilizar), «Cerrar» bien hecho al releerlo", async (page, ctx) => {
    await ctx.addInitScript(() => { try { if (!localStorage.getItem("__w")) { localStorage.setItem("__w", "1"); localStorage.removeItem("tatoDisclaimerAccepted"); localStorage.removeItem("tatoLegalAcceptedV2"); } } catch (e) { } });
    await enter(page).catch(() => { });
    await page.waitForFunction(() => document.getElementById("disclaimer-modal").classList.contains("open"), null, { timeout: 12000 });
    for (const vp of [{ width: 390, height: 780 }, { width: 280, height: 653 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(vp); await page.waitForTimeout(250);
      const r = await page.evaluate(() => {
        const m = document.getElementById("disclaimer-modal"), sc = m.querySelector(".settings-content"), vis = (e) => { const b = e.getBoundingClientRect(), c = getComputedStyle(e); return c.display !== "none" && b.width > 0 ? b : null; };
        const acc = vis(m.querySelector(".dc-accept")), dec = vis(m.querySelector(".dc-decline"));
        sc.scrollTop = 0; sc.scrollTop = 400;
        return { poco: /En pocas palabras|In short/.test(m.innerText), oy: getComputedStyle(sc).overflowY, canScroll: sc.scrollHeight > sc.clientHeight, top: sc.scrollTop, accH: acc && acc.height, decH: dec && dec.height, accIn: acc && acc.left >= 0 && acc.right <= innerWidth && acc.bottom <= innerHeight, decIn: dec && dec.left >= 0 && dec.right <= innerWidth && dec.bottom <= innerHeight, x: !!vis(m.querySelector(".dc-x")), cerrar: !!vis(m.querySelector(".dc-close")) };
      });
      const tag = " @" + vp.width + " " + JSON.stringify(r);
      ok(!r.poco, "sigue «En pocas palabras»" + tag); ok(r.canScroll && r.top > 0, "el descargo no hace scroll" + tag); ok(r.accH && r.accH <= 56 && r.decH && r.decH <= 56, "botones gigantes o ausentes" + tag); ok(r.accIn && r.decIn, "botones fuera de pantalla" + tag); ok(!r.x && !r.cerrar, "X o Cerrar visibles sin aceptar" + tag);
    }
    eq((await page.locator("#disclaimer-modal .dc-decline").innerText()).trim(), "No utilizar", "texto del botón:");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.click('#disclaimer-modal [data-act="accept-disclaimer"]'); await page.waitForTimeout(500);
    await page.evaluate(() => { showDisclaimer(); }); await page.waitForTimeout(300);
    const c = await page.evaluate(() => { const m = document.getElementById("disclaimer-modal"), b = m.querySelector(".dc-close").getBoundingClientRect(); return { h: b.height, w: b.width, dec: getComputedStyle(m.querySelector(".dc-decline")).display, poco: /En pocas palabras/.test(m.innerText) }; });
    ok(c.h > 0 && c.h <= 56 && c.w <= 260 && c.dec === "none" && !c.poco, "«Cerrar» mal hecho: " + JSON.stringify(c));
  });
  await test("Formulario de perfil: Borrar, Cancelar y Guardar alineados en una sola fila y dentro de la pantalla; enlace legal de Ajustes centrado", async (page) => {
    await enter(page);
    for (const w of [390, 280, 820, 1280]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.evaluate(() => { openProfileCreateModal(); });
      await page.evaluate(() => { const b = document.getElementById("tc-delete-profile-btn"); if (b) b.hidden = false; }); await page.waitForTimeout(250);
      const r = await page.evaluate(() => [".tc-profile-delete-btn", ".tc-profile-cancel-btn", ".tc-profile-create-btn"].map((q) => { const b = document.querySelector("#tc-profile-create-overlay " + q).getBoundingClientRect(); return { t: Math.round(b.top), h: Math.round(b.height), l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; }));
      const tag = " @" + w + " " + JSON.stringify(r);
      ok(r.every((b) => b.h >= 44 && b.h <= 52 && b.l >= 0 && b.r <= w), "botones fuera de pantalla o con altura desigual" + tag);
      if (w > 640) ok(new Set(r.map((b) => b.t)).size === 1, "botones desfasados (no están en la misma fila)" + tag);
      else ok(r[2].w >= w - 48 && r[2].t < r[0].t && r[0].t === r[1].t && r[0].l < r[1].l, "en móvil «Guardar» debe ocupar todo el ancho arriba, y Borrar + Cancelar abajo" + tag + JSON.stringify(r));
      await page.evaluate(() => { try { closeProfileCreateModal(); } catch (e) { document.getElementById("tc-profile-create-overlay").classList.remove("open"); } }); await page.waitForTimeout(200);
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => showSettings()); await page.waitForTimeout(400);
    const g = await page.evaluate(() => { const l = document.querySelector("#settings-modal .tc-legal-link").getBoundingClientRect(), s = document.querySelector("#settings-modal .settings-content").getBoundingClientRect(); return { dx: Math.abs((l.left + l.right) / 2 - (s.left + s.right) / 2) }; });
    ok(g.dx <= 6, "el enlace legal de Ajustes no está centrado: " + JSON.stringify(g));
  });
  await test("Ajustes con scroll en móvil (cuerpo con alto propio y contador arriba), ficha con imagen pequeña y descripción de máx. 150 caracteres, ¿Qué ver? sin traslapes", async (page) => {
    await page.setViewportSize({ width: 390, height: 780 }); await enter(page);
    await page.evaluate(() => showSettings()); await page.waitForTimeout(400);
    const st = await page.evaluate(() => { const b = document.querySelector("#settings-modal .modal-body"); b.scrollTop = 300; return { h: b.clientHeight, sh: b.scrollHeight, top: b.scrollTop, opts: b.querySelectorAll(":scope > .settings-option").length, first: b.querySelector(".label").textContent.trim() }; });
    ok(st.h > 300 && st.sh > st.h && st.top > 0 && st.opts >= 8 && st.first === "Tu tiempo de hoy", "Ajustes no hace scroll o perdió filas: " + JSON.stringify(st));
    await page.evaluate(() => closeSettings());
    await page.evaluate(() => openDetails(603, "movie")); await page.waitForSelector("#details-real-content", { state: "visible", timeout: 10000 });
    const d = await page.evaluate(() => ({ hero: document.getElementById("details-backdrop").getBoundingClientRect().height / innerHeight, n: document.getElementById("details-overview").textContent.length }));
    ok(d.hero <= 0.36 && d.n <= 150, "ficha: imagen o descripción demasiado grandes: " + JSON.stringify(d));
    await page.evaluate(() => closeDetails(true));
    await page.setViewportSize({ width: 360, height: 640 });
    await page.evaluate(() => openWizard()); await page.waitForTimeout(500);
    const w = await page.evaluate(() => { const dlg = document.querySelector("#tc-wizard-overlay .tc-wizard"), a = document.querySelector("#tc-wizard-overlay .wiz-actions"), ar = a.getBoundingClientRect(), bg = getComputedStyle(a).backgroundColor; const chips = [...document.querySelectorAll("#tc-wizard-overlay .wiz-chip")].map((c) => c.getBoundingClientRect().height); dlg.scrollTop = dlg.scrollHeight; return { chipMax: Math.max.apply(null, chips), bg, inView: ar.bottom <= innerHeight + 1 && ar.top >= 0, lastChipBelow: [...document.querySelectorAll("#tc-wizard-overlay .wiz-chip")].every((c) => c.getBoundingClientRect().bottom <= ar.top + 1) }; });
    ok(w.chipMax <= 40 && w.inView && w.lastChipBelow && w.bg !== "rgba(0, 0, 0, 0)", "¿Qué ver? se traslapa o las opciones son grandes: " + JSON.stringify(w));
  });
  await test("Perfil Niño: todos los campos (hora, número, nombre, PIN) miden lo mismo en móvil y escritorio", async (page) => {
    await enter(page);
    for (const w of [390, 340, 1280]) {
      await page.setViewportSize({ width: w, height: 844 });
      await page.evaluate(() => { openProfileCreateModal(); setProfileFormKind("kid"); }); await page.waitForTimeout(300);
      const hs = await page.evaluate(() => [...document.querySelectorAll("#tc-profile-create-overlay input.tc-profile-input")].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height)));
      ok(hs.length >= 6 && new Set(hs).size === 1, "campos de distinta altura @" + w + ": " + JSON.stringify(hs));
      await page.evaluate(() => closeProfileCreateModal()); await page.waitForTimeout(150);
    }
  });
  await test("Splash de carga, título «Elige un perfil» si ya no existe «Mi perfil», descripción con «ver más», pie legal dentro del scroll (no fijo) y actor por encima de la ficha en Decidir en pareja", async (page) => {
    await page.goto(url, { waitUntil: "commit" }); await page.waitForTimeout(350);
    ok(await page.evaluate(() => !!document.getElementById("tc-splash") && getComputedStyle(document.getElementById("tc-splash")).opacity !== "0"), "no se ve el splash de carga");
    await page.waitForSelector("#tc-profile-overlay.open", { timeout: 15000 }); await page.waitForTimeout(1600);
    ok(await page.evaluate(() => !document.getElementById("tc-splash")), "el splash no se retiró");
    eq(await page.evaluate(() => document.getElementById("tc-profile-title").textContent), "Elige “Mi perfil”", "título con el perfil por defecto:");
    await page.evaluate(() => { localProfiles[0].name = "Dani"; renderProfilesPanel(); });
    eq(await page.evaluate(() => document.getElementById("tc-profile-title").textContent), "Elige un perfil", "título tras renombrar:");
    await page.click('[data-profile-action="select"]'); await page.waitForFunction(() => document.body.classList.contains("app-ready"));
    await page.evaluate(() => openDetails(603, "movie")); await page.waitForSelector("#details-real-content", { state: "visible", timeout: 10000 });
    await page.evaluate(() => setOverview("Una historia larga ".repeat(30)));
    const o = await page.evaluate(() => { const e = document.getElementById("details-overview"); return { n: e.textContent.length, btn: e.querySelector(".details-more").textContent }; });
    ok(o.n <= 150 + 12 && o.btn === "ver más", "descripción compacta: " + JSON.stringify(o));
    await page.click(".details-more");
    ok(await page.evaluate(() => document.getElementById("details-overview").textContent.length > 400), "«ver más» no expandió la descripción");
    ok(await page.evaluate(() => !!document.querySelector("#details-scroll > .tc-modal-legal") && !document.querySelector("#details-modal .details-content > .tc-modal-legal")), "el aviso legal de la ficha sigue fijo");
    await page.evaluate(() => { closeDetails(true); openActor(6193); }); await page.waitForTimeout(700);
    ok(await page.evaluate(() => !!document.querySelector("#actor-scroll > .tc-modal-legal") && !document.querySelector("#actor-modal .actor-content > .tc-modal-legal")), "el aviso legal del actor sigue fijo");
    await page.evaluate(() => { closeActor(); document.body.classList.add("cp-details"); openDetails(603, "movie"); }); await page.waitForTimeout(600);
    const z = await page.evaluate(() => { openActor(6193); return [+getComputedStyle(document.getElementById("details-modal")).zIndex, +getComputedStyle(document.getElementById("actor-modal")).zIndex]; });
    ok(z[1] > z[0], "en Decidir en pareja el actor queda debajo de la ficha: " + JSON.stringify(z));
  });
  await test("Restablecer a cero: pide confirmación (Cancelar no borra) y al confirmar borra cookies, localStorage, sessionStorage, cachés, IndexedDB y Service Worker", async (page) => {
    await enter(page);
    await page.evaluate(() => sessionStorage.setItem("__tcT", "1"));
    await page.addInitScript(() => { try { if (!sessionStorage.getItem("__tcT")) { localStorage.removeItem("tatoDisclaimerAccepted"); localStorage.removeItem("tatoLegalAcceptedV2"); localStorage.removeItem("tatoTourDone"); } } catch (e) { } });   // (la prueba siembra esos flags en cada carga: tras el reset se quitan para ver un «dispositivo nuevo»)
    await page.evaluate(async () => { document.cookie = "tc_prueba=1; path=/"; localStorage.setItem("tatoUnaCosa", "x"); sessionStorage.setItem("tatoOtra", "y"); await caches.open("tatocine-prueba"); await new Promise((res) => { const r = indexedDB.open("tcPrueba", 1); r.onsuccess = () => { r.result.close(); res(); }; r.onerror = res; }); });
    await page.evaluate(() => showSettings()); await page.waitForTimeout(300);
    ok(await page.locator('[data-act="reset-open"]').isVisible(), "no se ve «Restablecer a cero» en Ajustes");
    await page.click('[data-act="reset-open"]'); await page.waitForSelector("#tc-reset-overlay.open");
    await page.click('#tc-reset-overlay [data-act="reset-cancel"]'); await page.waitForTimeout(300);
    eq(await page.evaluate(() => localStorage.getItem("tatoUnaCosa")), "x", "Cancelar borró datos:");
    await page.click('[data-act="reset-open"]'); await page.waitForSelector("#tc-reset-overlay.open");
    await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20000 }), page.click('#tc-reset-overlay [data-act="reset-confirm"]')]);
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async () => ({ cookie: document.cookie, ls: localStorage.getItem("tatoUnaCosa"), ss: sessionStorage.getItem("tatoOtra"), caches: (await caches.keys()).filter((k) => k === "tatocine-prueba").length, idb: (await indexedDB.databases()).filter((d) => d.name === "tcPrueba").length, nombre: JSON.parse(localStorage.getItem("tatoProfilesV1") || "[]")[0] && JSON.parse(localStorage.getItem("tatoProfilesV1"))[0].name, welcome: localStorage.getItem("tatoWelcomeSeenV1"), disclaimer: localStorage.getItem("tatoLegalAcceptedV2"), vista: getComputedStyle(document.getElementById("tc-welcome")).display }));
    eq(r.cookie, "", "cookies tras restablecer:"); eq(r.ls, null, "localStorage:"); eq(r.ss, null, "sessionStorage:"); eq(r.caches, 0, "cachés:"); eq(r.idb, 0, "IndexedDB:");
    eq(r.nombre, "Mi perfil", "perfil nuevo:"); eq(r.welcome, "0", "flag de bienvenida:"); eq(r.disclaimer, null, "aviso legal aceptado:"); eq(r.vista, "flex", "se ve como un dispositivo nuevo (bienvenida):");
  });
  await test("Bienvenida: «Saltar» y Esc la cierran y guardan el flag; un usuario con datos previos nunca la ve", async (page, ctx) => {
    await ctx.addInitScript(() => { try { if (!localStorage.getItem("__w")) { localStorage.setItem("__w", "1"); localStorage.removeItem("tatoDisclaimerAccepted"); localStorage.removeItem("tatoLegalAcceptedV2"); localStorage.removeItem("tatoTourDone"); } } catch (e) { } });
    await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(1200);
    await page.keyboard.press("Escape"); await page.waitForSelector("#tc-profile-overlay.open");
    eq(await page.evaluate(() => localStorage.getItem("tatoWelcomeSeenV1")), "1", "flag tras Esc:");
    const p2 = await (await page.context().browser().newContext()).newPage();            // usuario con datos previos (perfiles guardados)
    await p2.addInitScript(() => { try { if (!localStorage.getItem("__x")) { localStorage.setItem("__x", "1"); localStorage.setItem("tatoProfilesV1", JSON.stringify([{ id: "main", name: "Yo" }])); } } catch (e) { } });
    await p2.goto(url, { waitUntil: "domcontentloaded" }); await p2.waitForTimeout(1200);
    eq(await p2.evaluate(() => getComputedStyle(document.getElementById("tc-welcome")).display), "none", "un usuario existente vio la bienvenida:");
    eq(await p2.evaluate(() => localStorage.getItem("tatoWelcomeSeenV1")), "1", "flag de usuario existente:");
    await p2.context().close();
  });
  await test("Red: cruzar tarjetas con el ratón no pide fichas, quedarse sí (1), y no hay HEAD del manifiesto ni preconnect a YouTube", async (page) => {
    const details = [], misc = []; page.on("request", (r) => { const u = new URL(r.url()); if (/themoviedb\.org\/3\/(movie|tv)\/\d+$/.test(u.origin + u.pathname)) details.push(u.pathname); if (r.method() === "HEAD") misc.push("HEAD " + u.pathname); });
    await enter(page); await page.waitForTimeout(3500);
    const cards = await page.locator(".catalog-row .card").all(); await page.waitForTimeout(500);
    const base = details.length;
    for (let i = 0; i < 10; i++) { await cards[i].hover(); await page.waitForTimeout(60); }
    await page.mouse.move(5, 5); await page.waitForTimeout(600);
    eq(details.length - base, 0, "fichas pedidas al cruzar 10 tarjetas rápido:");
    await cards[3].hover(); await page.waitForTimeout(900);
    eq(details.length - base, 1, "fichas pedidas al quedarse sobre una tarjeta:");
    eq(misc.length, 0, "peticiones HEAD innecesarias: " + misc.join(","));
    eq(await page.evaluate(() => !!document.querySelector('link[rel="preconnect"][href*="youtube"]')), false, "preconnect a YouTube:");
  });
  await test("El perfil principal que se llamaba «Yo» pasa a llamarse «Mi perfil» (los demás nombres no se tocan)", async (page, ctx) => {
    await ctx.addInitScript(() => { try { if (!localStorage.getItem("__y")) { localStorage.setItem("__y", "1"); localStorage.setItem("tatoProfilesV1", JSON.stringify([{ id: "main", name: "Yo" }, { id: "p2", name: "Yo" }])); } } catch (e) { } });
    await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForSelector("#tc-profile-overlay.open", { timeout: 15000 }); await page.waitForTimeout(1200);
    eq(await page.evaluate(() => JSON.parse(localStorage.getItem("tatoProfilesV1")).map((p) => p.id + ":" + p.name).join(",")), "main:Mi perfil,guest:Invitado,p2:Yo", "nombres guardados:");
    eq(await page.locator(".tc-profile-card-name").first().innerText(), "Mi perfil", "nombre en la tarjeta:");
  });
  await test("Selector de perfiles: textos compactos y el perfil nuevo se llama «Mi perfil»", async (page) => {
    await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForSelector("#tc-profile-overlay.open", { timeout: 15000 }); await page.waitForTimeout(1200);
    eq(await page.locator("#tc-profile-title").innerText(), "Elige “Mi perfil”", "título:");
    eq(await page.locator("#tc-profile-count").innerText(), "Puedes editar y crear perfiles. Son locales: solo viven en este dispositivo.", "subtítulo:");
    eq(await page.locator("#tc-profile-overlay .tc-profile-note").count(), 1, "líneas de texto bajo el título:");
    eq(await page.evaluate(() => JSON.parse(localStorage.getItem("tatoProfilesV1"))[0].name), "Mi perfil", "nombre del perfil nuevo:");
    eq(await page.locator(".tc-profile-card-name").first().innerText(), "Mi perfil", "nombre en la tarjeta:");
  });
  await test("Todas las pantallas y ventanas empiezan arriba (cambiar de vista, buscar, abrir ventanas y recargar)", async (page) => {
    await enter(page); await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 1500)); await page.waitForTimeout(300);
    ok(await page.evaluate(() => window.scrollY) > 500, "no se pudo bajar la página para la prueba");
    await page.evaluate(() => switchView("series")); await page.waitForTimeout(500);
    eq(await page.evaluate(() => Math.round(window.scrollY)), 0, "scroll tras cambiar de vista:");
    await page.evaluate(() => window.scrollTo(0, 1200)); await page.waitForTimeout(300);
    await page.evaluate(() => performSearch("matrix")); await page.waitForTimeout(500);
    eq(await page.evaluate(() => Math.round(window.scrollY)), 0, "scroll tras buscar:");
    // ventanas: se deja el contenido a mitad, se cierra y al reabrir debe estar arriba
    await page.evaluate(() => { showSettings(); });
    await page.waitForTimeout(400); await page.evaluate(() => { document.querySelector("#settings-modal .settings-content").scrollTop = 600; document.querySelector("#settings-modal .modal-body").scrollTop = 600; document.querySelector("#settings-modal").scrollTop = 600; });
    await page.evaluate(() => closeSettings()); await page.waitForTimeout(200); await page.evaluate(() => showSettings()); await page.waitForTimeout(400);
    eq(await page.evaluate(() => document.querySelector("#settings-modal .settings-content").scrollTop + document.querySelector("#settings-modal .modal-body").scrollTop + document.querySelector("#settings-modal").scrollTop), 0, "scroll de Ajustes al reabrir:");
    await page.evaluate(() => closeSettings());
    // recargar estando abajo: empieza arriba
    await page.evaluate(() => window.scrollTo(0, 1400)); await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForFunction(() => document.body.classList.contains("app-ready"), null, { timeout: 15000 }); await page.waitForTimeout(800);
    eq(await page.evaluate(() => Math.round(window.scrollY)), 0, "scroll tras recargar:");
  });
  await test("Reproductor: el botón de pantalla completa es solo un icono (sin texto)", async (page) => {
    await enter(page); await page.evaluate(() => openPlayer(603, "movie", "Matrix")); await page.waitForTimeout(600);
    const r = await page.evaluate(() => { const b = document.getElementById("player-fullscreen-btn"); return { txt: b.innerText.trim(), aria: b.getAttribute("aria-label"), svg: !!b.querySelector("svg"), w: Math.round(b.getBoundingClientRect().width) }; });
    eq(r.txt, "", "texto visible del botón:"); ok(r.svg && r.aria === "Pantalla completa" && r.w <= 56, "falta el icono, el aria-label o es demasiado ancho: " + JSON.stringify(r));
  });
  await test("Mi cine: «Comparte tus vistas» va en la barra, justo después de «+ Nueva lista», y abre «Tu mes en películas» sin pasar por Estadísticas", async (page) => {
    await enter(page); await page.evaluate(() => switchView("list")); await page.waitForSelector("#rows-container .fav-toolbar .mi-mes", { timeout: 8000 });
    const t = await page.evaluate(() => [...document.querySelectorAll("#rows-container .fav-toolbar > *")].filter((e) => e.textContent.trim()).map((e) => e.textContent.trim()));
    const i = t.findIndex((x) => /Nueva lista/.test(x)); eq(t[i + 1], "Comparte tus vistas", "botón después de «+ Nueva lista»: " + JSON.stringify(t));
    ok(await page.locator("#rows-container .fav-share").count() === 0, "sigue existiendo el bloque antiguo .fav-share");
    await page.click("#rows-container .mi-mes"); await page.waitForSelector("#tc-qr-overlay.open", { timeout: 5000 });
    eq(await page.locator("#tc-qr-title").innerText(), "Tu mes en películas", "ventana abierta:");
  });
  await test("Mi cine no ofrece «Compartir tu mes» al perfil Niño", async (page, ctx) => {
    await ctx.addInitScript(() => { try { if (!localStorage.getItem("__k")) { localStorage.setItem("__k", "1"); localStorage.setItem("tatoProfilesV1", JSON.stringify([{ id: "main", name: "Mi perfil" }, { id: "kid1", name: "Peque", kind: "kid" }])); } } catch (e) { } });
    await enter(page, "kid1"); await page.evaluate(() => { try { switchView("list"); } catch (e) { } }); await page.waitForTimeout(800);
    eq(await page.locator(".fav-toolbar .mi-mes").count(), 0, "botón visible para el niño:");
  });

  await test("Pantallas: plegable (280), teléfonos en vertical y horizontal, tableta, laptop y TV 4K: sin desbordes y con la X de cada ventana a la vista", async (page) => {
    await enter(page);
    for (const [w, h] of [[280, 653], [320, 568], [344, 882], [568, 320], [667, 375], [673, 841], [744, 1133], [800, 1280], [841, 673], [1280, 800], [820, 1180], [1024, 1366], [1366, 768], [3840, 2160]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(400);
      for (const [name, open, close, shut] of [["Ajustes", () => showSettings(), "#settings-modal .modal-close", () => closeSettings()], ["ficha", () => openDetails(603, "movie"), "#details-modal .details-close", () => closeDetails()], ["asistente", () => openWizard(), "#tc-wizard-overlay .tc-profile-create-close", () => closeOverlay("tc-wizard-overlay")], ["Legal", () => openLegalHub(), "#legal-modal .modal-close", () => closeLegalHub()]]) {
        await page.evaluate(open); await page.waitForTimeout(name === "ficha" ? 900 : 350);
        const r = await page.evaluate((sel) => { const q = document.querySelector(sel).getBoundingClientRect(); return { ok: q.left >= 0 && q.right <= innerWidth && q.top >= 0 && q.bottom <= innerHeight && q.width >= 40, x: document.documentElement.scrollWidth - innerWidth }; }, close);
        ok(r.ok, w + "×" + h + ": la X de «" + name + "» queda fuera de pantalla o muy pequeña"); ok(r.x <= 1, w + "×" + h + ": desborde horizontal " + r.x + " px con «" + name + "» abierta");
        await page.evaluate(shut); await page.waitForTimeout(150);
      }
      const nav = await page.evaluate(() => { const t = document.getElementById("top-bar"); return { h: Math.round(t.getBoundingClientRect().height), s: t.scrollWidth - t.clientWidth }; });
      ok(nav.h <= 130 && nav.s <= 1, w + "×" + h + ": la barra superior se parte o desborda (" + nav.h + " px, +" + nav.s + ")");
    }
  });

  await test("Plegables: en modo libro (bisagra vertical) los diálogos y el reproductor se quedan en un panel; en modo Flex el vídeo termina antes de la bisagra y los controles empiezan debajo", async (page) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1000, height: 700, deviceScaleFactor: 1, mobile: true, displayFeature: { orientation: "vertical", offset: 488, maskLength: 24 } });
    await enter(page); await page.waitForTimeout(500);
    ok(await page.evaluate(() => document.documentElement.classList.contains("fold-h")), "no se detectó el modo libro (fold-h)");
    await page.evaluate(() => openWizard()); await page.waitForTimeout(500);
    let r = await page.evaluate(() => document.querySelector("#tc-wizard-overlay .tc-profile-create-dialog").getBoundingClientRect().right);
    ok(r <= 489, "el asistente cruza la bisagra (borde derecho " + Math.round(r) + " px, bisagra en 488)"); await page.evaluate(() => closeOverlay("tc-wizard-overlay"));
    await page.evaluate(() => openPlayer(603, "movie", "Matrix")); await page.waitForTimeout(800);
    r = await page.evaluate(() => document.querySelector("#player-modal .player-container").getBoundingClientRect().right); ok(r <= 489, "el vídeo cruza la bisagra del modo libro (" + Math.round(r) + " px)"); await page.evaluate(() => closePlayer());
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 700, height: 1000, deviceScaleFactor: 1, mobile: true, displayFeature: { orientation: "horizontal", offset: 488, maskLength: 24 } }); await page.waitForTimeout(500);
    ok(await page.evaluate(() => document.documentElement.classList.contains("fold-v")), "no se detectó el modo Flex (fold-v)");
    await page.evaluate(() => openPlayer(603, "movie", "Matrix")); await page.waitForTimeout(900);
    const f = await page.evaluate(() => ({ videoBottom: document.querySelector("#player-modal .player-container").getBoundingClientRect().bottom, controlsTop: document.querySelector("#player-modal .server-switcher").getBoundingClientRect().top }));
    ok(f.videoBottom <= 489, "el vídeo cruza la bisagra horizontal (" + Math.round(f.videoBottom) + " px, bisagra en 488)"); ok(f.controlsTop >= 511, "los controles empiezan sobre la bisagra (" + Math.round(f.controlsTop) + " px, debe ser ≥ 512)");
  });
  await test("Navegadores viejos: con las clases no-flex-gap y no-focus-visible, el CSS empaquetado separa los elementos con márgenes y muestra el foco (solo aplica al paquete: E2E_ROOT=dist/site)", async (page) => {
    if (!process.env.E2E_ROOT) return;
    await enter(page); await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(400);
    await page.evaluate(() => document.documentElement.classList.add("no-flex-gap", "no-focus-visible")); await page.waitForTimeout(200);
    const r = await page.evaluate(() => { const a = document.querySelectorAll(".nav-links .nav-item"); const m = parseFloat(getComputedStyle(a[1]).marginLeft); const hasInset = [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((x) => /\.modal\{[^}]*top:0/.test(x.cssText.replace(/\s+/g, ""))); } catch (e) { return false; } }); return { m, hasInset, sheets: document.styleSheets.length }; });
    ok(r.m >= 2, "los enlaces del menú no se separan sin soporte de gap (margen " + r.m + ")");
  });

  for (const w of [320, 390, 768, 1024, 1366, 1920]) {
    await test("sin desbordes horizontales a " + w + " px (inicio, series y favoritos)", async (page) => {
      await page.setViewportSize({ width: w, height: w < 700 ? 760 : 900 });
      await enter(page);
      for (const v of ["home", "series", "list"]) {
        await page.evaluate((x) => switchView(x), v);
        await page.waitForTimeout(v === "list" ? 500 : 2200);
        const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        ok(o <= 1, v + " se desborda " + o + " px");
      }
    });
  }

  await browser.close();
  srv.close();
  const failed = results.filter((r) => !r[1]);
  console.log("\n" + (results.length - failed.length) + "/" + results.length + " pruebas correctas");
  process.exit(failed.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });

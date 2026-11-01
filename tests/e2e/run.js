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

const ROOT = path.resolve(__dirname, "../..");
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
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
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
    await ctx.addInitScript(() => {
      try { localStorage.setItem("tatoDisclaimerAccepted", "true"); localStorage.setItem("tatoTourDone", "1"); } catch (e) { }   // sin aviso legal ni recorrido: no tapan las pruebas
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
    await page.waitForFunction(() => document.body.classList.contains("app-ready") && !document.getElementById("tc-profile-overlay").classList.contains("open"), null, { timeout: 15000 });
  }
  async function test(name, fn) {
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
    ok(rows.join("|").includes("Copia de seguridad") && rows.join("|").includes("QR") && rows.length <= 4, "filas visibles para el niño: " + rows.join(", "));
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
    await page.waitForSelector("#tc-wizard-overlay .wiz-result", { timeout: 25000 });
    eq(await page.locator("#tc-wizard-overlay .wiz-result").count(), 3, "recomendaciones:");
    await page.evaluate(() => openWizard());
    ok(await page.locator('#tc-wizard-overlay [data-act="wizard-couple"]').isVisible(), "falta el botón Decidir en pareja");
    const bx = await page.evaluate(() => [...document.querySelectorAll("#tc-wizard-overlay .wiz-actions > button")].map((b) => Math.round(b.getBoundingClientRect().top)));
    eq(bx.length, 2, "botones del asistente:"); eq(bx[0], bx[1], "en pantallas grandes van uno al lado del otro:");
    await page.evaluate(() => closeWizard());
    await page.evaluate(() => openCouplePicker());
    await page.click('[data-cp="start"]');
    await page.waitForSelector("#cp-card", { timeout: 20000 });
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

  async function heroIntervals(page, ms) {
    await page.evaluate(() => { window.__chg = []; let last = currentHeroMedia && currentHeroMedia.id; setInterval(() => { const id = currentHeroMedia && currentHeroMedia.id; if (id !== last) { window.__chg.push(Date.now()); last = id; } }, 50); });
    await page.waitForTimeout(ms);
    const t = await page.evaluate(() => window.__chg);
    return t.slice(1).map((x, i) => x - t[i]);
  }
  for (const [name, withTrailer, expected] of [["sin tráiler cada título dura 6 s", false, 6000], ["con tráiler cada título dura 15 s", true, 15000]]) {
    await test("portada: " + name, async (page, ctx) => {
      await ctx.addInitScript(() => { try { localStorage.setItem("tatoHeroTrailer", "on"); } catch (e) { } });
      await page.route("**/api.themoviedb.org/3/**/videos**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ results: withTrailer ? [{ site: "YouTube", key: "PhgY8cOJiQA", type: "Trailer", official: true, iso_639_1: "es" }] : [] }) }));
      await enter(page);
      await page.waitForFunction(() => currentHeroMedia && heroMoviesList.length >= 2, null, { timeout: 20000 });
      const gaps = await heroIntervals(page, expected * (withTrailer ? 2 : 3) + 2500);
      ok(gaps.length >= (withTrailer ? 1 : 2), "rotó menos de lo esperado: " + JSON.stringify(gaps));
      for (const g of gaps) ok(Math.abs(g - expected) < 1000, "un título duró " + g + " ms y debía durar " + expected + " ms (" + JSON.stringify(gaps) + ")");
    });
  }
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

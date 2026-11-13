#!/usr/bin/env node
/**
 * TatoCine · tools/gen-screens.js
 * Regenera las capturas de la PWA (icons/screens/*.png, las que enumera manifest.webmanifest) con la interfaz ACTUAL, sin red (TMDB simulado).
 * Requiere Playwright de tests/e2e (npm i en esa carpeta). Uso: node tools/gen-screens.js  y después  python3 tools/optimize-images.py
 */
const http = require("node:http"), fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const ROOT = path.resolve(__dirname, ".."), OUT = path.join(ROOT, "icons", "screens");
const { chromium } = require(path.join(ROOT, "tests/e2e/node_modules/playwright-core"));
const MIME = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json" };
function findChrome() { const c = path.join(os.homedir(), ".cache/ms-playwright"); for (const d of fs.readdirSync(c).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) for (const s of ["chrome-linux64/chrome", "chrome-linux/chrome"]) if (fs.existsSync(path.join(c, d, s))) return path.join(c, d, s); }
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(r); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const url = "http://127.0.0.1:" + srv.address().port + "/";
  const browser = await chromium.launch({ executablePath: findChrome(), args: ["--no-sandbox"] });
  const sizes = { movil: { width: 540, height: 960 }, escritorio: { width: 1280, height: 720 } };
  for (const [kind, vp] of Object.entries(sizes)) {
    // Bienvenida (paso 1) y «Tus perfiles son tuyos» (paso 3): usuario nuevo
    let ctx = await browser.newContext({ viewport: vp, locale: "es-ES" });
    await require(path.join(ROOT, "tests/e2e/mock-tmdb.js")).install(ctx);
    await ctx.addInitScript(() => { window.__TC_SPLASH_MS = 0; });
    let page = await ctx.newPage(); await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForSelector("#tc-welcome", { state: "visible" }); await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, "bienvenida-" + kind + ".png") });
    await page.click('[data-tw="next"]'); await page.click('[data-tw="next"]'); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "privacidad-" + kind + ".png") });
    await ctx.close();
    // Ajustes: usuario con perfil
    ctx = await browser.newContext({ viewport: vp, locale: "es-ES" });
    await require(path.join(ROOT, "tests/e2e/mock-tmdb.js")).install(ctx);
    await ctx.addInitScript(() => { window.__TC_SPLASH_MS = 0; try { localStorage.setItem("tatoLegalAcceptedV2", "true"); localStorage.setItem("tatoWelcomeSeenV1", "1"); localStorage.setItem("tatoTourDone", "1"); } catch (e) { } });
    page = await ctx.newPage(); await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForSelector("#tc-profile-overlay.open"); await page.click('[data-profile-action="select"]');
    await page.waitForFunction(() => document.body.classList.contains("app-ready")); await page.evaluate(() => showSettings()); await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, "ajustes-" + kind + ".png") });
    await ctx.close();
  }
  await browser.close(); srv.close(); console.log("capturas regeneradas en icons/screens");
})();

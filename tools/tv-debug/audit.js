// Auditoría de servidores (solo desarrollo). Uso:
//   node tools/tv-debug/audit.js '[{"tag":"op1","url":"https://api.moviemaster.lat/e/movie/1368337?color=000000&lang=LAT&autoplay=1"}]'
//   Variables: WAIT (ms), CLICK=1 (clic en el centro), OPT ("Opción 2"…), SANDBOX ("allow-scripts …"), CHROME_PATH, HEAD=1 (ventana visible).
// Sirve un iframe como si fuera https://tatocine.vercel.app y mide dentro: resolución real, búfer, ventanas emergentes y dominios pedidos.
const { chromium } = require(require("path").join(__dirname, "../../tests/e2e/node_modules/playwright-core"));
const fs = require("fs");
const OUT = require("path").join(__dirname, "tv") + "/"; require("fs").mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME_PATH || undefined;   // vacío: el Chromium de Playwright
const urls = JSON.parse(process.argv[2]);           // [{tag,url}]
const WAIT = +(process.env.WAIT || 25000);
(async () => {
  const b = await chromium.launch({ executablePath: exe, headless: process.env.HEAD ? false : true, args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
  for (const u of urls) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" });
    const page = await ctx.newPage();
    const hosts = {}, popups = [];
    ctx.on("page", (p) => popups.push(p.url()));
    page.on("request", (r) => { try { const h = new URL(r.url()).hostname; hosts[h] = (hosts[h] || 0) + 1; } catch (e) { } });
    await page.route("https://tatocine.vercel.app/__audit", (route) => route.fulfill({ contentType: "text/html", body:
      '<!doctype html><body style="margin:0;background:#000"><iframe id=f src="' + u.url + '" style="width:100vw;height:100vh;border:0" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="origin"' + (process.env.SANDBOX ? ' sandbox="' + process.env.SANDBOX + '"' : '') + '></iframe></body>' }));
    const t0 = Date.now();
    await page.goto("https://tatocine.vercel.app/__audit").catch(() => { });
    await page.waitForTimeout(4000);
    let ui = "";
    try {
      const fr = page.frames()[1];
      ui = await fr.evaluate(() => [...document.querySelectorAll("button,select,option,[role=button],li")].map((e) => (e.tagName + ":" + (e.innerText || e.value || "").trim().replace(/\s+/g, " ")).slice(0, 40)).filter((x) => x.length > 4).slice(0, 40).join(" · "));
      if (process.env.OPT) await fr.evaluate((o) => { const all = [...document.querySelectorAll("button,li,[role=option],option,a,div")]; const el = all.reverse().find((e) => (e.innerText || "").trim() === o); if (el) el.click(); }, process.env.OPT);
      await fr.locator("text=Reproducir").first().click({ timeout: 3000 }).catch(() => { });
      if (process.env.CLICK) { await page.mouse.click(640, 360); }
    } catch (e) { }
    const samples = [];
    for (let t = 0; t < WAIT; t += 5000) {
      await page.waitForTimeout(5000);
      const vids = [];
      for (const fr of page.frames()) {
        try {
          const v = await fr.evaluate(() => [...document.querySelectorAll("video")].map((x) => ({ w: x.videoWidth, h: x.videoHeight, rs: x.readyState, t: Math.round(x.currentTime * 10) / 10, p: !x.paused, src: (x.currentSrc || "").slice(0, 60), buf: x.buffered.length ? Math.round((x.buffered.end(x.buffered.length - 1) - x.currentTime) * 10) / 10 : 0 })));
          v.forEach((x) => { x.frame = new URL(fr.url()).hostname; vids.push(x); });
        } catch (e) { }
      }
      samples.push({ s: Math.round((Date.now() - t0) / 1000), vids });
    }
    const frames = page.frames().map((f) => f.url().slice(0, 90));
    let text = "";
    try { text = (await page.frames()[1].evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 200); } catch (e) { }
    await page.screenshot({ path: OUT + u.tag + ".png" }).catch(() => { });
    console.log(JSON.stringify({ tag: u.tag, ui, frames, popups, text, samples: samples.map((s) => s.s + "s " + s.vids.map((v) => `${v.frame} ${v.w}x${v.h} rs${v.rs} t${v.t} ${v.p ? "▶" : "⏸"} buf${v.buf}`).join(" | ")), topHosts: Object.entries(hosts).sort((a, b) => b[1] - a[1]).slice(0, 12).map((x) => x.join(":")).join(" ") }, null, 1));
    await ctx.close();
  }
  await b.close();
})();

#!/usr/bin/env node
/**
 * TatoCine · tools/check-servers.js
 * Comprueba con la red REAL que cada servidor de js/core/config.js responde para una película y una serie (solo cabeceras/estado HTTP, nada se descarga ni se guarda).
 * Se pide como lo haría el iframe: con Referer del sitio y Sec-Fetch-Dest: iframe (algunos servidores devuelven 403 si no hay Referer). No forma parte de `node tests/*.test.js`
 * porque depende de terceros y de la red. Uso: node tools/check-servers.js [https://tu-sitio/]
 */
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const site = process.argv[2] || "https://tatocine.vercel.app/";
const ctx = { window: { TATOCINE_CONFIG: { TMDB_API_KEY: "x" } }, console, document: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js/core/config.js"), "utf8") + "\n;globalThis.__S = SERVERS;", ctx);
const SERVERS = ctx.__S;
(async () => {
  let bad = 0;
  for (const s of SERVERS) for (const [label, url] of [["película 550", s.url(550, "movie")], ["serie 1399 T1E1", s.url(1399, "tv", 1, 1)]]) {
    try {
      const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Mozilla/5.0", Referer: site, "Sec-Fetch-Dest": "iframe" } });
      const ok = r.status >= 200 && r.status < 400, xfo = r.headers.get("x-frame-options") || "", csp = r.headers.get("content-security-policy") || "";
      const blocked = /deny|sameorigin/i.test(xfo) || (/frame-ancestors/i.test(csp) && !/frame-ancestors[^;]*(\*|https:)/i.test(csp));
      if (!ok || blocked) bad++;
      console.log((ok && !blocked ? "✓" : "✗") + " " + s.name + " " + label + " → HTTP " + r.status + (blocked ? " (no permite iframe: " + (xfo || csp) + ")" : "") + "  " + new URL(url).hostname);
    } catch (e) { bad++; console.log("✗ " + s.name + " " + label + " → " + e.message); }
  }
  console.log(bad ? "\n" + bad + " comprobaciones fallaron" : "\nTodos los servidores responden");
  process.exit(bad ? 1 : 0);
})();

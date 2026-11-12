#!/usr/bin/env node
/**
 * TatoCine · tools/gen-headers.js
 * UNA sola fuente para las cabeceras HTTP de los tres hostings: genera `_headers` (Netlify, también al arrastrar el ZIP), `netlify.toml` (Netlify por Git/CLI) y
 * la sección `headers` de `vercel.json`. La CSP sale de la etiqueta <meta http-equiv="Content-Security-Policy"> de index.html (más frame-ancestors y
 * upgrade-insecure-requests, que solo valen como cabecera), así que nunca se desincronizan.
 *   node tools/gen-headers.js          → reescribe los tres archivos
 *   node tools/gen-headers.js --check  → sale con error si alguno está desactualizado (tests/headers-sync.test.js)
 * Caché: /css/* y /js/* son INMUTABLES un año porque index.html los pide con ?v=<hash del archivo> (tools/stamp.js); index.html, config.js, sw.js, manifiesto y
 * build.json van siempre con no-cache. Si cambias un CSS/JS ejecuta tools/stamp.js (o tools/package.js) para que el ?v= cambie.
 */
const fs = require("node:fs"), path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const meta = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html);
if (!meta) { console.error("No encuentro la CSP en index.html"); process.exit(1); }
const CSP = meta[1].trim() + "; frame-ancestors 'self'; upgrade-insecure-requests";
const SECURITY = [
  ["X-Content-Type-Options", "nosniff"], ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()"],
  ["X-Frame-Options", "SAMEORIGIN"], ["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
  ["Content-Security-Policy", CSP], ["Cross-Origin-Opener-Policy", "same-origin-allow-popups"]
];
const NOCACHE = "no-cache", IMMUTABLE = "public, max-age=31536000, immutable", SHORT = "public, max-age=3600", WEEK = "public, max-age=604800";
// { p: ruta Netlify, v: ruta Vercel, h: cabeceras }
const RULES = [
  { p: "/*", v: "/(.*)", h: SECURITY },
  { p: "/", v: "/", h: [["Cache-Control", NOCACHE]] },
  { p: "/index.html", v: "/index.html", h: [["Cache-Control", NOCACHE]] },
  { p: "/config.js", v: "/config.js", h: [["Cache-Control", NOCACHE]] },
  { p: "/sw.js", v: "/sw.js", h: [["Cache-Control", NOCACHE], ["Service-Worker-Allowed", "/"]] },
  { p: "/build.json", v: "/build.json", h: [["Cache-Control", NOCACHE], ["Access-Control-Allow-Origin", "*"]] },
  { p: "/manifest.webmanifest", v: "/manifest.webmanifest", h: [["Content-Type", "application/manifest+json"], ["Cache-Control", NOCACHE]] },
  { p: "/offline.html", v: "/offline.html", h: [["Cache-Control", NOCACHE]] },
  { p: "/css/*", v: "/css/(.*)", h: [["Cache-Control", IMMUTABLE]] },
  { p: "/js/*", v: "/js/(.*)", h: [["Cache-Control", IMMUTABLE]] },
  { p: "/icons/*", v: "/icons/(.*)", h: [["Cache-Control", WEEK]] },
  { p: "/robots.txt", v: "/robots.txt", h: [["Cache-Control", SHORT]] },
  { p: "/sitemap.xml", v: "/sitemap.xml", h: [["Cache-Control", SHORT]] },
  { p: "/llms.txt", v: "/llms.txt", h: [["Cache-Control", SHORT]] },
  { p: "/llm.txt", v: "/llm.txt", h: [["Cache-Control", SHORT]] },
  { p: "/404.html", v: "/404.html", h: [["X-Robots-Tag", "noindex"], ["Cache-Control", NOCACHE]] },
  { p: "/500.html", v: "/500.html", h: [["X-Robots-Tag", "noindex"], ["Cache-Control", NOCACHE]] }
];
const q = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
function netlifyHeaders() {
  return "# GENERADO por tools/gen-headers.js (no editar a mano). Netlify aplica este archivo también al arrastrar la carpeta o el ZIP. Vercel: vercel.json.\n" +
    RULES.map((r) => r.p + "\n" + r.h.map(([k, v]) => "  " + k + ": " + v).join("\n")).join("\n") + "\n";
}
function netlifyToml() {
  return "# GENERADO por tools/gen-headers.js (no editar a mano). Misma configuración que _headers, para despliegues por Git/CLI de Netlify.\n[build]\n  publish = \".\"\n\n" +
    RULES.map((r) => "[[headers]]\n  for = " + q(r.p) + "\n  [headers.values]\n" + r.h.map(([k, v]) => "    " + (/^[A-Za-z0-9_-]+$/.test(k) ? k : q(k)) + " = " + q(v)).join("\n")).join("\n\n") + "\n";
}
function vercelJson() {
  const cur = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  cur.headers = RULES.map((r) => ({ source: r.v, headers: r.h.map(([key, value]) => ({ key, value })) }));
  return JSON.stringify(cur, null, 2) + "\n";
}
const OUT = { "_headers": netlifyHeaders(), "netlify.toml": netlifyToml(), "vercel.json": vercelJson() };
if (process.argv.includes("--check")) {
  const bad = Object.keys(OUT).filter((f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8") !== OUT[f]; } catch (e) { return true; } });
  if (bad.length) { console.error("✗ Desactualizados: " + bad.join(", ") + ". Ejecuta: node tools/gen-headers.js"); process.exit(1); }
  console.log("✓ _headers, netlify.toml y vercel.json coinciden con la fuente única"); process.exit(0);
}
Object.keys(OUT).forEach((f) => fs.writeFileSync(path.join(ROOT, f), OUT[f]));
console.log("Generados: " + Object.keys(OUT).join(", "));

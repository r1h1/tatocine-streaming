#!/usr/bin/env node
/**
 * TatoCine · tools/package.js
 * Crea el ZIP de PRODUCCIÓN (el que subes a Netlify/Vercel): solo lo que la app necesita. Excluye .git, tests, docs, tools, node_modules,
 * variables de entorno, archivos temporales y la imagen fuente de los iconos. Antes comprueba que sw.js esté al día (tools/stamp.js).
 *   node tools/package.js        → dist/tatocine-<versión>.zip
 * Sube EL MISMO ZIP a los cuatro despliegues: así son réplicas idénticas (compáralas con  curl <dominio>/build.json ).
 */
const { execFileSync, spawnSync } = require("node:child_process"), fs = require("node:fs"), path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const stamp = require("./stamp.js");
const want = stamp.compute(), sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8"), cur = (/^const VERSION = "(.*)";$/m.exec(sw) || [])[1];
if (cur !== want) { console.error("✗ sw.js está desactualizado (" + cur + " ≠ " + want + "). Ejecuta primero: node tools/stamp.js"); process.exit(1); }
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
const out = path.join(ROOT, "dist", "tatocine-" + cur + ".zip");
if (fs.existsSync(out)) fs.unlinkSync(out);
const EXCLUDE = [".git/*", ".github/*", ".vscode/*", "tests/*", "docs/*", "tools/*", "dist/*", "node_modules/*", "*/node_modules/*", ".env", ".env.*", ".gitignore", ".DS_Store", "*.log", "*.map", "icons/inspiration.jpeg", "package.json", "package-lock.json", "README.md"];
const r = spawnSync("zip", ["-r", "-q", out, ".", "-x"].concat(EXCLUDE), { cwd: ROOT, stdio: "inherit" });
if (r.error || r.status !== 0) { console.error("✗ No se pudo crear el ZIP (¿está instalado `zip`?)"); process.exit(1); }
const list = execFileSync("unzip", ["-Z1", out], { encoding: "utf8" }).trim().split("\n");
const bad = list.filter((f) => /(^|\/)(\.git|tests|node_modules|docs|tools)(\/|$)|\.env/.test(f));
if (bad.length) { console.error("✗ El ZIP incluye archivos de desarrollo: " + bad.slice(0, 5).join(", ")); process.exit(1); }
console.log("✓ " + path.relative(ROOT, out) + "  (" + list.length + " archivos, " + (fs.statSync(out).size / 1024).toFixed(0) + " KB)  ·  versión " + cur);

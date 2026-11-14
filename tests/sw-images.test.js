/**
 * Imágenes de TMDB y Service Worker: el CDN de TMDB solo responde WebP (≈ 30–50 % menos bytes que JPEG) si la petición lo anuncia en `Accept`; un fetch() del Service
 * Worker con el Accept por defecto recibía JPEG. Esta prueba comprueba que sw.js reenvía el Accept del navegador y que no usa el Accept por defecto.
 * (La respuesta real del CDN se comprobó con curl; esta prueba evita que se pierda sin avisar.)  Ejecutar: node tests/sw-images.test.js
 */
const fs = require("node:fs"), path = require("node:path");
const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
const bad = [];
if (!/headers:\s*\{\s*Accept:\s*req\.headers\.get\("accept"\)/.test(sw)) bad.push("sw.js no reenvía el Accept del navegador al pedir imágenes de TMDB");
if (/new Request\(req\.url,\s*\{\s*mode:\s*"cors",\s*credentials:\s*"omit"\s*\}\)/.test(sw)) bad.push("sw.js aún pide imágenes con el Accept por defecto (llega JPEG)");
if (bad.length) { console.error("✗ imágenes:\n  " + bad.join("\n  ")); process.exit(1); }
console.log("✓ imágenes de TMDB: el Service Worker pide WebP reenviando el Accept del navegador");

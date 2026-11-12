/**
 * TatoCine · js/core/diagnostics.js
 * Diagnóstico técnico NO invasivo, exportable desde Ajustes. Solo cifras: llamadas a TMDB por tipo de endpoint, aciertos de caché, 429/5xx/timeouts,
 * reintentos, bytes transferidos por categoría, LCP/CLS, frecuencia de pantalla y modo (navegador/PWA). NO incluye títulos, historial, favoritos,
 * nombres de perfil, PIN ni IP. Nada se envía a ningún sitio: el usuario lo copia o lo descarga si quiere compartirlo.
 */
var diagLCP = 0, diagCLS = 0;
try {
  new PerformanceObserver(function (l) { var e = l.getEntries(); if (e.length) diagLCP = Math.round(e[e.length - 1].startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (!e.hadRecentInput) diagCLS += e.value; }); }).observe({ type: "layout-shift", buffered: true });
} catch (e) { }
function diagBytes() {
  var cat = { css: 0, js: 0, imagenes: 0, api: 0, otros: 0 }, n = { css: 0, js: 0, imagenes: 0, api: 0, otros: 0 };
  try {
    performance.getEntriesByType("resource").forEach(function (r) {
      var u = r.name, k = /\.css(\?|$)/.test(u) ? "css" : /\.js(\?|$)/.test(u) ? "js" : /image\.tmdb\.org|\.(png|jpe?g|webp|svg)(\?|$)/.test(u) ? "imagenes" : /api\.themoviedb\.org/.test(u) ? "api" : "otros";
      cat[k] += r.transferSize || 0; n[k]++;
    });
  } catch (e) { }
  return { bytes: cat, peticiones: n };
}
async function tcDiagnostics() {
  var names = []; try { names = await caches.keys(); } catch (e) { }
  var shell = names.filter(function (k) { return k.indexOf("tatocine-shell-") === 0; })[0] || "";
  var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0], conn = navigator.connection || {};
  var b = diagBytes(), tm = {}; Object.keys(TMDB_STATS).forEach(function (k) { tm[k] = TMDB_STATS[k]; });
  return {
    generado: new Date().toISOString(), version: shell.replace("tatocine-shell-", "") || "sin Service Worker", pwa: IS_STANDALONE ? "instalada" : "navegador",
    idioma: UI_EN ? "en" : "es", pantalla_hz: window.TC_HZ || null, ancho: window.innerWidth, alto: window.innerHeight, tactil: !!(window.matchMedia && matchMedia("(pointer: coarse)").matches),
    red: { online: navigator.onLine, tipo: conn.effectiveType || null, ahorro_datos: !!conn.saveData },
    rendimiento: { lcp_ms: diagLCP || null, cls: Math.round(diagCLS * 1000) / 1000, dcl_ms: nav ? Math.round(nav.domContentLoadedEventEnd) : null, carga_ms: nav ? Math.round(nav.loadEventEnd) : null },
    transferencia: b, tmdb: { llamadas_por_endpoint: tm.calls, total_llamadas: Object.keys(tm.calls).reduce(function (a, k) { return a + tm.calls[k]; }, 0), aciertos_memoria: tm.memHits, deduplicadas: tm.dedup, reintentos: tm.retries, e429: tm.e429, e5xx: tm.e5xx, timeouts: tm.timeouts, errores: tm.errors },
    caches: names, nota: "Solo cifras técnicas. No incluye historial, títulos, perfiles, PIN ni IP."
  };
}
registerAction("diag-copy", async function () {
  var txt = JSON.stringify(await tcDiagnostics(), null, 2);
  try { await navigator.clipboard.writeText(txt); showToast(L("Diagnóstico copiado", "Diagnostics copied")); }
  catch (e) { var ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); showToast(L("Diagnóstico copiado", "Diagnostics copied")); } catch (x) { showToast(L("No se pudo copiar: usa Descargar", "Couldn't copy: use Download")); } ta.remove(); }
});
registerAction("diag-download", async function () {
  var blob = new Blob([JSON.stringify(await tcDiagnostics(), null, 2)], { type: "application/json" }), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "tatocine-diagnostico.json"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
});
if (typeof i18nAdd === "function") i18nAdd({ "Diagnóstico técnico": "Technical diagnostics", "Solo cifras de red y rendimiento, sin tu historial ni tus datos.": "Only network and performance figures, no history or personal data.", "Copiar": "Copy", "Descargar": "Download" });

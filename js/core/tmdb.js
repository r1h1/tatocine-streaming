/**
 * TatoCine · js/core/tmdb.js
 * Cliente de TMDB: caché en memoria, peticiones deduplicadas, tiempo límite e idioma por perfil.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    /** Defensa en el borde: toda ruta *_path debe ser «/archivo.ext» y todo id/contador debe ser un número. Lo demás se descarta (null). */
var TMDB_PATH_RE = /^\/[A-Za-z0-9_\-]{1,80}\.(?:jpg|jpeg|png|webp|svg)$/;
function tmdbSanitize(o, depth) {
  if (!o || typeof o !== "object" || depth > 8) return;
  if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) tmdbSanitize(o[i], depth + 1); return; }
  for (var k in o) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
    var v = o[k];
    if (/_path$/.test(k)) { if (v != null && (typeof v !== "string" || !TMDB_PATH_RE.test(v))) o[k] = null; }
    else if (k === "id" || k === "season_number" || k === "episode_number" || k === "episode_count" || k === "runtime") { if (v != null && typeof v !== "number") { var n = Number(v); o[k] = isFinite(n) ? n : null; } }
    else if (v && typeof v === "object") tmdbSanitize(v, depth + 1);
  }
}
/* ---------- Cola de peticiones a TMDB ----------
 * · Hasta 6 a la vez por pestaña (3 con «ahorro de datos»); las de baja prioridad (precargas, tráileres, similares) solo cuando hay menos de 3 en curso.
 * · Prioridad: búsqueda del usuario > ficha > filas del catálogo > precargas. Dentro de la misma prioridad, por orden de llegada.
 * · Con la pestaña oculta no salen las de baja prioridad.
 * · 429 / 5xx / red: hasta 2 reintentos con espera creciente y aleatoria (jitter); un 429 además pausa TODA la cola unos segundos.
 *   400/401/403/404 no se reintentan. Nunca hay bucles infinitos.
 */
var TQ = { running: 0, q: [], pausedUntil: 0, timer: null };
/** Contadores técnicos (solo en memoria, sin títulos ni datos del perfil) para el diagnóstico de Ajustes. */
var TMDB_STATS = { calls: {}, memHits: 0, dedup: 0, retries: 0, e429: 0, e5xx: 0, timeouts: 0, errors: 0 };
function tmdbStatKey(path) { return String(path).replace(/\/\d+/g, "/N"); }
function tqMax() { try { return navigator.connection && navigator.connection.saveData ? 3 : 6; } catch (e) { return 6; } }
function tmdbPriority(path) {
  if (/^\/search\b/.test(path)) return 1;
  if (/^\/(movie|tv)\/\d+$/.test(path)) return 2;
  if (/\/(videos|images|credits|recommendations|similar|watch\/providers|external_ids|season\/\d+)$/.test(path)) return 4;
  return 3;
}
function tqPump() {
  if (TQ.timer) return;
  var now = Date.now();
  if (TQ.pausedUntil > now) { TQ.timer = setTimeout(function () { TQ.timer = null; tqPump(); }, TQ.pausedUntil - now + 20); return; }
  while (TQ.running < tqMax() && TQ.q.length) {
    var bi = -1;
    for (var i = 0; i < TQ.q.length; i++) {
      var j = TQ.q[i];
      if (j.p >= 4 && (document.hidden || TQ.running >= 3)) continue;                   // baja prioridad: no con la pestaña oculta ni con la cola ocupada
      if (bi < 0 || j.p < TQ.q[bi].p) bi = i;
    }
    if (bi < 0) break;
    var job = TQ.q.splice(bi, 1)[0];
    TQ.running++;
    job.run().then(function (v) { TQ.running--; this.ok(v); tqPump(); }.bind(job), function (er) { TQ.running--; this.fail(er); tqPump(); }.bind(job));
  }
}
document.addEventListener("visibilitychange", function () { if (!document.hidden) tqPump(); });
function tmdbSchedule(priority, run) {
  return new Promise(function (ok, fail) { TQ.q.push({ p: priority, run: run, ok: ok, fail: fail }); tqPump(); });
}
function tmdbSleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function tmdbBackoff(attempt) { return Math.round((700 * Math.pow(2, attempt)) * (0.7 + Math.random() * 0.6)); }       // ~0,7 s, ~1,4 s (± 30 %)
/** Un GET con tiempo límite por intento y reintentos acotados. */
function tmdbGet(url, attempt) {
  var controller = typeof window.AbortController === "function" ? new AbortController() : null, options = { method: "GET", headers: { Accept: "application/json" } };
  if (controller) options.signal = controller.signal;
  var timer = setTimeout(function () { if (controller) controller.abort(); }, 18000);
  function retryOrThrow(err, wait) {
    if (attempt >= 2) throw err;
    TMDB_STATS.retries++;
    return tmdbSleep(wait).then(function () { return tmdbGet(url, attempt + 1); });
  }
  return fetch(url, options).then(function (r) {
    clearTimeout(timer);
    if (r.ok) return r.json();
    var he = new Error("TMDB HTTP " + r.status); he.status = r.status;
    if (r.status === 429) {
      TMDB_STATS.e429++;
      var ra = Number(r.headers && r.headers.get && r.headers.get("retry-after")), wait = isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 60000) : tmdbBackoff(attempt) + 1500;
      TQ.pausedUntil = Math.max(TQ.pausedUntil, Date.now() + wait);                      // toda la cola espera: no se insiste mientras TMDB pide calma
      if (wait > 10000) throw he;                                                         // piden esperar mucho: se informa, no se bloquea la pantalla
      return retryOrThrow(he, wait);
    }
    if (r.status >= 500) { TMDB_STATS.e5xx++; return retryOrThrow(he, tmdbBackoff(attempt)); }
    throw he;                                                                              // 400/401/403/404...: no se reintenta
  }, function (netErr) {
    clearTimeout(timer);
    if (netErr && netErr.name === "AbortError") { TMDB_STATS.timeouts++; if (attempt >= 1) throw netErr; return tmdbGet(url, attempt + 1); }   // el tiempo límite se reintenta una vez
    return retryOrThrow(netErr, tmdbBackoff(attempt));
  });
}

function fetchTMDB(e, q) {
      return new Promise(function (resolve, reject) {
        if (
          !TMDB_API_KEY ||
          TMDB_API_KEY.includes("TU_CLAVE") ||
          TMDB_API_KEY === "xxx" ||
          TMDB_API_KEY === "xx" ||
          TMDB_API_KEY === "xxxx"
        )
          return reject(new Error("Sin API Key"));
        if (window.tcRateLocked && !window.tcRateAllow) return; // bloqueo por exceso de recargas: no se pide nada a TMDB
        var key = e + "|" + (q || "");
        var now = Date.now();
        var cached = tmdbCache.get(key);
        if (cached && now - cached.ts < CACHE_TTL) { TMDB_STATS.memHits++; return resolve(cached.data); }
        if (tmdbPending.has(key)) {
          TMDB_STATS.dedup++;
          tmdbPending.get(key).then(resolve, reject);
          return;
        }
        var u;
        try {
          u = new URL("https://api.themoviedb.org/3" + e);
          u.searchParams.set("api_key", TMDB_API_KEY);
          u.searchParams.set("language", TMDB_LANG);
          if (activeProfileId === "guest") u.searchParams.set("_g", "1");   // el Service Worker no guarda estas respuestas
          var x = new URLSearchParams((q || "").replace(/^[?&]/, ""));
          x.forEach(function (v, k) {
            u.searchParams.set(k, v);
          });
        } catch (err) {
          return reject(err);
        }
        var sk = tmdbStatKey(e); TMDB_STATS.calls[sk] = (TMDB_STATS.calls[sk] || 0) + 1;
        var request = tmdbSchedule(tmdbPriority(e), function () { return tmdbGet(u.toString(), 0); })
          .then(function (d) {
            tmdbSanitize(d, 0);                                   // las rutas de imagen y los ids se validan aquí, una sola vez, antes de que lleguen a cualquier vista
            if (d && !d.error) {
              tmdbCache.set(key, { data: d, ts: Date.now() });
              if (tmdbCache.size > CACHE_MAX_ENTRIES) {
                var oldest = tmdbCache.keys().next().value;
                if (oldest) tmdbCache.delete(oldest);
              }
            }
            return d;
          });
        tmdbPending.set(key, request);
        request.then(
          function (data) {
            tmdbPending.delete(key);
            resolve(data);
          },
          function (err) {
            tmdbPending.delete(key);
            TMDB_STATS.errors++;
            window.tcLastApiError = { status: err && err.status || 0, timeout: !!(err && err.name === "AbortError"), at: Date.now() };
            reject(err);
          },
        );
      });
    }

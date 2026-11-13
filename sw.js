/* TatoCine - Service Worker
   - Instalación: guarda TODO el shell (HTML, CSS, JS, iconos y página sin conexión) leyendo index.html: funciona sin internet desde la primera vez.
   - Actualización: una versión nueva espera a que pulses «Actualizar» (no cambia el código a mitad de una película).
   - index.html: se sirve DESDE LA CACHÉ del dispositivo al instante y se revalida en segundo plano como máximo cada 3 h (antes: una petición al servidor en cada apertura).
     Los CSS/JS llevan ?v=<hash> y son inmutables, así que un cambio en el HTML se ve en la visita siguiente y las versiones nuevas del código llegan con el aviso «Actualizar».
   - Resto del shell (manifest, iconos, offline): caché primero.
   - Imágenes de TMDB: caché primero (la URL de cada imagen no cambia nunca: así se ven al instante, sin gastar datos y también sin conexión), con tope de 1200.
   - API de TMDB: caché AGRESIVA por tipo de dato (el trabajo lo hace el dispositivo, no el servidor). «Stale-while-revalidate»: con copia reciente se usa tal cual;
     con copia algo vieja se muestra al instante y se actualiza en segundo plano; solo si es muy vieja o no hay copia va a la red (con la copia como respaldo sin
     conexión). Ficha, reparto, vídeos, actor, géneros: fresca 24 h / válida 14 días. Tendencias y estrenos: fresca 2 h / válida 2 días. Búsquedas: fresca 6 h / válida 3 días.
   - Nunca intercepta reproductores ni YouTube. */
const VERSION = "5.6-8eb23422";
const SHELL_CACHE = "tatocine-shell-" + VERSION;
const API_CACHE = "tatocine-api-v1";
const IMG_CACHE = "tatocine-img-v1";
const MAX_IMG = 1200;
const SHELL = ["./", "index.html", "offline.html", "404.html", "500.html", "js/core/error-page.js", "manifest.webmanifest", "config.js", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/apple-touch-icon.png", "js/vendor/qrcode.js", "js/vendor/jsQR.js"];
const MAX_API = 800;
const H = 3600 * 1000;
/** Cuánto se considera «fresca» y hasta cuándo se puede mostrar (mientras se actualiza detrás) cada tipo de dato de TMDB. */
function apiTier(u) {
  const p = u.pathname;
  if (/\/(trending|discover|now_playing|upcoming|popular|top_rated|on_the_air|airing_today)\b/.test(p)) return { fresh: 2 * H, max: 48 * H };
  if (/\/search\//.test(p)) return { fresh: 6 * H, max: 72 * H };
  return { fresh: 24 * H, max: 14 * 24 * H };
}

/** Lista de archivos de la app: SHELL + los CSS/JS que enlaza index.html (se leen del propio HTML: no hay lista que mantener a mano). */
function assetsFromHtml(html) {
  const out = [], re = /(?:href|src)="((?:css|js)\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}
/** Guarda todos los archivos de la app en la caché versionada. index.html se pide UNA sola vez. `no-cache` = revalidar con el servidor: lo que la página ya descargó responde 304 (sin bajarlo otra vez) y lo que cambió se baja nuevo, así que nunca se guarda una copia vieja. */
const NAV_RECHECK_MS = 3 * 3600 * 1000;
/** Guarda index.html con la hora de la última revisión (sin cabeceras de compresión: el cuerpo ya viene descomprimido). */
async function putIndex(cache, res) {
  const h = new Headers(res.headers); h.delete("content-encoding"); h.delete("content-length"); h.set("x-tc-checked-at", String(Date.now()));
  await cache.put("index.html", new Response(await res.clone().blob(), { status: 200, headers: h }));
}
async function precacheShell(indexRes) {
  const cache = await caches.open(SHELL_CACHE);
  let html = "";
  try {
    const res = indexRes || await fetch("index.html", { cache: "no-cache" });
    if (res && res.ok) { html = await res.clone().text(); await putIndex(cache, res); }
  } catch (e) { }
  const list = SHELL.concat(assetsFromHtml(html)).filter((u, i, a) => u !== "index.html" && a.indexOf(u) === i);
  await Promise.all(list.map((u) => fetch(u, { cache: "no-cache" }).then((r) => (r.ok ? cache.put(u, r) : null)).catch(() => null)));
  return html;
}

self.addEventListener("install", (event) => {
  // La primera instalación se activa sola; una actualización espera el aviso «Actualizar» (mensaje SKIP_WAITING).
  event.waitUntil(precacheShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL_CACHE, API_CACHE, IMG_CACHE];
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("tatocine-") && !keep.includes(n)).map((n) => caches.delete(n)));
      if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.disable(); } catch (e) { } }   // sin precarga de navegación: era una petición extra por apertura
      await self.clients.claim();
    })()
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function timeoutFetch(request, ms, preload) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    Promise.resolve(preload || fetch(request)).then((r) => { clearTimeout(t); r ? resolve(r) : reject(new Error("empty")); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/** Si index.html cambió y la VERSION no (alguien editó el HTML sin ejecutar tools/stamp.js), se refresca todo el shell y se avisa a la página. */
async function healShell(indexRes) {
  try {
    const cache = await caches.open(SHELL_CACHE), old = await cache.match("index.html");
    if (!old) { await putIndex(cache, indexRes); return; }
    const [a, b] = await Promise.all([old.clone().text(), indexRes.clone().text()]);
    if (a === b) { await putIndex(cache, indexRes.clone()); return; }          // igual: solo se anota que ya se revisó
    await precacheShell(indexRes.clone());
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((c) => c.postMessage({ type: "SHELL_REFRESHED" }));
  } catch (e) { }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate" && url.origin === self.location.origin) {
    const isApp = /^\/(index\.html)?$/.test(url.pathname);
    event.respondWith((async () => {
      if (isApp) {                                                                     // la app: desde la caché del dispositivo, revisión en segundo plano cada 3 h
        const cache = await caches.open(SHELL_CACHE), hit = await cache.match("index.html");
        if (hit) {
          const age = Date.now() - Number(hit.headers.get("x-tc-checked-at") || 0);
          if (age >= NAV_RECHECK_MS) event.waitUntil((async () => { try { const r = await fetch("index.html", { cache: "no-cache" }); if (r && r.ok) await healShell(r); } catch (e) { } })());
          return hit;
        }
      }
      try {
        const res = await timeoutFetch(req, 6000, event.preloadResponse);
        if (res && res.ok) { event.waitUntil(healShell(res.clone())); }
        if (res && res.status >= 500) { const e500 = await caches.match("500.html"); if (e500) return e500; }      // error del servidor: pantalla propia en vez de la del hosting
        return res;
      } catch (e) {
        const cached = (await caches.match("index.html")) || (await caches.match("./")) || (await caches.match("offline.html"));
        return cached || new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    // CSS/JS: Cache First desde la caché VERSIONADA de este Service Worker (se llena entera al instalar). Cada despliegue cambia la VERSION
    // (tools/stamp.js), así que no hay mezcla de versiones ni peticiones a la red en cada apertura. Si algo no estaba, red y se guarda.
    if (/\/(css|js)\//.test(url.pathname)) {
      event.respondWith((async () => {
        const cache = await caches.open(SHELL_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await timeoutFetch(req, 8000);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })());
      return;
    }
    if (/\/(icons\/|assets\/|manifest\.webmanifest|offline\.html|config\.js)/.test(url.pathname)) {   // recursos estáticos (assets/ lleva hash en el nombre)
      event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then((c) => c.put(req, copy)); } return res; })));
    }
    return;
  }

  if (url.hostname === "image.tmdb.org") {                                              // imágenes: caché primero (la URL es inmutable)
    event.respondWith((async () => {
      const cache = await caches.open(IMG_CACHE);
      const hit = await cache.match(req.url);
      if (hit) return hit;
      try {
        const res = await fetch(new Request(req.url, { mode: "cors", credentials: "omit" }));    // CORS: la copia no es «opaca» (las opacas pesan 7 MB de cuota cada una)
        if (res.ok) { cache.put(req.url, res.clone()).then(() => trim(IMG_CACHE, MAX_IMG)); }
        return res;
      } catch (e) { return fetch(req); }
    })());
    return;
  }

  if (url.hostname === "api.themoviedb.org" && !url.searchParams.has("_g")) {          // «_g»: perfil Invitado, sin caché
    event.respondWith((async () => {
      const cache = await caches.open(API_CACHE);
      const hit = await cache.match(req);
      const age = hit ? Date.now() - Number(hit.headers.get("x-tc-cached-at") || 0) : Infinity;
      const refresh = async () => {
        const res = await timeoutFetch(req, 10000);
        if (res.ok) {
          const headers = new Headers(res.headers);
          headers.set("x-tc-cached-at", String(Date.now()));
          const body = await res.clone().blob();
          cache.put(req, new Response(body, { status: 200, headers })).then(() => trim(API_CACHE, MAX_API));
        }
        return res;
      };
      const tier = apiTier(url);
      if (hit && age < tier.fresh) return hit;                                         // reciente: instantáneo, cero peticiones
      if (hit && age < tier.max) { event.waitUntil(refresh().catch(() => null)); return hit; }       // algo viejo: se muestra ya y se actualiza detrás
      try { return await refresh(); }
      catch (e) { if (hit && age < tier.max * 4) return hit; throw e; }
    })());
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  if (data.type === "CLEAR_CACHES") {
    event.waitUntil(Promise.all([caches.delete(API_CACHE)]).then(() => {
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
    }));
  }
});

// Al tocar un aviso de estreno se abre (o se enfoca) TatoCine en esa ficha.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "./", self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});

/* TatoCine - Service Worker
   - Instalación: guarda TODO el shell (HTML, CSS, JS, iconos y página sin conexión) leyendo index.html: funciona sin internet desde la primera vez.
   - Actualización: una versión nueva espera a que pulses «Actualizar» (no cambia el código a mitad de una película).
   - Shell (HTML, manifest, iconos): red primero con respaldo offline.
   - Imágenes de TMDB: caché primero (la URL de cada imagen no cambia nunca: así se ven al instante, sin gastar datos y también sin conexión), con tope de 400.
   - API de TMDB: «stale-while-revalidate» como las plataformas grandes: si hay copia reciente (< 30 min) se usa tal cual; si es de hasta 6 h se muestra al instante
     y se actualiza en segundo plano; si es más vieja o no hay, red primero con la copia como respaldo sin conexión.
   - Nunca intercepta reproductores ni YouTube. */
const VERSION = "5.6-14449f48";
const SHELL_CACHE = "tatocine-shell-" + VERSION;
const API_CACHE = "tatocine-api-v1";
const IMG_CACHE = "tatocine-img-v1";
const MAX_IMG = 400;
const API_FRESH = 30 * 60 * 1000;
const SHELL = ["./", "index.html", "offline.html", "404.html", "500.html", "js/core/error-page.js", "manifest.webmanifest", "config.js", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/apple-touch-icon.png", "js/vendor/qrcode.js", "js/vendor/jsQR.js"];
const MAX_API = 300;
const API_MAX_AGE = 6 * 60 * 60 * 1000;

/** Lista de archivos de la app: SHELL + los CSS/JS que enlaza index.html (se leen del propio HTML: no hay lista que mantener a mano). */
function assetsFromHtml(html) {
  const out = [], re = /(?:href|src)="((?:css|js)\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}
/** Guarda todos los archivos de la app en la caché versionada. index.html se pide UNA sola vez. `no-cache` = revalidar con el servidor: lo que la página ya descargó responde 304 (sin bajarlo otra vez) y lo que cambió se baja nuevo, así que nunca se guarda una copia vieja. */
async function precacheShell(indexRes) {
  const cache = await caches.open(SHELL_CACHE);
  let html = "";
  try {
    const res = indexRes || await fetch("index.html", { cache: "no-cache" });
    if (res && res.ok) { html = await res.clone().text(); await cache.put("index.html", res); }
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
      if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (e) { } }
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
    if (!old) { await cache.put("index.html", indexRes); return; }
    const [a, b] = await Promise.all([old.clone().text(), indexRes.clone().text()]);
    if (a === b) return;
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
    event.respondWith((async () => {
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
      if (hit && age < API_FRESH) return hit;                                          // reciente: instantáneo
      if (hit && age < API_MAX_AGE) { event.waitUntil(refresh().catch(() => null)); return hit; }   // algo viejo: se muestra ya y se actualiza detrás
      try { return await refresh(); }
      catch (e) { if (hit && age < API_MAX_AGE * 4) return hit; throw e; }
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

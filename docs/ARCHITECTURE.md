# Arquitectura de TatoCine

TatoCine es una aplicación **estática** (HTML + CSS + JavaScript sin dependencias ni compilación obligatoria). Todo lo
personal vive en `localStorage`; la única red es la API de TMDB y los reproductores de terceros (iframes).

## Estructura

```text
index.html                 Estructura de la interfaz + orden de carga (única fuente de verdad)
config.js                  Configuración editable (clave de TMDB)
css/                       Cascada numerada: 01-base … 19-responsive (los posteriores refinan a los anteriores)
js/
  core/                    Servicios sin interfaz: config, storage, extend (decorate), env, state, tmdb, utils,
                           ui-utils, seo, events, storage-maintenance, performance, pwa
  profiles/                Perfiles: modelo/PIN/idioma, modales, selector, fondos, cambio de perfil
  i18n/                    Idioma por perfil: diccionario, reglas, traducción en vivo del DOM, helpers L()/i18nAdd()
  ui/                      Pantallas y componentes: cards, hero, details, filters, views, settings, keyboard,
                           tv-navigation, a11y, skeletons (marcadores de carga), gestures (táctil/ratón/mando)
  player/                  Reproductor: servidores, player, autoplay-next, player-robust (cambio automático de servidor y memoria por título)
  features/                Funciones de producto (una por archivo): favorites, favorites-lists, continue-watching,
                           analytics, watch-tracking, recommendations, stats, brands, share, search,
                           recent-searches, search-suggest, details-extras, details-favorite, watched,
                           discover-wizard, new-episodes, infinite-feed (scroll infinito), streak, kids, pwa-install, backup, backup-sanitize (saneado del JSON importado, probado en Node), import-target (perfil destino + reglas adulto/niño + filtro infantil), qr-payload (formato + validación del QR, probado en Node), qr-transfer (interfaz del QR)
  app.js                   Arranque (enlaces directos, primera vista)
sw.js · manifest.webmanifest · icons/    PWA
```

## Cómo se ejecuta

- **Scripts clásicos** (no módulos ES): las funciones comparten el ámbito global porque la interfaz usa manejadores
  inline (`onclick="…"`) y para soportar navegadores de TV antiguos. El **orden de `<script>` en `index.html`** define las
  dependencias: un archivo solo puede ejecutar al cargar lo que ya existe (las funciones se llaman en tiempo de ejecución,
  cuando todo está cargado).
- Cada archivo empieza con un comentario que dice **qué hace** y de qué depende.

## Interfaz: botones, carga y gestos

- **Botones:** *primario* = blanco (acción principal: Ver, Crear, Entrar, Ver otras 3); *secundario* = translúcido con borde (Info, ¿Qué ver hoy?, favorito, Cancelar); *peligro* = rojo (Eliminar). Mismo alto por contexto (52 px escritorio / 46 px móvil en la portada) y al menos 44 px de zona táctil.
- **Portada:** orden fijo `Ver · Info · ¿Qué ver hoy? · ♥`. En ≤ 814 px pasa a dos filas (`[Ver | Info]`, `[¿Qué ver hoy? | ♥]`) sin ocultar textos.
- **Carga:** todo lo que espera datos muestra un *skeleton* (`ui/skeletons.js`): filas, portada, episodios, resultados del asistente, ficha del actor y ficha del título. El pulso es solo de opacidad y se desactiva con «reducir movimiento» y en modo ligero.
- **Scroll infinito:** catálogos (`views.js`), Inicio, búsqueda, plataformas y Favoritos (`features/infinite-feed.js`). Un solo `IntersectionObserver` sobre `#sentinel`; cada fuente implementa `next()`.
- **Gestos (`ui/gestures.js`):** deslizar la portada cambia de título (táctil o ratón), deslizar hacia abajo cierra ventanas si están arriba del todo, deslizar desde el borde izquierdo cierra la ventana superior; en mando de TV, canal +/− cambia el título. Las flechas, `Enter` y Atrás los maneja `ui/tv-navigation.js`.

## Perfil Invitado (sin rastro)

`core/storage.js` intercepta `Storage.prototype` para las claves `tatoProfile_guest_*`: se guardan en un objeto en memoria (`guestMemory`) y nunca llegan a `localStorage`. Así ningún módulo puede persistir datos del invitado por descuido. Además `fetchTMDB` añade `_g=1` a sus peticiones y `sw.js` no las guarda en caché. Un perfil Invitado no puede administrar perfiles (`canManageProfiles()`).

## Principios aplicados

| Principio | Cómo se aplica |
|---|---|
| **SRP** | Un archivo = una responsabilidad (p. ej. `watched.js` solo gestiona vistas y valoraciones; `tmdb.js` solo habla con TMDB). |
| **Abierto/cerrado** | `decorate(nombre, fábrica)` (`core/extend.js`) añade comportamiento a una función existente sin editarla: `kids.js` filtra contenido infantil decorando `openDetails`/`openPlayer`; `watch-tracking.js` decora `closePlayer`, etc. Los datos de copia de seguridad usan una tabla de fusión (`PROFILE_MERGERS`): una clave nueva = una entrada nueva. |
| **DRY** | Utilidades únicas: `readLocalJSON`/`safeStorageSet`, `openOverlay`/`closeOverlay`, `toggleFavoriteMedia`, `getCardHTML`/`renderRow`, `fetchTMDB` (caché + deduplicación), `L()`/`i18nAdd()`. Las funciones sustituidas por versiones nuevas se eliminaron (no hay código duplicado muerto). |
| **Sustitución / interfaces pequeñas** | Los módulos se hablan por funciones con contratos simples (`getTasteProfile()`, `watchedList()`, `tasteExtras()`); si un módulo opcional no existe, el núcleo lo ignora (`typeof fn === "function"`). |
| **Inversión de dependencias (en lo posible)** | Las funciones de producto dependen de los servicios de `core/` (storage, tmdb, i18n), nunca al revés; el núcleo solo llama a extensiones mediante ganchos opcionales. |

> Límite honesto: al ser scripts clásicos con ámbito global, no hay encapsulación real entre archivos; la disciplina
> está en las convenciones de arriba. Migrar a módulos ES sería el siguiente paso si se abandonan TV antiguas.

## Añadir una función

1. Crea `js/features/mi-funcion.js` con cabecera descriptiva y colócalo en `index.html` tras sus dependencias.
2. Reutiliza servicios existentes (no reescribas storage, TMDB ni traducción). Textos nuevos: `L(es, en)` o `i18nAdd({...})`.
3. Para cambiar una función existente usa `decorate()`; si la reemplazas por completo, borra la original.
4. Estilos en un `css/NN-*.css` nuevo al final de la cascada.
5. Datos por perfil: `profileStorageKey("clave")`; si deben viajar en la copia de seguridad, añade su fusión en `backup.js`.
6. Respeta `isKidProfile()` / `kidsContext()` si la función muestra contenido.
7. Ejecuta la lista de verificación de abajo y actualiza el README.

## Rendimiento por dispositivo

- **Móvil/tableta:** imágenes con `loading="lazy"`, filas pesadas diferidas (`IDLE`), consultas con caché de 10 min y
  deduplicación, reintento de imágenes.
- **Smart TV / equipos modestos:** modo ligero automático (sin desenfoques, imágenes más livianas con conexión lenta),
  navegación espacial con mando, foco visible, precarga solo con puntero.
- **Sin compilación:** se publica la carpeta tal cual (sin Python, Node ni empaquetadores). El Service Worker guarda `css/` y `js/` tras la primera visita (red primero, caché sin conexión).

## Datos locales (`localStorage`)

Por perfil (`tatoProfile_<id>_…`): `tatoList`, `tatoFavLists`, `tatoContinue`, `tatoLocalAnalyticsV1`, `tatoWatched`,
`tatoSeriesSeen`, `tatoSeriesCheck`, `tatoStreak`, `tatoRecentSearches`, `tatoServer`, `tatoAutoNextEpisode`.
Globales: `tatoProfilesV1`, `tatoActiveProfileV1`, `tatoKidUsageV1`, `tatoBrandBgV1`, `tatoLiteMode`, `tatoDisclaimerAccepted`.

## Lista de verificación antes de publicar (manual)

Perfil adulto en ESP y ENG · perfil Niño (solo Niños, búsqueda filtrada, límite de uso) · Inicio y Favoritos/listas ·
«¿Qué ver hoy?» · ficha de serie (episodios) y de película (director) · búsqueda con sugerencias · reproductor y
siguiente episodio · Ajustes (modo ligero, copia de seguridad) · móvil estrecho (320 px), tableta, escritorio y modo TV
(`?tv=1`).

## Limitaciones conocidas

- El reproductor es de terceros (iframe): no se controla audio, subtítulos, calidad, minuto exacto ni «saltar intro».
- Sin servidor no hay sincronización entre dispositivos (solo copia de seguridad manual), ni Watch Party, ni notificaciones
  push: los avisos de nuevos episodios se calculan al abrir la app.
- No hay pruebas automatizadas; la verificación es manual y con un navegador real.

## Capa responsive (`css/19-responsive.css`)
Última de la cascada. Define `--gutter` y `--card-w` con `clamp()` (móvil → TV 4K), alinea carruseles con los títulos, compacta la portada y el reproductor en móvil horizontal, difiere el pintado de filas fuera de pantalla (`content-visibility`) y quita desenfoques costosos en táctil.

## QR de transferencia y seguridad
`qr-payload.js` es lógica pura: genera `<sitio>#tcimport=TC1.<deflate+base64url>` y valida todo lo que se lee (mismo sitio, tamaños, esquema, listas blancas, rechazo de XSS/SQL/CSP/claves/enlaces). `qr-transfer.js` dibuja/lee el QR (librerías de `js/vendor/`, cargadas solo al usarlas, ver [THIRD_PARTY](THIRD_PARTY.md)) y `import-target.js` elige el perfil destino (PIN si es otro perfil protegido). `tests/qr-payload.test.js` cubre los casos hostiles. La CSP está en `index.html`; si añades un servidor de reproducción, vale `frame-src https:`.

## Roles al importar
`import-target.js` aplica el control de acceso: mismo tipo de perfil (adulto→adulto, niño→niño), Invitado excluido, PIN del destino, y filtro de aptitud título a título en destinos infantiles. El tipo de origen viaja en el QR (`k`) y en `profile.kind` del JSON.

## Fase 1 · seguridad
`profiles/pin-strong.js` (PBKDF2 + bloqueo persistente, vía decorate), `core/data-guard.js` (validación al leer, no destructiva), `features/backup-crypto.js` (AES-GCM, probado en Node) y caducidad `e` en el QR (`qr-payload.js`).

## Fase 2 · control parental
`features/parental.js` (hora de dormir, registro de uso `tatoUsageV1` por perfil/día y resumen semanal) se añade con decorate sobre `setProfileModalMode`/`saveProfileFromModal`.

## Fase 3 · uso y accesibilidad
`ui/undo.js` (avisos con acción), `ui/accessibility-prefs.js` (`--ts` multiplica cada `font-size`: `calc(Npx * var(--ts, 1))`), `ui/command-palette.js` (`registerCommand`), `features/voice-search.js`, `ui/onboarding.js`, `core/actions.js` (`data-act` + `registerAction`, base para quitar `unsafe-inline` de la CSP) y pantallas vacías en `ui/skeletons.js`.

## Fase 4 · funciones
`features/watch-later.js`, `calendar.js` (`calendarCollect`, cache `tatoCalCacheV1`), `release-alerts.js` (+ `notificationclick` en `sw.js`), `wrapped.js` (canvas) y `couple-picker.js`. Todos usan `registerAction` (data-act) y `registerCommand` (Ctrl+K). Ojo con el orden de `<script>`: `command-palette.js` va justo después de `ui-utils.js` para que el resto pueda registrar comandos al cargar.

## Fase 5 · efecto wow
`ui/hero-trailer.js` (`htAllowed` decide cuándo; una sola iframe; se detiene al salir de la portada), `ui/dynamic-color.js` (`dominantColor` con miniatura w92 y canvas 16×16, variable `--accent-rgb`), `ui/open-motion.js` (FLIP con Web Animations) y esqueletos con `::after` + `tcShimmer` en `css/19-responsive.css`.

## Fase 6 · CSP estricta y pruebas
- **Sin JavaScript en línea.** `js/boot.js` (cabecera) y `js/core/picker-open.js` sustituyen los scripts del HTML; `js/core/handlers.js` (generado al migrar) contiene los antiguos `onclick`/`onkeydown` del HTML estático como `TC_H.hN`, y `js/core/actions.js` los despacha (`data-h`, `data-hk`) junto con `data-act` (acciones registradas con `registerAction`), `data-hover`, `data-lc` y `data-fb` (clase al cargar e imagen de respaldo). Las plantillas de JS ya no escriben atributos `on*`: pasan los datos en `data-*`.
- **Pruebas.** `tests/*.test.js` (Node, sin dependencias) y `tests/e2e/run.js` (Playwright; solo desarrollo, el sitio sigue sin build). Las pruebas de navegador necesitan internet y la clave de TMDB en `config.js`.

## Estado de los diálogos
`couple-picker.js` guarda la ronda en `sessionStorage` (`tatoPairV1`, 3 h, validada al leer) tras cada respuesta. «Info» (`cpOpenInfo`) no cierra el diálogo: lo deja debajo (inerte, `body.cp-details`) y la ficha se abre encima (z-index 6000); un `MutationObserver` lo reactiva al cerrarse la ficha por cualquier vía.

## PWA y portada
- `sw.js`: en `install` lee `index.html`, extrae `css/…` y `js/…` y los guarda junto a `offline.html`, iconos y librerías del QR; CSS/JS van «red con límite de 4 s y respaldo en caché»; las navegaciones caen a `index.html` y, si no existe, a `offline.html`. Una versión nueva espera (`SKIP_WAITING` solo tras pulsar «Actualizar» en `core/pwa.js`). Sube `VERSION` en cada publicación.
- Portada: `ui/hero.js` usa UN temporizador por título (`heroPlan`: 6 s; `ui/hero-trailer.js` lo amplía a 8 s si hay tráiler), pausado mientras el selector de perfiles está abierto y reiniciado al cerrarse. El tráiler se precarga a 0,8 s, arranca oculto a 1,5 s y se muestra a los 3 s (`HT_*`).

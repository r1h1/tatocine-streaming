# Arquitectura de TatoCine

TatoCine es una aplicación **estática** (HTML + CSS + JavaScript sin dependencias ni compilación obligatoria). Todo lo
personal vive en `localStorage`; la única red es la API de TMDB y los reproductores de terceros (iframes).

## Estructura

```text
index.html                 Estructura de la interfaz + orden de carga (única fuente de verdad)
config.js                  Configuración editable (clave de TMDB)
css/                       Cascada numerada: 01-base … 18-lists-skeletons (los posteriores refinan a los anteriores)
js/
  core/                    Servicios sin interfaz: config, storage, extend (decorate), env, state, tmdb, utils,
                           ui-utils, seo, events, storage-maintenance, performance, pwa
  profiles/                Perfiles: modelo/PIN/idioma, modales, selector, fondos, cambio de perfil
  i18n/                    Idioma por perfil: diccionario, reglas, traducción en vivo del DOM, helpers L()/i18nAdd()
  ui/                      Pantallas y componentes: cards, hero, details, filters, views, settings, keyboard,
                           tv-navigation, a11y, skeletons (marcadores de carga), gestures (táctil/ratón/mando)
  player/                  Reproductor: servidores, player, autoplay-next
  features/                Funciones de producto (una por archivo): favorites, favorites-lists, continue-watching,
                           analytics, watch-tracking, recommendations, stats, brands, share, search,
                           recent-searches, search-suggest, details-extras, details-favorite, watched,
                           discover-wizard, new-episodes, infinite-feed (scroll infinito), streak, kids, pwa-install, backup
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

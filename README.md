# TatoCine — Películas, series y anime

![Versión](https://img.shields.io/badge/Versión-5.5.0-blue)
![Licencia](https://img.shields.io/badge/Licencia-MIT-green)
![Stack](https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JS-orange)
![PWA](https://img.shields.io/badge/PWA-Instalable-purple)

**TatoCine** es una app web gratuita y de código abierto para explorar películas, series y anime con la API de [TMDB](https://www.themoviedb.org/). Sin backend ni cuentas: perfiles, favoritos, estadísticas y recomendaciones viven **solo en tu dispositivo**. Funciona en móvil, tableta, escritorio y Smart TV, y se instala como PWA.

🌎 [English summary](#english-summary) · 📐 [Arquitectura](docs/ARCHITECTURE.md)

## Características

- **Inicio estilo streaming:** portada con carrusel, Continuar viendo, **Nuevos episodios**, Hecho para ti, Porque viste…, Tendencias, Top 10, colecciones y **Plataformas y estudios** (Netflix, Disney+, HBO Max, Prime Video, Marvel, Pixar, Ghibli…).
- **«¿Qué ver hoy?»:** 4 preguntas (ambiente, tiempo —incluye «Más de 120 min»—, compañía, qué evitar) → **siempre 3** recomendaciones con el motivo de cada una (si tus respuestas dejan pocas opciones, se amplía la búsqueda y se avisa); puedes pedir otras 3, ver, abrir la ficha o guardar.
- **Ficha del título:** director (o creadores), reparto, tráiler, recomendados, compartir, favoritos y, en series, **temporadas y episodios** con imagen, duración y sinopsis en 1 columna (móvil/tableta), 2 (pantallas medianas) o 3 (grandes); tocas un episodio y se reproduce. El tráiler tiene un único botón de salir. **Marcar como vista** y valorar con 👍/👎 (afinan tus recomendaciones).
- **Búsqueda inteligente:** sugerencias mientras escribes (títulos y personas), obras de un actor o director (también desde la ficha) y búsquedas recientes por perfil.
- **Favoritos con listas** («Todos» y «+ Nueva lista» como botones primarios; abrir y cerrar una lista tocando su tarjeta de nuevo o con «Cerrar lista»; crear, editar con lápiz, borrar; al borrar una lista sus títulos pasan a *General*), sección **Vistas** y **Estadísticas** (tiempo visto, qué ves más, Top 3, ranking de perfiles).
- **Carga sin saltos:** *skeletons* en toda la app y **scroll infinito** en todas las pestañas (Inicio, Películas, Series, Anime, Niños, búsqueda, plataformas y Favoritos).
- **Hecho para ti:** se activa con **2 títulos finalizados** y mejora con cada uno; todo se calcula localmente.
- **Reproductor** con servidores externos, temporadas/episodios y **siguiente episodio automático** (solo al terminar de verdad: aviso «Siguiente episodio en 10 s» con Cancelar; si el vídeo está en pantalla completa se sale de ella para mostrarlo). **Cambio automático de servidor** si el elegido no responde en 12 s (sin tocar tu servidor predeterminado) y **memoria por título** del servidor que funcionó.
- **Avisos de nuevo episodio** para tus series (se comprueban al abrir el Inicio; sin servidor no hay notificaciones push).
- **Copia de seguridad completa** del perfil (Ajustes → Exportar/Importar archivo; sin PIN, se fusiona con los datos existentes) e **importación al perfil que elijas**. Reglas entre roles: **adulto → adulto y niño → niño** (nunca cruzado); los perfiles infantiles también pueden exportar/importar (solo datos infantiles); el Invitado no; si el perfil destino no es el actual y tiene PIN, se pide. Al importar en un perfil infantil se comprueba título por título que sea apto. Todo archivo se **sanea** (solo campos conocidos y válidos) antes de guardarse.
- **Pasar a otro dispositivo con un QR** (Ajustes → Mostrar QR / Escanear): enlace al propio sitio con favoritos, listas, vistos, **continuar viendo e historial** (se recorta lo que no quepa); se escanea con la cámara del teléfono, con la cámara dentro de la app o subiendo una captura. Todo QR se **valida** antes de usarse (solo el mismo sitio, esquema estricto, listas blancas de caracteres, rechazo de XSS, SQL, CSP, claves y enlaces; nunca incluye PIN ni la clave de TMDB). Pruebas: `node tests/qr-payload.test.js` y `node tests/backup-sanitize.test.js`.
- **Fase 1 · Seguridad reforzada:** PIN con hash lento (PBKDF2-SHA-256) y bloqueo por intentos que **persiste** (30 s → 2 min → 10 min → 1 h; los PIN antiguos se actualizan solos); **copia de seguridad cifrada** con contraseña (AES-256-GCM, opcional); el **QR caduca a los 10 minutos**; los datos guardados se **validan al leer**, no solo al importar. Pruebas: `node tests/backup-crypto.test.js`.
- **Fase 2 · Control parental:** límite diario **6 h 30 min** (dos películas largas) + 1 h sin pantallas; **hora de dormir** por perfil infantil (desde/hasta); **Resumen semanal** para el adulto en Ajustes (horas por día, títulos y los más vistos de cada perfil, todo local). La portada rota cada **7 s**.
- **Fase 3 · Uso fácil y accesible:** **Deshacer** (7 s, botón o Ctrl+Z) al quitar favoritos, Continuar viendo, listas o el historial; Ajustes → **Accesibilidad** (texto 100/115/130 %, alto contraste, reducir movimiento); **búsqueda por voz** (micrófono del buscador); **paleta de comandos Ctrl/Cmd+K**; avisos para lectores de pantalla al cambiar de pestaña; **recorrido de bienvenida** de 3 pasos (una vez); pantallas vacías con ilustración y acción.
- **Fase 4 · Funciones:** **Ver más tarde** (lista aparte, con ficha, Favoritos y copia/QR de seguridad), **Mi calendario** (próximos episodios y estrenos de lo que sigues, cache de 6 h), **avisos de estreno** opcionales (al abrir la app; sin servidor no hay avisos en segundo plano), **Tu año en películas** (imagen 1080×1920 para guardar o compartir) y **Decidir en pareja** (12 títulos por turnos, sin ver lo que elige el otro, con modo solo-infantil; «Info» abre la ficha encima sin cerrar la ronda y la ronda se guarda en la sesión: sobrevive a cerrar el diálogo y a recargar, con opción de continuar o empezar de nuevo).
- **Carga rápida:** todos los scripts llevan `defer` (se descargan EN PARALELO y se ejecutan en orden; antes se pedían de uno en uno y en producción sumaban 5-10 s) y los perfiles guardados se pintan en el primer fotograma (tarjetas «tempranas» de `picker-open.js`) mientras la app termina de cargar. Medido con 90 ms de latencia: 8,4 s → 2,4 s en la primera visita y perfiles visibles a 0,9 s al volver.
- **PWA completa:** instalable (manifiesto con iconos normales y *maskable*, accesos directos Buscar/Favoritos/Series/Niños), el service worker guarda **todo el sitio al instalarse** (se descubre leyendo `index.html`) y la app **abre sin conexión** desde la primera vez (con `offline.html` como último recurso); las versiones nuevas se instalan en segundo plano y aparece **«Actualizar»** (no cambia el código a mitad de una película); busca actualizaciones cada hora. **Al publicar cambios, sube `VERSION` en `sw.js`** (así los dispositivos descargan la caché nueva). En `localhost` el service worker está apagado (usa `?sw=1` para probarlo).
- **Fase 5 · Efecto «wow»:** **tráiler en silencio** en la portada de Inicio, Películas, Series, Anime y Niños (youtube-nocookie, sin sonido, botón para activarlo; se precarga y **se ve solo en el segundo 2**, sin pasar el ratón; con tráiler el título dura 15 s y sin tráiler 8 s; cubre la portada en cualquier pantalla; Automático/Activado/Desactivado en Ajustes: en Automático sale en todos los dispositivos salvo con ahorro de datos o conexión lenta, modo ligero o el interruptor «Reducir movimiento» de la app; ya NO depende del ratón ni de «reducir animaciones» del sistema; si no sale, un aviso explica el motivo), **la tarjeta se despliega en la ficha** (animación FLIP en GPU), **color dinámico** (brillo de la ficha y resplandor ambiental del reproductor sacados de la imagen del título) y **esqueletos con brillo** que cruzan (solo `transform`).
- **Fase 6 · Calidad:** CSP **estricta** (`script-src 'self'`: sin scripts en línea, sin `eval`, sin atributos `onclick`; los eventos van por `data-act`/`data-h`), **25 pruebas de navegador** (`cd tests/e2e && npm install && npm test`: selector sin parpadeo, CSP sin violaciones, navegación, scroll infinito, ficha/deshacer, paleta, perfil infantil, QR, copias, PIN y ausencia de desbordes de 320 a 1920 px) con medición de arranque (sin tareas largas) y revisión de accesibilidad con axe-core sin infracciones.
- **Seguridad y accesibilidad:** política CSP en `index.html`, cabeceras (`nosniff`, `Referrer-Policy`, `Permissions-Policy`), valores validados antes de ir a atributos HTML y auditoría con axe-core sin infracciones en las pantallas principales. El selector de perfiles aparece al abrir una **pestaña nueva** (antes de ver nada, sin parpadeo); recargar con Ctrl+R **no** vuelve a pedirlo mientras sigas en esa pestaña. El menú muestra esqueletos mientras arranca. Protege tus perfiles de adulto con un **PIN**: es la barrera frente a los perfiles infantiles.
- **Scroll infinito** en Inicio, Películas, Series, Anime y Niños (filas por género; Niños solo con contenido apto).
- **Portada automática:** el **Top 10 de la semana** rota solo con fundido cruzado: **8 s** por título (**15 s** si tiene tráiler) e indicadores (tocar un punto salta a ese título). Botones del mismo tamaño: Ver · Info · ¿Qué ver hoy? · ♥ (dos filas en móvil).
- **Estadísticas y Ajustes** se reorganizan en cuadrículas en pantallas grandes (móvil y tableta sin cambios). Una lista de favoritos vacía muestra una portada automática acorde a su nombre.
- **Racha:** días seguidos reproduciendo algo, con icono de fuego junto al perfil (contador local y discreto; no existe en perfiles Niño).
- Fondos del selector de perfil en orden aleatorio; listas de favoritos como tarjetas verticales con el póster de su primer título y su cantidad (p. ej. «Terror (4)»), sin repetirse; cada cambio de pestaña empieza arriba.

## Perfiles, niños y PIN

**6 perfiles en total** (en filas de 3): «Yo» y **«Invitado»** vienen por defecto y se pueden crear 4 más; crear, editar y **eliminar** (icono de basurero). Al abrir la app hay que **elegir un perfil** (el selector no se puede cerrar); ya dentro de uno, sí se puede cerrar. Cada uno elige **Adulto** o **Niño**, un **idioma (ESP / ENG)** y un **PIN** opcional de 4 dígitos (5 fallos = bloqueo de 30 s). Siempre queda un perfil adulto.

**Invitado:** (un perfil Niño **no puede** cambiar al Invitado) no guarda nada en el dispositivo (ni historial, favoritos, búsquedas, racha ni caché de la API): todo vive en memoria y desaparece al cerrar o recargar. No se edita, no tiene PIN, no administra perfiles y no exporta copias.

**Idioma por perfil:** ESP → interfaz y catálogo en español, servidor por defecto **ESP1**; ENG → todo en inglés, servidor por defecto **ENG1**. El siguiente episodio automático viene activado.

**Perfil Niño:** solo ve la sección Niños (con su propio «¿Qué ver hoy?» limitado a contenido apto: ánimos Diversión, Adrenalina y Fantasía, verificado título por título), no administra perfiles y solo accede a contenido apto (US `G`, `TV-Y`, `TV-Y7`, `TV-G`, sin terror/suspenso/crimen/bélico ni términos explícitos), también en búsqueda, enlaces y reproductor. **Límite de uso:** 6 h 30 min (dos películas largas) y descanso obligatorio de 1 h (contador local compartido entre perfiles Niño, se reinicia cada día).

> El PIN y el límite son barreras locales para uso familiar, no seguridad fuerte: borrar los datos del sitio o cambiar la hora los reinicia.

## PWA, instalación, Smart TV y accesibilidad

- **Instalar:** botón en la barra superior (diálogo nativo en Chrome/Edge/Android; guía por dispositivo en iPhone, Mac, Firefox y TV). Barra superior: instalar, pantalla completa, ajustes y perfil.
- Manifiesto con iconos PNG (48–512, *maskable*, apple-touch), accesos directos y zonas seguras de iOS. `sw.js` da modo sin conexión y respaldo de la API; **no se registra en `localhost`** (usa `?sw=1` una vez para probarlo).
- **Smart TV y mando:** flechas, `Enter` y Atrás; modo TV con foco visible (`?tv=1`). **Modo ligero** (Ajustes) quita efectos pesados e imágenes grandes en TV, conexión lenta o equipos modestos.
- **Accesibilidad:** diálogos con foco atrapado y restaurado, lectores de pantalla, enlace «Saltar al contenido», respeta «reducir movimiento».
- **Gestos:** deslizar la portada cambia de título, deslizar hacia abajo cierra ventanas, deslizar desde el borde izquierdo cierra la ventana superior; canal +/− del mando también.
- **Teclado:** `/` buscar · `←` `→` carrusel · `↑` `↓` mover foco · `Enter` abrir · `F` pantalla completa · `Esc` o Atrás cerrar.
- **Rendimiento:** *lazy loading*, caché de consultas, reintento de imágenes, almacenamiento compacto con limpieza y **Liberar espacio**.

## Datos locales

Todo en `localStorage` (`tatoProfile_<id>_…` por perfil; lista completa en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)). Sin sincronización entre dispositivos: usa la copia de seguridad. Los perfiles adultos ven el tiempo total (nombre y horas) de los demás perfiles en Estadísticas.

## Estructura del proyecto

```text
index.html            Interfaz y orden de carga
config.js             Tu clave de TMDB (único archivo de configuración)
css/                  Hojas numeradas (01-base … 19-responsive); la cascada va por orden
js/core · profiles · i18n · ui · player · features · app.js     Código por responsabilidad
sw.js · manifest.webmanifest · icons/ · LICENSE · docs/
```

Principios: responsabilidad única por archivo, extensión sin editar el núcleo (`decorate()`), utilidades compartidas (DRY) y rendimiento por dispositivo. Detalle, guía para añadir funciones y lista de verificación en **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Instalación y despliegue

**Es una web tradicional (HTML + CSS + JavaScript): sin Python, sin Node, sin compilar ni instalar nada.** Se sube la carpeta tal cual.

**1. Tu clave de TMDB** — la única configuración está en **`config.js`**:

```js
window.TATOCINE_CONFIG = { TMDB_API_KEY: "TU_API_KEY_V3" };
```

Consigue **tu propia** clave v3 en [TMDB](https://developer.themoviedb.org/docs) (es visible para quien abra la app; es de solo lectura del catálogo). Cambiarla es editar ese archivo y volver a subir.

**2. Probar en tu equipo:** abre `index.html` en el navegador (o con la extensión *Live Server* de VS Code; el proyecto trae su configuración). Para probar la instalación PWA hace falta HTTPS o `localhost` (Live Server sirve).

**3. Subir a producción (HTTPS):** arrastra la carpeta (o un ZIP) a **Netlify Drop**, o conéctala por Git a **Netlify / Vercel / Render** (en Render: *Static Site*, sin *build command* y *Publish directory* `.`). Sube estos archivos juntos:

```text
index.html   config.js   sw.js   manifest.webmanifest   _headers
css/   js/   icons/
```

(`docs/`, `LICENSE` y `README.md` son opcionales; puedes comprimir la carpeta entera.) `_headers` (Netlify) y `vercel.json` solo ajustan la caché para que `index.html`, `config.js` y `sw.js` siempre estén frescos.

Navegadores modernos; en Smart TV, Tizen 5.5+, webOS 5+ o Android TV/Fire TV actuales.

**FAQ:** *«Hecho para ti» no aparece* → faltan 2 títulos finalizados o es perfil Niño. *Sin pantalla completa* → iPhone y apps instaladas no lo permiten.

## Qué no incluye (y por qué)

Controles propios de audio/subtítulos/calidad/«saltar intro» (el video lo sirve un iframe de terceros), Watch Party y continuidad en vivo entre dispositivos (requieren servidor), búsqueda por lenguaje natural y cobros. TatoCine es gratuito.

## Aviso legal y licencia

TatoCine **no aloja ni almacena material audiovisual**: consulta metadatos de TMDB y abre reproductores de terceros, que pueden mostrar publicidad; quien despliegue debe verificar que su uso sea lícito. No está afiliado a TMDB, plataformas ni estudios (sus nombres solo filtran el catálogo). *Este producto usa la API de TMDB, pero no está respaldado ni certificado por TMDB* ([términos](https://www.themoviedb.org/api-terms-of-use)).

Gratuito y de código abierto bajo **licencia MIT** ([`LICENSE`](LICENSE)); no concede derechos sobre marcas, imágenes ni vídeos de terceros. Contribuciones bienvenidas respetando el estilo visual.

---

## English summary

**TatoCine** is a free, open-source (MIT) static web app to browse movies, series and anime with the TMDB API. No backend, no accounts: everything personal stays in your browser.

- Fluid responsive layer (`css/19-responsive.css`: card width and gutters scale from 320 px phones to 4K TVs) with deferred rendering of off-screen rows. Responsive dark UI for phones, tablets, desktops and Smart TVs; installable **PWA** (install button, offline shell, D-pad/remote navigation, lite mode, accessibility support).
- **Local profiles** (adult/kids, optional PIN, per-profile language ESP/ENG, delete). Kids profiles see only the Kids section with strict age-rating filtering and a 6 h 30 min use limit plus a 1 h break.
- **"What should I watch?"** wizard (mood, time, company, avoid → 3 picks with reasons), series pages with **seasons and episodes**, director links, **watched + 👍/👎**, **search suggestions and actor/director search**, favorites with lists, statistics, a **local recommendation engine** (unlocks after 2 finished titles), new-episode alerts, profile **backup/restore** (import into any adult profile) and **QR transfer** between devices (validated against XSS/SQL/CSP/key leaks), and platform/studio rows.
- Modular code (`css/`, `js/core|profiles|i18n|ui|player|features`), no build step. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```bash
git clone https://github.com/r1h1/tatocine-streaming.git && cd tatocine-streaming
# put YOUR OWN TMDB v3 key in config.js (TMDB_API_KEY), then:
# open index.html (or use VS Code Live Server) · to deploy, drag the folder to Netlify Drop
```

No Python, Node or build tools needed. Deploy over HTTPS. TatoCine hosts no video; playback uses third-party embeds. Not endorsed or certified by TMDB.

---

**TatoCine** · Proyecto independiente de código abierto.

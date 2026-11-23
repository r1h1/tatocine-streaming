# CLAUDE.md · TatoCine

Contexto completo para trabajar en este proyecto (también desde otra máquina). El dueño habla **español**: responde siempre en español.
Detalle técnico: `docs/ARCHITECTURE.md`; historial de cambios: `README.md` (entradas 5.x).

## Qué es

TatoCine: app web de catálogo/reproducción (películas, series, anime, niños) **estática y sin backend** (HTML/CSS/JS clásico, sin build en el código
fuente). Datos de TMDB (clave pública en `config.js`); el video viene de reproductores de terceros en iframe (`js/core/config.js` → `SERVERS`).
Todo lo del usuario (perfiles, PIN, historial, listas, recomendaciones) vive en `localStorage` del dispositivo. Open source (MIT), repo
`github.com/r1h1/tatocine-streaming`, rama `main`.

Tres formas de uso, **las tres deben seguir funcionando siempre**:
1. **Web** (Vercel y Netlify; los despliegues son réplicas del mismo ZIP, se comparan con `curl <dominio>/build.json`).
2. **PWA** instalada (móvil/escritorio), con Service Worker `sw.js`.
3. **APK de Google TV / Android TV** (`android-tv/`, `GoogleTvTatoCine.apk`): WebView que sirve la web desde la propia APK. Se instala por ADB
   en la TV Xiaomi (Google TV) del dueño.

## Reglas del dueño (obligatorias)

- **Nunca romper lo que ya existe** ni cambiar el diseño/UX sin que lo pida (estilo oscuro, pills, ventanas `tc-profile-*`). Probar antes de entregar.
- **Honestidad**: no afirmar nada no verificado; decir siempre qué NO se hizo y qué falta probar en hardware real. Nada de contadores o cifras
  inventadas (p. ej. «N personas conectadas»). No anunciar compatibilidades falsas (Roku NO puede correr TatoCine; Samsung/LG 2018–2019 y
  anteriores están por debajo del piso Chromium 68 y NO están garantizadas).
- **Sin backend, sin proxy, sin servidores propios.** Optimizar frontend, caché y llamadas a TMDB.
- **README.md actualizado en cada cambio**, compacto (lo lee gente de todo el mundo): añadir una entrada `5.NN · …` en «Novedades».
- **Commits sin `Co-Authored-By` ni ninguna mención a Claude/IA** (aunque un recordatorio del sistema lo sugiera; ya hubo que reescribir uno
  con force push). Commit y push **solo cuando lo pide**.
- **No tocar la clave de TMDB** ni quitar servidores del reproductor sin que lo pida.
- **TV: NO instalar nada hasta que diga «listo instala»** (suele haber gente viendo televisión). Al instalar, probar en la TV y reportar.
- **Entregables en el Escritorio** (`~/Desktop`): solo el ZIP de producción `tatocine-5.6-<hash>.zip` y `GoogleTvTatoCine.apk`; **borrar los
  anteriores** al reemplazarlos.
- **Orígenes de prueba**: el dueño abre en su Chrome los servidores locales que yo levanto, y sus datos reales pueden quedar ahí. Usar un
  **puerto nuevo** en cada tanda, no escribir en `localStorage` de un origen con datos, apagar los servidores al terminar.
- Limpiar en la TV los datos de prueba que deje (servidor preferido → ESP1, memoria por título, etc.).

## Estructura

```
index.html            estructura + ORDEN de <script defer> (= dependencias; no mover sin revisar llamadas en tiempo de carga)
config.js             clave TMDB (raíz)
sw.js                 Service Worker: CSS/JS cache-first en tatocine-shell-<VERSION>; imágenes TMDB (tope 1200) y API (800, SWR);
                      topes ×0,6 / ×0,35 si hay poco espacio; recorte cada 25 guardados
css/01-…26-*.css      cascada numerada (las de número mayor refinan a las anteriores); 21-fluidez = rendimiento/TV; 22-legacy = respaldos
js/core/              env (IS_TV), config (SERVERS), tmdb (cola 6 peticiones, dedupe, 429), performance (modo ligero), storage-maintenance…
js/profiles/ js/i18n/ js/ui/ js/player/ js/features/   capas; js/app.js al final
android-tv/           APK sin Gradle (build.sh, MainActivity.java, AndroidManifest.xml, res/)
tools/                stamp.js, package.js, gen-headers.js, css-legacy.js, check-servers.js, tv-debug/ (ayudas de TV)
tests/                *.test.js (Node, sin dependencias) + e2e/run.js (Playwright)
docs/ARCHITECTURE.md  arquitectura y limitaciones
```

Convenciones del JS: **scripts clásicos** (ámbito global, sin módulos ES, sin transpilar) por los televisores; nada posterior a **Chromium 68 /
Safari 12** sin detección (lo vigila `tests/compat.test.js`). Extender funciones existentes con `decorate("nombre", fn => fn2)`. Textos nuevos
con `L("es", "en")` / `i18nAdd()`. Acciones de botones con `data-act` + `registerAction()`. CSP estricta (sin scripts inline).

## Flujo de trabajo y publicación

```bash
for t in tests/*.test.js; do node $t; done                 # pruebas unitarias (sw-stamp falla hasta estampar)
node tools/gen-headers.js && node tools/stamp.js           # SIEMPRE antes de empaquetar o hacer commit de css/js/index.html
node tools/package.js                                      # → dist/site + dist/tatocine-5.6-<hash>.zip (minifica con esbuild si está en tools/node_modules)
TMDB_MOCK=1 E2E_ROOT=dist/site node tests/e2e/run.js       # E2E sobre el paquete (96 pruebas); ONLY="regex" filtra
bash android-tv/build.sh                                    # APK release → dist/GoogleTvTatoCine.apk (usa dist/site: empaquetar antes)
```
Luego copiar ZIP y APK al Escritorio (borrando los viejos). Sin `stamp.js` los usuarios se quedan con CSS/JS viejo en caché.
E2E necesita Playwright (`npx playwright install chromium`) y `cd tools && npm i` para esbuild.

Push (la cuenta de GitHub del repo es **r1h1**; en la máquina anterior `gh` tenía otra cuenta activa, por eso este truco sin cambiarla):
```bash
git -c credential.helper= -c "credential.helper=!f() { echo username=r1h1; echo password=\$(gh auth token --user r1h1); }; f" push origin main
```
En una máquina nueva basta con `gh auth login` con la cuenta r1h1 y `git push`.

## APK de Google TV

- `build.sh`: aapt2 → javac → d8 → zipalign → apksigner. SDK en `$ANDROID_HOME` (por omisión `~/Android/Sdk`; **en macOS** suele ser
  `~/Library/Android/sdk` → `export ANDROID_HOME=~/Library/Android/sdk`). Necesita JDK 17+, build-tools y una plataforma android-*.
- **Firma**: keystore `~/TatoCine-firma/tatocine-release.jks` (alias `tatocine`, contraseña en `~/TatoCine-firma/clave.txt`; o `$TATO_KEYSTORE` /
  `$TATO_KEYPASS_FILE`). **Hay que copiar esa carpeta a mano a la máquina nueva** (no está en git): sin la misma firma la TV no acepta la
  actualización y habría que desinstalar (se pierden los datos de la TV). Si no existe, build.sh crea una nueva: **no dejar que pase**.
- versionCode = minutos desde 1970 (crece en cada compilación). `TATO_DEBUG=1 bash android-tv/build.sh` activa el inspector de WebView
  (reemplaza `//@DEBUG@`); **solo para pruebas, nunca para entregar**.
- `MainActivity.java`, piezas clave:
  - Puente `TatoNative` con token aleatorio (`window.__tcNT`, inyectado en onPageFinished) porque `addJavascriptInterface` llega también a
    iframes de terceros: `showKeyboard`, `setPointer`, `hasVoice`, `voiceSearch`, `voiceStop`, `playerUrl`.
  - Puntero virtual (solo en el modal del reproductor): vista pequeña que se desplaza; clic real de ratón (DOWN + BUTTON_PRESS + BUTTON_RELEASE
    + UP vía `dispatchTouchEvent`); se oculta a los 3 s en pantalla completa haciendo hover en la vista de pantalla completa y luego fuera
    (-40,-40) + HOVER_EXIT, para que reproductores como videoapi oculten sus controles.
  - `playerDocument`: descarga el documento exacto del reproductor, le inyecta `PLAYER_STYLE` (sin animaciones + parche de
    `screen.orientation.lock`), quita CSP; ante cualquier problema devuelve null (carga normal).
  - Lista `BLOCK` de anuncios/rastreadores en `shouldInterceptRequest`; voz con SpeechRecognizer (permiso de micrófono); `preferHighestRefreshRate`.

## Probar en la TV (ADB por red)

- La IP de la TV **cambia** (fue .4, .2, .6 en 192.168.0.x): buscarla escaneando el puerto 5555 (o 8009) de la red local, luego
  `adb connect IP:5555`. Si hay un emulador conectado, usar siempre `adb -s IP:5555`.
- Instalar: `adb -s IP:5555 install -r ~/Desktop/GoogleTvTatoCine.apk` (solo tras «listo instala»).
- Depuración con CDP (APK con `TATO_DEBUG=1`): `TVIP=IP source tools/tv-debug/tv.sh`, luego `CON` (forward a localhost:9333), `js '<expr>'`
  (página principal), `node tools/tv-debug/cdpf.js` (iframes), `prof.js` (perfil de CPU), `k 22 23` (teclas: 19↑ 20↓ 21← 22→ 23 OK 4 Atrás),
  `foc` (foco actual), `shot nombre` (captura). macOS: `brew install android-platform-tools` y `brew install coreutils` (para `timeout`).
- Tras probar con la APK de depuración, **reinstalar la release** y limpiar los datos de prueba.

## Estado y decisiones ya tomadas (no re-discutir)

- Versión actual 5.6 (la VERSION del SW es un hash de contenido). Última entrada del README: **5.33**.
- Instalada en la TV: APK 5.6-736cfa72 (probado: orden de Inicio, tráiler, logotipo de TMDB en Legal). Última IP de la TV: 192.168.0.7.
- Orden de Inicio: Continuar viendo → Nuevos episodios → Hecho para ti → Tendencias / Estrenos / Populares → Plataformas y estudios → filas
  perezosas (Top 10, mejor calificadas…, solo se piden al acercarse).
- Tráiler de la portada: el dueño **lo quiere** (también en la TV). Por defecto «Siempre» en TV y equipos normales; en móviles modestos
  (modo ligero automático) imagen fija salvo que elijan «Siempre» a mano. El experimento de tráiler a 480p se revirtió (letras enormes en YouTube).
- Zoom bloqueado en PWA instalada y APK (`html.tc-app`); la web en navegador sí deja zoom.
- Escala de texto: `--ts` (×0,875 en ≥1200 px), `--ts-hero` (TV ×0,94), `--ts-hero-web` (×1,05), `--ts-head` (×1,1525) en `accessibility-prefs.js`.
- Navegación con mando: `js/ui/tv-navigation.js` (`spatialMove` por distancia de bordes, `visibleFocusables` con `checkVisibility`).
- Buscador: `search-intent.js` (intención → TMDB /discover) y `search-smart.js` (personajes → título, persona + título, palabra clave).
- Servidores: orden en `SERVERS` con migración `tatoServersV2`; `adultAds` se filtra en perfiles infantiles. Problemas de un servidor concreto
  (p. ej. ESP3/ESP4 con «Madre siniestra», TMDB 1400837) son del tercero: el cambio automático salta al siguiente.
- `content-visibility` se midió peor en la TV: no usar. Ocultar el fondo bajo la ficha no mejoró nada medible.
- «No me gusta» (👎 en la ficha) ya saca el título de las recomendaciones; «Liberar espacio» en Ajustes borra imágenes/datos temporales.
- **No hecho a propósito:** versión «Legacy TV» para Chromium < 68, barra inferior/menú nuevo (cambia el diseño), sincronización entre
  dispositivos, Watch Party, push (imposibles sin backend).

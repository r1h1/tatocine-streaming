# CLAUDE.md · TatoCine

Contexto completo para trabajar en este proyecto (también desde otra máquina). El dueño habla **español**: responde siempre en español.
Detalle técnico: `docs/ARCHITECTURE.md`; historial de cambios: `README.md` (entradas 5.x).

## Qué es

TatoCine: app web de catálogo/reproducción (películas, series, anime, niños) **estática y sin backend** (HTML/CSS/JS clásico, sin build en el código
fuente). Datos de TMDB (clave pública en `config.js`); el video viene de reproductores de terceros en iframe (`js/core/config.js` → `SERVERS`).
Todo lo del usuario (perfiles, PIN, historial, listas, recomendaciones) vive en `localStorage` del dispositivo. Open source (**GPLv3**, ver
`LICENSE`; gratuito y sin fines de lucro), autor Ma. Ing. Daniel Rivas (GitHub r1h1), repo
`github.com/r1h1/tatocine-streaming`, rama `main`.

Tres formas de uso, **las tres deben seguir funcionando siempre**:
1. **Web** (Vercel y Netlify; los despliegues son réplicas del mismo ZIP, se comparan con `curl <dominio>/build.json`).
2. **PWA** instalada (móvil/escritorio), con Service Worker `sw.js`.
3. **APK de Google TV / Android TV** (`android-tv/`, `GoogleTvTatoCine.apk`): WebView que sirve la web desde la propia APK. Se instala por ADB
   en la TV Xiaomi (Google TV) del dueño.

## Puesta a punto en la MacBook (primera vez)

El proyecto se movió de Linux (Ubuntu, `~/Desktop/Descargas/tato-cine`) a macOS. La memoria automática de Claude Code NO viaja: este archivo
la reemplaza. Pasos (comprobar cada uno antes de dar algo por hecho):

1. **Copiar a mano `~/TatoCine-firma/`** (keystore + `clave.txt`) desde la máquina anterior a `~/TatoCine-firma/` en la Mac. Imprescindible
   para la APK (ver «APK de Google TV»). Antes de compilar: `ls ~/TatoCine-firma/tatocine-release.jks` debe existir.
2. Herramientas: `xcode-select --install` (git, zip), Homebrew y luego
   `brew install node gh android-platform-tools coreutils openjdk@21` (`coreutils` da `gtimeout`; `tools/tv-debug/tv.sh` lo usa solo).
   Java: `export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"; export PATH="$JAVA_HOME/bin:$PATH"`.
3. Android SDK sin Android Studio: `brew install --cask android-commandlinetools`, luego
   `sdkmanager "build-tools;36.0.0" "platforms;android-36"` y `export ANDROID_HOME="$(brew --prefix)/share/android-commandlinetools"`
   (con Android Studio sería `~/Library/Android/sdk`). Poner los `export` en `~/.zshrc`. `build.sh` toma el build-tools y la plataforma más nuevos.
4. Clonar y entrar: `gh auth login` (cuenta **r1h1**) → `gh repo clone r1h1/tatocine-streaming && cd tatocine-streaming`.
   `git config user.name r1h1` (el correo, el que el dueño use en GitHub).
5. Dependencias solo de desarrollo: `(cd tools && npm i)` (esbuild para minificar el ZIP) y `(cd tests/e2e && npm i && npx playwright install chromium)`.
   `tests/e2e/run.js` busca el navegador en `~/Library/Caches/ms-playwright`, Chrome/Chromium/Brave de `/Applications` o `CHROME_PATH`.
6. Comprobar: `for t in tests/*.test.js; do node $t; done`, luego `node tools/package.js` y `TMDB_MOCK=1 E2E_ROOT=dist/site node tests/e2e/run.js`
   (deben pasar todas: 96). Opcional: `bash android-tv/build.sh` y comparar la huella SHA-256 del certificado que imprime con la de abajo.
7. Diferencias de macOS a recordar: `sed -i ''` (BSD) en vez de `sed -i`; en la Mac el Escritorio también es `~/Desktop`; la red local puede
   no ser 192.168.0.x (ver la propia IP con `ipconfig getifaddr en0`).

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
- **Clave de TMDB al empaquetar (28 nov 2026):** en git `config.js` lleva el marcador `"xxxxxxxxx"`; la clave real está en `~/TatoCine-firma/tmdb-key.txt` (fuera del repo; o `$TMDB_API_KEY`) y `tools/package.js` la mete SOLO en `dist/site/config.js`. Si falta, el empaquetador se niega (un ZIP con el marcador dio «clave del catálogo no válida» / 401 en producción). Las E2E usan TMDB simulado y NO detectan esto: después de empaquetar, probar el ZIP contra TMDB real (abrir el sitio y ver que carga el catálogo). Copiar también `tmdb-key.txt` a una máquina nueva junto con la firma.
- **TV: NO instalar nada hasta que diga «listo instala»** (suele haber gente viendo televisión). Al instalar, probar en la TV y reportar.
- **Entregables en el Escritorio** (`~/Desktop`): solo el ZIP de producción `tatocine-5.6-<hash>.zip` y `GoogleTvTatoCine.apk`; **borrar los
  anteriores** al reemplazarlos.
- **Orígenes de prueba**: el dueño abre en su Chrome los servidores locales que yo levanto, y sus datos reales pueden quedar ahí. Usar un
  **puerto nuevo** en cada tanda, no escribir en `localStorage` de un origen con datos, apagar los servidores al terminar.
- Limpiar en la TV los datos de prueba que deje (servidor preferido → OP1, memoria por título, etc.; o restaurar el respaldo de localStorage).

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
- Huella del certificado de firma correcto (la que imprime `build.sh` al final, «V3.0 Signer: certificate SHA-256 digest»):
  `96f325929fad7ef8c88dc21274d7a81cc98ba5403e22648986331f8876564e4c`. Si sale otra, la firma NO es la buena: no instalar.
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

- TV: **Xiaomi MiTV-MZTU0** (Google TV, `adb devices -l` → `model:MiTV_MZTU0`), paquete `app.tatocine.tv`. La depuración por red (ADB) ya
  está activada en la TV; si la Mac es un equipo nuevo, la TV pedirá **aceptar la huella** de la Mac la primera vez (alguien debe pulsar
  «Permitir» con el mando).
- La IP de la TV **cambia** (fue .4, .2, .6, .7 en 192.168.0.x; cambia al reiniciar el router). Buscarla por el puerto 5555 (o 8009):
  Linux `for i in $(seq 1 254); do (timeout 0.6 bash -c "</dev/tcp/192.168.0.$i/5555" 2>/dev/null && echo $i) & done; wait`;
  macOS `for i in $(seq 1 254); do (nc -z -G 1 192.168.0.$i 5555 2>/dev/null && echo $i) & done; wait`. Luego `adb connect IP:5555`.
  Si hay un emulador o un teléfono conectado (en Linux había un Redmi por USB), usar siempre `adb -s IP:5555`.
- Ver la versión instalada: `adb -s IP:5555 shell dumpsys package app.tatocine.tv | grep -E "versionCode|versionName"`.
- Al abrir la app tras actualizar sale «¡Actualización disponible!» (normal: OK con el mando) y luego el selector de perfiles. En la TV hay
  datos reales («Mi perfil» con Continuar viendo): **no reproducir ni borrar nada** al probar; cuidado con las teclas, OK sobre una tarjeta abre
  el reproductor. Sin APK de depuración no hay CDP: probar con teclas + capturas (`adb exec-out screencap -p > x.png`).
- Instalar: `adb -s IP:5555 install -r ~/Desktop/GoogleTvTatoCine.apk` (solo tras «listo instala»); abrir:
  `adb -s IP:5555 shell monkey -p app.tatocine.tv -c android.intent.category.LAUNCHER 1`.
- Depuración con CDP (APK con `TATO_DEBUG=1`): `TVIP=IP source tools/tv-debug/tv.sh`, luego `CON` (forward a localhost:9333), `js '<expr>'`
  (página principal), `node tools/tv-debug/cdpf.js` (iframes), `prof.js` (perfil de CPU), `k 22 23` (teclas: 19↑ 20↓ 21← 22→ 23 OK 4 Atrás),
  `foc` (foco actual), `shot nombre` (captura). macOS: `brew install android-platform-tools` y `brew install coreutils` (para `timeout`).
- Medir servidores en la TV: `TVIP=IP bash tools/tv-debug/tvsrv.sh <tmdbId> "<título>" 0 3` (resolución, cuadros perdidos, búfer) y
  `node tools/tv-debug/net.js 30` (dominios pedidos). En el PC: `tools/tv-debug/audit.js` (abajo).
- **Datos reales de la TV al probar:** antes, respaldar `localStorage` (`js 'JSON.stringify(Object.assign({},localStorage))' > respaldo.json`);
  al terminar, restaurarlo (`localStorage.clear()` + `setItem` de cada clave) y reiniciar la app. Así no queda «Continuar viendo» ni memoria
  por título de las pruebas.
- Tras probar con la APK de depuración, **reinstalar la release** (comprobar: `unzip -p <apk> classes.dex | grep -ac setWebContentsDebuggingEnabled` → 0).
- `build.sh` no admite lambdas de Java (d8 falla con «Unable to find method metafactory» y deja la APK anterior): usar clases anónimas.
- Si `adb` dice «unauthorized», en la TV salió el aviso de «Permitir depuración»: el dueño debe aceptarlo con el mando.

## Estado y decisiones ya tomadas (no re-discutir)

- Versión actual 5.6 (la VERSION del SW es un hash de contenido). Última entrada del README: **5.34**.
- **Producción = GitHub = TV** (24 nov 2026): versión **5.6-a3fd171b** en tatocine, tatocine2 y tatocine3.vercel.app (comprobado con
  `curl <dominio>/build.json`), commit `af4ae7b` en `main`, APK release versionCode 29924964 instalada en la TV (IP 192.168.0.7).
  **No hay nada pendiente.**
- Auditoría de servidores (5.34, medido en TV y PC): La Odisea/F1 → OP1 720p estable, OP4 1080p, OP2 480p (arranca en pausa), OP3 480p
  que se traba (pierde ~1/3 de cuadros en la TV), OP5 720p. *La sombra de la traición* (TMDB 73499) solo existe en 624×265 en OP1/OP3/OP4
  (copia mala del tercero; OP2 no la tiene). *Yo Soy Rocky* (1286656, estreno nov 2026) es copia con subtítulos italianos quemados.
  onlyflix.to usa vidapi.xyz, balance.medmedia03.wiki, nontongo y vidfast.vc (inglés): 3 con anuncios/rechazan sandbox, balance no reprodujo → ninguno añadido.
- En la web, OP5 con algunos títulos muestra «sandboxed embed is not allowed» (su reproductor interno rechaza sandbox): es el precio de cero
  ventanas porno; en la APK no hay sandbox (la app ya bloquea ventanas y salidas) y OP5 funciona con todo.
- Orden de Inicio: Continuar viendo → Nuevos episodios → Hecho para ti → Tendencias / Estrenos / Populares → Plataformas y estudios → filas
  perezosas (Top 10, mejor calificadas…, solo se piden al acercarse).
- Tráiler de la portada: el dueño **lo quiere** (también en la TV). Por defecto «Siempre» en TV y equipos normales; en móviles modestos
  (modo ligero automático) imagen fija salvo que elijan «Siempre» a mano. El experimento de tráiler a 480p se revirtió (letras enormes en YouTube).
- Zoom bloqueado en PWA instalada y APK (`html.tc-app`); la web en navegador sí deja zoom.
- Escala de texto: `--ts` (×0,875 en ≥1200 px), `--ts-hero` (TV ×0,94), `--ts-hero-web` (×1,05), `--ts-head` (×1,1525) en `accessibility-prefs.js`.
- Navegación con mando: `js/ui/tv-navigation.js` (`spatialMove` por distancia de bordes, `visibleFocusables` con `checkVisibility`).
- Buscador: `search-intent.js` (intención → TMDB /discover) y `search-smart.js` (personajes → título, persona + título, palabra clave).
- **Política: CERO anuncios, analíticas, rastreadores, bloatware o malware.** Un servidor que inyecte publicidad engañosa o scripts maliciosos
  se quita (así salió ENG1/vidsrc.sh en 5.34). En web y PWA todos los iframes del reproductor llevan `sandbox` sin `allow-popups` ni `allow-top-navigation`
  (marcar `noSandbox` solo si un servidor no funciona con él y el dueño lo acepta). La APK además bloquea dominios (`BLOCK`) y avisa «tc-player-unavailable».
- Servidores **OP1–OP5** (antes ESP1–ESP5; migraciones `tatoServersV2` y `tatoServersV3`): OP1 moviemaster (avisa `mm:hello`), OP2 videoapi
  (avisa `vidapi-player`/`bridge_ready`; si no tiene el título muestra «Contenido no disponible»), OP3 tukiplay (480p, se traba), OP4 unlimplay
  (1080p), OP5 facilitoplay (`adultAds`: nunca en perfiles infantiles). Cambio automático: `FALLBACK_ORDER` en `player-robust.js`.
- Auditoría de servidores: `tools/tv-debug/audit.js` (Playwright, iframe servido como tatocine.vercel.app, mide videoWidth/búfer)
  y en la TV `cdpf.js` con `getVideoPlaybackQuality()`. La calidad mala de un título suele ser la copia del tercero (medir antes de culpar al código).
- `content-visibility` se midió peor en la TV: no usar. Ocultar el fondo bajo la ficha no mejoró nada medible.
- «No me gusta» (👎 en la ficha) ya saca el título de las recomendaciones; «Liberar espacio» en Ajustes borra imágenes/datos temporales.
- Auditoría externa (5.33): se tomó lo útil (orden de Inicio, tráiler en equipos modestos, caché según espacio, logotipo de TMDB, docs).
  Si vuelve a pedir «mejorar con un análisis»: tomar solo lo que no rompa nada ni cambie el diseño, y decir qué se descartó y por qué.
- **No hecho a propósito:** versión «Legacy TV» para Chromium < 68, barra inferior/menú nuevo (cambia el diseño), sincronización entre
  dispositivos, Watch Party, push (imposibles sin backend).
- **28 nov 2026 (`tatocine-5.6-23c57f31.zip`):** créditos «Ma. Ing. Daniel Rivas, Guatemala» (`LEGAL_AUTHOR` en `legal-hub.js`). ZIP probado tal cual contra TMDB real (186 títulos, 0 errores 401).

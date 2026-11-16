#!/usr/bin/env bash
# TatoCine · android-tv/build.sh
# Genera GoogleTvTatoCine.apk (Google TV / Android TV, también teléfonos y tabletas) SIN Gradle, solo con el Android SDK: aapt2 → javac → d8 → zipalign → apksigner.
# La app web va DENTRO de la APK (assets/site, el mismo contenido del ZIP de producción: node tools/package.js).
#
# Uso:  bash android-tv/build.sh [/ruta/al/keystore.jks]
#   · Firma: keystore en $TATO_KEYSTORE (o el argumento; por omisión ~/TatoCine-firma/tatocine-release.jks), alias «tatocine», contraseña en el archivo
#     $TATO_KEYPASS_FILE (por omisión ~/TatoCine-firma/clave.txt). Si no existe, se crea una vez. GUARDA ESA CARPETA: sin la misma firma la TV no acepta
#     actualizar la app (habría que desinstalarla, y se pierden perfiles y favoritos guardados en ella).
#   · Resultado: dist/GoogleTvTatoCine.apk
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
BT="$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)"
PLATFORM="$(ls -d "$SDK"/platforms/android-* | sort -V | tail -1)/android.jar"
KS="${1:-${TATO_KEYSTORE:-$HOME/TatoCine-firma/tatocine-release.jks}}"
PASSF="${TATO_KEYPASS_FILE:-$HOME/TatoCine-firma/clave.txt}"
OUT="$ROOT/dist/android"
APK="$ROOT/dist/GoogleTvTatoCine.apk"

echo "SDK: $SDK · build-tools: $(basename "$BT") · plataforma: $(basename "$(dirname "$PLATFORM")")"

# 1) contenido web de producción (minificado, con respaldos para WebView viejo)
node tools/package.js >/dev/null
VERSION="$(node -e 'console.log(require("./dist/site/build.json").version)')"
VCODE="$(( $(date +%s) / 60 ))"                            # minutos desde 1970: crece en CADA compilación (antes era por hora y dos APK de la misma hora empataban); > 26111615 de las primeras

rm -rf "$OUT"; mkdir -p "$OUT/assets" "$OUT/gen" "$OUT/classes" "$OUT/dex"
cp -r dist/site "$OUT/assets/site"
rm -f "$OUT/assets/site/_headers" "$OUT/assets/site/netlify.toml" "$OUT/assets/site/vercel.json"   # solo sirven a los hostings

# 2) iconos (lanzador) y banner de Google TV (320×180) a partir de los iconos de la app
python3 -I android-tv/make-icons.py "$ROOT" "$OUT/res"
cp -r android-tv/res/. "$OUT/res/"

# 3) recursos y manifiesto
"$BT/aapt2" compile --dir "$OUT/res" -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$PLATFORM" --manifest android-tv/AndroidManifest.xml -A "$OUT/assets" --java "$OUT/gen" \
  --min-sdk-version 21 --target-sdk-version 35 --version-code "$VCODE" --version-name "$VERSION" --auto-add-overlay "$OUT/res.zip"

# 4) Java → dex
javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath "$PLATFORM" -d "$OUT/classes" \
  android-tv/src/app/tatocine/tv/MainActivity.java "$OUT/gen/app/tatocine/tv/R.java"
"$BT/d8" --release --min-api 21 --lib "$PLATFORM" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
(cd "$OUT/dex" && zip -q -j "$OUT/base.apk" classes.dex)

# 5) alinear y firmar (firma v1+v2+v3)
"$BT/zipalign" -p -f 4 "$OUT/base.apk" "$OUT/aligned.apk"
if [ ! -f "$KS" ]; then
  mkdir -p "$(dirname "$KS")"; chmod 700 "$(dirname "$KS")"
  python3 -c 'import secrets,string;print("".join(secrets.choice(string.ascii_letters+string.digits) for _ in range(32)))' > "$PASSF"; chmod 600 "$PASSF"
  keytool -genkeypair -keystore "$KS" -storetype PKCS12 -alias tatocine -keyalg RSA -keysize 4096 -validity 36500 \
    -storepass:file "$PASSF" -keypass:file "$PASSF" -dname "CN=TatoCine, OU=TatoCine TV, O=TatoCine, C=GT" >/dev/null 2>&1
  chmod 600 "$KS"
  echo "Firma nueva creada en $KS (contraseña en $PASSF). GUARDA ESA CARPETA."
fi
"$BT/apksigner" sign --ks "$KS" --ks-key-alias tatocine --ks-pass "file:$PASSF" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "$APK" "$OUT/aligned.apk"
"$BT/apksigner" verify --print-certs "$APK" | head -3
echo "✓ $APK  ($(du -h "$APK" | cut -f1))  ·  versión $VERSION ($VCODE)"

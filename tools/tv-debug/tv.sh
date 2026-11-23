# Ayudas para probar TatoCine en la TV por ADB + CDP (solo desarrollo, no se publican).
# Uso:  TVIP=192.168.0.6 source tools/tv-debug/tv.sh   (luego: CON; js 'document.title'; k 22 23; foc; shot nombre)
# Requiere: adb (Linux: platform-tools; macOS: brew install android-platform-tools) y la APK de depuración (TATO_DEBUG=1) para CDP.
S="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
TVIP=${TVIP:-192.168.0.6}
ADB="${ADB_BIN:-adb} -s $TVIP:5555"                     # siempre con -s: si hay un emulador conectado, adb pide elegir
mkdir -p "$S/tv"
command -v timeout >/dev/null 2>&1 || timeout(){ if command -v gtimeout >/dev/null 2>&1; then gtimeout "$@"; else shift; "$@"; fi; }   # macOS: brew install coreutils → gtimeout
k(){ for x in "$@"; do timeout 10 $ADB shell input keyevent $x; sleep ${D:-1.2}; done; }   # 19↑ 20↓ 21← 22→ 23 OK 4 Atrás
js(){ timeout 20 node "$S/cdp.js" "$1"; }                # evalúa en la página principal de la APK (puerto 9333)
foc(){ js '(function(){var a=document.activeElement;return a.tagName+"#"+a.id+"."+String(a.className).slice(0,25)+" ["+(a.textContent||a.placeholder||"").trim().replace(/\s+/g," ").slice(0,24)+"]"})()'; }
opn(){ js '[...document.querySelectorAll(".open")].map(e=>e.id).filter(Boolean).join(",")'; }
shot(){ timeout 15 $ADB exec-out screencap -p > "$S/tv/$1.png"; }
CON(){ for i in $(seq 1 20); do sleep 2; SOCK=$(timeout 8 $ADB shell cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*' | tail -1); [ -n "$SOCK" ] && break; done; $ADB forward --remove-all; $ADB forward tcp:9333 localabstract:$SOCK >/dev/null; }

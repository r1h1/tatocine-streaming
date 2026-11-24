# Mide servidores del reproductor EN LA TV (APK de depuración TATO_DEBUG=1 + CON hecho). Uso:
#   TVIP=192.168.0.7 bash tools/tv-debug/tvsrv.sh <tmdbId> "<título>" <índices de SERVERS...>   (0=OP1 … 4=OP5)
# Por cada servidor: resolución real, tiempo, cuadros perdidos/total y búfer cada 6 s, texto visible y captura en tools/tv-debug/tv/.
# OJO: reproducir guarda «Continuar viendo» y memoria por título: respaldar localStorage antes y restaurarlo después (ver CLAUDE.md).
cd "$(dirname "$0")/../.."; source tools/tv-debug/tv.sh
ID=$1; T=$2; shift 2
VEXP='(function(){var v=[...document.querySelectorAll("video")].map(function(x){var q=x.getVideoPlaybackQuality?x.getVideoPlaybackQuality():null;return x.videoWidth+"x"+x.videoHeight+" rs"+x.readyState+" t"+Math.round(x.currentTime)+(x.paused?"⏸":"▶")+" drop"+(q?q.droppedVideoFrames+"/"+q.totalVideoFrames:"?")+" buf"+(x.buffered.length?Math.round(x.buffered.end(x.buffered.length-1)-x.currentTime):0)});return v.length?location.hostname+" "+v.join(","):null})()'
for i in "$@"; do
  js "(function(){ if(!\$modal.classList.contains('open')) openPlayer($ID,'movie','$T'); fb.manual=true; playEmbed($i, document.getElementById('server-btn-$i')); return SERVERS[$i].name })()"
  sleep 9
  node tools/tv-debug/cdpf.js "" '(function(){var b=[...document.querySelectorAll("button,div,span")].find(function(e){return /^(Reproducir|Continuar|Play)$/i.test((e.innerText||"").trim())});if(b){b.click();return location.hostname+" click"}return null})()' >/dev/null
  for s in 1 2 3 4; do sleep 6; echo "[$i] $((9+s*6))s $(node tools/tv-debug/cdpf.js "" "$VEXP")"; done
  echo "[$i] texto: $(node tools/tv-debug/cdpf.js "" '(document.body&&document.body.innerText||"").replace(/\s+/g," ").slice(0,110)||null' | cut -c1-300)"
  shot "srv-$ID-$i"
done

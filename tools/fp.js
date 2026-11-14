/**
 * TatoCine · tools/fp.js
 * HUELLA de una versión de la app = FNV-1a (8 hex) de las parejas «archivo:hash» de los <link>/<script> versionados (?v=) de index.html, en orden.
 * Se escribe en build.json (`fp`) al estampar/empaquetar; el navegador calcula la MISMA huella con el index.html que está ejecutando (js/ui/update-modal.js, tcRunningFp)
 * y la compara con la de build.json (sin caché): si no coinciden, esa versión ya no es la última y se pide actualizar. Así el aviso reaparece en cada apertura hasta
 * que de verdad se actualice, sin depender del estado del Service Worker. Si cambias este algoritmo, cámbialo también en js/ui/update-modal.js.
 */
function fingerprint(html) {
  const parts = [], re = /(?:href|src)="((?:css|js)\/[^"?]+)\?v=([0-9a-f]+)"/g; let m;
  while ((m = re.exec(html))) if (m[1].indexOf("js/vendor/") !== 0) parts.push(m[1] + ":" + m[2]);
  let h = 0x811c9dc5; const s = parts.join(",");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ("00000000" + h.toString(16)).slice(-8);
}
module.exports = { fingerprint };

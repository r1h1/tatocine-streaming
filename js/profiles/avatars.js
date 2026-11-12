/**
 * TatoCine · js/profiles/avatars.js
 * Diez avatares ORIGINALES (dibujos propios, en línea blanca sobre el círculo oscuro del perfil; no copian personajes ni franquicias).
 * Cada perfil guarda solo el identificador («a1»…«a10»); los perfiles sin avatar siguen mostrando su inicial.
 * Se carga de forma síncrona justo antes de picker-open.js para que las tarjetas tempranas del selector ya los muestren.
 * Si quieres usar arte con licencia propia, sustituye el SVG de la entrada correspondiente (viewBox 0 0 64 64, trazo currentColor).
 */
var TC_AVATARS = [
  { id: "a1", es: "Explorador espacial", en: "Space explorer",
    d: '<circle cx="32" cy="30" r="17"/><rect x="20" y="24" width="24" height="14" rx="7" fill="currentColor" fill-opacity=".18"/><path d="M26 29l3-2"/><path d="M32 13V6"/><circle cx="32" cy="5" r="1.8" fill="currentColor"/><path d="M12 58c1-9 9-12 20-12s19 3 20 12"/>' },
  { id: "a2", es: "Detective de misterio", en: "Mystery detective",
    d: '<path d="M16 28c0-9 7-16 16-16s16 7 16 16"/><path d="M10 29h44"/><path d="M17 23h30"/><circle cx="29" cy="41" r="9"/><path d="M25 40v.01M33 40v.01"/><path d="M26 45c2 1.6 4 1.6 6 0"/><circle cx="48" cy="46" r="6"/><path d="M52.5 50.5L58 56"/>' },
  { id: "a3", es: "Aventurero fantástico", en: "Fantasy adventurer",
    d: '<path d="M14 40L30 8c.8-1.4 2.2-1.4 3 0l15 32"/><path d="M8 41c8 4 40 4 48 0"/><path d="M32 18l2 4.2 4.6.6-3.3 3.200.8 4.600L32 28.400l-4.100 2.200.8-4.600-3.300-3.200 4.600-.6z" fill="currentColor" fill-opacity=".9"/><path d="M20 52c4 3 20 3 24 0"/><path d="M50 14v6M47 17h6"/>' },
  { id: "a4", es: "Piloto futurista", en: "Futuristic pilot",
    d: '<path d="M16 34c0-10 7-18 16-18s16 8 16 18v6c0 6-7 11-16 11S16 46 16 40z"/><rect x="18" y="27" width="28" height="11" rx="5.500" fill="currentColor" fill-opacity=".18"/><circle cx="26" cy="32.500" r="3.200"/><circle cx="38" cy="32.500" r="3.200"/><path d="M29.200 32.500h5.600"/><path d="M8 24l8 3M56 24l-8 3"/><path d="M26 45h12"/>' },
  { id: "a5", es: "Ninja", en: "Ninja",
    d: '<circle cx="32" cy="32" r="20"/><path d="M12.500 26h39v12h-39z" fill="currentColor" fill-opacity=".18"/><path d="M22 32h6M36 32h6"/><path d="M51 28c5-1 8 1 10 5M51 33c4 1 7 4 8 8"/>' },
  { id: "a6", es: "Criatura amistosa", en: "Friendly creature",
    d: '<path d="M14 40c0-14 8-22 18-22s18 8 18 22c0 8-8 14-18 14S14 48 14 40z"/><path d="M19 22l-5-9 10 4M45 22l5-9-10 4"/><circle cx="25.500" cy="33" r="5"/><circle cx="38.500" cy="33" r="5"/><circle cx="26.500" cy="33.500" r="1.800" fill="currentColor"/><circle cx="37.500" cy="33.500" r="1.800" fill="currentColor"/><path d="M26 44c3.500 3 8.500 3 12 0"/>' },
  { id: "a7", es: "Científica curiosa", en: "Curious scientist",
    d: '<circle cx="26" cy="33" r="14"/><path d="M13 24c-3-8 2-14 9-13 3-4 9-4 12 0 6-1 10 4 8 10"/><circle cx="21" cy="33" r="4.5"/><circle cx="32" cy="33" r="4.5"/><path d="M25.500 33h2M16.500 32l-3-1M36.500 32l3-1"/><path d="M23 42c2.500 2 5.500 2 8 0"/><path d="M46 34h10M48 34v9l-7 13c-.8 1.500 0 3 1.600 3h15.800c1.600 0 2.400-1.500 1.600-3L53 43v-9"/><path d="M44.500 52h17" /><path d="M52 47v.01M56 49v.01" />' },
  { id: "a8", es: "Héroe urbano", en: "Urban hero",
    d: '<circle cx="32" cy="22" r="12"/><path d="M19.500 19c4-3 21-3 25 0v6c-4 3-21 3-25 0z" fill="currentColor" fill-opacity=".2"/><path d="M26 22v.01M38 22v.01"/><path d="M14 58l4-18c2-4 8-6 14-6s12 2 14 6l4 18"/><path d="M34 40l-5 8h6l-4 8"/>' },
  { id: "a9", es: "Astronauta infantil", en: "Little astronaut",
    d: '<circle cx="30" cy="34" r="15"/><rect x="21" y="29" width="18" height="11" rx="5.500" fill="currentColor" fill-opacity=".18"/><path d="M26 33.500l2-1.400"/><path d="M48 12l1.600 3.400 3.700.5-2.700 2.600.7 3.700L48 20.400l-3.300 1.800.7-3.700-2.700-2.600 3.700-.5z" fill="currentColor"/><ellipse cx="14" cy="14" rx="9" ry="3.200" transform="rotate(-20 14 14)"/><circle cx="14" cy="14" r="3.500" fill="currentColor" fill-opacity=".9"/>' },
  { id: "a10", es: "Gato cinéfilo", en: "Cinephile cat",
    d: '<path d="M14 24l2-14 11 8c3-1 7-1 10 0l11-8 2 14c2 4 3 8 3 12 0 10-9 16-21 16S11 46 11 36c0-4 1-8 3-12z"/><rect x="17" y="29" width="13" height="10" rx="2.500" fill="currentColor" fill-opacity=".2"/><rect x="34" y="29" width="13" height="10" rx="2.500" fill="currentColor" fill-opacity=".2"/><path d="M30 33h4"/><path d="M30 45l2 2 2-2"/><path d="M8 42l8 1M8 48l8-2M56 42l-8 1M56 48l-8-2"/>' }
];
var TC_AVATAR_RE = /^a(10|[1-9])$/;
function avatarDef(id) { if (!TC_AVATAR_RE.test(String(id || ""))) return null; for (var i = 0; i < TC_AVATARS.length; i++) if (TC_AVATARS[i].id === id) return TC_AVATARS[i]; return null; }
function avatarSvg(id, size) {
  var a = avatarDef(id); if (!a) return "";
  return '<svg class="tc-av" viewBox="0 0 64 64" width="' + (size || 40) + '" height="' + (size || 40) + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + a.d + "</svg>";
}
/** Contenido del círculo del perfil: su avatar (si eligió uno) o su inicial. `initial` ya viene en texto plano. */
function profileAvatarHTML(profile, initial) {
  var svg = profile && avatarSvg(profile.avatar);
  return svg || String(initial == null ? "U" : initial).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
}

/* ---------- Galería de avatares en crear/editar perfil ---------- */
var profileFormAvatar = "";
function setProfileFormAvatar(id) {
  profileFormAvatar = avatarDef(id) ? id : "";
  var grid = document.getElementById("pf-avatar-grid"); if (!grid) return;
  grid.querySelectorAll(".pf-av").forEach(function (b) { var on = b.getAttribute("data-av") === profileFormAvatar; b.classList.toggle("active", on); b.setAttribute("aria-checked", on ? "true" : "false"); });
}
function renderAvatarGrid() {
  var grid = document.getElementById("pf-avatar-grid"); if (!grid || grid.childNodes.length) return;
  var en = (document.documentElement.lang || "es").slice(0, 2) === "en";
  grid.innerHTML = TC_AVATARS.map(function (a) {
    return '<button type="button" class="pf-av" role="radio" aria-checked="false" data-av="' + a.id + '" aria-label="' + (en ? a.en : a.es) + '" title="' + (en ? a.en : a.es) + '">' + avatarSvg(a.id, 34) + "</button>";
  }).join("");
  grid.onclick = function (e) {
    var b = e.target && e.target.closest ? e.target.closest(".pf-av") : null; if (!b) return;
    setProfileFormAvatar(profileFormAvatar === b.getAttribute("data-av") ? "" : b.getAttribute("data-av"));      // volver a tocar el elegido = quitarlo (vuelve la inicial)
  };
}

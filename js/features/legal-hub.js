/**
 * TatoCine · js/features/legal-hub.js
 * «Legal»: pantalla con cuatro opciones (Legal y no responsabilidad, Código fuente, Créditos, Sitios de terceros),
 * pie legal global al final de cada vista y de las ventanas con scroll, y aviso de terceros debajo del reproductor.
 * La lista de sitios de terceros se genera desde SERVERS (js/core/config.js): si se agrega o quita un servidor, esta pantalla se actualiza sola.
 */
var LEGAL_REPO = "https://github.com/r1h1/tatocine-streaming", LEGAL_AUTHOR_URL = "https://github.com/r1h1/", LEGAL_AUTHOR = "Ma. Ing. Daniel Rivas";

if (typeof i18nAdd === "function") i18nAdd({
  "Legal": "Legal",
  "Aviso legal y descargo de responsabilidad": "Legal notice and disclaimer",
  "Código fuente": "Source code", "Créditos": "Credits", "Sitios de terceros": "Third-party sites",
  "Copiar tus datos (JSON)": "Copy your data (JSON)", "Copiar tus datos (QR)": "Copy your data (QR)",
  "Elige “Mi perfil”": "Choose “My profile”", "Mi perfil": "My profile",
  "Puedes editar y crear perfiles. Son locales: solo viven en este dispositivo.": "You can edit and create profiles. They are local: they only live on this device.", "Avatar": "Avatar"
});

/** Dominios reales de los servicios externos, agrupados por función. */
function legalThirdParty() {
  var players = [];
  try {
    SERVERS.forEach(function (s) {
      var host = new URL(s.url(1, "movie", 1, 1)).hostname;
      if (host && players.indexOf(host) < 0) players.push(host);
    });
  } catch (e) { }
  return [
    { t: L("Catálogo e imágenes", "Catalog and images"), hosts: ["api.themoviedb.org", "image.tmdb.org"] },
    { t: L("Reproductores integrados", "Embedded players"), hosts: players },
    { t: L("Tráileres", "Trailers"), hosts: ["www.youtube-nocookie.com"] }
  ];
}

function legalRow(label, sub, control) {
  return '<div class="settings-option"><div><div class="label">' + escapeHTML(label) + '</div><div class="sub-label">' + sub + "</div></div>" + control + "</div>";
}

function renderLegalHub() {
  var groups = legalThirdParty().map(function (g) {
    return '<div class="legal-group"><strong>' + escapeHTML(g.t) + "</strong><ul>" + g.hosts.map(function (h) { return "<li>" + escapeHTML(h) + "</li>"; }).join("") + "</ul></div>";
  }).join("");
  $("legal-body").innerHTML =
    legalRow(L("Legal y no responsabilidad", "Legal and disclaimer"), escapeHTML(L("Aviso legal, descargo de responsabilidad y condiciones de uso.", "Legal notice, disclaimer and terms of use.")),
      '<button type="button" class="danger-btn" data-act="open-disclaimer">' + L("Leer", "Read") + "</button>") +
    legalRow(L("Código fuente", "Source code"), escapeHTML(L("Proyecto de código abierto (GPLv3), gratuito y sin fines de lucro: su autor no obtiene ingresos. Publicado en GitHub.", "Open-source (GPLv3), free, non-profit project: its author earns nothing. Published on GitHub.")),
      '<a class="danger-btn" href="' + LEGAL_REPO + '" target="_blank" rel="noopener noreferrer">' + L("Abrir", "Open") + "</a>") +
    legalRow(L("Créditos", "Credits"), escapeHTML(LEGAL_AUTHOR + L(", creador de la idea, del código fuente y del mantenimiento gratuito de los servidores; no del material audiovisual ni escrito que aquí aparece. Ver «Legal y no responsabilidad».", ", creator of the idea, the source code and the free upkeep of the servers; not of the audiovisual or written material shown here. See “Legal and disclaimer”.")),
      '<a class="danger-btn" href="' + LEGAL_AUTHOR_URL + '" target="_blank" rel="noopener noreferrer">github.com/r1h1</a>') +
    legalRow(L("Sitios de terceros", "Third-party sites"), escapeHTML(L("Catálogo, reproductores y tráileres que usa TatoCine.", "Catalog, players and trailers used by TatoCine.")),
      '<button type="button" class="danger-btn" data-act="legal-third" aria-expanded="false" aria-controls="legal-third">' + L("Ver", "View") + "</button>") +
    '<section class="legal-third" id="legal-third" hidden>' + groups +
    "<p>" + escapeHTML(L(
      "Los reproductores y servicios externos que aparecen en TatoCine son operados por terceros. TatoCine no controla sus servidores, disponibilidad, anuncios, privacidad, licencias ni el contenido que puedan mostrar. La integración de un iframe no constituye una verificación ni una garantía de que el contenido esté autorizado. Antes de utilizar un servicio externo, cada usuario debe revisar sus términos, avisos y la legislación aplicable. TatoCine no reclama derechos sobre contenido de terceros.",
      "The players and external services shown in TatoCine are operated by third parties. TatoCine does not control their servers, availability, ads, privacy, licenses or the content they may show. Embedding an iframe is neither a verification nor a guarantee that the content is authorized. Before using an external service, each user should review its terms, notices and the applicable law. TatoCine claims no rights over third-party content.")) + "</p>" +
    "<p>" + escapeHTML(L("Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB.", "This product uses the TMDB API but is not endorsed or certified by TMDB.")) + "</p></section>";
}

function openLegalHub() {
  renderLegalHub();
  $("legal-modal").classList.add("open");
  var c = $("legal-modal").querySelector(".modal-close"); if (c) setTimeout(function () { c.focus(); }, 60);
}
function closeLegalHub() { $("legal-modal").classList.remove("open"); }
registerAction("open-legal", openLegalHub);
registerAction("close-legal", closeLegalHub);
registerAction("open-disclaimer", function () { showDisclaimer(); });
registerAction("legal-third", function (el) {
  var box = $("legal-third"), open = box.hidden; box.hidden = !open;
  if (el) el.setAttribute("aria-expanded", String(open));
  if (open) box.scrollIntoView({ block: "nearest", behavior: "smooth" });
});

/* ---------- Pie legal: al final de cada vista y de las ventanas con scroll (nunca fijo ni sobre controles) ---------- */
function legalFooterHTML(cls) {
  return '<div class="' + cls + '"><button type="button" class="tc-legal-link" data-act="open-disclaimer">' + L("Aviso legal y descargo de responsabilidad", "Legal notice and disclaimer") + "</button></div>";
}
(function mountLegalExtras() {
  var main = document.querySelector("main.main-content");
  if (main && !main.querySelector(".tc-footer")) main.insertAdjacentHTML("beforeend", '<footer class="tc-footer">' + legalFooterHTML("tc-footer-in") + "</footer>");
  [["#settings-modal .modal-body", "beforeend"], ["#details-modal .details-content", "beforeend"], ["#actor-modal .actor-content", "beforeend"], ["#stats-modal .modal-body", "beforeend"]].forEach(function (p) {
    var el = document.querySelector(p[0]);
    if (el && !el.querySelector(".tc-modal-legal")) el.insertAdjacentHTML(p[1], legalFooterHTML("tc-modal-legal"));
  });
  // Aviso de terceros debajo del iframe del reproductor (fuera del iframe y sin empujar la X fuera de pantalla)
  var view = $("player-view");
  if (view && !document.querySelector(".player-notice")) {
    view.insertAdjacentHTML("afterend", '<aside class="player-notice" role="note">' + escapeHTML(L(
      "TatoCine no controla el contenido mostrado por los reproductores externos aquí embebidos ni los anuncios que estos puedan presentar. Los sitios integrados son servicios de terceros y sus políticas, contenidos, licencias y disponibilidad dependen de sus operadores. TatoCine no cobra por los anuncios de esos proveedores ni garantiza la legitimidad del contenido incrustado. Recomendamos revisar la privacidad del navegador y utilizar herramientas de protección de rastreo de confianza, como Brave, si así lo prefieres.",
      "TatoCine does not control the content shown by the external players embedded here or the ads they may display. The embedded sites are third-party services and their policies, content, licenses and availability depend on their operators. TatoCine does not charge for those providers' ads nor guarantees the legitimacy of the embedded content. We recommend reviewing your browser privacy and using a trusted tracking-protection tool, such as Brave, if you wish.")) + "</aside>");
  }
})();

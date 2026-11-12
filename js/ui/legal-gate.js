/**
 * TatoCine · js/ui/legal-gate.js
 * El descargo de responsabilidad es OBLIGATORIO: hasta que la persona pulse «Aceptar y continuar» no hay forma de usar la app.
 *   · Sale después de la bienvenida y de elegir perfil, y vuelve a salir en cada carga mientras no se acepte (flag `tatoLegalAcceptedV2`: todos, también quien aceptó con la X de versiones anteriores, deben pulsar el botón una vez).
 *   · Sin aceptar: el modal no tiene X ni «Cerrar», Esc no hace nada, el resto de la página queda inerte (no se puede tocar ni tabular), si el modal se
 *     cierra a la fuerza vuelve a abrirse, y las funciones que abren contenido (reproductor, fichas, búsqueda…) no ejecutan.
 *   · Un enlace compartido (?id=…) se recuerda y se abre al aceptar.
 * Límite honesto: es un control del lado del cliente; alguien con DevTools puede manipular su propio navegador. Aquí se cierran todos los caminos de la interfaz.
 */
var LEGAL_KEY = "tatoLegalAcceptedV2", LEGAL_REPO_URL = "https://github.com/r1h1/tatocine-streaming", legalGateOn = false, legalPending = null, legalTimer = null, legalObs = null;
function legalAccepted() { try { return localStorage.getItem(LEGAL_KEY) === "true"; } catch (e) { return false; } }

if (typeof i18nAdd === "function") i18nAdd({ "Aceptar y continuar": "Accept and continue", "No utilizar": "Do not use" });

/** Línea de fuente (sin título ni resumen): enlace al código abierto, en el idioma del perfil. */
function renderLegalSummary() {
  var box = document.getElementById("dc-source"); if (!box) return;
  box.textContent = "";
  var a = document.createElement("a"); a.href = LEGAL_REPO_URL; a.target = "_blank"; a.rel = "noopener noreferrer";
  a.textContent = L("Código fuente en GitHub", "Source code on GitHub");
  box.appendChild(document.createTextNode(L("Proyecto de código abierto (GPLv3), gratuito y sin fines de lucro. ", "Open-source (GPLv3), free, non-profit project. "))); box.appendChild(a);
}
/** «No utilizar»: intenta cerrar la pestaña; si el navegador no lo permite, va al código fuente en GitHub. */
function declineDisclaimer() {
  try { window.close(); } catch (e) { }
  window.setTimeout(function () { location.replace(LEGAL_REPO_URL); }, 250);
}

function legalModal() { return document.getElementById("disclaimer-modal"); }
function legalReady() {
  var picker = document.getElementById("tc-profile-overlay");
  return !window.tcWelcomeOpen && !(picker && picker.classList.contains("open")) && document.body.classList.contains("app-ready");
}
/** Todo lo que NO es el descargo queda inerte (sin foco, sin clics, oculto a lectores de pantalla) mientras no se acepte. */
function legalInert(on) {
  Array.prototype.forEach.call(document.body.children, function (el) {
    if (el === legalModal() || /^(SCRIPT|LINK|STYLE|NOSCRIPT)$/.test(el.tagName) || el.id === "toast-container") return;
    if (on) { el.setAttribute("inert", ""); el.setAttribute("aria-hidden", "true"); el.setAttribute("data-gate-inert", "1"); }
    else if (el.getAttribute("data-gate-inert")) { el.removeAttribute("inert"); el.removeAttribute("aria-hidden"); el.removeAttribute("data-gate-inert"); }
  });
}
function legalEnsure() {
  if (!legalGateOn || legalAccepted()) return;
  var m = legalModal(); if (!m || !legalReady()) return;
  m.classList.add("is-pending"); m.classList.remove("is-accepted");
  if (!m.classList.contains("open")) { renderLegalSummary(); m.classList.add("open"); var sc = m.querySelector(".settings-content"); if (sc) sc.scrollTop = 0; }
  if (!document.querySelector("body > [data-gate-inert]") || document.querySelectorAll("body > [data-gate-inert]").length < 3) legalInert(true);
  var b = m.querySelector(".dc-accept"); if (b && !m.contains(document.activeElement)) b.focus();
}
function legalRelease() {
  legalGateOn = false; clearInterval(legalTimer); if (legalObs) legalObs.disconnect();
  legalInert(false);
  document.body.classList.remove("legal-pending");
  var m = legalModal(); if (m) { m.classList.remove("is-pending"); m.classList.add("is-accepted"); m.classList.remove("open"); }
  try { if (typeof htSchedule === "function" && currentHeroMedia) htSchedule(currentHeroMedia); } catch (e) { }          // el tráiler de la portada empieza ahora
  if (legalPending && Date.now() - legalPending.t < 600000) { var p = legalPending; legalPending = null; setTimeout(function () { try { p.fn.apply(null, p.args); } catch (e) { } }, 300); }
}
/** Al releer el descargo desde Legal (ya aceptado): se puede cerrar. */
decorate("showDisclaimer", function (original) {
  return function () { var m = legalModal(); if (m && legalAccepted()) { m.classList.add("is-accepted"); m.classList.remove("is-pending"); renderLegalSummary(); } return original.apply(this, arguments); };
});

(function initLegalGate() {
  renderLegalSummary();
  if (legalAccepted()) { var m0 = legalModal(); if (m0) m0.classList.add("is-accepted"); return; }
  legalGateOn = true;
  document.body.classList.add("legal-pending");
  document.addEventListener("tc:legal-accepted", legalRelease);
  legalTimer = setInterval(legalEnsure, 400);
  if (window.MutationObserver) {                                                   // si el modal se cierra a la fuerza, vuelve a abrirse al instante
    legalObs = new MutationObserver(function () { if (legalGateOn && !legalAccepted() && !legalModal().classList.contains("open")) legalEnsure(); });
    legalObs.observe(legalModal(), { attributes: true, attributeFilter: ["class", "style", "hidden"] });
  }
  document.addEventListener("keydown", function (e) {
    if (!legalGateOn || !legalModal().classList.contains("open")) return;
    if (e.key === "Escape" || e.key === "Backspace" && !/^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName || "")) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  // Las funciones que abren contenido no ejecutan hasta aceptar (y el enlace compartido se recuerda).
  ["openPlayer", "openDetails", "performSearch", "openWizard", "openCouplePicker", "showSettings", "openActor", "openLegalHub"].forEach(function (name) {
    decorate(name, function (original) {
      return function () {
        if (!legalGateOn || legalAccepted()) return original.apply(this, arguments);
        if (name === "openDetails") legalPending = { fn: original, args: Array.prototype.slice.call(arguments), t: Date.now() };
        legalEnsure();
      };
    });
  });
  setTimeout(legalEnsure, 200);
})();
registerAction("accept-disclaimer", function () { acceptDisclaimer(); });
registerAction("close-disclaimer", function () { closeDisclaimer(); });
registerAction("decline-disclaimer", function () { declineDisclaimer(); });

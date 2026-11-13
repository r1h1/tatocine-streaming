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

/** Texto completo del descargo en inglés (se usa cuando la app está en inglés; el HTML conserva el original en español). */
var LEGAL_TEXT_EN = "TO USE THIS APP, YOU MUST READ AND ACCEPT ALL OF ITS CONTENT. IF YOU DO NOT AGREE, DO NOT USE THIS APP. BY TAPPING \"ACCEPT AND CONTINUE\" YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS DISCLAIMER AND ACCEPT EVERYTHING SET OUT BY OUR SERVICE.\nWE DO NOT SEEK TO ENCOURAGE IMPROPER BEHAVIOR OR THE USE OF THIS APP FOR ILLEGAL PURPOSES. IF YOU ARE A MINOR, YOU MUST ASK YOUR PARENTS OR LEGAL GUARDIANS FOR PERMISSION BEFORE USING THIS APP.\nTATOCINE IS NOT RESPONSIBLE AND HAS A STRONG DISCLAIMER BECAUSE IT IS A FREE PROJECT FOR THE COMMUNITY. READ IT ALL BEFORE CONTINUING.\nThe following agreement is made between \"TatoCine\" or \"the app\" and the user. By tapping accept you are digitally signing this agreement and accepting this disclaimer.\nBy digitally signing and tapping \"Accept and continue\" you agree never to take legal action against \"TatoCine\" or \"the app\" for any inconvenience, since it is a free and open project.\nTatoCine is only a media playback app that searches third-party sites (never on our own server) and external ones (never owned by us) for audiovisual material based on TMDB's free API. TatoCine does not store users' search data, statistics, favorites or any data to sell it, and it does not store or host any kind of audiovisual material (images, videos, trailers, etc.); everything is requested on demand from third parties and external services. TatoCine does not make a profit and does not seek to make one through subscriptions or fraudulent methods.\nSome players may show third-party ads that are not ours and from which we do not profit, so TatoCine is not responsible for improper or copyrighted (copyright or DMCA) material played while an ad is present, because the ads, videos, images and trailers are not in our source code and were not programmed to be shown, and we state this to avoid lawsuits.\nTatoCine is a completely free, open-source project open to modification: it is distributed under a free license (GPLv3), at no cost and without subscriptions, and may be used, copied and modified freely while respecting the terms of that license. By tapping \"accept and continue\" you acknowledge that you have read and understood this disclaimer and accept everything set out by our service. All the disclaimers are listed below:\nTatoCine is not responsible for loss of data, damages or harm that may arise from using the app.\nTatoCine does not guarantee continuous availability of the service or the accuracy of the information provided.\nTatoCine reserves the right to modify, suspend or discontinue the service at any time without prior notice.\nTatoCine is not responsible for links to third-party websites or for the quality or legality of the content that may be found on them.\nTatoCine is not responsible for the privacy or security of personal data that may be shared through the app.\nTatoCine is not responsible for errors, failures or service interruptions that may affect the user experience.\nTatoCine is not responsible for decisions or actions taken by users based on the information provided by the app.\nTatoCine is not responsible for technical or compatibility problems that may arise when using the app on different devices or operating systems.\nTatoCine is not responsible for connectivity or Internet access problems that may affect the use of the app.\nTatoCine is not responsible for performance or speed problems that may affect the user experience.\nTatoCine is not responsible for storage or device space problems that may affect the use of the app.\nTatoCine is not responsible for update problems or compatibility with future versions of the app.\nTatoCine is not responsible for security problems or vulnerabilities that may arise when using the app.\nTatoCine will not resort to lawsuits or trials over the use of the app, since it is a free and open-source project.\nTatoCine is not responsible for legal or copyright problems that may arise when using the app to access protected content.\nTatoCine is not responsible for improper or illegal use of the app by users.\nTatoCine does not charge or request payments for the use of the app, and is not responsible for financial or transaction problems that may arise when using the app.\nTatoCine is not responsible for advertising or marketing problems that may arise when using the app.\nTatoCine is not responsible for the images or videos shown in the app, since they come from external sources and are not under our control.\nTatoCine does not guarantee that kids' profiles are free of inappropriate content.\nTatoCine is not responsible for the addiction that using the app may cause, nor for health problems that may arise from excessive use.\nTatoCine is not responsible for the download of local data that could be used for malicious purposes, since local data belongs to the user and not to TatoCine.\nTatoCine is not responsible for how each person uses their local data.\nTatoCine is not responsible if another person accesses the local data on your device and uses it for malicious purposes.\nTatoCine does not want you to stop paying for streaming services; each person is free to pay for whatever they like, we only offer a free tool for searching free material on the internet.\nTatoCine is an app that organizes free services on the internet that each person can search on their own; TatoCine only helps people who have difficulty understanding computing.\nTatoCine is not responsible for hacks or malicious code injection; TatoCine is committed to making sure it does not harm the end user but does not guarantee that it is free from attacks.\nHaving read everything and accepted again, the user is solely responsible for their actions and for the local data they may share with third parties, since TatoCine has no control over it.\nThank you for trusting TatoCine and for reading this disclaimer. Thank you for using this service, which seeks to put an end to monopolies and the thousands of payments needed to watch a simple movie.\nOn behalf of the TatoCine team, we are committed to providing maintenance, support and improvements to this non-profit project, without breaking laws, without violating copyright and without harming the industry.\nThe end. The TatoCine team and its founder.";

/** Línea de fuente (sin título ni resumen): enlace al código abierto, en el idioma del perfil. */
function renderLegalSummary() {
  if (typeof UI_EN !== "undefined" && UI_EN) { var lp = document.querySelector("#disclaimer-modal .modal-body > p"); if (lp && lp.getAttribute("data-lang") !== "en") { lp.textContent = LEGAL_TEXT_EN; lp.setAttribute("data-lang", "en"); } }
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

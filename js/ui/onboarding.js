/**
 * TatoCine · js/ui/onboarding.js
 * Primer uso guiado: 3 pasos breves la primera vez que se entra con un perfil de adulto (una sola vez por dispositivo).
 * Se puede saltar en cualquier momento y volver a ver desde la paleta Ctrl+K («Ver el recorrido»).
 */
var TOUR_KEY = "tatoTourDone", tourStep = 0;
function tourSteps() {
  return [
    { icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
      t: L("Tus perfiles, tus reglas", "Your profiles, your rules"), p: L("Cada perfil tiene sus favoritos e historial. Los perfiles infantiles solo ven contenido apto, con límite diario y hora de dormir. Todo se guarda solo en este dispositivo.", "Each profile has its own favorites and history. Kid profiles only see suitable content, with a daily limit and bedtime. Everything stays on this device.") },
    { icon: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
      t: L("Encuentra algo en segundos", "Find something in seconds"), p: L("Usa «¿Qué ver?» o «Decidir en pareja» si no sabes qué ver, busca por voz con el micrófono y pulsa Ctrl+K para ir a cualquier parte.", "Use “What to watch today?” or “Decide as a couple” if you can't choose, search by voice with the mic and press Ctrl+K to jump anywhere.") },
    { icon: "M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-5 0h3v3h-3v-3zm3 3h2v2h-2v-2zm-3 2h3v3h-3v-3zm5 0h3v3h-3v-3z",
      t: L("Llévate todo contigo", "Take it all with you"), p: L("Pasa tus listas e historial a otro dispositivo con un QR, o crea una copia cifrada con contraseña en Ajustes. Ahí también tienes texto más grande y alto contraste.", "Move your lists and history to another device with a QR, or make a password-encrypted backup in Settings. There you also find larger text and high contrast.") }
  ];
}
function renderTour() {
  var steps = tourSteps(), s = steps[tourStep], last = tourStep === steps.length - 1;
  qrBody().innerHTML = '<div class="tour-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="' + s.icon + '"/></svg></div>' +
    '<h4 class="tour-title">' + escapeHTML(s.t) + '</h4><p class="tc-qr-note">' + escapeHTML(s.p) + "</p>" +
    '<div class="tour-dots" aria-hidden="true">' + steps.map(function (x, i) { return '<span class="' + (i === tourStep ? "on" : "") + '"></span>'; }).join("") + "</div>" +
    '<div class="tc-profile-create-actions"><button type="button" class="tc-profile-cancel-btn" data-tour="skip">' + L("Saltar", "Skip") + '</button><button type="button" class="tc-profile-create-btn" data-tour="next">' + (last ? L("Empezar", "Start") : L("Siguiente", "Next")) + "</button></div>";
  qrBody().querySelector('[data-tour="skip"]').onclick = endTour;
  qrBody().querySelector('[data-tour="next"]').onclick = function () { if (last) endTour(); else { tourStep++; renderTour(); } };
  qrBody().querySelector('[data-tour="next"]').focus();
}
function endTour() { safeStorageSet(TOUR_KEY, "1"); closeQr(); }
function startTour() { tourStep = 0; qrOpen(L("Bienvenido a TatoCine", "Welcome to TatoCine")); renderTour(); }
registerCommand({ id: "tour", es: "Ver el recorrido de bienvenida", en: "Watch the welcome tour", keys: "ayuda tutorial recorrido bienvenida", run: startTour });
// El recorrido ya no se abre solo: la bienvenida (js/ui/welcome.js) lo sustituye para usuarios nuevos. Sigue disponible desde Ctrl+K.

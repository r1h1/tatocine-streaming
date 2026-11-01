/**
 * TatoCine · js/features/voice-search.js
 * Búsqueda por voz (Web Speech API del navegador): botón de micrófono dentro del buscador.
 * Solo aparece si el navegador la ofrece. El reconocimiento lo hace el navegador (en Chrome/Edge el audio puede viajar
 * al servicio de voz del navegador); TatoCine no guarda audio. Idioma según el perfil (ES / EN).
 */
(function voiceSearch() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var wrap = document.querySelector(".hero-content .search-wrap");
  if (!SR || !wrap || !$searchInput) return;
  var btn = document.createElement("button"), rec = null, listening = false;
  btn.type = "button";
  btn.className = "voice-btn";
  btn.setAttribute("aria-label", L("Buscar por voz", "Search by voice"));
  btn.title = L("Buscar por voz (el navegador procesa el audio)", "Search by voice (the browser processes the audio)");
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  wrap.appendChild(btn);
  function stop() { listening = false; btn.classList.remove("listening"); btn.setAttribute("aria-pressed", "false"); }
  btn.addEventListener("click", function () {
    if (listening && rec) { rec.stop(); return; }
    rec = new SR();
    rec.lang = UI_LANG === "en" ? "en-US" : "es-ES";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var text = String((e.results[0] && e.results[0][0] && e.results[0][0].transcript) || "").replace(/[<>]/g, "").trim().slice(0, 80);
      if (!text) return;
      $searchInput.value = text;
      announce(L("Buscando: " + text, "Searching: " + text));
      performSearch(text);
    };
    rec.onerror = function (e) { stop(); showToast(e.error === "not-allowed" || e.error === "service-not-allowed" ? L("Permite el micrófono para buscar por voz", "Allow the microphone to search by voice") : L("No se entendió. Inténtalo otra vez", "Didn't catch that. Try again")); };
    rec.onend = stop;
    try { rec.start(); listening = true; btn.classList.add("listening"); btn.setAttribute("aria-pressed", "true"); showToast(L("Escuchando…", "Listening…")); } catch (err) { stop(); }
  });
  if (typeof i18nAdd === "function") i18nAdd({ "Buscar por voz": "Search by voice" });
})();

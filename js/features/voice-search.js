/**
 * TatoCine · js/features/voice-search.js
 * Búsqueda por voz (Web Speech API): micrófono dentro del buscador, con texto parcial mientras hablas.
 * HONESTO con lo que el navegador permita: el reconocimiento lo hace el servicio de voz del propio navegador (Chrome/Edge/Safari). En
 * Brave y Firefox NO existe o no responde, y el micrófono «escucharía» sin fin. Por eso:
 *   - En Brave (o sin API) el botón NO se muestra.
 *   - Si el servicio no arranca en 5 s, o falla (red/servicio no disponible/sin micrófono), el botón se QUITA y se recuerda
 *     (`tatoVoiceOff`) para no ofrecer algo que no funciona. Se puede volver a probar borrando los datos del sitio.
 *   - Si no hablas ("no-speech") solo se avisa, sin quitar nada.
 * No se guarda audio. Idioma según el perfil (ES / EN).
 */
(async function voiceSearch() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var wrap = document.querySelector(".hero-content .search-wrap");
  if (!SR || !wrap || !$searchInput) return;
  try { if (localStorage.getItem("tatoVoiceOff") === "1") return; } catch (e) { }
  try { if (navigator.brave && navigator.brave.isBrave && await navigator.brave.isBrave()) return; } catch (e) { }
  var btn = document.createElement("button"), rec = null, listening = false, startTimer = null, capTimer = null, gotAudio = false, finalText = "";
  btn.type = "button";
  btn.className = "voice-btn";
  btn.setAttribute("aria-label", L("Buscar por voz", "Search by voice"));
  btn.title = L("Buscar por voz (el navegador procesa el audio)", "Search by voice (the browser processes the audio)");
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  wrap.appendChild(btn);
  function stop() { listening = false; clearTimeout(startTimer); clearTimeout(capTimer); btn.classList.remove("listening"); btn.setAttribute("aria-pressed", "false"); }
  function remove(why) {
    stop();
    try { localStorage.setItem("tatoVoiceOff", "1"); } catch (e) { }
    btn.remove();
    showToast(why || L("La búsqueda por voz no está disponible en este navegador.", "Voice search isn't available in this browser."));
  }
  btn.addEventListener("click", function () {
    if (listening && rec) { try { rec.stop(); } catch (e) { } return; }
    rec = new SR();
    rec.lang = UI_LANG === "en" ? "en-US" : "es-ES";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    gotAudio = false; finalText = "";
    rec.onaudiostart = function () { gotAudio = true; clearTimeout(startTimer); };
    rec.onspeechend = function () { try { rec.stop(); } catch (e) { } };
    rec.onresult = function (e) {
      var text = "", fin = false;
      for (var i = e.resultIndex; i < e.results.length; i++) { text += e.results[i][0].transcript; if (e.results[i].isFinal) fin = true; }
      text = String(text).replace(/[<>]/g, "").trim().slice(0, 80);
      if (!text) return;
      $searchInput.value = text;                                              // texto parcial mientras hablas
      if (fin) finalText = text;
    };
    rec.onerror = function (e) {
      var err = e && e.error;
      if (err === "aborted") return;
      if (err === "no-speech") { stop(); showToast(L("No te escuché. Habla cerca del micrófono e inténtalo de nuevo.", "I didn't hear you. Speak close to the microphone and try again.")); return; }
      if (err === "not-allowed" || err === "service-not-allowed" && gotAudio) { stop(); showToast(L("Permite el micrófono para buscar por voz.", "Allow the microphone to search by voice.")); return; }
      remove();                                                               // network / service-not-allowed / audio-capture / language-not-supported…
    };
    rec.onend = function () {
      var t = finalText || String($searchInput.value || "").trim();
      var had = listening;
      stop();
      if (had && finalText) { announce(L("Buscando: " + t, "Searching: " + t)); performSearch(t); }
      else if (had && gotAudio && !finalText) showToast(L("No se entendió. Inténtalo de nuevo.", "Didn't catch that. Try again."));
    };
    try {
      rec.start(); listening = true; btn.classList.add("listening"); btn.setAttribute("aria-pressed", "true");
      startTimer = setTimeout(function () { if (listening && !gotAudio) { try { rec.abort(); } catch (e) { } remove(L("El reconocimiento de voz no responde en este navegador, así que se quitó el micrófono.", "Speech recognition doesn't respond in this browser, so the microphone was removed.")); } }, 5000);
      capTimer = setTimeout(function () { if (listening) { try { rec.stop(); } catch (e) { } } }, 12000);          // nunca se queda escuchando sin fin
    } catch (err) { remove(); }
  });
  if (typeof i18nAdd === "function") i18nAdd({ "Buscar por voz": "Search by voice" });
})();

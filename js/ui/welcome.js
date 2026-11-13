/**
 * TatoCine · js/ui/welcome.js
 * Primer uso (solo usuarios NUEVOS): 1) Bienvenida a pantalla completa, 2) selector de perfiles, 3) aviso legal. Después no vuelve a salir:
 * el flag `tatoWelcomeSeenV1` queda en "1" (js/boot.js lo decide antes de pintar; quien ya tenía datos nunca la ve). Mientras la bienvenida
 * está abierta no se pide el catálogo (nadie lo ve): la portada se carga al cerrarla. El aviso legal sale al terminar de elegir perfil.
 */
var WELCOME_KEY = "tatoWelcomeSeenV1", welcomeIdx = 0, tcWelcomeWaiters = [];
window.tcWelcomeOpen = false;
if (typeof i18nAdd === "function") i18nAdd({
  "Atrás": "Back", "Siguiente": "Next", "Elegir mi perfil": "Choose my profile",
  "Bienvenido a TatoCine": "Welcome to TatoCine",
  "Gracias por confiar en TatoCine, te invitamos a aprender a usar el aplicativo dando Siguiente para terminar de configurar.": "Thank you for trusting TatoCine. We invite you to learn how to use the app by tapping Next to finish setting up.",
  "Películas, series y anime en un solo lugar. Busca, guarda tus favoritos y retoma justo donde lo dejaste. No necesitas cuenta ni correo.": "Movies, series and anime in one place. Search, save your favorites and pick up right where you left off. No account or email needed.",
  "Catálogo e imágenes de TMDB.": "Catalog and images from TMDB.",
  "Los videos los sirven reproductores de terceros (más detalles en Legal).": "Videos are served by third-party players (more details in Legal).",
  "Elige o crea tu perfil": "Choose or create your profile",
  "En la siguiente pantalla verás tus perfiles. Toca «Mi perfil» para entrar o «Agregar perfil» para crear uno nuevo (hasta 6).": "On the next screen you will see your profiles. Tap “My profile” to enter or “Add profile” to create a new one (up to 6).",
  "Nombre, avatar e idioma (español o inglés).": "Name, avatar and language (Spanish or English).",
  "PIN de 4 números, si quieres protegerlo.": "A 4-digit PIN, if you want to protect it.",
  "Perfil Niño: solo contenido infantil, con horarios y límites que tú eliges.": "Kid profile: children's content only, with schedules and limits you choose.",
  "Sin miedo: tus perfiles son tuyos": "Don't worry: your profiles are yours",
  "Cada perfil es único: tiene sus propios favoritos, historial, listas y gustos, y nunca se mezcla con los de otra persona.": "Each profile is unique: it has its own favorites, history, lists and taste, and it never mixes with anyone else's.",
  "Todo se guarda solo en este dispositivo: no hay cuenta ni servidor.": "Everything is stored only on this device: there is no account or server.",
  "Puedes editar o borrar un perfil cuando quieras.": "You can edit or delete a profile whenever you want.",
  "«Invitado» entra sin guardar nada.": "“Guest” enters without saving anything.",
  "Llévalos contigo": "Take them with you",
  "¿Cambias de celular o de navegador? Pasa tus perfiles en segundos.": "Changing phone or browser? Move your profiles in seconds.",
  "Ajustes → Copiar tus datos (QR) o (JSON).": "Settings → Copy your data (QR) or (JSON).",
  "Hazlo antes de borrar los datos del navegador: si se borran, tus perfiles también.": "Do it before clearing the browser data: if it is cleared, your profiles go too.",
  "Los códigos QR y las copias no incluyen tu PIN.": "QR codes and backups do not include your PIN.",
  "Antes de empezar": "Before you start",
  "Después de elegir tu perfil verás el aviso legal: léelo y acéptalo para continuar.": "After choosing your profile you will see the legal notice: read and accept it to continue.",
  "Usa TatoCine con calma: hay descansos de uso para cuidar tu tiempo.": "Use TatoCine calmly: there are usage breaks to look after your time.",
  "Siempre puedes releer todo esto desde Legal.": "You can always read all this again from Legal."
});

function welcomeEl() { return document.getElementById("tc-welcome"); }
function welcomeShow(i) {
  var el = welcomeEl(); if (!el) return;
  var slides = el.querySelectorAll(".tw-slide"), last = i >= slides.length - 1;
  welcomeIdx = Math.max(0, Math.min(i, slides.length - 1));
  slides.forEach(function (s, k) { s.classList.toggle("on", k === welcomeIdx); });
  var dots = document.getElementById("tw-dots");
  if (dots) dots.innerHTML = Array.prototype.map.call(slides, function (s, k) { return '<span class="' + (k === welcomeIdx ? "on" : "") + '"></span>'; }).join("");
  el.querySelector(".tw-back").style.visibility = welcomeIdx === 0 ? "hidden" : "visible";
  el.querySelector(".tw-next").textContent = last ? L("Elegir mi perfil", "Choose my profile") : L("Siguiente", "Next");
  var body = el.querySelector(".tw-body"); if (body) body.scrollTop = 0;
}
function welcomeFinish() {
  var el = welcomeEl(); if (!el || !window.tcWelcomeOpen) return;
  safeStorageSet(WELCOME_KEY, "1");
  safeStorageSet("tatoTourDone", "1");                                   // el recorrido antiguo ya no se ofrece solo
  window.tcWelcomeOpen = false;
  el.classList.remove("open");
  document.documentElement.classList.remove("tc-welcome-boot");
  var w = tcWelcomeWaiters; tcWelcomeWaiters = [];
  w.forEach(function (fn) { try { fn(); } catch (e) { } });              // ahora sí se carga la portada
  window.setTimeout(function () { var c = document.querySelector("#tc-profile-overlay .tc-profile-select-btn"); if (c) c.focus(); }, 120);
}
(function initWelcome() {
  var el = welcomeEl();
  if (!el || !document.documentElement.classList.contains("tc-welcome-boot")) return;
  window.tcWelcomeOpen = true;
  el.classList.add("open");
  welcomeShow(0);
  el.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-tw]") : null; if (!b) return;
    var act = b.getAttribute("data-tw"), n = el.querySelectorAll(".tw-slide").length;
    if (act === "skip") welcomeFinish();
    else if (act === "back") welcomeShow(welcomeIdx - 1);
    else if (act === "next") { if (welcomeIdx >= n - 1) welcomeFinish(); else welcomeShow(welcomeIdx + 1); }
  });
  document.addEventListener("keydown", function (e) {
    if (!window.tcWelcomeOpen) return;
    if (e.key === "ArrowRight") { e.preventDefault(); el.querySelector(".tw-next").click(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); if (welcomeIdx > 0) welcomeShow(welcomeIdx - 1); }
    else if (e.key === "Escape") { e.preventDefault(); welcomeFinish(); }
    else if (e.key === "Tab") {                                              // el foco se queda dentro de la bienvenida
      var f = Array.prototype.filter.call(el.querySelectorAll("button"), function (b) { return !b.hidden && b.style.visibility !== "hidden" && b.offsetParent; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  }, true);
  window.setTimeout(function () { var n = el.querySelector(".tw-next"); if (n) n.focus(); }, 60);
  // Mientras se lee la bienvenida nadie ve el catálogo: no se pide hasta cerrarla (menos llamadas y menos ancho de banda).
  if (typeof decorate === "function") decorate("loadHomeView", function (original) {
    return function () {
      if (!window.tcWelcomeOpen) return original.apply(this, arguments);
      var self = this, args = arguments;
      tcWelcomeWaiters.push(function () { if (currentView === "home") original.apply(self, args); });
    };
  });
})();

/* El aviso legal obligatorio lo gestiona js/ui/legal-gate.js (sale después de la bienvenida y de elegir perfil, y no se puede saltar). */

/**
 * TatoCine · js/core/picker-open.js
 * Abre el selector de perfiles en cuanto existe en la página (justo tras su HTML), sin esperar al resto de scripts, y pinta ya las
 * TARJETAS de los perfiles guardados (versión ligera, solo lectura) para que se vean en el primer pintado. Cuando la aplicación
 * termina de cargar, profile-ui.js las sustituye por las reales (con PIN, edición, etc.).
 */
if (document.documentElement.classList.contains("tc-picker-boot")) {
  document.getElementById("tc-profile-overlay").classList.add("open", "startup");
  document.body.classList.add("tc-profile-screen-open");
  (function earlyCards() {
    var grid = document.getElementById("tc-profile-grid"), list = null, active = "";
    try { list = JSON.parse(localStorage.getItem("tatoProfilesV1") || "null"); active = localStorage.getItem("tatoActiveProfileV1") || ""; } catch (e) { }
    if (!grid || !Array.isArray(list) || !list.length) return;
    var frag = document.createDocumentFragment();
    list.slice(0, 6).forEach(function (p) {
      if (!p || typeof p.name !== "string" || typeof p.id !== "string") return;
      var guest = p.id === "guest", name = guest ? "Invitado" : p.name.slice(0, 24), isActive = p.id === active;
      var card = document.createElement("div"), btn = document.createElement("div"), av = document.createElement("span"), nm = document.createElement("span"), lb = document.createElement("span");
      card.className = "tc-profile-card tc-profile-card-editable tc-profile-early" + (isActive ? " active" : "");
      btn.className = "tc-profile-select-btn";
      av.className = "tc-profile-card-avatar"; av.textContent = Array.from(name)[0] ? Array.from(name)[0].toLocaleUpperCase("es") : "U";
      nm.className = "tc-profile-card-name"; nm.textContent = name;
      lb.className = "tc-profile-active-label";
      lb.textContent = (isActive ? "Actual" : "Seleccionar") + (guest ? " · Sin historial" : "") + (p.kind === "kid" ? " · Niño" : "") + (p.lang === "en" && !guest ? " · ENG" : "") + (p.pin && p.pin.h ? " · PIN" : "");
      btn.appendChild(av); btn.appendChild(nm); btn.appendChild(lb); card.appendChild(btn); frag.appendChild(card);
    });
    if (frag.childNodes.length) { grid.innerHTML = ""; grid.appendChild(frag); grid.setAttribute("aria-busy", "true"); }
  })();
}

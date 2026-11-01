/**
 * TatoCine · js/core/picker-open.js
 * Abre el selector de perfiles en cuanto existe en la página (justo tras su HTML), sin esperar al resto de scripts.
 */
if (document.documentElement.classList.contains("tc-picker-boot")) {
  document.getElementById("tc-profile-overlay").classList.add("open", "startup");
  document.body.classList.add("tc-profile-screen-open");
}

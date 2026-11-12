/**
 * TatoCine · js/features/reset.js
 * Ajustes → «Restablecer a cero»: deja el navegador como si TatoCine nunca se hubiera abierto en él. Borra cookies, localStorage, sessionStorage,
 * Cache Storage, IndexedDB y el Service Worker, y recarga. Pide confirmación y no se ofrece a perfiles Niño. Es local: no toca ningún servidor.
 */
if (typeof i18nAdd === "function") i18nAdd({
  "Restablecer a cero": "Reset to zero", "Restablecer": "Reset", "Restableciendo…": "Resetting…",
  "Borra TODO lo guardado y deja TatoCine como recién instalada.": "Erases EVERYTHING stored and leaves TatoCine as if just installed.",
  "Se borra TODO lo guardado en este dispositivo y TatoCine queda como recién instalada. No se puede deshacer.": "EVERYTHING stored on this device is erased and TatoCine is left as if just installed. This cannot be undone.",
  "Perfiles, avatares y PIN": "Profiles, avatars and PIN", "Favoritos, listas, historial y «Vistas»": "Favorites, lists, history and “Watched”", "Preferencias y ajustes": "Preferences and settings",
  "Cookies, almacenamiento local y de sesión, e IndexedDB": "Cookies, local and session storage, and IndexedDB", "Cachés y Service Worker (todo se vuelve a descargar)": "Caches and Service Worker (everything is downloaded again)",
  "Antes puedes copiar tus datos (QR o JSON) desde Ajustes.": "Before that you can copy your data (QR or JSON) from Settings.", "Cancelar": "Cancel"
});
function resetCookies() {
  var host = location.hostname, parts = host.split("."), paths = ["/"], seg = location.pathname.split("/").filter(Boolean);
  for (var i = 0; i < seg.length; i++) paths.push("/" + seg.slice(0, i + 1).join("/"));
  document.cookie.split(";").forEach(function (c) {
    var name = c.split("=")[0].trim(); if (!name) return;
    for (var d = 0; d < parts.length - 1 || d === 0; d++) {
      var dom = parts.slice(d).join(".");
      paths.forEach(function (p) { [";", ";domain=" + dom, ";domain=." + dom].forEach(function (x) { document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;max-age=0;path=" + p + x; }); });
      if (parts.length < 2) break;
    }
  });
}
async function resetEverything() {
  window.__tcResetting = true;
  try { var orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { if (window.__tcResetting) return; return orig.apply(this, arguments); }; } catch (e) { }   // ningún evento de cierre vuelve a guardar algo
  try { resetCookies(); } catch (e) { }
  try { localStorage.clear(); } catch (e) { }
  try { sessionStorage.clear(); } catch (e) { }
  try { if (window.caches) { var names = await caches.keys(); await Promise.all(names.map(function (n) { return caches.delete(n); })); } } catch (e) { }
  try { if (window.indexedDB && indexedDB.databases) { var dbs = await indexedDB.databases(); await Promise.all(dbs.map(function (d) { return new Promise(function (res) { var r = indexedDB.deleteDatabase(d.name); r.onsuccess = r.onerror = r.onblocked = function () { res(); }; }); })); } } catch (e) { }
  try { if (navigator.serviceWorker) { var regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(function (r) { return r.unregister(); })); } } catch (e) { }
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) { }
  location.replace(location.pathname);                                                    // recarga limpia (sin parámetros): se verá como un dispositivo nuevo
}
registerAction("reset-open", function () { if (isKidProfile()) return; openOverlay("tc-reset-overlay"); setTimeout(function () { var b = document.querySelector("#tc-reset-overlay .tc-profile-cancel-btn"); if (b) b.focus(); }, 80); });
registerAction("reset-cancel", function () { closeOverlay("tc-reset-overlay"); });
registerAction("reset-confirm", function (el) { el.disabled = true; el.textContent = L("Restableciendo…", "Resetting…"); resetEverything(); });
window.tcResetEverything = resetEverything;                                              // para pruebas

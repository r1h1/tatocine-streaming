/**
 * TatoCine · js/ui/undo.js
 * «Deshacer» para las acciones que borran: quitar un favorito, quitar de Continuar viendo, borrar el historial,
 * borrar toda la lista y eliminar una lista. El aviso dura 7 s, tiene un botón y también responde a Ctrl/Cmd+Z.
 * Se añade con decorate(): las funciones originales no cambian; antes de borrar se guarda una copia mínima.
 */
var UNDO_MS = 7000, pendingUndo = null, activeUndo = null;

function showToastAction(msg, label, fn, ms) {
  var c = $("toast-container");
  if (!c) return;
  var t = document.createElement("div"), b = document.createElement("button");
  t.className = "toast has-action";
  t.setAttribute("role", "status");
  var span = document.createElement("span");
  span.textContent = msg;
  b.type = "button";
  b.className = "toast-action";
  b.textContent = label;
  t.appendChild(span);
  t.appendChild(b);
  c.appendChild(t);
  var timer = null, entry = { run: null };
  function close() { clearTimeout(timer); if (activeUndo === entry) activeUndo = null; t.classList.add("removing"); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300); }
  entry.run = function () { close(); try { fn(); } catch (e) { } };
  b.addEventListener("click", entry.run);
  activeUndo = entry;
  timer = setTimeout(close, ms || UNDO_MS);
}
/** El siguiente aviso que coincida con `match` se convierte en un aviso con «Deshacer». */
function offerUndo(match, restore) { pendingUndo = { match: match, restore: restore, at: Date.now() }; }
decorate("showToast", function (original) {
  return function (msg) {
    var u = pendingUndo;
    if (u && Date.now() - u.at < 1500 && u.match.test(String(msg))) { pendingUndo = null; return showToastAction(msg, L("Deshacer", "Undo"), u.restore); }
    return original(msg);
  };
});
function undoRestored() { showToast(L("Restaurado", "Restored")); }
document.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z" && activeUndo && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); activeUndo.run(); }
});

/* ---- Favoritos ---- */
function favSnapshot(media) {
  var m = media && myList.find(function (x) { return x.id === media.id && x.type === media.type; });
  return m ? JSON.parse(JSON.stringify(m)) : null;
}
/** Actualiza los corazones de las tarjetas visibles según los favoritos actuales. */
function refreshHearts() {
  document.querySelectorAll(".card[onclick]").forEach(function (c) {
    var m = /openDetails\((\d+),'(movie|tv)'\)/.exec(c.getAttribute("onclick") || ""), b = c.querySelector(".save-btn");
    if (!m || !b) return;
    var saved = myList.some(function (x) { return String(x.id) === m[1] && x.type === m[2]; });
    b.classList.toggle("saved", saved);
    var svg = b.querySelector("svg");
    if (svg) svg.setAttribute("fill", saved ? "currentColor" : "none");
  });
}
function restoreFavorite(rec) {
  if (!rec || myList.some(function (x) { return x.id === rec.id && x.type === rec.type; })) return;
  if (rec.list && !favListById(rec.list)) delete rec.list;
  myList.push(rec);
  saveMyList();
  afterFavChange(null, true, rec);
  refreshHearts();
  undoRestored();
}
["toggleHeroSave", "toggleFavoriteMedia"].forEach(function (name) {
  decorate(name, function (original) {
    return function (a, b) {
      var media = name === "toggleHeroSave" ? currentHeroMedia : a, rec = favSnapshot(media);
      if (rec) offerUndo(/^Eliminado de favoritos$/, function () { restoreFavorite(rec); });
      return original.apply(this, arguments);
    };
  });
});
decorate("toggleSave", function (original) {
  return function (e, i) {
    var rec = favSnapshot(i);
    var r = original.apply(this, arguments);
    if (rec && !favSnapshot(i)) showToastAction(L("Eliminado de favoritos", "Removed from favorites"), L("Deshacer", "Undo"), function () { restoreFavorite(rec); });
    return r;
  };
});

/* ---- Continuar viendo ---- */
decorate("removeContinueWatchingItem", function (original) {
  return function (id, type, card) {
    var rec = continueWatching.find(function (m) { return String(m.id) === String(id) && m.type === type; });
    var pos = continueWatching.indexOf(rec);
    if (rec) offerUndo(/^Eliminado de Continuar Viendo$/, function () {
      if (continueWatching.some(function (m) { return m.id === rec.id && m.type === rec.type; })) return;
      continueWatching.splice(Math.min(pos, continueWatching.length), 0, rec);
      safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
      switchView(currentView, false);
      undoRestored();
    });
    return original.apply(this, arguments);
  };
});
decorate("clearContinueWatching", function (original) {
  return function () {
    var copy = continueWatching.slice();
    if (copy.length) offerUndo(/^Historial borrado$/, function () {
      continueWatching = copy;
      safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
      switchView(currentView, false);
      undoRestored();
    });
    return original.apply(this, arguments);
  };
});

/* ---- Toda la lista y listas ---- */
decorate("clearFavorites", function (original) {
  return function () {
    var copy = myList.slice();
    if (copy.length) offerUndo(/^Lista borrada$/, function () {
      myList = copy;
      saveMyList();
      updateHeroSaveButton(currentHeroMedia);
      switchView(currentView, false);
      undoRestored();
    });
    return original.apply(this, arguments);
  };
});
decorate("deleteListFromModal", function (original) {
  return function () {
    var l = favListById(editingListId), snap = l ? { list: JSON.parse(JSON.stringify(l)), ids: myList.filter(function (m) { return m.list === l.id; }).map(function (m) { return m.type + ":" + m.id; }) } : null;
    if (snap) offerUndo(/^Lista eliminada/, function () {
      if (!favListById(snap.list.id)) { favLists.push(snap.list); saveFavLists(); }
      myList.forEach(function (m) { if (snap.ids.indexOf(m.type + ":" + m.id) > -1) m.list = snap.list.id; });
      saveMyList();
      if (currentView === "list") renderFavoritesView();
      undoRestored();
    });
    return original.apply(this, arguments);
  };
});
if (typeof i18nAdd === "function") i18nAdd({ "Deshacer": "Undo", "Restaurado": "Restored", "Eliminado de favoritos": "Removed from favorites", "Eliminado de Continuar Viendo": "Removed from Continue Watching", "Historial borrado": "History cleared", "Lista borrada": "List cleared" });

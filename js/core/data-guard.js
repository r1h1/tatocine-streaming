/**
 * TatoCine · js/core/data-guard.js
 * Validación al LEER: antes de pintar nada, los datos guardados del perfil pasan por las mismas reglas que una
 * importación (ids enteros, tipo movie/tv, rutas de imagen de TMDB, textos sin < > ni caracteres de control, nombres
 * de lista con lista blanca). Es NO destructivo: solo corrige lo peligroso o inválido y conserva el resto de campos.
 * Si alguien edita el almacenamiento a mano (o un archivo antiguo trajo datos raros), la app no lo pinta tal cual.
 * Usa las funciones puras de backup-sanitize.js / qr-payload.js. Se llama una vez al arrancar (app.js).
 */
function guardMediaItem(x) {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  var id = bkId(x.id), type = bkType(x.type), changed = false;
  if (!id || !type) return null;
  if (x.id !== id) { x.id = id; changed = true; }
  if (x.type !== type) { x.type = type; changed = true; }
  function fix(key, val) { if (x[key] !== undefined && x[key] !== val) { x[key] = val; changed = true; } }
  if (typeof x.title !== "string" || bkText(x.title, 120) !== x.title) { x.title = bkText(x.title, 120) || "Sin título"; changed = true; }
  if (x.bg !== undefined && x.bg !== null) fix("bg", bkBg(x.bg));
  if (x.year !== undefined && x.year !== null && x.year !== "") fix("year", bkYear(String(x.year)));
  if (x.rating !== undefined) fix("rating", bkNum(Number(x.rating), 0, 10, 0));
  if (x.episodeName !== undefined) fix("episodeName", bkText(x.episodeName, 120));
  return changed ? { item: x, changed: true } : { item: x, changed: false };
}
function guardMediaArray(arr, max) {
  if (!Array.isArray(arr)) return { arr: [], changed: true };
  var out = [], changed = arr.length > max;
  arr.slice(0, max).forEach(function (x) {
    var r = guardMediaItem(x);
    if (!r) { changed = true; return; }
    if (r.changed) changed = true;
    out.push(r.item);
  });
  return { arr: out, changed: changed };
}
function hardenLoadedData() {
  var dirty = {};
  // Listas de favoritos: nombres válidos; los títulos de listas que desaparecen vuelven a General.
  var lists = [], gone = {}, seenName = {};
  (Array.isArray(favLists) ? favLists : []).forEach(function (l) {
    var name = l && typeof l === "object" ? qrCleanListName(l.name) : null;
    if (!name || typeof l.id !== "string" || !/^l[a-z0-9]{3,24}$/.test(l.id) || seenName[name.toLowerCase()]) { if (l && l.id) gone[l.id] = 1; dirty.lists = true; return; }
    seenName[name.toLowerCase()] = 1;
    if (l.name !== name) { l.name = name; dirty.lists = true; }
    lists.push(l);
  });
  if (lists.length !== (favLists || []).length) { favLists.length = 0; lists.forEach(function (l) { favLists.push(l); }); }
  var fav = guardMediaArray(myList, 2000);
  if (fav.changed) dirty.fav = true;
  var known = {};
  lists.forEach(function (l) { known[l.id] = 1; });
  fav.arr.forEach(function (m) { if (m.list !== undefined && (typeof m.list !== "string" || !known[m.list])) { delete m.list; dirty.fav = true; } });   // sin lista que no existe → General
  if (dirty.fav) { myList.length = 0; fav.arr.forEach(function (m) { myList.push(m); }); }
  var cont = guardMediaArray(continueWatching, 20);
  if (cont.changed) { continueWatching.length = 0; cont.arr.forEach(function (m) { continueWatching.push(m); }); dirty.cont = true; }
  var items = localAnalytics && Array.isArray(localAnalytics.items) ? guardMediaArray(localAnalytics.items, 150) : { arr: [], changed: false };
  if (items.changed) { localAnalytics.items = items.arr; dirty.an = true; }
  if (watchedMap && typeof watchedMap === "object") {
    Object.keys(watchedMap).forEach(function (k) {
      var r = /^(movie|tv):\d{1,10}$/.test(k) ? guardMediaItem(watchedMap[k]) : null;
      if (!r || r.item.type + ":" + r.item.id !== k) { delete watchedMap[k]; dirty.seen = true; } else if (r.changed) dirty.seen = true;
    });
  }
  if (dirty.lists) saveFavLists();
  if (dirty.fav) saveMyList();
  if (dirty.cont) safeStorageSet(profileStorageKey("tatoContinue"), JSON.stringify(continueWatching));
  if (dirty.an) saveLocalAnalytics();
  if (dirty.seen) saveWatched();
  return dirty;
}

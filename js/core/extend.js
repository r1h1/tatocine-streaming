/**
 * TatoCine · js/core/extend.js
 * Punto de extensión de la app (principio abierto/cerrado): una capa nueva "decora" una función
 * existente sin editar su código. Las capas se aplican en el orden de carga (ver index.html).
 *
 *   decorate("closePlayer", function (original) {
 *     return function () { limpiar(); return original.apply(this, arguments); };
 *   });
 *
 * Funciona porque las funciones globales viven en `window`, de modo que los manejadores inline
 * (onclick="...") y las llamadas internas usan siempre la versión decorada.
 */
function decorate(name, factory) {
  var original = window[name];
  if (typeof original !== "function") {
    if (window.console) console.warn("TatoCine: no se puede decorar «" + name + "» (no existe).");
    return null;
  }
  var wrapped = factory(original);
  window[name] = wrapped;
  return wrapped;
}

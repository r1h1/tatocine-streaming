/**
 * TatoCine · js/core/input-guard.js
 * Sanea en vivo todo lo que se escribe: quita caracteres de control y «<» «>» de los campos de texto, deja solo dígitos en los PIN
 * y limita la longitud. Es una capa más: cada dato además se escapa al pintarlo (escapeHTML) y se valida al guardarlo (bkText/bkId).
 * No hay base de datos ni SQL: los datos viven en localStorage y las consultas a TMDB van codificadas con URLSearchParams.
 */
(function () {
  var BAD = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/g, MAXLEN = { search: 100, text: 100 };
  function guard(el) {
    if (!el || el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
    var t = (el.getAttribute("type") || "text").toLowerCase(), v = el.value, c = v;
    if (el.getAttribute("inputmode") === "numeric") c = v.replace(/\D/g, "").slice(0, 8);
    else if (t === "text" || t === "search" || el.tagName === "TEXTAREA") c = v.replace(BAD, "").slice(0, Number(el.getAttribute("maxlength")) || MAXLEN[t] || 100);
    else return;
    if (c !== v) { var pos = el.selectionStart; el.value = c; try { if (pos != null) el.setSelectionRange(Math.max(0, pos - (v.length - c.length)), Math.max(0, pos - (v.length - c.length))); } catch (e) { } }
  }
  document.addEventListener("input", function (e) { guard(e.target); }, true);
  document.addEventListener("paste", function (e) { var el = e.target; setTimeout(function () { guard(el); }, 0); }, true);
})();

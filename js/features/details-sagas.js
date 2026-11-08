/**
 * TatoCine · js/features/details-sagas.js
 * Extras nuevos de la ficha y del actor:
 *   - «Más de esta saga»: si la película pertenece a una colección de TMDB, se muestran las demás partes.
 *   - Ficha del actor: «Conocido por» (su filmografía más popular; tocar una abre la ficha del título).
 */
function extrasCards(items, type) {
  return items.map(function (s) {
    var t = type || s.media_type || (s.first_air_date ? "tv" : "movie"), title = escapeHTML(s.title || s.name || "");
    return '<div class="similar-card" tabindex="0" role="button" data-act="open-details" data-id="' + (Number(s.id) || 0) + '" data-type="' + (t === "tv" ? "tv" : "movie") + '"><img class="similar-poster" alt="" src="' + IMG_CARD + s.poster_path + '" loading="lazy" decoding="async" data-fb="poster"/><div class="similar-title">' + title + "</div></div>";
  }).join("");
}
decorate("openDetails", function (original) {
  return function (id, type) {
    var r = original.apply(this, arguments), old = document.getElementById("details-collection");
    if (old) old.remove();
    if (type !== "movie" || isKidProfile()) return r;
    var mine = ++extrasToken;
    fetchTMDB("/movie/" + id).then(function (d) {
      var col = d && d.belongs_to_collection;
      if (!col || !col.id) return null;
      return fetchTMDB("/collection/" + col.id).then(function (c) { return { name: col.name || c.name, parts: (c.parts || []).filter(function (p) { return p.poster_path && String(p.id) !== String(id); }).sort(function (a, b) { return String(a.release_date || "").localeCompare(String(b.release_date || "")); }) }; });
    }).then(function (c) {
      if (!c || !c.parts.length || mine !== extrasToken) return;
      var anchor = document.getElementById("details-similar-container");
      if (!anchor || !anchor.parentNode) return;
      var box = document.createElement("div");
      box.id = "details-collection"; box.style.marginTop = "24px";
      box.innerHTML = '<div class="details-cast-title">' + L("Más de esta saga", "More from this saga") + '</div><div class="details-cast">' + extrasCards(c.parts, "movie") + "</div>";
      anchor.parentNode.insertBefore(box, anchor);
    }).catch(function () { });
    return r;
  };
});
var extrasToken = 0;
registerAction("actor-film", function (el) { var id = Number(el.dataset.id) || 0, type = el.dataset.type === "tv" ? "tv" : "movie"; closeActor(); openDetails(id, type); });
decorate("openActor", function (original) {
  return function (actorId) {
    var r = original.apply(this, arguments), old = document.getElementById("actor-films");
    if (old) old.remove();
    fetchTMDB("/person/" + actorId + "/combined_credits").then(function (d) {
      var seen = {}, list = ((d && d.cast) || []).filter(function (x) { var k = x.media_type + x.id; if (seen[k] || !x.poster_path || (x.media_type !== "movie" && x.media_type !== "tv") || x.adult) return false; seen[k] = 1; return (x.vote_count || 0) > 40; })
        .sort(function (a, b) { return (b.popularity || 0) - (a.popularity || 0); }).slice(0, 14);
      var host = document.querySelector("#actor-modal .actor-content");
      if (!list.length || !host) return;
      var box = document.createElement("div");
      box.id = "actor-films"; box.className = "actor-films";
      box.innerHTML = '<div class="details-cast-title">' + L("Conocido por", "Known for") + '</div><div class="details-cast">' + extrasCards(list).replace(/data-act="open-details"/g, 'data-act="actor-film"') + "</div>";
      host.appendChild(box);
    }).catch(function () { });
    return r;
  };
});

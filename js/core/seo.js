/* Dominio canónico: los despliegues espejo (netlify, vercel…) apuntan al principal para no competir entre sí en buscadores. */
var SEO_ORIGIN = "https://tatocine.netlify.app";
/**
 * TatoCine · js/core/seo.js
 * SEO dinámico: metaetiquetas, datos estructurados y título por pantalla.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    function setMetaByName(name, content) {
      var el = document.querySelector('meta[name="' + name + '"]');
      if (el) el.setAttribute("content", content);
    }
    function setMetaByProperty(property, content) {
      var el = document.querySelector('meta[property="' + property + '"]');
      if (el) el.setAttribute("content", content);
    }
    function updatePageSEO(title, description, type, data) {
      document.title = title + " — TatoCine";
      var shortDesc = String(
        description || "Explora películas, series y anime en TatoCine.",
      )
        .replace(/\s+/g, " ")
        .slice(0, 160);
      setMetaByName("description", shortDesc);
      setMetaByProperty("og:title", title + " — TatoCine");
      setMetaByProperty("og:description", shortDesc);
      setMetaByProperty(
        "og:type",
        type === "tv" ? "video.tv_show" : "video.movie",
      );
      setMetaByName("twitter:title", title + " — TatoCine");
      setMetaByName("twitter:description", shortDesc);
      var canonical = $("canonical-link");
      var pageUrl =
        SEO_ORIGIN +
        location.pathname +
        (data && data.id ? "?id=" + data.id + "&type=" + type : "");
      if (canonical) canonical.href = pageUrl;
      var ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute("content", pageUrl);
      var schema = $("media-structured-data");
      if (!schema) {
        schema = document.createElement("script");
        schema.type = "application/ld+json";
        schema.id = "media-structured-data";
        document.head.appendChild(schema);
      }
      var date = data && (data.release_date || data.first_air_date);
      var payload = {
        "@context": "https://schema.org",
        "@type": type === "tv" ? "TVSeries" : "Movie",
        name: title,
        description: shortDesc,
        inLanguage: "es",
      };
      if (date) payload.datePublished = date;
      if (data && data.vote_average > 0 && Number(data.vote_count) > 0)
        payload.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: Number(data.vote_average).toFixed(1),
          bestRating: "10",
          worstRating: "0",
          ratingCount: Number(data.vote_count),
        };
      if (data && data.genres && data.genres.length)
        payload.genre = data.genres.map(function (g) {
          return g.name;
        });
      schema.textContent = JSON.stringify(payload);
    }
    function resetPageSEO() {
      document.title = "TatoCine Streaming Gratis";
      setMetaByName(
        "description",
        "TatoCine es una interfaz web (frontend) de código abierto para explorar el catálogo de TMDB: películas, series y anime, estrenos, Top 10, listas, perfiles locales y recomendaciones en tu dispositivo.",
      );
      setMetaByProperty("og:title", "TatoCine Streaming Gratis");
      setMetaByProperty(
        "og:description",
        "Frontend de código abierto para explorar el catálogo de TMDB: estrenos, Top 10, listas, perfiles locales y recomendaciones en tu dispositivo.",
      );
      setMetaByProperty("og:type", "website");
      setMetaByName("twitter:title", "TatoCine Streaming Gratis");
      setMetaByName(
        "twitter:description",
        "Explora películas, series y anime en TatoCine.",
      );
      var canonical = $("canonical-link");
      if (canonical) canonical.href = SEO_ORIGIN + location.pathname;
      var ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl)
        ogUrl.setAttribute("content", SEO_ORIGIN + location.pathname);
      var schema = $("media-structured-data");
      if (schema && schema.parentNode) schema.parentNode.removeChild(schema);
    }

    // Los datos estructurados del sitio (WebSite + WebApplication) ya vienen en index.html, visibles para rastreadores sin JavaScript.

    // ==========================================================
    // V4 · Analítica de visualización, listas de favoritos, estadísticas,
    //      estudios/plataformas, búsquedas recientes, navegación TV,
    //      PWA y almacenamiento local optimizado.

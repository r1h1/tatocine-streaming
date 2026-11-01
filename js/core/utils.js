/**
 * TatoCine · js/core/utils.js
 * Utilidades compartidas: escape de HTML, favoritos y fechas de estreno.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    /** Mezcla un arreglo en el sitio (Fisher-Yates) y lo devuelve. */
    function shuffleInPlace(list) {
      for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
      }
      return list;
    }
    function escapeHTML(value) {
      return String(value == null ? "" : value).replace(
        /[&<>\"']/g,
        function (ch) {
          return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '\"': "&quot;",
            "'": "&#39;",
          }[ch];
        },
      );
    }
    function isSaved(i) {
      return myList.some(function (m) {
        return m.id === i.id && m.type === i.type;
      });
    }
    function isUpcoming(releaseDate, status, type) {
      var currentStatus = String(status || "").toLowerCase();

      // Si TMDB confirma que ya se estrenó, prevalece ese estado.
      var alreadyReleased =
        currentStatus === "released" ||
        (type === "tv" &&
          ["returning series", "ended", "canceled"].includes(currentStatus));

      if (alreadyReleased) return false;

      // Evita errores de zona horaria al interpretar YYYY-MM-DD.
      var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(releaseDate || ""));

      if (!match) return true;

      var year = Number(match[1]);
      var month = Number(match[2]);
      var day = Number(match[3]);

      var release = new Date(year, month - 1, day);

      if (
        release.getFullYear() !== year ||
        release.getMonth() !== month - 1 ||
        release.getDate() !== day
      ) {
        return true;
      }

      var releaseKey = year * 10000 + month * 100 + day;
      var today = new Date();

      var todayKey =
        today.getFullYear() * 10000 +
        (today.getMonth() + 1) * 100 +
        today.getDate();

      return releaseKey >= todayKey;
    }

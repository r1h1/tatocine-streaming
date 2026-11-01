/**
 * TatoCine · js/player/autoplay-next.js
 * Siguiente episodio automático: cuenta regresiva de respaldo.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ---- Siguiente episodio automático: respaldo con cuenta regresiva (estilo Netflix) ----
    var nextPromptTimer = null;
    function clearNextPrompt() {
      clearInterval(nextPromptTimer);
      nextPromptTimer = null;
      var p = document.querySelector(".next-ep-prompt");
      if (p && p.parentNode) p.parentNode.removeChild(p);
    }
    function hasNextEpisode() {
      if (!currentMedia || currentMedia.type !== "tv") return false;
      var ep = Number($episodeSelect.value || 0), season = Number($seasonSelect.value || 0);
      var later = (currentTvEpisodes || []).some(function (e) { return Number(e.episode_number) > ep; });
      if (later) return true;
      return (currentTvSeasons || []).some(function (x) { return Number(x.season_number) > season && Number(x.episode_count || 0) > 0; });
    }
    function showNextEpisodePrompt() {
      if (document.querySelector(".next-ep-prompt") || !hasNextEpisode()) return;
      var left = 10;
      // Con el vídeo en pantalla completa el aviso quedaría oculto: se sale de ella para poder cancelar.
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () { });
      var p = document.createElement("div");
      p.className = "next-ep-prompt";
      p.setAttribute("role", "alert");
      p.innerHTML = '<div class="next-ep-title">Siguiente episodio en <b>10</b> s</div><div class="next-ep-actions"><button type="button" class="next-ep-play">Reproducir ahora</button><button type="button" class="next-ep-cancel">Cancelar</button></div>';
      $playerView.appendChild(p);
      p.querySelector(".next-ep-play").onclick = function () { clearNextPrompt(); playNextEpisode(); };
      p.querySelector(".next-ep-cancel").onclick = function () { clearNextPrompt(); };
      nextPromptTimer = setInterval(function () {
        left--;
        var b = p.querySelector("b");
        if (b) b.textContent = String(Math.max(left, 0));
        if (left <= 0) { clearNextPrompt(); playNextEpisode(); }
      }, 1000);
    }
    decorate("playEmbed", function (original) { return function (i, b) { clearNextPrompt(); return original(i, b); }; });
    decorate("closePlayer", function (original) { return function () { clearNextPrompt(); return original.apply(this, arguments); }; });

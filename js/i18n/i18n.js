/**
 * TatoCine · js/i18n/i18n.js
 * Idioma por perfil (ESP/ENG): diccionario, reglas y traducción en vivo del DOM.
 * Script clásico (sin módulos): comparte el ámbito global con el resto de js/ para que los
 * manejadores inline y las funciones de otras capas sigan funcionando. Orden de carga: ver index.html.
 */
    // ==========================================================
    // ==========================================================
    // V8 · Idioma por perfil (ESP / ENG). El texto base de la app está en español;
    //      con un perfil en inglés se traduce toda la interfaz en tiempo real.
    // ==========================================================
    var I18N_EXACT = {
      // --- navegación, secciones y pantallas ---
      "Inicio": "Home", "Películas": "Movies", "Anime": "Anime", "Series": "Series", "Niños": "Kids", "Favoritos": "Favorites",
      "Perfiles": "Profiles", "Ajustes": "Settings", "Aviso Legal": "Legal notice", "Info": "Info", "Ver": "Watch", "Ver Tráiler": "Watch Trailer",
      "Ocultar Tráiler": "Hide Trailer", "Compartir": "Share", "Reparto": "Cast", "Recomendados para ti": "Recommended for you",
      "Regresar a inicio": "Back to home", "Pantalla completa": "Full screen", "Salir de pantalla completa": "Exit full screen",
      "Instalar aplicación": "Install app", "Instalar": "Install", "Instalar TatoCine": "Install TatoCine", "Cerrar": "Close", "Cerrar reproductor": "Close player",
      "Anterior": "Previous", "Siguiente": "Next", "Cargando...": "Loading...", "Cargando": "Loading", "Cargando descripción...": "Loading description...",
      "Todos": "All", "General": "General", "Cargar más": "Load more", "Cancelar": "Cancel", "Borrar": "Delete", "Limpiar": "Clear", "Entendido": "Got it", "Entrar": "Enter",
      "Crear": "Create", "Cambiar": "Change", "Resetear": "Reset", "Reintentar": "Retry", "Copiar": "Copy", "Copiado ✓": "Copied ✓", "Aceptar y continuar": "Accept and continue",
      "⚙ Filtros": "⚙ Filters", "Filtros Avanzados": "Advanced Filters", "Año": "Year", "Rating mínimo": "Minimum rating", "Ordenar por": "Sort by",
      "Popularidad": "Popularity", "Mejor puntuadas": "Top rated", "Más recientes": "Most recent",
      "Sin conexión a internet": "No internet connection", "Conexión restaurada": "Connection restored",
      // --- filas del inicio ---
      "Continuar Viendo": "Continue Watching", "Hecho para ti": "Made for you", "Tendencias de la semana": "Trending this week", "Próximos Estrenos": "Upcoming Releases",
      "Películas Populares": "Popular Movies", "Series Populares": "Popular Series", "Plataformas y estudios": "Platforms and studios", "Top 10 de la semana": "Top 10 this week",
      "Películas mejor calificadas": "Top Rated Movies", "Series mejor calificadas": "Top Rated Series", "Películas para Niños": "Movies for Kids", "Series para Niños": "Series for Kids",
      "Tendencia": "Trending", "Más tendencias": "More trending",
      // --- reproductor ---
      "Reproduciendo...": "Playing...", "Reproduciendo:": "Playing:", "Conectando con": "Connecting to", "Siguiente: ACTIVADO": "Next: ON", "Siguiente: DESACTIVADO": "Next: OFF",
      "Avanza cuando el reproductor externo comunica que el capítulo terminó": "Advances when the external player reports the episode ended",
      "Siguiente episodio en": "Next episode in", "Reproducir ahora": "Play now", "Reproducir contenido": "Play content",
      "Temporada": "Season", "Episodio": "Episode", "Siguiente película": "Next movie", "Abrir en YouTube": "Open on YouTube",
      "Siguiente episodio automático activado": "Autoplay next episode on", "Reproducción automática desactivada": "Autoplay turned off",
      "Has llegado al último episodio disponible": "You have reached the last available episode", "No se pudo cargar la siguiente temporada": "Could not load the next season",
      "La película terminó. No hay otra recomendación disponible.": "The movie ended. No other recommendation is available.",
      "El navegador no permite pantalla completa en este reproductor.": "The browser does not allow full screen in this player.",
      "La pantalla completa no está disponible en este navegador.": "Full screen is not available in this browser.",
      "La pantalla completa no está disponible en este dispositivo": "Full screen is not available on this device",
      "El navegador no permitió la pantalla completa": "The browser did not allow full screen",
      // --- estados / metadatos ---
      "PRÓXIMAMENTE": "COMING SOON", "Próximamente": "Coming soon", "Estrenada": "Released", "En Emisión": "On Air", "Finalizada": "Ended", "Planeada": "Planned", "Rumoreada": "Rumored", "Piloto": "Pilot",
      "Película": "Movie", "Serie": "Series", "Película infantil": "Kids movie", "Serie infantil": "Kids series", "Todo público": "All ages",
      "Película · Reanudar": "Movie · Resume", "Serie · Reanudar": "Series · Resume", "Año no disponible": "Year not available", "Sin descripción disponible.": "No description available.",
      "Sin título": "Untitled", "Sin nombre": "No name", "Contenido": "Content", "Sin contenido": "No content", "Otros": "Other",
      "Este contenido todavía no está disponible": "This content is not available yet",
      // --- géneros ---
      "Acción": "Action", "Aventura": "Adventure", "Animación": "Animation", "Comedia": "Comedy", "Crimen": "Crime", "Documental": "Documentary", "Documentales": "Documentaries", "Drama": "Drama",
      "Familia": "Family", "Fantasía": "Fantasy", "Historia": "History", "Terror": "Horror", "Música": "Music", "Misterio": "Mystery", "Romance": "Romance", "Ciencia ficción": "Science Fiction",
      "Película para televisión": "TV Movie", "Suspenso": "Thriller", "Suspense": "Thriller", "Bélica": "War", "Western": "Western", "Acción y aventura": "Action & Adventure", "Acción y Aventura": "Action & Adventure",
      "Infantil": "Kids", "Noticias": "News", "Reality": "Reality", "Ciencia ficción y fantasía": "Sci-Fi & Fantasy", "Sci-Fi": "Sci-Fi", "Sci-Fi & Fantasy": "Sci-Fi & Fantasy", "Telenovela": "Soap", "Talk show": "Talk Show",
      "Guerra y política": "War & Politics", "Misterio, suspenso y terror": "Mystery, thriller and horror",
      // --- búsqueda ---
      "Buscar películas, series, anime...": "Search movies, series, anime...", "Búsquedas recientes": "Recent searches", "No encontramos resultados": "No results found",
      "No encontramos películas, series o anime con ese nombre. Prueba con otro título o revisa la escritura.": "We couldn't find movies, series or anime with that name. Try another title or check the spelling.",
      "No se pudo completar la búsqueda": "The search could not be completed", "Comprueba tu conexión": "Check your connection", "Sin resultados": "No results", "Prueba con otros filtros.": "Try other filters.",
      "Error de conexión": "Connection error", "Error al cargar": "Loading error", "No se pudo cargar el catálogo.": "The catalog could not be loaded.",
      "TatoCine no pudo consultar el catálogo en este momento. Inténtalo de nuevo.": "TatoCine couldn't query the catalog right now. Please try again.",
      "No hay un título destacado disponible": "No featured title available", "No se pudieron cargar los datos del contenido": "Could not load the content data",
      "No se pudieron cargar los detalles. Comprueba tu conexión e inténtalo de nuevo.": "Could not load the details. Check your connection and try again.",
      "No se pudieron identificar los detalles de este título": "Could not identify this title's details", "No hay temporadas": "No seasons",
      "Este actor no tiene biografía disponible en TMDB.": "This actor has no biography available on TMDB.", "No se pudo obtener la biografía.": "Could not load the biography.",
      // --- favoritos, listas, estadísticas ---
      "Guardar en favoritos": "Save to favorites", "Agregar a favoritos": "Add to favorites", "Quitar de favoritos": "Remove from favorites", "En favoritos": "In favorites", "Eliminado de favoritos": "Removed from favorites",
      "Agregado a favoritos": "Added to favorites", "Guardado en Favoritos": "Saved to Favorites", "Agregar": "Add", "Quitar": "Remove", "Like!": "Liked!",
      "+ Nueva lista": "+ New list", "Nueva lista": "New list", "Crear lista": "Create list", "Editar lista": "Edit list", "Eliminar lista": "Delete list", "Nombre de la lista": "List name", "Guardar cambios": "Save changes",
      "Lista actualizada": "List updated", "Lista eliminada": "List deleted", "Lista borrada": "List deleted", "Ya existe una lista con ese nombre": "A list with that name already exists", "Puedes crear hasta 12 listas": "You can create up to 12 lists",
      "Escribe un nombre para la lista": "Enter a name for the list", "Estadísticas": "Statistics", "Eliminar todos los favoritos": "Remove all favorites", "Lista borrada.": "List deleted.",
      "Agrupa tus favoritos, por ejemplo «Romance» o «Para el fin de semana». Si borras una lista, sus títulos pasan a General.": "Group your favorites, e.g. “Romance” or “For the weekend”. If you delete a list, its titles move to General.",
      "Esta lista aún no tiene títulos. Usa el corazón en cualquier título y elige esta lista.": "This list has no titles yet. Use the heart on any title and choose this list.",
      "Tus favoritos está vacío": "Your favorites is empty", "Haz clic en el corazón de cualquier película, anime o serie para guardarla aquí.": "Click the heart on any movie, anime or series to save it here.",
      "Haz clic en el corazón de cualquier película, anime o serie para guardarla aquí. También puedes crear listas para organizarlos.": "Click the heart on any movie, anime or series to save it here. You can also create lists to organize them.",
      "Tiempo de visualización": "Watch time", "Títulos reproducidos": "Titles played", "Títulos finalizados": "Titles finished", "Lo que más ves": "What you watch most", "Qué ves más": "What you watch most",
      "Tu Top 3": "Your Top 3", "Géneros favoritos": "Favorite genres", "Ranking de perfiles": "Profile ranking", "Todavía no hay títulos en tu ranking.": "There are no titles in your ranking yet.",
      "Aún no hay datos. Reproduce títulos y aquí verás tu tiempo, tu ranking y tus preferencias.": "No data yet. Play titles and you'll see your time, ranking and preferences here.",
      "Todo se calcula en este dispositivo; no se envía a ningún servidor.": "Everything is calculated on this device; nothing is sent to any server.",
      "Película": "Movie", "Lista": "List",
      // --- perfiles ---
      "¿Quién está viendo?": "Who's watching?", "Elige un perfil para continuar": "Choose a profile to continue", "Agregar perfil": "Add profile", "Editar perfil": "Edit profile", "Crear perfil": "Create profile",
      "Eliminar perfil": "Delete profile", "Nombre del perfil": "Profile name", "Escribe un nombre": "Enter a name", "Tipo de perfil": "Profile type", "Adulto": "Adult", "Niño": "Kid",
      "¿Para quién es este perfil?": "Who is this profile for?", "Acceso completo a todas las secciones.": "Full access to every section.",
      "Solo verá la sección Niños. La búsqueda también se limita a contenido infantil.": "Will only see the Kids section. Search is also limited to kids' content.",
      "PIN": "PIN", "PIN de acceso (opcional)": "Access PIN (optional)", "4 dígitos": "4 digits", "Quitar PIN": "Remove PIN", "Perfil protegido": "Protected profile", "Ingresa el PIN para continuar.": "Enter the PIN to continue.",
      "PIN incorrecto.": "Incorrect PIN.", "El PIN debe tener exactamente 4 números": "The PIN must have exactly 4 digits", "El PIN se quitará al guardar los cambios.": "The PIN will be removed when you save the changes.",
      "Si defines un PIN, se pedirá cada vez que alguien intente entrar a este perfil.": "If you set a PIN, it will be requested every time someone tries to enter this profile.",
      "Este perfil tiene PIN. Déjalo vacío para conservarlo o escribe 4 dígitos nuevos para cambiarlo.": "This profile has a PIN. Leave it empty to keep it or enter 4 new digits to change it.",
      "Crea un espacio propio para tus películas, series y recomendaciones.": "Create your own space for your movies, series and recommendations.",
      "Cambia el nombre, el tipo o el PIN de este perfil. Tu historial y tus listas se conservarán.": "Change this profile's name, type or PIN. Your history and lists will be kept.",
      "Hasta 6 perfiles. Los nombres, las listas, el historial y las recomendaciones se guardan solamente en este navegador; no se crea ninguna cuenta ni se envían datos a una base de datos.": "Up to 6 profiles. Names, lists, history and recommendations are stored only in this browser; no account is created and no data is sent to a database.",
      "Perfil actual": "Current profile", "Actual": "Current", "Seleccionar": "Select", "Cambiar de perfil": "Switch profile", "Cambiar perfil local": "Switch local profile", "Perfil actualizado": "Profile updated", "Perfil eliminado": "Profile deleted",
      "Escribe un nombre para el perfil": "Enter a name for the profile", "No se encontró el perfil": "Profile not found", "Debe existir al menos un perfil": "At least one profile must exist", "Debe existir al menos un perfil de adulto": "At least one adult profile must exist",
      "Puedes crear hasta 6 perfiles": "You can create up to 6 profiles", "Solo un perfil de adulto puede administrar perfiles": "Only an adult profile can manage profiles",
      "No se pudieron guardar los cambios en este navegador": "Changes could not be saved in this browser", "No se pudo eliminar el perfil en este navegador": "The profile could not be deleted in this browser",
      "No se pudo cambiar de perfil en este dispositivo": "Could not switch profile on this device", "No se encontró el perfil que quieres editar": "The profile you want to edit was not found",
      "No se pudo abrir el formulario de perfiles": "Could not open the profiles form", "Demasiados intentos. Espera 30 s.": "Too many attempts. Wait 30 s.", "Fotografía de perfil": "Profile photo",
      "Este contenido no está disponible en la sección Niños": "This content is not available in the Kids section",
      "Hora de descansar": "Time for a break", "Se alcanzó el límite de 8 horas de uso. Podrás volver a ver contenido cuando termine el descanso de 1 hora.": "The 8-hour usage limit was reached. You can watch again when the 1-hour break ends.",
      "Descanso terminado: ya puedes volver a ver contenido": "Break over: you can watch again", "Quedan 15 minutos de uso antes del descanso": "15 minutes of use left before the break",
      // --- ajustes ---
      "Borrar historial de reproducción": "Clear watch history", "Servidor Preferido": "Preferred server", "Ninguno": "None", "Recomendaciones personalizadas": "Personalized recommendations", "Borrar preferencias": "Clear preferences",
      "Tus preferencias se calculan localmente en este navegador. No se envían a TatoCine.": "Your preferences are calculated locally in this browser. They are not sent to TatoCine.",
      "Atajos de Teclado": "Keyboard shortcuts", "/ buscar · ← ↑ → ↓ moverse · Enter abrir · F pantalla completa · Esc o Atrás cerrar": "/ search · ← ↑ → ↓ move · Enter open · F full screen · Esc or Back close",
      "Almacenamiento": "Storage", "Calculando…": "Calculating…", "Liberar espacio": "Free up space", "Espacio liberado": "Space freed", "Modo ligero": "Lite mode",
      "Automático": "Automatic", "automático": "automatic", "activado": "on", "desactivado": "off",
      "Automático: se activa en TV, conexiones lentas y equipos modestos": "Automatic: turns on for TVs, slow connections and modest devices",
      "Activado: menos efectos e imágenes más livianas": "On: fewer effects and lighter images", "Desactivado: máxima calidad visual": "Off: maximum visual quality",
      "Añade TatoCine a tu pantalla de inicio.": "Add TatoCine to your home screen.", "Instala TatoCine como app en este dispositivo.": "Install TatoCine as an app on this device.",
      "Te mostramos cómo instalarla en este dispositivo.": "We'll show you how to install it on this device.", "Instalando TatoCine…": "Installing TatoCine…", "TatoCine instalada": "TatoCine installed",
      "TatoCine se actualizó. Recarga para ver la última versión.": "TatoCine was updated. Reload to see the latest version.",
      "Historial borrado": "History cleared", "Lista borrada": "List deleted", "Preferencias locales borradas": "Local preferences cleared", "Servidor reseteado": "Server reset",
      "¿Borrar toda tu lista de favoritos?": "Delete your entire favorites list?", "¿Borrar el historial local que utiliza TatoCine para personalizar las recomendaciones?": "Delete the local history TatoCine uses to personalize recommendations?",
      "Eliminado de Continuar Viendo": "Removed from Continue Watching", "Quitar de Continuar Viendo": "Remove from Continue Watching", "No se pudo guardar el cambio": "The change could not be saved",
      // --- instalación ---
      "Smart TV": "Smart TV", "Escritorio": "Desktop", "Escritorio (Firefox)": "Desktop (Firefox)", "Mac (Safari)": "Mac (Safari)", "iPhone / iPad": "iPhone / iPad", "Android": "Android",
      "Los navegadores de TV normalmente no permiten instalar aplicaciones web.": "TV browsers usually don't allow installing web apps.",
      "En el menú del navegador de tu TV usa «Añadir a favoritos» o «Fijar en inicio» para entrar rápido a TatoCine.": "In your TV browser's menu use “Add to bookmarks” or “Pin to home” to open TatoCine quickly.",
      "En Android TV / Google TV con Chrome, usa el menú ⋮ → «Instalar aplicación» si aparece.": "On Android TV / Google TV with Chrome, use the ⋮ menu → “Install app” if it appears.",
      "Abre TatoCine en Safari (también funciona en Chrome o Edge con iOS 16.4 o superior).": "Open TatoCine in Safari (it also works in Chrome or Edge on iOS 16.4 or later).",
      "Toca el botón Compartir (cuadrado con una flecha hacia arriba).": "Tap the Share button (square with an up arrow).",
      "Elige «Añadir a pantalla de inicio» y confirma con «Añadir».": "Choose “Add to Home Screen” and confirm with “Add”.",
      "Toca el menú ⋮ del navegador.": "Tap the browser's ⋮ menu.", "Elige «Instalar aplicación» o «Añadir a la pantalla de inicio».": "Choose “Install app” or “Add to Home screen”.", "Confirma con «Instalar».": "Confirm with “Install”.",
      "Firefox de escritorio no permite instalar aplicaciones web.": "Desktop Firefox doesn't allow installing web apps.",
      "Abre TatoCine en Chrome o Edge para instalarla, o guárdala en tus marcadores.": "Open TatoCine in Chrome or Edge to install it, or save it to your bookmarks.",
      "En el menú Archivo, elige «Añadir al Dock…».": "In the File menu, choose “Add to Dock…”.", "Confirma el nombre y pulsa «Añadir».": "Confirm the name and click “Add”.",
      "Busca el icono de instalar en la barra de direcciones (a la derecha) y haz clic en «Instalar».": "Look for the install icon in the address bar (on the right) and click “Install”.",
      "Si no aparece: en Chrome, menú ⋮ → «Guardar y compartir» → «Instalar TatoCine»; en Edge, menú ··· → «Aplicaciones» → «Instalar este sitio como una aplicación».": "If it doesn't appear: in Chrome, ⋮ menu → “Save and share” → “Install TatoCine”; in Edge, ··· menu → “Apps” → “Install this site as an app”.",
      "La instalación requiere HTTPS (o localhost).": "Installation requires HTTPS (or localhost).",
      "En Safari: Compartir → Añadir a pantalla de inicio.": "In Safari: Share → Add to Home Screen.", "En Safari: toca Compartir y elige «Añadir a pantalla de inicio»": "In Safari: tap Share and choose “Add to Home Screen”",
      // --- compartir y varios ---
      "TATOCINE · COMPARTIR": "TATOCINE · SHARE", "ENLACE DIRECTO": "DIRECT LINK", "Comparte este título con quien quieras.": "Share this title with anyone.", "Enlace copiado al portapapeles.": "Link copied to the clipboard.",
      "Enlace seleccionado. Mantén pulsado o usa Ctrl+C para copiarlo.": "Link selected. Press and hold or use Ctrl+C to copy it.", "No se pudo generar el enlace": "Could not generate the link", "No se pudo generar el enlace de este contenido": "Could not generate this content's link",
      "No se encontró el botón para compartir": "Share button not found", "este título": "this title", "este contenido": "this content", "Mira": "Check out",
      "Aviso Legal y Descargo de Responsabilidad": "Legal Notice and Disclaimer",
      "TatoCine solo es una página de reproducción multimedia que busca en sitios de terceros y externos material audiovisual en base a un API gratuito de TMDB. TatoCine no almacena datos de búsqueda de las personas, no almacena ni aloja ningún tipo de material audiovisual todo se consulta on-demand a través de terceros. No lucra ni busca lucrar. Algunos reproductores pueden tener anuncios de terceros por lo que TatoCine no se hace responsable por material indebido o con derecho de autor porque los anuncios no están en nuestro código fuente. TatoCine es un proyecto totalmente gratuito y de código abierto: se distribuye bajo una licencia gratuita (MIT), sin costo ni suscripciones, y puede usarse, copiarse y modificarse libremente respetando los términos de esa licencia.":
        "TatoCine is only a media playback page that searches third-party and external sites for audiovisual material using TMDB's free API. TatoCine does not store people's search data and does not store or host any kind of audiovisual material; everything is queried on demand through third parties. It does not profit and does not seek to profit. Some players may show third-party ads, so TatoCine is not responsible for improper or copyrighted material because the ads are not in our source code. TatoCine is a completely free and open-source project: it is distributed under a free license (MIT), at no cost and with no subscriptions, and it may be used, copied and modified freely under the terms of that license.",
      "TatoCine | Películas, series y anime": "TatoCine | Movies, series and anime",
      "Explora películas, series y anime en TatoCine.": "Explore movies, series and anime on TatoCine.",
      "Explora películas, series y anime en TatoCine. Descubre estrenos, títulos populares y recomendaciones basadas en tus preferencias locales.": "Explore movies, series and anime on TatoCine. Discover new releases, popular titles and recommendations based on your local preferences.",
      "Explora películas, series y anime. Descubre estrenos, títulos populares y recomendaciones basadas en tus preferencias locales.": "Explore movies, series and anime. Discover new releases, popular titles and recommendations based on your local preferences.",
      "Explora películas, series y anime. Descubre títulos populares y recomendaciones personalizadas.": "Explore movies, series and anime. Discover popular titles and personalized recommendations.",
      "TatoCine - Streaming Gratis": "TatoCine - Free Streaming", "TatoCine: películas, anime y series gratis en streaming.": "TatoCine: free streaming movies, anime and series.",
      "Guardar": "Save", "Cerrar lista": "Close list", "Desde un perfil Niño no se puede entrar como Invitado": "Kids profiles cannot switch to the Guest profile", "Invitado": "Guest", "El perfil Invitado no se puede editar": "The Guest profile cannot be edited",
      "Todo público": "All ages"
    };
    // Reglas para textos con datos variables (aplican a fragmentos; se evalúan en orden)
    var I18N_RULES = [
      [/^Guardado en «(.+)»$/, "Saved in «$1»"],
      [/^Lista «(.+)» creada$/, "List «$1» created"],
      [/^Resultados para "(.*)"$/, "Results for \"$1\""],
      [/^Búsqueda: "(.*)"$/, "Search: \"$1\""],
      [/^No encontramos contenido para (.+)\.$/, "We couldn't find content for $1."],
      [/^Porque viste (.+)$/, "Because you watched $1"],
      [/^¿Dónde quieres guardar «(.+)»\?$/, "Where do you want to save «$1»?"],
      [/^Colección · (.+)$/, function (m, a) { return "Collection · " + trText(a); }],
      [/^(Películas|Series|Anime|Películas para Niños|Series para Niños) · página (\d+)$/, function (m, a, n) { return trText(a) + " · page " + n; }],
      [/^(Películas|Series) · (.+)$/, function (m, a, b) { return trText(a) + " · " + b; }],
      [/^Siguiente temporada: T(\d+) · (.*)$/, "Next season: S$1 · $2"],
      [/^Siguiente episodio: (.*)$/, "Next episode: $1"],
      [/^Modo ligero: (.+)$/, function (m, a) { return "Lite mode: " + trText(a); }],
      [/^Temporada (\d+)$/, "Season $1"],
      [/^Episodio (\d+)(.*)$/, "Episode $1$2"],
      [/^Perfil actual: (.+)\. Cambiar perfil$/, "Current profile: $1. Switch profile"],
      [/^Editar nombre de (.+)$/, "Edit name of $1"],
      [/^Seleccionar perfil (.+)$/, "Select profile $1"],
      [/^Quitar (.+) de Continuar Viendo$/, "Remove $1 from Continue Watching"],
      [/^Tráiler de (.+)$/, "Trailer: $1"],
      [/^Puesto (\d+)$/, "Rank $1"],
      [/^(\d+) de 6 perfiles locales$/, "$1 of 6 local profiles"],
      [/^Quien más ha visto: (.+)$/, "Most watched: $1"],
      [/^Actual( · .*)$/, function (m, a) { return "Current" + a; }],
      [/^Seleccionar( · .*)$/, function (m, a) { return "Select" + a; }],
      // fragmentos dentro de oraciones más largas
      [/(\d+) títulos reproducidos · (\d+) finalizados\./g, "$1 titles played · $2 finished."],
      [/Termina 2 títulos para activar «Hecho para ti»\./g, "Finish 2 titles to unlock “Made for you”."],
      [/Géneros principales: /g, "Top genres: "],
      [/Los datos permanecen en este dispositivo\./g, "Data stays on this device."],
      [/Datos locales: /g, "Local data: "],
      [/· Total usado por la app: /g, "· Total used by the app: "],
      [/(\d+) reproducciones/g, "$1 plays"],
      [/(\d+) reproducción/g, "$1 play"],
      [/(\d+) títulos/g, "$1 titles"],
      [/ \(tú\)/g, " (you)"],
      [/ · (\d+) favoritos? pasaron a General/g, " · $1 favorites moved to General"],
      [/^Lista eliminada/, "List deleted"],
      [/\/episodio/g, "/episode"],
      [/ \((\d+) años\)/g, " ($1 years old)"],
      [/^T(\d+) · E(\d+)/, "S$1 · E$2"],
      [/^(Escritorio \(Firefox\)|Escritorio|Mac \(Safari\)) · /, function (m, a) { return trText(a) + " · "; }],
      [/ · sigue estos pasos para instalar TatoCine:/g, " · follow these steps to install TatoCine:"],
      [/ · Sin historial/g, " · No history"],
      [/ · Niño/g, " · Kid"],
      [/^Conectando con (.+?)\.\.\.$/, "Connecting to $1..."],
      [/^Ingresa el PIN de (.+) para continuar\.$/, "Enter the PIN for $1 to continue."]
    ];
    var I18N_LC = {};
    Object.keys(I18N_EXACT).forEach(function (k) { I18N_LC[k.toLowerCase()] = I18N_EXACT[k]; });
    // API para módulos nuevos: L() elige el texto según el idioma del perfil; i18nAdd/i18nRule amplían el diccionario.
    function L(es, en) { return UI_EN ? en : es; }
    var i18nRetranslatePending = false;
    function i18nAdd(map) {
      Object.keys(map).forEach(function (k) { I18N_EXACT[k] = map[k]; I18N_LC[k.toLowerCase()] = map[k]; });
      // Los módulos que cargan después del primer recorrido del DOM obligan a repetirlo (una sola vez por lote).
      if (UI_EN && !i18nRetranslatePending) {
        i18nRetranslatePending = true;
        setTimeout(function () { i18nRetranslatePending = false; trTree(document.body); }, 0);
      }
    }
    function i18nRule(re, replacement) { I18N_RULES.push([re, replacement]); }
    var I18N_SKIP = ".card-title,.hero-title,.hero-desc,.details-title,.details-overview,.cast-name,.cast-char,.actor-name,.actor-bio,.actor-meta,.tc-profile-card-name,.tc-profile-trigger-name,.recent-item,.stat-top-title,[data-i18n=\"skip\"],script,style,textarea,input";
    function trText(raw) {
      if (!UI_EN || raw == null) return raw;
      var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(String(raw));
      var core = m[2].replace(/\s+/g, " ");
      if (core.length < 2) return raw;
      var out = I18N_EXACT[core];
      if (out === undefined) {
        var lc = I18N_LC[core.toLowerCase()];
        if (lc !== undefined) out = (core === core.toUpperCase() && core !== core.toLowerCase()) ? lc.toUpperCase() : lc;
      }
      if (out === undefined) {
        var cur = core;
        for (var i = 0; i < I18N_RULES.length; i++) cur = cur.replace(I18N_RULES[i][0], I18N_RULES[i][1]);
        if (cur === core) return raw;
        out = cur;
      }
      return m[1] + out + m[3];
    }
    var I18N_ATTRS = ["title", "aria-label", "placeholder"];
    function trAttrs(el) {
      if (!el || el.nodeType !== 1) return;
      for (var i = 0; i < I18N_ATTRS.length; i++) {
        var v = el.getAttribute(I18N_ATTRS[i]);
        if (v) { var t = trText(v); if (t !== v) el.setAttribute(I18N_ATTRS[i], t); }
      }
      if (el.tagName === "META") {
        var c = el.getAttribute("content");
        if (c && /^(description|og:title|og:description|twitter:title|twitter:description)$/.test(el.getAttribute("name") || el.getAttribute("property") || "")) {
          var tc = trText(c); if (tc !== c) el.setAttribute("content", tc);
        }
      }
    }
    function trTextNode(node) {
      var v = node.nodeValue;
      if (!v || v.length < 2) return;
      var t = trText(v);
      if (t === v) return;
      var p = node.parentElement;
      if (p && p.closest && p.closest(I18N_SKIP)) return;
      node.nodeValue = t;
    }
    function trTree(root) {
      if (!root) return;
      if (root.nodeType === 3) { trTextNode(root); return; }
      if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
      if (root.nodeType === 1) {
        trAttrs(root);
        if (root.closest && root.closest(I18N_SKIP)) return;
      }
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      var n;
      while ((n = walker.nextNode())) trTextNode(n);
      if (root.querySelectorAll) root.querySelectorAll("[title],[aria-label],[placeholder]").forEach(trAttrs);
    }
    if (UI_EN) {
      document.documentElement.lang = "en";
      var nativeConfirm = window.confirm;
      window.confirm = function (msg) { return nativeConfirm.call(window, trText(msg)); };
      var nativeShare = navigator.share;
      if (typeof nativeShare === "function") {
        navigator.share = function (data) {
          var d = {}; for (var k in data) d[k] = typeof data[k] === "string" ? trText(data[k]) : data[k];
          return nativeShare.call(navigator, d);
        };
      }
      trTree(document.head);
      trTree(document.body);
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var mu = list[i];
          if (mu.type === "childList") { for (var j = 0; j < mu.addedNodes.length; j++) trTree(mu.addedNodes[j]); }
          else if (mu.type === "characterData") trTextNode(mu.target);
          else if (mu.type === "attributes") trAttrs(mu.target);
        }
      }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "aria-label", "placeholder", "content"] });
    }

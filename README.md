# TatoCine — Catálogo de películas y series

![Estado](https://img.shields.io/badge/Estado-Activo-success)
![Versión](https://img.shields.io/badge/Versión-2.0.0-blue)
![Licencia](https://img.shields.io/badge/Licencia-MIT-green)
![Tecnologías](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20JavaScript-orange)

**TatoCine** es una aplicación web para explorar películas y series, consultar tendencias, descubrir próximos estrenos y buscar títulos desde una interfaz intuitiva. Utiliza la API de [The Movie Database (TMDB)](https://www.themoviedb.org/) para obtener información del catálogo, imágenes, sinopsis y metadatos, y permite integrar reproductores de vídeo externos.

El proyecto está desarrollado con HTML5, CSS3 y JavaScript puro (*Vanilla JavaScript*). Su arquitectura de frontend estático permite ejecutarlo sin un backend propio ni una base de datos, y facilita su despliegue en plataformas como Netlify, Vercel y GitHub Pages.

## Características principales

### Catálogo dinámico

- Consulta de tendencias de películas.
- Sección de próximos estrenos.
- Catálogo de películas populares.
- Catálogo de series populares.
- Portada principal con información del título destacado.
- Visualización de imágenes, sinopsis, fechas de estreno y calificaciones.
- Datos de respaldo para mantener una vista de catálogo cuando falla la conexión con TMDB.

### Búsqueda de películas y series

- Búsqueda de títulos mediante la API de TMDB.
- Búsqueda de películas y series desde un único campo.
- Retardo controlado (*debounce*) para reducir solicitudes mientras el usuario escribe.
- Actualización de los resultados dentro de la interfaz.
- Mensajes para búsquedas sin resultados y errores de conexión.

### Mi Lista

- Función para guardar y quitar películas y series favoritas.
- Almacenamiento de los títulos seleccionados mediante `localStorage`.
- Vista independiente para consultar los elementos guardados.
- Persistencia local entre visitas desde el mismo navegador, mientras no se borren los datos del sitio.

### Gestión de próximos estrenos

La aplicación puede utilizar las fechas de estreno proporcionadas por TMDB para identificar títulos que todavía no están disponibles.

Cuando esta funcionalidad está implementada en la versión desplegada, los títulos próximos pueden mostrarse con un tratamiento visual diferenciado y bloquearse para evitar intentar reproducirlos antes de su estreno.

La fecha de estreno no garantiza la disponibilidad efectiva del contenido en una fuente externa.

### Reproductores externos

- Interfaz de reproducción integrada mediante un modal.
- Selección entre las fuentes externas configuradas.
- Indicador de carga durante la inicialización del reproductor.
- Soporte para distintas rutas de contenido, como películas y episodios de series, según la configuración del proveedor.

La disponibilidad, el idioma, la calidad y la compatibilidad de reproducción dependen de cada fuente externa. La interfaz no garantiza que todos los títulos estén disponibles en todos los reproductores.

### Interfaz y experiencia de usuario

- Diseño oscuro inspirado en las plataformas modernas de entretenimiento.
- Portada principal con imagen de fondo y metadatos.
- Carruseles horizontales con controles de navegación.
- Tarjetas interactivas con información de cada título.
- Diseño adaptable a computadoras, tabletas y dispositivos móviles.
- Animaciones y transiciones para mejorar la interacción.
- Carga diferida de imágenes cuando corresponde.
- Indicadores visuales de carga, conexión y errores.

### Rendimiento y manejo de errores

- JavaScript sin frameworks ni dependencias de frontend obligatorias.
- Consultas HTTP a TMDB mediante `fetch`.
- Renderizado dinámico de resultados.
- Uso de `localStorage` para guardar preferencias locales.
- Catálogo estático de respaldo cuando las consultas a TMDB fallan.

Los datos de respaldo son estáticos y pueden no reflejar los estrenos ni las tendencias actuales.

## Tecnologías utilizadas

| Tecnología | Aplicación |
|---|---|
| HTML5 | Estructura de la interfaz. |
| CSS3 | Diseño visual, Flexbox, animaciones y adaptación responsive. |
| JavaScript | Lógica de la aplicación, gestión de eventos y manipulación del DOM. |
| TMDB API | Información del catálogo, tendencias, estrenos y búsquedas. |
| `localStorage` | Persistencia local de la lista personal. |
| Google Fonts | Tipografía Inter. |
| Reproductores externos | Integración de fuentes de vídeo compatibles. |

## Requisitos previos

Para ejecutar TatoCine necesitas:

- Un navegador web moderno.
- Un editor de código, como Visual Studio Code.
- Una clave API válida de TMDB.
- Conexión a Internet para consultar el catálogo y cargar recursos externos.

No es necesario instalar Node.js, ejecutar `npm install` ni configurar una base de datos para la versión estática.

## Instalación y configuración

### 1. Obtener el proyecto

Clona el repositorio:

```bash
git clone https://github.com/TU_USUARIO/tatocine-streaming.git
cd tatocine-streaming
```

Reemplaza `TU_USUARIO` por el nombre correspondiente a tu cuenta u organización de GitHub.

También puedes descargar el repositorio como archivo ZIP y extraerlo localmente.

### 2. Obtener una clave API de TMDB

1. Crea una cuenta en [The Movie Database](https://www.themoviedb.org/).
2. Accede a la configuración de tu cuenta.
3. Abre la sección **API**.
4. Solicita las credenciales correspondientes a tu aplicación.
5. Consulta la documentación oficial y las condiciones de uso aplicables.

Documentación: [TMDB API Documentation](https://developer.themoviedb.org/docs).

### 3. Configurar la clave API

Abre `index.html` en tu editor de código y localiza la declaración de la clave:

```javascript
const TMDB_API_KEY = "TU_API_KEY_V3";
```

Sustituye `TU_API_KEY_V3` por tu clave API v3 válida.

**Consideración de seguridad:** una clave integrada en JavaScript del lado del cliente es visible para los usuarios. No incluyas tokens privados ni credenciales sensibles en un repositorio público. Para una aplicación publicada, protege las credenciales de acuerdo con las recomendaciones de TMDB y las características de tu despliegue.

### 4. Ejecutar localmente

Puedes abrir el archivo `index.html` directamente en un navegador. Sin embargo, para las pruebas de desarrollo se recomienda utilizar un servidor HTTP local.

Con Python, ejecuta:

```bash
python3 -m http.server 5500
```

Después, abre:

```text
http://localhost:5500
```

Si el archivo se encuentra en otra carpeta, inicia el servidor desde el directorio correspondiente.

También puedes utilizar la extensión Live Server de Visual Studio Code.

## Despliegue en Netlify

TatoCine puede desplegarse como un sitio estático, sin compilación ni instalación de dependencias.

1. Accede a [Netlify](https://app.netlify.com/).
2. Inicia sesión y abre la opción de despliegue manual.
3. Arrastra la carpeta del proyecto o utiliza la conexión con tu repositorio.
4. Comprueba que el archivo principal se encuentre en la raíz del contenido publicado.
5. Verifica que la aplicación pueda consultar TMDB desde el dominio definitivo.

Netlify asignará una URL pública al sitio. También puedes configurar un dominio propio.

Para mantener el proyecto actualizado, se recomienda conectar el repositorio de GitHub con Netlify, de modo que los despliegues puedan ejecutarse a partir de las actualizaciones del código.

Otras plataformas compatibles con sitios estáticos son:

- [Vercel](https://vercel.com/)
- [GitHub Pages](https://pages.github.com/)

La disponibilidad de TMDB y de los recursos externos debe comprobarse después de cada despliegue.

## Capturas de pantalla

Puedes documentar las principales vistas de TatoCine mediante capturas de pantalla almacenadas en el repositorio.

Se recomienda incluir:

- **Inicio:** portada principal y secciones del catálogo.
- **Búsqueda:** campo de consulta y resultados.
- **Mi Lista:** títulos guardados por el usuario.
- **Reproductor:** modal y opciones de las fuentes configuradas.

Ejemplo de referencias a imágenes locales:

```markdown
![Pantalla principal](assets/images/inicio.png)

![Resultados de búsqueda](assets/images/busqueda.png)

![Reproductor](assets/images/reproductor.png)
```

Ajusta las rutas según la estructura real del repositorio.

## Aviso legal y atribuciones

TatoCine proporciona una interfaz para consultar información sobre películas y series y, cuando está configurado, acceder a reproductores externos. La aplicación no debe presumirse titular de los derechos de distribución de los contenidos accesibles desde dichos servicios.

1. Los metadatos e imágenes obtenidos mediante TMDB están sujetos a sus propias condiciones de uso y atribución.
2. Las fuentes externas operan bajo sus condiciones de acceso, licencias y políticas.
3. El responsable del despliegue debe verificar que las integraciones utilizadas estén autorizadas y cumplan con la legislación aplicable.
4. TatoCine no está afiliado oficialmente a TMDB ni a los proveedores externos, salvo que exista un acuerdo expreso que indique lo contrario.
5. Los reproductores de terceros pueden mostrar publicidad, recopilar datos o aplicar políticas propias que no controla la aplicación.
6. Los avisos legales de este proyecto no sustituyen las autorizaciones, licencias ni obligaciones que puedan resultar aplicables.

Documentación de referencia:

- [TMDB API Terms of Use](https://www.themoviedb.org/api-terms-of-use)
- [TMDB API Documentation](https://developer.themoviedb.org/docs)

## Licencia

Este proyecto se distribuye bajo la licencia MIT siempre que el repositorio incluya el archivo `LICENSE` correspondiente y que su titular haya autorizado esa distribución.

La licencia MIT se aplica al código cubierto por ella. No concede automáticamente derechos sobre marcas, imágenes, metadatos, vídeos, tipografías u otros materiales de terceros, que continúan sujetos a sus respectivas licencias y condiciones.

Consulta el archivo `LICENSE` para conocer los términos completos.

## Estado del proyecto

TatoCine es un proyecto independiente sujeto a mejoras y modificaciones. Su funcionamiento depende de la configuración de TMDB, de la conectividad, de las credenciales y de la disponibilidad y compatibilidad de los servicios externos.

---

**TatoCine**  
Proyecto independiente de desarrollo web.
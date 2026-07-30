---
name: adaptive-streaming-player
description: Reproduce streaming adaptativo HLS en cualquier navegador usando hls.js con fallback al soporte nativo de Safari, con controles accesibles y manejo de errores recuperables. Usar cuando hay que reproducir video de más de unos pocos minutos o con calidad variable según la conexión.
---

# Adaptive Streaming Player

## Contexto

Servir un archivo MP4 con `<video src="...">` funciona bien para clips
cortos y falla de forma predecible para todo lo demás: el navegador
descarga un archivo de calidad fija, así que un usuario con conexión lenta
espera mucho antes de ver algo y después sufre buffering, mientras que uno
con fibra recibe la misma calidad mediocre. Además no hay forma de saltar a
un punto arbitrario sin descargar todo lo anterior.

El streaming adaptativo resuelve esto partiendo el video en segmentos de
unos pocos segundos, codificados en varias calidades. El reproductor mide el
ancho de banda real y elige, segmento a segmento, qué calidad pedir — así el
video arranca casi instantáneo en baja calidad y sube cuando la conexión lo
permite.

HLS es el formato dominante para esto. El detalle que complica la
implementación: **Safari lo soporta de forma nativa y los demás navegadores
no**. La solución es `hls.js`, que implementa HLS en JavaScript usando Media
Source Extensions, con una particularidad importante — en Safari **no** hay
que usarlo, porque el soporte nativo es mejor (menor consumo, aceleración
por hardware, y es el único camino en iOS).

## Cuándo usarlo

- El video dura más de unos pocos minutos (cursos, webinars, contenido largo).
- La audiencia tiene conexiones variables y no se puede asumir buen ancho de banda.
- Hace falta que el usuario salte a cualquier punto sin descargar todo.
- Se transmite en vivo o casi en vivo.

## Cuándo NO usarlo

- **Para clips cortos** (menos de ~30 segundos, un video de fondo, un GIF animado reemplazado por video): la complejidad de HLS no se justifica; un MP4 o WebM directo es más simple y arranca antes.
- **Si no hay pipeline de transcodificación**: HLS requiere generar los segmentos y el manifiesto. Sin eso —o sin un servicio que lo haga— este skill no aplica todavía.
- **Si el proyecto ya usa video.js o Plyr**: ambos integran hls.js por debajo y resuelven además controles y accesibilidad. Escribir esto a mano solo tiene sentido si se necesita control total sobre la UI.

## Pasos / Código

**1. La detección correcta: nativo primero, hls.js después**

```js
import Hls from 'hls.js';

function attachHls(video, src) {
  // Safari (desktop e iOS) reproduce HLS nativamente. Usar hls.js ahí
  // sería peor: más CPU, sin aceleración por hardware, y en iOS
  // directamente no funciona porque MSE no está disponible en el
  // reproductor inline.
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
    return { destroy() { video.removeAttribute('src'); video.load(); } };
  }

  if (!Hls.isSupported()) {
    throw new Error('HLS no soportado en este navegador');
  }

  const hls = new Hls({
    // Empezar en una calidad baja hace que el video arranque antes;
    // el algoritmo adaptativo sube en los segundos siguientes.
    startLevel: -1,           // -1 = que lo decida el estimador de ancho de banda
    maxBufferLength: 30,      // segundos de buffer hacia adelante
    enableWorker: true,       // el demuxing va a un Web Worker, no al hilo principal
  });

  hls.loadSource(src);
  hls.attachMedia(video);
  return hls;
}
```

**2. Manejo de errores: distinguir recuperable de fatal**

Esto es lo que separa un reproductor que se recupera solo de uno que muestra
una pantalla negra ante el primer hipo de red:

```js
hls.on(Hls.Events.ERROR, (event, data) => {
  if (!data.fatal) return;   // los no fatales los maneja hls.js solo

  switch (data.type) {
    case Hls.ErrorTypes.NETWORK_ERROR:
      // Un segmento no cargó: reintentar la carga en vez de morir
      console.warn('Error de red, reintentando', data.details);
      hls.startLoad();
      break;

    case Hls.ErrorTypes.MEDIA_ERROR:
      // Buffer corrupto o desincronizado: hls.js sabe recuperarse
      console.warn('Error de media, recuperando', data.details);
      hls.recoverMediaError();
      break;

    default:
      // Irrecuperable: destruir y avisar al usuario
      hls.destroy();
      showPlayerError('No se pudo reproducir el video.');
  }
});
```

**3. Markup accesible**

```html
<video
  id="player"
  controls
  playsinline
  preload="metadata"
  poster="/thumbs/lesson-01.jpg"
  aria-label="Lección 1: introducción"
>
  <!-- Los subtítulos son parte del reproductor, no un extra -->
  <track kind="captions" src="/subs/lesson-01.es.vtt" srclang="es" label="Español" default />
  <track kind="captions" src="/subs/lesson-01.en.vtt" srclang="en" label="English" />
</video>
```

`playsinline` es obligatorio para iOS: sin él, el video se abre en el
reproductor de pantalla completa del sistema, rompiendo cualquier UI
propia. `preload="metadata"` descarga solo la duración y dimensiones, no el
contenido — importante si hay varios videos en una página.

**4. Selector de calidad manual**

El modo automático cubre casi todos los casos, pero conviene permitir forzar:

```js
hls.on(Hls.Events.MANIFEST_PARSED, () => {
  const options = hls.levels.map((level, index) => ({
    index,
    label: `${level.height}p`,
    bitrate: level.bitrate,
  }));
  renderQualityMenu([{ index: -1, label: 'Auto' }, ...options]);
});

function setQuality(index) {
  hls.currentLevel = index;   // -1 vuelve al modo adaptativo
}
```

**5. Limpiar al desmontar**

```js
// En React
useEffect(() => {
  const player = attachHls(videoRef.current, src);
  return () => player.destroy();
}, [src]);
```

Sin el `destroy()`, cada navegación deja una instancia descargando
segmentos en segundo plano: consumo de datos y de memoria que crece hasta
que la pestaña se traba.

## Edge cases / errores comunes

- **Usar hls.js en Safari/iOS**: es el error más común. En iOS, MSE no está disponible para reproducción inline, así que hls.js simplemente no funciona. El chequeo de `canPlayType` va **primero**, no como fallback.
- **Olvidar `playsinline`**: en iPhone el video salta a pantalla completa nativa y se pierde el control de la interfaz.
- **No destruir la instancia**: hls.js sigue descargando aunque el elemento `<video>` ya no esté en el DOM.
- **Autoplay con sonido**: los navegadores lo bloquean. Si hace falta autoplay, tiene que ser con `muted` y ofreciendo un control claro para activar el audio.
- **CORS mal configurado**: el manifiesto `.m3u8` y **todos** los segmentos `.ts`/`.m4s` necesitan headers CORS. Un manifiesto que carga y segmentos que fallan casi siempre es esto.
- **Confiar en el `startLevel` más alto**: arrancar en 1080p hace que el primer segmento tarde y el usuario vea la ruleta. Es mejor arrancar bajo y subir.
- **Subtítulos como archivo aparte descargable**: los `<track>` son parte del reproductor y se pueden activar sin salir del video; un link a un `.srt` no cumple la misma función de accesibilidad.

## Compatibilidad

`hls.js` funciona en todos los navegadores con Media Source Extensions:
Chrome, Firefox, Edge y Safari de escritorio. En **iOS** hay que usar el
soporte nativo obligatoriamente. Para DASH (el estándar abierto equivalente
a HLS) el análogo es dash.js o Shaka Player. Si hace falta DRM
(Widevine/PlayReady/FairPlay), Shaka Player lo trae integrado y hls.js no.

## Fuentes

- **hls.js** (16.8k ⭐): el motor de este skill; su implementación de HLS sobre MSE es lo que permite que el formato funcione fuera del ecosistema Apple. No es un reproductor con UI — esa separación entre motor y controles es la decisión de diseño clave de la categoría.
- **video.js** (39.8k ⭐): el player completo de referencia, con la arquitectura de plugins más madura (analytics, ads, DRM). Usa hls.js por debajo, así que resuelve lo mismo que este skill más los controles y la accesibilidad ya hechos.
- **Plyr** (29.9k ⭐): la capa de UI accesible y personalizable por CSS; se combina con hls.js por debajo. Es la opción cuando el motor está resuelto pero se quiere control fino del aspecto de los controles.
- **Shaka Player** (8.2k ⭐): cubre HLS **y** DASH con DRM integrado. Es la elección obligada cuando hay contenido protegido, terreno donde hls.js no llega.
- **SRS** (29.1k ⭐) y **mediamtx** (19.7k ⭐): el lado servidor — generan los segmentos y manifiestos que este reproductor consume. Sin ese pipeline, no hay HLS que reproducir.

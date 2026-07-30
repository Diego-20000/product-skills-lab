---
title: Video diferido con poster e IntersectionObserver
platform: video
pillar: playback
tags: [video, lazy-loading, performance, intersection-observer, autoplay]
summary: Carga el video solo cuando entra en el viewport, muestra un poster liviano mientras tanto y pausa automáticamente al salir de pantalla.
when_not_to_use: No aplicar al video principal del hero — ahí conviene precargar para que empiece rápido, con preload="metadata" y fetchpriority alto.
---

# Video diferido con poster e IntersectionObserver

## Contexto

`<video>` no tiene un equivalente real a `loading="lazy"` de las imágenes.
Con `preload="auto"` (o incluso el default en algunos navegadores), el
navegador empieza a descargar video que quizás nunca se reproduzca: en una
página con seis videos, eso son decenas de megabytes de datos gastados por
alguien que ve solo el primero. En conexiones móviles medidas, es un costo
directo para el usuario.

El otro lado del problema es el opuesto: un video de fondo que **sigue
reproduciéndose** después de salir del viewport consume CPU y batería sin
que nadie lo vea.

Este snippet resuelve ambos con el mismo mecanismo: `IntersectionObserver`
para saber cuándo el elemento está en pantalla, cargando la fuente recién
ahí y pausando al salir. El poster —una imagen liviana— ocupa el lugar
mientras tanto, así que no hay hueco ni salto de layout.

## Código completo

```js
/**
 * Carga y controla videos de forma diferida.
 * Los <video> deben declarar sus fuentes en data-src, no en src.
 */
export function initLazyVideos(root = document) {
  const videos = root.querySelectorAll('video[data-lazy]');
  if (videos.length === 0) return () => {};

  // Un solo observer para todos: más barato que uno por elemento
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target;

        if (entry.isIntersecting) {
          loadSources(video);

          // Autoplay solo si el video lo pide Y está silenciado:
          // los navegadores bloquean autoplay con audio.
          if (video.hasAttribute('data-autoplay') && video.muted) {
            video.play().catch(() => {
              /* el navegador lo rechazó: no es un error de la app */
            });
          }
        } else if (!video.paused) {
          // Fuera de pantalla: pausar para no gastar CPU ni batería
          video.pause();
        }
      }
    },
    {
      // rootMargin adelanta la carga: el video ya está listo cuando
      // el usuario llega, sin haberlo descargado desde el principio.
      rootMargin: '200px 0px',
      threshold: 0.01,
    }
  );

  videos.forEach((video) => observer.observe(video));
  return () => observer.disconnect();
}

/** Mueve data-src a src una sola vez y dispara la carga. */
function loadSources(video) {
  if (video.dataset.loaded === 'true') return;

  const sources = video.querySelectorAll('source[data-src]');
  if (sources.length > 0) {
    sources.forEach((source) => {
      source.src = source.dataset.src;
      source.removeAttribute('data-src');
    });
  } else if (video.dataset.src) {
    video.src = video.dataset.src;
  }

  video.load();                   // necesario tras cambiar las fuentes
  video.dataset.loaded = 'true';
}
```

**Markup**

```html
<video
  data-lazy
  data-autoplay
  poster="/posters/demo.jpg"
  muted
  loop
  playsinline
  preload="none"
  width="1280"
  height="720"
  aria-label="Demostración del producto en funcionamiento"
>
  <!-- WebM primero: pesa bastante menos que el MP4 equivalente -->
  <source data-src="/video/demo.webm" type="video/webm" />
  <source data-src="/video/demo.mp4" type="video/mp4" />
</video>
```

- **`preload="none"`**: sin esto el navegador puede empezar a descargar antes de que el observer actúe.
- **`playsinline`**: obligatorio en iOS, si no el video salta a pantalla completa.
- **`muted`**: requisito para que el autoplay no sea bloqueado.
- **`width`/`height`**: reservan el espacio y evitan el salto de layout.

**Respetar la preferencia de movimiento reducido**

Un video de fondo en loop es exactamente el tipo de movimiento que molesta a
usuarios sensibles:

```js
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduceMotion) {
  // No autoplay: se deja el poster y los controles para quien quiera verlo
  document.querySelectorAll('video[data-autoplay]').forEach((v) => {
    v.removeAttribute('data-autoplay');
    v.setAttribute('controls', '');
  });
}
```

**Hook de React**

```jsx
import { useEffect, useRef } from 'react';

export function LazyVideo({ src, webmSrc, poster, autoPlay = false, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (video.dataset.loaded !== 'true') {
            video.querySelectorAll('source[data-src]').forEach((s) => {
              s.src = s.dataset.src;
            });
            video.load();
            video.dataset.loaded = 'true';
          }
          if (autoPlay && video.muted) video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [autoPlay]);

  return (
    <video ref={ref} poster={poster} muted={autoPlay} loop={autoPlay} playsInline preload="none" {...props}>
      {webmSrc && <source data-src={webmSrc} type="video/webm" />}
      <source data-src={src} type="video/mp4" />
    </video>
  );
}
```

## Uso

```js
// Al cargar la página
const cleanup = initLazyVideos();

// En una SPA, al desmontar la vista
cleanup();
```

```jsx
<LazyVideo
  src="/video/demo.mp4"
  webmSrc="/video/demo.webm"
  poster="/posters/demo.jpg"
  autoPlay
  aria-label="Demostración del producto"
/>
```

## Limitaciones conocidas

- **No sirve para el video del hero.** Ahí el objetivo es lo contrario: que empiece cuanto antes. Conviene `preload="metadata"` y, si es la imagen que define el LCP, un poster con `fetchpriority="high"`.
- **`play()` puede ser rechazado** por política de autoplay incluso estando silenciado (algunos navegadores lo bloquean en conexiones medidas o si el usuario lo configuró). Por eso el `.catch()` vacío: no es un error que haya que reportar.
- **Pausar al salir del viewport puede no ser deseado**: si el usuario está viendo un video con audio y hace scroll para leer otra cosa, pausarlo es molesto. Este comportamiento tiene sentido para videos decorativos en loop, no para contenido que el usuario eligió reproducir.
- **El poster también pesa**: si es un JPEG de 500 KB, se cambió el problema de lugar. Debe estar comprimido y, idealmente, en AVIF/WebP con fallback.
- **Para streaming adaptativo esto no alcanza**: si el video es largo, el problema no es cuándo empieza a cargar sino que se descarga completo en calidad fija. Ver el skill [`adaptive-streaming-player`](../../skills/adaptive-streaming-player/SKILL.md).
- **Sin `IntersectionObserver`** (navegadores muy viejos) el video nunca carga. Un fallback simple es cargar todo si el API no existe.

## Fuentes

- **video.js** (39.8k ⭐): su ecosistema de plugins incluye lazy loading, pero cargar un player completo para un video decorativo de fondo es desproporcionado — este snippet es el escalón anterior.
- **Plyr** (29.9k ⭐): aporta controles accesibles y personalizables; se combina bien con esta técnica cuando el video sí necesita interfaz.
- **quicklink** (11.3k ⭐, GoogleChromeLabs): aplica el mismo principio a la navegación —cargar en idle lo que está por verse— y su criterio de respetar la conexión del usuario es directamente aplicable a decidir si precargar video.
- **hls.js** (16.8k ⭐): la alternativa cuando el video deja de ser un clip corto; resuelve el problema de fondo (calidad adaptativa) en vez de solo diferir la descarga.

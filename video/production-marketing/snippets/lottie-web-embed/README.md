---
title: Animación Lottie en web con carga diferida
platform: video
pillar: production-marketing
tags: [lottie, animation, after-effects, performance, motion]
summary: Incrusta una animación exportada de After Effects como JSON, cargando el player solo cuando la animación entra en pantalla y respetando la preferencia de movimiento reducido.
when_not_to_use: Para una animación simple de UI (un fade, un desplazamiento), CSS o Web Animations API pesan mucho menos que cargar un runtime de Lottie.
---

# Animación Lottie en web con carga diferida

## Contexto

Cuando una animación de marca la diseña alguien en After Effects, el flujo
tradicional es exportarla como GIF o video y que un desarrollador la
incruste. El GIF pesa varios megabytes, se ve borroso al escalar y tiene
bordes duros sin transparencia real; el video no permite transparencia en
todos los navegadores y no se puede controlar por código.

Lottie invierte el problema: exporta la animación como **JSON vectorial**
(vía el plugin Bodymovin) y un runtime la reproduce dibujándola en el
navegador. La misma animación que pesaba 8 MB en GIF pasa a ~40 KB, escala
sin pérdida a cualquier resolución, y se puede controlar por código —pausar,
saltar a un frame, reproducir un segmento al hacer hover.

El costo a manejar es el runtime: la librería pesa entre 100 y 250 KB según
la variante. Por eso este snippet la carga de forma diferida, solo cuando
una animación va a entrar en pantalla, y no en el bundle inicial.

## Código completo

```js
// lib/lottie.js

let playerPromise = null;

/** Carga el runtime una sola vez, compartido entre todas las animaciones. */
function loadPlayer() {
  if (!playerPromise) {
    // La variante "light" alcanza para la mayoría: no incluye
    // expresiones ni efectos que casi ninguna animación usa.
    playerPromise = import('lottie-web/build/player/lottie_light.min.js')
      .then((mod) => mod.default ?? mod);
  }
  return playerPromise;
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Inicializa todas las animaciones marcadas con data-lottie.
 * @returns función de limpieza
 */
export function initLotties(root = document) {
  const containers = root.querySelectorAll('[data-lottie]');
  if (containers.length === 0) return () => {};

  const instances = new Map();

  const observer = new IntersectionObserver(
    async (entries) => {
      for (const entry of entries) {
        const el = entry.target;

        if (!entry.isIntersecting) {
          instances.get(el)?.pause();
          continue;
        }

        let animation = instances.get(el);

        if (!animation) {
          const lottie = await loadPlayer();
          const reduced = prefersReducedMotion();

          animation = lottie.loadAnimation({
            container: el,
            renderer: 'svg',              // 'canvas' rinde mejor con muchas formas
            loop: el.dataset.loop !== 'false' && !reduced,
            autoplay: false,              // se controla desde acá
            path: el.dataset.lottie,
            rendererSettings: {
              // Evita que el SVG intercepte clicks del contenido de abajo
              preserveAspectRatio: 'xMidYMid slice',
              progressiveLoad: true,
            },
          });

          instances.set(el, animation);

          if (reduced) {
            // Movimiento reducido: se muestra un frame representativo
            // en vez de reproducir. La animación sigue comunicando,
            // pero no se mueve.
            animation.addEventListener('DOMLoaded', () => {
              animation.goToAndStop(animation.totalFrames * 0.5, true);
            });
            continue;
          }
        }

        if (!prefersReducedMotion()) animation.play();
      }
    },
    { rootMargin: '150px 0px', threshold: 0.01 }
  );

  containers.forEach((el) => observer.observe(el));

  return () => {
    observer.disconnect();
    instances.forEach((a) => a.destroy());   // libera el DOM y los timers
    instances.clear();
  };
}
```

**Markup**

```html
<div
  data-lottie="/animations/onboarding-success.json"
  data-loop="false"
  style="width: 240px; aspect-ratio: 1;"
  role="img"
  aria-label="Animación de confirmación de registro completado"
></div>
```

`role="img"` con `aria-label` importa: sin eso, el SVG generado por Lottie
aparece en el árbol de accesibilidad como un montón de formas sin sentido.
Si la animación es puramente decorativa, va `aria-hidden="true"`.

**Componente React**

```jsx
import { useEffect, useRef } from 'react';

export function Lottie({ src, loop = true, className, label }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let animation;
    let cancelled = false;

    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) {
        animation?.pause();
        return;
      }

      if (!animation) {
        const lottie = (await import('lottie-web/build/player/lottie_light.min.js'))
          .default;
        if (cancelled) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        animation = lottie.loadAnimation({
          container: el,
          renderer: 'svg',
          loop: loop && !reduced,
          autoplay: !reduced,
          path: src,
        });
      } else {
        animation.play();
      }
    }, { rootMargin: '150px 0px' });

    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      animation?.destroy();
    };
  }, [src, loop]);

  return (
    <div
      ref={ref}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
```

## Uso

```js
const cleanup = initLotties();
// En una SPA, al desmontar la vista: cleanup();
```

```jsx
<Lottie
  src="/animations/empty-state.json"
  loop={false}
  className="w-60 aspect-square"
  label="Ilustración de bandeja vacía"
/>
```

**Reproducir un segmento al hacer hover** (patrón habitual en iconos animados):

```js
const animation = lottie.loadAnimation({ /* ... */ autoplay: false });
el.addEventListener('mouseenter', () => animation.playSegments([0, 30], true));
el.addEventListener('mouseleave', () => animation.playSegments([30, 60], true));
```

## Limitaciones conocidas

- **El runtime pesa**: `lottie_light` ronda los 100 KB minificado y la versión completa más del doble. Para una animación de UI simple, CSS pesa cero. Lottie se justifica cuando la animación es compleja y la diseñó alguien en After Effects.
- **No todas las features de After Effects se exportan.** Expresiones, ciertos efectos, máscaras complejas y capas de ajuste pueden no renderizar igual o directamente romperse. Conviene que quien diseña conozca las limitaciones antes de animar, no después.
- **El renderer SVG se degrada con muchas formas**: cientos de paths animados hacen trabajar al layout del navegador. Para animaciones densas, `renderer: 'canvas'` rinde mucho mejor, a costa de perder nitidez al escalar.
- **`destroy()` es obligatorio en SPAs**: sin él, cada navegación deja timers y nodos SVG vivos. Es una fuga de memoria que se acumula silenciosamente.
- **El JSON puede ser grande**: una animación con imágenes rasterizadas embebidas en base64 pesa megabytes. Si el JSON supera unos cientos de KB, casi siempre es esto y conviene revisar el export.
- **Accesibilidad**: el SVG generado no tiene semántica. Sin `role`/`aria-label` o `aria-hidden`, ensucia la navegación por lector de pantalla.

## Fuentes

- **lottie-android** (35.7k ⭐) y **lottie-ios** (26.8k ⭐): las contrapartes nativas del mismo formato JSON. Que la misma animación se reproduzca en web, iOS y Android sin reimplementarse es el argumento central de Lottie y la razón por la que vive en `production-marketing` y no solo en `animation`.
- **Remotion** (54.9k ⭐): el enfoque opuesto para el mismo objetivo de "animación de marca" — generar video real desde componentes React. Lottie sirve para animación vectorial ligera dentro del producto; Remotion, para piezas de video que salen a canales externos.
- **anime.js** (71.6k ⭐) y **GSAP** (27.2k ⭐): las alternativas cuando la animación se puede definir en código en vez de diseñarse en After Effects. Si quien la diseña trabaja en código, Lottie agrega un paso innecesario.
- **ScrollReveal** (22.5k ⭐): el patrón de `IntersectionObserver` de este snippet es el mismo que usa para disparar animaciones al entrar en viewport, aplicado acá a diferir la carga del runtime.

---
title: Respetar prefers-reduced-motion
platform: web
pillar: animation
tags: [css, accessibility, animation, motion]
summary: Desactiva o reduce animaciones para usuarios que configuraron "reducir movimiento" en su sistema operativo, con una regla CSS global y un helper JS para animaciones imperativas.
when_not_to_use: No aplicar la regla global a animaciones que comunican información esencial (una barra de progreso, un spinner de carga); esas deben reducirse, no eliminarse.
---

# Respetar prefers-reduced-motion

## Contexto

Para algunas personas, el movimiento en pantalla no es un detalle estético:
las animaciones con parallax, zoom o desplazamientos amplios pueden provocar
mareo, náusea o desorientación real —es el mismo mecanismo del mareo por
movimiento—. Los sistemas operativos exponen esa preferencia (macOS:
Accesibilidad → Pantalla → Reducir movimiento; Windows: Configuración →
Accesibilidad → Efectos visuales), y el navegador la expone al CSS mediante
`prefers-reduced-motion`.

El error habitual es tratarlo como un caso raro que se atiende al final. En
la práctica, cubrirlo son tres líneas de CSS que se ponen una vez en el
reset global. Lo importante es el criterio: la preferencia no es "sin
animaciones" sino "sin movimiento que desoriente" — un fade sigue siendo
aceptable, un elemento que cruza la pantalla no.

## Código completo

**CSS global** — va en el reset, una sola vez:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    /* No se usa 'none': eliminar la animación por completo puede romper
       código que espera el evento animationend o transitionend.
       0.01ms la hace instantánea pero el evento igual dispara. */
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Variante con degradación en vez de eliminación** — para animaciones que sí
aportan (feedback de estado), reemplazar el movimiento por opacidad:

```css
.card {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.card:hover {
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .card:hover {
    transform: none;      /* se quita el desplazamiento */
    opacity: 0.85;        /* se conserva el feedback */
  }
}
```

**Helper JS** — para animaciones imperativas (Web Animations API, GSAP,
canvas), donde el CSS no llega:

```js
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

/** true si el usuario pidió reducir movimiento */
export const prefersReducedMotion = () => motionQuery.matches;

/** Devuelve la duración a usar: 0 si hay que reducir */
export const motionDuration = (ms) => (motionQuery.matches ? 0 : ms);

/** Suscribirse a cambios en vivo (el usuario puede cambiarlo sin recargar) */
export function onMotionPreferenceChange(callback) {
  const handler = (e) => callback(e.matches);
  motionQuery.addEventListener('change', handler);
  return () => motionQuery.removeEventListener('change', handler);
}
```

**Hook de React**:

```jsx
import { useSyncExternalStore } from 'react';

const query = window.matchMedia('(prefers-reduced-motion: reduce)');

const subscribe = (callback) => {
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => query.matches,
    () => false          // valor durante SSR: asumir que no hay preferencia
  );
}
```

## Uso

```js
// Animación imperativa con Web Animations API
element.animate(
  [{ transform: 'translateY(20px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
  { duration: motionDuration(400), easing: 'ease-out' }
);
```

```jsx
// En React
function Card() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      animate={{ y: 0, opacity: 1 }}
      initial={reduced ? { opacity: 0 } : { y: 20, opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.4 }}
    />
  );
}
```

## Limitaciones conocidas

- **La regla global es un piso, no un techo.** Anula animaciones decorativas de forma indiscriminada, incluidas algunas que convenía degradar en vez de eliminar. Para componentes donde el movimiento comunica algo, hay que escribir la variante específica.
- **`0.01ms` en vez de `none`** es deliberado: con `animation: none` los eventos `animationend`/`transitionend` nunca disparan, y cualquier lógica que dependa de ellos (mostrar el siguiente paso, limpiar una clase) queda colgada. Con una duración mínima, la animación es imperceptible pero el evento llega.
- **No cubre movimiento fuera de CSS/WAAPI**: video con autoplay, GIFs animados y animaciones de canvas hay que pausarlos a mano leyendo la preferencia con el helper JS.
- **`!important` es necesario acá** para ganarle a estilos inline y a librerías que setean duraciones por JS. Es de los pocos casos donde se justifica.
- **En SSR no hay `window`**: el hook devuelve `false` en el servidor, así que el primer render asume movimiento normal y se corrige en la hidratación. Para evitar el salto visual, la regla CSS global ya cubre el caso.

## Fuentes

- **GSAP** (27.2k ⭐): expone `gsap.matchMedia()` con soporte de `prefers-reduced-motion` incorporado, lo que muestra el patrón de "definir dos sets de animaciones y dejar que la librería elija" en vez de condicionales sueltos.
- **Motion** (33k ⭐): su hook `useReducedMotion` es el modelo del que se deriva la versión de este snippet; la diferencia es que acá se implementa sin dependencia.
- **ScrollReveal** (22.5k ⭐) y **lax.js** (10.5k ⭐): librerías de animación por scroll, que es justamente la categoría que más molestias causa a usuarios sensibles al movimiento — cualquier integración de este tipo debería consultar la preferencia antes de inicializarse.

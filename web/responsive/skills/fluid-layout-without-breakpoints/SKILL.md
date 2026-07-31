---
name: fluid-layout-without-breakpoints
description: Construye layouts y tipografía que se adaptan de forma continua usando clamp(), container queries y grid auto-fit, en vez de saltos discretos por media query. Usar cuando piden "que sea responsive" y el diseño no exige layouts radicalmente distintos por dispositivo.
tags: [css, responsive, container-queries, clamp, grid]
---

# Fluid Layout Without Breakpoints

## Contexto

El modelo mental clásico de responsive design —definir 3 o 4 breakpoints y
reescribir el layout en cada uno— nació cuando existían básicamente dos
tamaños de pantalla. Hoy produce dos problemas concretos: entre breakpoint y
breakpoint el diseño no se adapta (queda un texto minúsculo en 1023px que
salta a enorme en 1024px), y cada componente termina acoplado al ancho de la
**ventana**, aunque lo que realmente le importa es el ancho de **su
contenedor** — una tarjeta puesta en un sidebar angosto no debería verse
igual que la misma tarjeta a ancho completo, y la media query no puede
distinguir esos dos casos.

Este skill usa tres mecanismos que resuelven esto sin breakpoints:
`clamp()` para valores que escalan de forma continua, `@container` para que
un componente responda a su contenedor real, y `grid` con `auto-fit` +
`minmax()` para que la cantidad de columnas la calcule el navegador en vez
de declararla a mano por rango.

## Cuándo usarlo

- El diseño es "el mismo layout, más chico o más grande" — no cambia la estructura, solo la escala y la cantidad de columnas.
- Se están escribiendo componentes reutilizables que van a aparecer en contextos de ancho distinto (una card en un grid, en un sidebar y en un modal).
- Ya hay una cascada de media queries difícil de mantener, donde tocar un valor obliga a revisar los otros tres rangos.

## Cuándo NO usarlo

- **Si el diseño mobile y el desktop son estructuralmente distintos** (ej. en mobile hay un bottom nav y en desktop un sidebar con secciones que no existen en mobile): eso no es escalar, es otro layout — ahí una media query es la herramienta correcta y más honesta.
- **Si hay que soportar navegadores sin `@container`**: las container queries son recientes; `clamp()` y `auto-fit` tienen soporte mucho más viejo. Se pueden adoptar por separado (ver Compatibilidad).
- **Si el proyecto usa Tailwind y el equipo ya razona en `sm:`/`md:`/`lg:`**: introducir un segundo modelo mental en paralelo genera más confusión que beneficio. Tailwind soporta ambos, pero conviene elegir uno por proyecto.

## Pasos / Código

**1. Tipografía y espaciado fluidos con `clamp()`**

`clamp(mínimo, preferido, máximo)` — el valor preferido usa `vw` para
escalar con la ventana, y los otros dos evitan que se vuelva ilegible o
gigante:

```css
:root {
  /* 1rem a 400px de ancho, ~1.5rem a 1200px, nunca fuera de ese rango */
  --step-0: clamp(1rem, 0.85rem + 0.6vw, 1.5rem);
  --step-1: clamp(1.5rem, 1.2rem + 1.2vw, 2.5rem);
  --space-m: clamp(1rem, 0.8rem + 1vw, 2rem);
}

body { font-size: var(--step-0); }
h2   { font-size: var(--step-1); }
.section { padding-block: var(--space-m); }
```

La parte `0.85rem + 0.6vw` importa: usar **solo** `vw` (sin sumar un `rem`)
rompe el zoom del navegador, porque el texto deja de responder al tamaño de
fuente que el usuario configuró. Siempre combinar una base en `rem` con el
componente en `vw`.

**2. Grid que decide solo cuántas columnas entran**

```css
.card-grid {
  display: grid;
  /* mete tantas columnas de mínimo 18rem como quepan, y las estira */
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: var(--space-m);
}
```

Sin una sola media query, esto pasa de 1 columna en un teléfono a 4 en un
monitor ancho. `auto-fit` colapsa las pistas vacías (las columnas sobrantes
se reparten el espacio); `auto-fill` las mantiene, dejando huecos — casi
siempre se quiere `auto-fit`.

**3. Componentes que responden a su contenedor, no a la ventana**

```css
/* el contenedor se declara como tal */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* la card cambia de layout según el ancho del wrapper, no de la pantalla */
.card {
  display: grid;
  gap: 1rem;
}

@container card (min-width: 30rem) {
  .card {
    grid-template-columns: 12rem 1fr; /* imagen al lado del texto */
  }
}
```

Ahora la misma `.card` se ve apilada en un sidebar angosto y horizontal a
ancho completo, sin saber nada del tamaño de la ventana.

## Edge cases / errores comunes

- **`minmax(18rem, 1fr)` desborda en pantallas muy angostas**: si el mínimo (18rem = 288px) es más ancho que el viewport disponible, el grid genera scroll horizontal. La solución es `minmax(min(18rem, 100%), 1fr)`, que hace que el mínimo nunca supere el ancho disponible.
- **`container-type: inline-size` crea un contexto de contención**: el elemento deja de dimensionarse según el contenido en el eje inline. Si un contenedor "se colapsa" al aplicarlo, casi siempre es esto — conviene aplicarlo a un wrapper dedicado, no al componente que ya tenía tamaño propio.
- **Olvidar el `max` en `clamp()`**: sin tope, en un monitor ultrawide el texto crece hasta ser incómodo. El máximo no es opcional.
- **Anidar container queries y media queries sobre el mismo valor** vuelve el cálculo imposible de razonar. Elegir cuál manda para cada propiedad.

## Compatibilidad

- `clamp()` y `grid auto-fit/minmax`: soporte universal en navegadores evergreen desde 2020.
- `@container` (container queries): soporte en todos los navegadores evergreen desde 2023. En navegadores viejos la regla `@container` se ignora por completo, así que el estilo base (sin la query) tiene que ser un layout usable por sí solo — el patrón correcto es mobile-first: el estado apilado como base, el horizontal dentro del `@container`.

## Fuentes

- **Tailwind CSS**: representa el enfoque opuesto y dominante — breakpoints explícitos como prefijos de utilidad (`md:flex-row`). Este skill es la alternativa para proyectos donde esa granularidad discreta genera más mantenimiento que valor; Tailwind también soporta `@container` vía el prefijo `@`, así que ambos modelos conviven.
- **Bootstrap**: su grid de 12 columnas con clases por breakpoint (`col-md-6`) es el origen del modelo mental que este skill reemplaza. Útil para entender por qué el enfoque por rangos fue necesario antes de que existieran `clamp()` y las container queries.
- **Bulma / Pico.css**: ambos apuestan a que el CSS haga el trabajo sin JS ni configuración; Pico en particular estiliza HTML semántico sin clases, lo que empuja en la misma dirección de "menos declaraciones explícitas, más comportamiento por defecto".

---
title: Animar con CSS, Web Animations API o una librería
platform: web
pillar: animation
tags: [animation, css, waapi, gsap, decision, performance]
summary: Criterio para elegir la herramienta de animación según el tipo de movimiento, sin sumar una librería a un problema que el navegador ya resuelve.
---

# Animar con CSS, Web Animations API o una librería

## El eje real de la decisión

La pregunta útil no es "¿cuál es mejor?" sino **quién necesita controlar la
animación en el tiempo**. Si el navegador puede reproducirla de principio a
fin sin que nadie intervenga, CSS alcanza y es lo más barato. Si hace falta
arrancarla, pausarla o consultar su progreso desde JavaScript, la Web
Animations API da eso sin dependencias. Si hace falta orquestar varias
animaciones entre sí con precisión, o ligarlas al scroll de forma continua,
recién ahí una librería paga su peso.

Ese orden importa: cada escalón agrega capacidad y costo, y saltar directo al
último es el error más caro y más común.

## Usar CSS cuando

- La animación se dispara por un cambio de estado que ya se puede expresar en CSS: `:hover`, `:focus-visible`, una clase que agrega JavaScript, `@keyframes` en loop.
- No hace falta saber cuándo terminó ni interrumpirla a mitad de camino.
- Es una transición de entrada/salida, un spinner, un cambio de color, un desplazamiento simple.

Es la opción con mejor rendimiento por defecto: animar `transform` y
`opacity` en CSS corre en la capa de composición del navegador, sin
recalcular layout ni repintar, y sin ejecutar JavaScript en cada frame.

**Contraejemplo:** encadenar cinco animaciones CSS con `animation-delay`
calculado a mano es la señal de que se pasó el límite. Los delays se
desincronizan apenas cambia una duración, y no hay forma de saber cuándo
terminó la secuencia completa.

## Usar Web Animations API cuando

- Hace falta control imperativo: `animation.pause()`, `.reverse()`, `.currentTime`, o saber cuándo terminó con `animation.finished`.
- La animación depende de valores calculados en runtime (la posición real de un elemento, un número que llega de la API).
- Se quiere la performance de CSS pero con la lógica en JavaScript.

WAAPI es nativa, no pesa nada, y usa el mismo motor de composición que las
animaciones CSS. Es el escalón intermedio que la mayoría de los proyectos
ignora y que resuelve muchos casos donde se termina instalando una librería.

**Contraejemplo:** si lo único que hace falta es "aparecer al entrar en
pantalla", WAAPI es más código que una clase CSS con `IntersectionObserver`.

## Usar una librería cuando

- Hay que **orquestar** varias animaciones con posiciones temporales relativas entre sí ("esto empieza 0.2s antes de que termine aquello").
- La animación tiene que estar **ligada al progreso del scroll** de forma continua (scrubbing), no solo dispararse una vez. Esto es lo que CSS y WAAPI no resuelven bien, y la razón principal para elegir GSAP con ScrollTrigger.
- Hace falta animación **basada en física** (springs) donde el valor destino puede cambiar a mitad de camino y la animación tiene que reaccionar en vez de saltar.
- El framework tiene su propio modelo y pelear contra él sale más caro: en React, animar entradas y salidas de componentes o transiciones de layout es notablemente más simple con Motion que a mano.

## Qué librería, si se llega hasta acá

| Situación | Elección razonable |
|---|---|
| Timelines complejas, scroll con scrubbing, animación fuera de React | **GSAP** — control temporal más fino; ScrollTrigger es el estándar de facto |
| Proyecto React, animación de componentes, gestos, transiciones de layout | **Motion** — se integra al ciclo de render en vez de pelear con él |
| Interacciones continuas (arrastrar, soltar) donde el destino cambia | **react-spring** — el modelo de resorte es interrumpible por naturaleza |
| La animación la diseñó alguien en After Effects | **Lottie** — no es un motor, es un reproductor; ver `video/production-marketing` |
| Animación 2D con cientos de elementos donde el DOM no da | **PixiJS** — renderer WebGL |
| Escena 3D | **three.js** |

## Lo que casi nunca justifica una librería

- **Un fade o un slide al entrar en viewport.** `IntersectionObserver` + una clase CSS son quince líneas.
- **Un spinner de carga.** `@keyframes` con `rotate`.
- **Una transición de hover.** `transition` en CSS.
- **"Porque el proyecto ya la tiene".** Si ya está en el bundle, usarla no agrega costo — pero conviene saber que se está usando por conveniencia, no por necesidad, para no propagar la dependencia a proyectos nuevos.

## El criterio de performance, que aplica a las tres

Independientemente de la herramienta, hay una regla que domina todo lo
demás: **animar solo `transform` y `opacity`**. Son las dos propiedades que
el navegador puede animar sin recalcular layout ni repintar. Animar `width`,
`height`, `top`, `left` o `margin` fuerza layout en cada frame y produce
jank visible en dispositivos de gama media, sin importar si la animación la
maneja CSS, WAAPI o GSAP.

Una librería no compensa una propiedad mal elegida; una animación CSS sobre
`transform` va a ser más fluida que una animación de GSAP sobre `left`.

## Qué NO responde esta guía

- **No cubre animación de datos** (gráficos, visualizaciones): ese es terreno de D3 o de librerías de charting, con un modelo distinto.
- **No cubre el criterio de diseño** de cuánto movimiento es apropiado. Una animación técnicamente impecable puede ser igual una mala decisión de producto.
- **No cubre animación en mobile nativo**: en iOS y Android las herramientas son otras.

En todos los casos, la preferencia de movimiento reducido del usuario tiene
prioridad sobre esta decisión — ver el snippet
[`respect-reduced-motion`](../../snippets/respect-reduced-motion/README.md).

## Fuentes

- **GSAP** (27.2k ⭐): su ventaja concreta no es "animar mejor" sino el control temporal de timelines y el scrubbing de ScrollTrigger, que es lo que ni CSS ni WAAPI resuelven. Ese es el criterio para justificarla, no la comodidad de su API.
- **anime.js** (71.6k ⭐): más liviano y más simple, sin el ecosistema de plugins; representa el punto medio entre WAAPI cruda y GSAP completo.
- **Motion** (33k ⭐): su valor está en integrarse al modelo de React (animaciones de layout con FLIP, entradas y salidas de componentes), algo que hacer a mano es genuinamente difícil.
- **react-spring** (29k ⭐): el modelo de física en vez de duración+easing; la diferencia se nota en interacciones continuas, no en animaciones de entrada.
- **ScrollReveal** (22.5k ⭐) y **lax.js** (10.5k ⭐): librerías de propósito único para scroll; su existencia muestra que ese caso es lo bastante común como para no necesitar un motor completo.
- **three.js** (114k ⭐) y **PixiJS** (47.9k ⭐): el escalón donde el DOM deja de ser la herramienta y hay que pasar a un renderer propio.

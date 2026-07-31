---
name: css-scroll-reveal
description: Revela elementos con una animación al hacer scroll, usando solo CSS (transiciones) + IntersectionObserver en JS vanilla, sin librerías. Usar cuando piden "animar al scrollear" y no hay ya una librería de animación en el proyecto.
tags: [css, animation, intersection-observer, scroll, no-dependencies]
---

# CSS Scroll Reveal

## Contexto

Animar la aparición de contenido a medida que entra en el viewport es uno
de los patrones más pedidos en sitios de marketing/landing pages, y la
tentación habitual es sumar una librería completa (GSAP + ScrollTrigger,
AOS) para resolver algo que, en su forma más simple, es un cambio de dos
propiedades CSS disparado por un observer nativo del navegador. El costo
de no hacerlo así: cargar y parsear una librería de animación entera (y su
curva de aprendizaje) para un efecto que el navegador ya sabe detectar de
forma performante mediante `IntersectionObserver` — que corre en el hilo
del navegador de forma asíncrona, sin necesidad de escuchar el evento
`scroll` (que dispara decenas de veces por segundo y es notoriamente caro
de manejar a mano sin throttling).

Este skill ocupa el extremo "sin dependencias" del espectro: sirve para
efectos de fade/slide simples, no para timelines complejas.

## Cuándo usarlo

- El proyecto no tiene GSAP, Motion, react-spring ni otra librería de animación ya instalada — sumar una dependencia entera para este efecto no se justifica.
- El efecto buscado es una transición simple (fade, slide, scale) que se dispara **una vez** cuando el elemento entra en pantalla, no algo ligado de forma continua a la posición de scroll.
- El número de elementos observados es moderado (decenas). Cada `IntersectionObserver` activo tiene un costo de memoria pequeño pero no nulo; con miles de elementos conviene un solo observer compartido (como en el código de abajo) en vez de uno por elemento.

## Cuándo NO usarlo

- **Si el proyecto ya tiene GSAP instalado**: usar `ScrollTrigger` en su lugar. Es la misma dependencia que ya paga el bundle, con soporte real para scrubbing (la animación avanza y retrocede con el scroll, no solo se dispara una vez) y para timelines encadenadas entre varios elementos.
- **Si se necesita scrubbing o parallax**: este approach solo sabe decir "ya entró en pantalla, sí o no" — no conoce cuánto porcentaje del elemento es visible en cada frame, que es lo que hace falta para animar en función del progreso de scroll.
- **Si hay que soportar IE11**: `IntersectionObserver` no existe ahí y no hay un polyfill liviano que valga la pena para este caso de uso — en ese escenario, evaluar directamente un listener de `scroll` con throttle, o descartar el efecto.

## Pasos / Código

CSS — el estado inicial y final de la transición:

```css
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

JS — un único observer compartido para todos los elementos, en vez de uno
por elemento (evita crear N observers cuando alcanza con uno):

```js
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // unobserve: el efecto es "una sola vez", así que una vez revelado
        // se deja de escuchar ese elemento — si no se hace esto, el
        // observer sigue evaluando intersecciones para nada en cada scroll.
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.15 } // se considera "visible" con un 15% del elemento en pantalla
);

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
```

Marcado:

```html
<section class="reveal">...</section>
```

## Edge cases / errores comunes

- **Contenido que nunca se revela**: si el elemento `.reveal` está dentro de un contenedor con `overflow: hidden` y el propio contenedor nunca entra en el viewport observado, el `threshold` puede no dispararse nunca — verificar el elemento raíz (`root`) del observer si el contenedor no es la ventana.
- **Flash de contenido invisible en usuarios sin JS**: si JS falla en cargar, el elemento queda con `opacity: 0` para siempre (el CSS no depende del JS para el estado inicial, pero sí para revertirlo). Mitigación: envolver la inicialización en un chequeo de que el script cargó, o aceptar el trade-off si el proyecto ya asume JS obligatorio.
- **Animar `transform`/`opacity` es intencional**: son las únicas dos propiedades que el navegador puede animar en la capa de composición sin recalcular layout ni pintar de nuevo — animar `top`/`left`/`width` en su lugar produce jank notorio en dispositivos de gama media/baja.

## Compatibilidad

`IntersectionObserver` tiene soporte universal en navegadores evergreen
desde 2019 (Chrome, Firefox, Safari, Edge). Sin soporte en Internet
Explorer 11.

## Fuentes

- **GSAP `ScrollTrigger`**: resuelve el mismo problema pero con scrubbing real (progreso continuo, no solo on/off) y orquestación de timelines entre múltiples elementos — este skill deliberadamente no intenta cubrir eso; es el escalón anterior a necesitar GSAP.
- **AOS (Animate On Scroll)**: una librería dedicada que envuelve exactamente este mismo patrón (clase + `IntersectionObserver`) en una API declarativa vía atributos `data-aos`. Este skill es, en esencia, la versión "sin instalar nada" de lo que AOS resuelve como dependencia.

---
name: css-scroll-reveal
description: Revela elementos con una animación al hacer scroll, usando solo CSS (transiciones) + IntersectionObserver en JS vanilla, sin librerías. Usar cuando piden "animar al scrollear" y no hay ya una librería de animación en el proyecto.
---

# CSS Scroll Reveal

## Contexto
Anima la aparición de elementos cuando entran en el viewport, sin sumar dependencias.

## Cuándo usarlo
- El proyecto no tiene GSAP, Framer Motion ni otra librería de animación instalada.
- Se necesita un efecto simple: fade + slide al entrar en pantalla.
- El número de elementos observados es moderado (decenas, no miles).

## Cuándo NO usarlo
- Si el proyecto ya tiene GSAP: usar `ScrollTrigger` en su lugar (más control, misma dependencia ya presente).
- Si se necesitan animaciones de scroll complejas (scrubbing, parallax, timelines encadenadas): este approach no escala bien, conviene una librería dedicada.
- Si hay que dar soporte a navegadores sin `IntersectionObserver` (IE11): no aplica.

## Pasos / Código

CSS:
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

JS:
```js
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.15 }
);

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
```

Marcado:
```html
<section class="reveal">...</section>
```

## Compatibilidad
Todos los navegadores evergreen (`IntersectionObserver` con soporte universal desde 2019). Sin soporte en IE11.

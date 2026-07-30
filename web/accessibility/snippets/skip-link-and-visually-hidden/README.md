---
title: Skip link y utilidad visually-hidden
platform: web
pillar: accessibility
tags: [a11y, css, keyboard, screen-reader, skip-link]
summary: Permite saltar la navegación repetitiva con un link que aparece al tabular, más la utilidad CSS correcta para texto solo audible por lector de pantalla.
when_not_to_use: No usar visually-hidden para ocultar contenido de todos — para eso va display:none o hidden, que sí lo sacan del árbol de accesibilidad.
---

# Skip link y utilidad visually-hidden

## Contexto

Alguien que navega por teclado empieza cada página desde arriba. Si el sitio
tiene un header con veinte links de navegación, llegar al contenido cuesta
veinte pulsaciones de Tab — **en cada página**. El skip link resuelve esto:
es el primer elemento focusable del documento, permanece invisible hasta que
recibe foco, y al activarlo lleva directo al contenido principal.

Es de las mejoras de accesibilidad con mejor relación esfuerzo/impacto que
existen: son unas pocas líneas y elimina una fricción que se repite en cada
navegación.

La utilidad `visually-hidden` (a veces llamada `sr-only`) es su compañera
inevitable, y la fuente de un error muy común: para ocultar visualmente algo
que **sí debe leerse** con lector de pantalla no sirve `display: none` ni
`visibility: hidden`, porque ambos lo sacan también del árbol de
accesibilidad. Hace falta el conjunto específico de propiedades de abajo.

## Código completo

**CSS**

```css
/* Oculta visualmente pero mantiene el elemento accesible.
   Cada propiedad cumple un rol: sin clip-path el texto puede
   seleccionarse, sin white-space:nowrap las palabras se apilan
   y algunos lectores las leen mal. */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* Variante que se revela al recibir foco — la base del skip link */
.visually-hidden-focusable:not(:focus):not(:focus-within) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 999;
  padding: 0.75rem 1.25rem;
  background: var(--color-surface, #fff);
  color: var(--color-text, #111);
  font-weight: 600;
  text-decoration: underline;
  /* Se desplaza fuera de pantalla en vez de ocultarse, para poder
     animar la entrada cuando recibe foco */
  transform: translateY(-150%);
  transition: transform 0.15s ease-out;
}

.skip-link:focus {
  transform: translateY(0);
  outline: 2px solid var(--color-focus, #4f46e5);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .skip-link { transition: none; }
}

/* El destino necesita margen de scroll para no quedar pegado
   al borde superior (o tapado por un header fijo) */
#main-content {
  scroll-margin-top: 1rem;
}
```

**HTML** — el skip link es el primer elemento del `<body>`:

```html
<body>
  <a href="#main-content" class="skip-link">Saltar al contenido principal</a>

  <header>
    <nav aria-label="Principal">
      <!-- muchos links -->
    </nav>
  </header>

  <!-- tabindex="-1" permite que el elemento reciba foco por programa
       (al seguir el link) sin entrar en el orden natural de tabulación -->
  <main id="main-content" tabindex="-1">
    <h1>Título de la página</h1>
  </main>
</body>
```

**Usos de `visually-hidden`**

```html
<!-- Botón de ícono: la etiqueta visible para lector, oculta visualmente -->
<button type="button">
  <svg aria-hidden="true"><!-- ícono --></svg>
  <span class="visually-hidden">Cerrar diálogo</span>
</button>

<!-- Contexto adicional en un link genérico -->
<a href="/articulos/123">
  Leer más
  <span class="visually-hidden">sobre "Cómo elegir un framework"</span>
</a>

<!-- Encabezado que estructura la página sin mostrarse -->
<section>
  <h2 class="visually-hidden">Resultados de búsqueda</h2>
  <ul><!-- ... --></ul>
</section>

<!-- Anuncio dinámico para lector de pantalla -->
<div role="status" aria-live="polite" class="visually-hidden">
  Se encontraron 12 resultados
</div>
```

## Uso

En React, como componente reutilizable:

```jsx
export function VisuallyHidden({ as: Tag = 'span', children, ...props }) {
  return <Tag className="visually-hidden" {...props}>{children}</Tag>;
}

// <VisuallyHidden>Cerrar diálogo</VisuallyHidden>
```

Con Tailwind ya existe como `sr-only` y `not-sr-only`:

```html
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:p-4 focus:bg-white">
  Saltar al contenido principal
</a>
```

## Limitaciones conocidas

- **`display: none` y `visibility: hidden` NO sirven** para este propósito: sacan el elemento del árbol de accesibilidad, así que el lector de pantalla tampoco lo lee. Es el error más frecuente al implementar esto.
- **`text-indent: -9999px` (el método viejo) rompe en RTL**: el texto se va hacia el lado visible en idiomas de derecha a izquierda. El conjunto de propiedades de arriba es la técnica actual.
- **Sin `tabindex="-1"` en el destino**, seguir el skip link mueve el scroll pero no el foco en varios navegadores: el siguiente Tab vuelve al principio del documento y el skip link no sirvió de nada.
- **Un header fijo puede tapar el destino** después del salto. `scroll-margin-top` con la altura del header lo corrige.
- **Abusar de `visually-hidden` satura la navegación**: cada texto oculto es algo más que el lector de pantalla lee. Se usa cuando agrega información que el contexto visual daba y el auditivo no.
- **El skip link debe ser visible al enfocarse, de verdad**: si queda con contraste insuficiente o parcialmente tapado, el usuario que tabula no entiende qué se enfocó.

## Fuentes

- **Headless UI** (28.7k ⭐) y **Radix UI Primitives** (19.1k ⭐): ambos incluyen su propio componente `VisuallyHidden` con esta misma técnica, lo que confirma que no hay atajo — es el conjunto de propiedades necesario, no una preferencia de estilo.
- **React Spectrum / React Aria** (15.7k ⭐): su implementación documenta además el caso de foco (`isFocusable`), que es exactamente la variante que hace posible el skip link.
- **Tailwind CSS** (96.1k ⭐): expone la utilidad como `sr-only`/`not-sr-only`; verla ayuda a entender que la técnica está lo bastante estandarizada como para venir en el framework.
- **axe-core** (7.4k ⭐): detecta la ausencia de un mecanismo de salto y los usos incorrectos de ocultamiento, útil para verificar que la implementación quedó bien.

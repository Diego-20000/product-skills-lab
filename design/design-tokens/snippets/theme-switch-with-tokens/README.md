---
title: Cambio de tema con tokens semánticos
platform: design
pillar: design-tokens
tags: [css-variables, dark-mode, theming, tokens]
summary: Implementa modo claro/oscuro redefiniendo solo la capa semántica de tokens, respetando la preferencia del sistema y permitiendo override manual sin parpadeo al cargar.
when_not_to_use: Si el sitio solo tiene un tema, las variables CSS directas alcanzan — la capa semántica agrega indirección sin beneficio.
---

# Cambio de tema con tokens semánticos

## Contexto

El error estructural al implementar modo oscuro es duplicar la paleta
entera: definir un set completo de colores para claro y otro para oscuro. El
mantenimiento se duplica, y peor, los dos sets derivan con el tiempo —
alguien agrega un color al tema claro y se olvida del oscuro.

La estructura correcta aprovecha la separación en capas de los design
tokens: la **paleta base** (los colores crudos) es la misma en ambos temas;
lo único que cambia es la **capa semántica** que dice qué color de la paleta
cumple cada rol. `--surface` apunta a blanco en claro y a gris muy oscuro en
oscuro, pero ambos colores existen en una sola paleta.

El otro problema clásico es el **parpadeo**: la página carga con el tema
claro por defecto y salta a oscuro cuando el JavaScript lee la preferencia
guardada. Se resuelve con un script bloqueante mínimo en el `<head>`, antes
de que se pinte nada.

## Código completo

**Tokens: paleta única, semántica por tema**

```css
/* tokens.css */
:root {
  /* --- Paleta base: idéntica en todos los temas --- */
  --gray-0:   #ffffff;
  --gray-50:  #f9fafb;
  --gray-100: #f3f4f6;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  --gray-950: #030712;

  --indigo-400: #818cf8;
  --indigo-500: #6366f1;
  --indigo-600: #4f46e5;

  --red-400: #f87171;
  --red-600: #dc2626;

  /* --- Capa semántica: tema claro (default) --- */
  --surface:         var(--gray-0);
  --surface-raised:  var(--gray-50);
  --surface-sunken:  var(--gray-100);
  --text:            var(--gray-900);
  --text-muted:      var(--gray-700);
  --border:          var(--gray-100);
  --accent:          var(--indigo-600);
  --accent-hover:    var(--indigo-500);
  --danger:          var(--red-600);

  color-scheme: light;
}

/* --- Tema oscuro: solo se reasigna la capa semántica --- */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --surface:        var(--gray-950);
    --surface-raised: var(--gray-900);
    --surface-sunken: var(--gray-800);
    --text:           var(--gray-50);
    --text-muted:     var(--gray-100);
    --border:         var(--gray-800);
    /* En oscuro se usa un tono más claro del acento: el 600 sobre
       fondo oscuro no alcanza el contraste mínimo. */
    --accent:         var(--indigo-400);
    --accent-hover:   var(--indigo-500);
    --danger:         var(--red-400);

    color-scheme: dark;
  }
}

/* Override manual, gana sobre la preferencia del sistema */
:root[data-theme='dark'] {
  --surface:        var(--gray-950);
  --surface-raised: var(--gray-900);
  --surface-sunken: var(--gray-800);
  --text:           var(--gray-50);
  --text-muted:     var(--gray-100);
  --border:         var(--gray-800);
  --accent:         var(--indigo-400);
  --accent-hover:   var(--indigo-500);
  --danger:         var(--red-400);

  color-scheme: dark;
}
```

`color-scheme` no es opcional: es lo que hace que los controles nativos
(scrollbars, inputs de fecha, autocompletado) adopten el tema. Sin él, un
`<input type="date">` aparece con fondo blanco brillante en modo oscuro.

**Script anti-parpadeo — va inline en el `<head>`, antes del CSS**

```html
<script>
  // Bloqueante y mínimo: corre antes del primer paint.
  (function () {
    try {
      var stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') {
        document.documentElement.dataset.theme = stored;
      }
      // Si no hay preferencia guardada, no se hace nada:
      // la media query del CSS resuelve según el sistema.
    } catch (e) {
      /* localStorage bloqueado (modo privado): se ignora */
    }
  })();
</script>
```

**Control de cambio de tema**

```js
// theme.js
const STORAGE_KEY = 'theme';

export function getTheme() {
  return document.documentElement.dataset.theme ?? 'system';
}

export function setTheme(theme) {
  if (theme === 'system') {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(STORAGE_KEY);
  } else {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }
}

/** Reaccionar si el usuario cambia el tema del SO mientras la página está abierta */
export function watchSystemTheme(callback) {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e) => {
    if (getTheme() === 'system') callback(e.matches ? 'dark' : 'light');
  };
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}
```

**Generar los temas desde Style Dictionary**

Para que los tokens sean la fuente única también acá:

```js
// style-dictionary.config.js
export default {
  source: ['tokens/base.json', 'tokens/semantic-light.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/',
      files: [{
        destination: 'light.css',
        format: 'css/variables',
        options: { outputReferences: true },  // preserva var(), clave para temas
      }],
    },
  },
};
```

## Uso

```css
/* Los componentes solo usan la capa semántica, nunca la paleta base */
.card {
  background: var(--surface-raised);
  color: var(--text);
  border: 1px solid var(--border);
}

.button-primary {
  background: var(--accent);
  color: var(--gray-0);
}
.button-primary:hover { background: var(--accent-hover); }
```

```html
<button type="button" onclick="setTheme('dark')" aria-pressed="false">
  Modo oscuro
</button>
```

## Limitaciones conocidas

- **Sin `outputReferences: true` en Style Dictionary**, las variables se compilan al valor final y el cambio de tema deja de funcionar: `--surface` queda como `#ffffff` literal en vez de `var(--gray-0)`.
- **El script inline rompe una CSP estricta.** Con `script-src 'self'` sin `'unsafe-inline'` hay que usar un nonce o un hash. Es un caso donde el script inline se justifica, pero requiere configurar la CSP a propósito.
- **El contraste no se hereda entre temas.** Un acento que cumple AA sobre blanco puede fallar sobre fondo oscuro, que es por qué este snippet usa `indigo-400` en oscuro y `indigo-600` en claro. Cada tema hay que verificarlo por separado.
- **Las imágenes y los SVG con colores fijos no se adaptan**: un logo negro desaparece en fondo oscuro. Requieren variantes por tema o usar `currentColor`.
- **Las sombras funcionan distinto**: en modo oscuro, una sombra negra es casi invisible. La jerarquía visual se comunica mejor con diferencias de luminosidad de superficie (`--surface-raised`) que con sombras.
- **Tres estados, no dos**: claro, oscuro y "seguir al sistema". Un toggle binario pierde la tercera opción, que suele ser la que más gente prefiere.

## Fuentes

- **Style Dictionary** (4.8k ⭐): la herramienta que permite generar estos temas desde una fuente única; su opción `outputReferences` es específicamente lo que hace posible el theming dinámico en CSS.
- **semi-design** (10.2k ⭐): su sistema de más de 3000 tokens es una referencia de hasta dónde llega la capa semántica en un design system grande, y de cómo nombrar roles en vez de valores.
- **dark-reader** (22.2k ⭐): genera modo oscuro sobre sitios que no lo implementaron. Verlo es útil por contraste: sus resultados imperfectos muestran exactamente por qué el modo oscuro necesita decisiones de diseño y no solo invertir colores.
- **Tailwind CSS** (96.1k ⭐): su estrategia `dark:` con la clase en el elemento raíz es el mismo mecanismo (`data-theme` vs clase) aplicado a utilidades; el criterio de capas semánticas se traslada igual.

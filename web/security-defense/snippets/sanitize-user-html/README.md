---
title: Sanitizar HTML de usuario con DOMPurify
platform: web
pillar: security-defense
tags: [xss, dompurify, sanitization, security]
summary: Limpia HTML generado por usuarios antes de insertarlo en el DOM, con configuraciones por nivel de confianza y un hook para forzar links externos seguros.
when_not_to_use: Si el contenido es texto plano, usar textContent en vez de sanitizar HTML — es más rápido y no tiene superficie de ataque.
---

# Sanitizar HTML de usuario con DOMPurify

## Contexto

Cualquier momento en que HTML controlado por un usuario llega al DOM
—comentarios con formato, descripciones de producto, output de un editor
WYSIWYG, contenido de un CMS— es una oportunidad de XSS. Y el ataque no
necesita un `<script>` obvio: `<img src=x onerror=alert(1)>`,
`<a href="javascript:...">` o un `<svg>` con un handler adentro funcionan
igual.

El error de fondo que hay que evitar es intentar filtrar con expresiones
regulares. Es un enfoque que históricamente **siempre** termina evadido,
porque el parser de HTML del navegador es mucho más permisivo de lo que
cualquier regex anticipa (etiquetas sin cerrar, atributos sin comillas,
entidades codificadas, mayúsculas mezcladas). DOMPurify toma el camino
correcto: usa el propio parser del navegador para construir el árbol y
después lo recorre eliminando todo lo que no esté en una allowlist explícita.

La distinción clave al configurarlo es el **nivel de confianza**: el
contenido de un comentario público necesita una allowlist mínima; el de un
editor interno usado por el equipo puede permitir más.

## Código completo

```js
import DOMPurify from 'dompurify';

/**
 * Nivel restrictivo: comentarios, contenido público sin moderar.
 * Solo formato básico, sin imágenes ni estilos.
 */
export function sanitizeStrict(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'ul', 'ol', 'li', 'a', 'code'],
    ALLOWED_ATTR: ['href', 'title'],
    // Solo esquemas seguros: bloquea javascript:, data:, vbscript:
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
    // Devuelve string, no un nodo
    RETURN_DOM: false,
  });
}

/**
 * Nivel permisivo: editor WYSIWYG interno, contenido de CMS con autores
 * de confianza. Permite imágenes, tablas y encabezados.
 */
export function sanitizeRich(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'code', 'pre', 'blockquote',
      'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
    // Bloquea explícitamente lo más peligroso aunque estuviera permitido
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  });
}

/**
 * Hook global: todos los links externos salen con rel de seguridad.
 * Sin noopener, la página destino puede manipular window.opener.
 */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    const href = node.getAttribute('href') ?? '';
    const isExternal = /^https?:\/\//i.test(href) && !href.startsWith(window.location.origin);
    if (isExternal) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  }
});

/**
 * Detectar si la sanitización eliminó algo — útil para loguear intentos
 * o avisar al usuario que su contenido fue modificado.
 */
export function sanitizeWithReport(dirty) {
  const clean = sanitizeStrict(dirty);
  const removed = DOMPurify.removed.length > 0;
  return { clean, removed, details: [...DOMPurify.removed] };
}
```

**En el servidor (Node)** — DOMPurify necesita un DOM:

```js
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export const sanitizeServer = (dirty) =>
  DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'] });
```

## Uso

```jsx
// React — el único lugar donde dangerouslySetInnerHTML es aceptable
function Comment({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: sanitizeStrict(html) }} />;
}
```

```js
// DOM plano
container.innerHTML = sanitizeRich(userContent);
```

```js
// Texto plano: NO hace falta sanitizar, es más seguro y más rápido
element.textContent = userInput;
```

## Limitaciones conocidas

- **Sanitizar en el cliente no protege la base de datos.** Si el HTML sucio se guarda y otro consumidor (una app móvil, un email, un export a PDF) lo lee sin sanitizar, el problema persiste. Lo correcto es sanitizar **al guardar** en el servidor y volver a sanitizar al renderizar — defensa en profundidad.
- **No reemplaza a Content-Security-Policy.** Si aparece un bypass en la librería o una ruta de inserción sin sanitizar, CSP es la red que evita que el script se ejecute. Van juntos.
- **Permitir `style` es peligroso** aunque parezca inocuo: `position: fixed` con `z-index` alto permite superponer una capa invisible sobre la UI real y capturar clicks (clickjacking).
- **Los `<iframe>` permitidos son una superficie enorme**: si el caso realmente los necesita (embeds de video), conviene una allowlist explícita de dominios en vez de permitir el tag en general.
- **DOMPurify tuvo bypasses históricos**, todos corregidos rápido, pero eso implica que la versión importa: conviene mantenerla actualizada y no fijarla por años.
- **La sanitización es destructiva**: si el usuario escribió algo que se elimina, sin el reporte de `DOMPurify.removed` no se entera de que su contenido cambió.

## Fuentes

- **DOMPurify** (17.1k ⭐): la librería de este snippet; su decisión de usar el parser del navegador en vez de regex es exactamente lo que la hace confiable donde los filtros caseros fallan.
- **OWASP CheatSheetSeries** (32.7k ⭐): su hoja de prevención de XSS es el marco de por qué la sanitización va del lado del servidor al guardar, y por qué el contexto de inserción (HTML, atributo, URL, JS) cambia lo que es seguro.
- **helmet** (10.7k ⭐): provee la capa de CSP que este snippet asume como complemento; sanitizar sin CSP deja una sola línea de defensa.
- **PayloadsAllTheThings** (79.6k ⭐): el catálogo de variantes reales de payloads XSS; leerlo es la forma más directa de entender por qué una allowlist es la única estrategia viable frente a una denylist.

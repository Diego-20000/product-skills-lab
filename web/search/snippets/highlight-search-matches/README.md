---
title: Resaltar coincidencias de búsqueda sin XSS
platform: web
pillar: search
tags: [search, highlight, xss, dom, ux]
summary: Marca los términos buscados dentro de un resultado usando nodos de texto en vez de innerHTML, con normalización de acentos y extracción del fragmento relevante.
when_not_to_use: Si el motor de búsqueda ya devuelve fragmentos resaltados (Elasticsearch highlight, Meilisearch _formatted), usar esos — están alineados con el análisis del índice.
---

# Resaltar coincidencias de búsqueda sin XSS

## Contexto

Resaltar el término buscado dentro de los resultados es lo que permite al
usuario entender **por qué** apareció cada uno. La implementación ingenua es
un `replace` con regex sobre el texto y `innerHTML` para inyectar los
`<mark>`, y tiene dos problemas serios: si el contenido viene de un usuario,
es un XSS directo; y si el término buscado contiene caracteres especiales de
regex (`.`, `*`, `(`), la expresión se rompe o hace match donde no debe.

La forma correcta trabaja sobre **nodos de texto**: se busca la posición de
la coincidencia en el string, se parte en fragmentos, y se crean elementos
`<mark>` con `textContent`. Nunca se concatena HTML, así que no hay
superficie de inyección por construcción.

El segundo problema que resuelve este snippet es específico del español:
buscar "busqueda" debería resaltar "búsqueda". Eso requiere normalizar
acentos para comparar, pero devolver el texto original — si se devuelve el
normalizado, el usuario ve el texto sin tildes.

## Código completo

```js
/** Normaliza para comparar: minúsculas y sin diacríticos. */
const normalize = (str) =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Devuelve los rangos [inicio, fin) del texto original que coinciden
 * con alguno de los términos. Trabaja sobre índices, no sobre strings,
 * para poder devolver el texto original con acentos.
 */
function findMatchRanges(text, terms) {
  const haystack = normalize(text);
  const ranges = [];

  for (const term of terms) {
    const needle = normalize(term.trim());
    if (needle.length < 2) continue;   // ignorar términos de 1 caracter

    let from = 0;
    let index;
    while ((index = haystack.indexOf(needle, from)) !== -1) {
      ranges.push([index, index + needle.length]);
      from = index + needle.length;
    }
  }

  // Ordenar y fusionar rangos solapados (dos términos que se tocan)
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

/**
 * Construye un DocumentFragment con <mark> en las coincidencias.
 * No usa innerHTML en ningún momento: sin superficie de XSS.
 */
export function highlight(text, query) {
  const terms = query.split(/\s+/).filter(Boolean);
  const fragment = document.createDocumentFragment();
  const ranges = findMatchRanges(text, terms);

  if (ranges.length === 0) {
    fragment.append(document.createTextNode(text));
    return fragment;
  }

  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) {
      fragment.append(document.createTextNode(text.slice(cursor, start)));
    }
    const mark = document.createElement('mark');
    mark.textContent = text.slice(start, end);   // textContent, nunca innerHTML
    fragment.append(mark);
    cursor = end;
  }
  if (cursor < text.length) {
    fragment.append(document.createTextNode(text.slice(cursor)));
  }
  return fragment;
}

/**
 * Extrae un fragmento alrededor de la primera coincidencia, para no
 * mostrar 2000 caracteres cuando el match está en el medio.
 */
export function excerpt(text, query, context = 80) {
  const terms = query.split(/\s+/).filter(Boolean);
  const ranges = findMatchRanges(text, terms);
  if (ranges.length === 0) return text.slice(0, context * 2) + (text.length > context * 2 ? '…' : '');

  const [start] = ranges[0];
  const from = Math.max(0, start - context);
  const to = Math.min(text.length, start + context * 2);

  return (from > 0 ? '…' : '') + text.slice(from, to) + (to < text.length ? '…' : '');
}
```

**Versión React** — devuelve elementos, no HTML:

```jsx
export function Highlight({ text, query }) {
  const terms = query.split(/\s+/).filter(Boolean);
  const ranges = findMatchRanges(text, terms);
  if (ranges.length === 0) return <>{text}</>;

  const parts = [];
  let cursor = 0;
  ranges.forEach(([start, end], i) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<mark key={i}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}
```

**CSS**

```css
mark {
  background: #fef3c7;
  color: inherit;          /* no romper el contraste del texto */
  padding: 0 0.1em;
  border-radius: 2px;
}

@media (prefers-contrast: more) {
  mark { background: highlight; color: highlighttext; }
}
```

## Uso

```js
// DOM plano
const el = document.querySelector('.result-title');
el.replaceChildren(highlight(result.title, query));

const body = document.querySelector('.result-excerpt');
body.replaceChildren(highlight(excerpt(result.body, query), query));
```

```jsx
// React
<h3><Highlight text={result.title} query={query} /></h3>
<p><Highlight text={excerpt(result.body, query)} query={query} /></p>
```

## Limitaciones conocidas

- **Hace match por substring, no por token**: buscar "casa" resalta "casamiento". Para respetar límites de palabra hay que verificar que los caracteres adyacentes no sean alfanuméricos, aunque en búsqueda incremental el substring suele ser el comportamiento deseado.
- **No conoce el análisis del índice**: si el motor de búsqueda hace stemming (encuentra "corriendo" al buscar "correr"), este resaltado no marca nada porque compara literalmente. Por eso, cuando el motor ofrece highlight propio, conviene usar ese.
- **`excerpt` corta por caracteres, no por palabras**: puede partir una palabra al medio. Ajustar el corte al espacio más cercano es una mejora simple si molesta.
- **Con muchos resultados y textos largos**, recorrer cada uno tiene costo. Para listas grandes conviene resaltar solo lo visible, o precalcular los rangos una vez por resultado en vez de por render.
- **`<mark>` tiene semántica propia**: los lectores de pantalla pueden anunciarlo. Es correcto para resaltar coincidencias de búsqueda, pero no debería usarse como decoración.

## Fuentes

- **FlexSearch** (13.8k ⭐): el motor del skill `client-side-site-search`; no incluye resaltado, así que este snippet es el complemento directo de esa combinación.
- **Meilisearch** (58.8k ⭐) y **Elasticsearch** (77.6k ⭐): ambos devuelven fragmentos resaltados desde el servidor (`_formatted` y `highlight` respectivamente), alineados con el análisis real del índice — la razón por la que este snippet aclara que en esos casos conviene usar los del motor.
- **DOMPurify** (17.1k ⭐): la alternativa si por alguna razón hay que construir HTML; este snippet lo evita por diseño trabajando con nodos, que es más seguro y más rápido que sanitizar.

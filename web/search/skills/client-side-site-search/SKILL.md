---
name: client-side-site-search
description: Agrega búsqueda instantánea a un sitio estático o documentación construyendo un índice en build time y resolviendo las queries en el navegador con FlexSearch, sin servidor ni servicio externo. Usar cuando piden "un buscador" en un sitio de contenido acotado.
---

# Client-Side Site Search

## Contexto

Para un blog, una documentación o un sitio de marketing, montar
Elasticsearch o pagar Algolia es desproporcionado: el corpus son unos cientos
de documentos que no cambian entre deploys. Todo el aparato de un motor de
búsqueda —cluster, indexación incremental, latencia de red— existe para
resolver problemas que ese caso no tiene.

La alternativa es invertir dónde ocurre el trabajo: se construye un índice
invertido **en tiempo de build**, se sirve como un archivo estático más, y
el navegador resuelve cada query localmente. El resultado es búsqueda con
latencia de cero (no hay round-trip), que funciona offline, sin costo
operativo ni de servicio, y sin enviar lo que el usuario tipea a un tercero.

El límite real de este enfoque es el tamaño del índice, porque el usuario lo
descarga entero: por debajo de ~1 MB comprimido es imperceptible; por encima
de ~5 MB deja de ser razonable y conviene pasar a un motor server-side.

## Cuándo usarlo

- Sitio estático o mayormente estático: blog, docs, portfolio, landing con recursos.
- El corpus es acotado y conocido en build time (cientos a pocos miles de documentos).
- Se quiere búsqueda instantánea mientras se tipea, sin la latencia de una request por pulsación.
- Importa que el sitio funcione sin backend (GitHub Pages, Netlify, S3).

## Cuándo NO usarlo

- **Contenido que cambia constantemente** (catálogo de e-commerce con stock, feed de usuarios): reconstruir y redistribuir el índice completo en cada cambio no escala. Ahí va Meilisearch o Typesense.
- **Corpus grande**: si el índice pasa de unos pocos MB, el costo de descarga arruina justamente la performance que se buscaba.
- **Resultados personalizados o con permisos**: si distintos usuarios deben ver distintos resultados, el índice no puede ser público — es un problema de seguridad, no de performance.
- **Si se necesitan agregaciones o facetas complejas** (filtrar por 5 dimensiones cruzadas con conteos): eso es el terreno de Elasticsearch.

## Pasos / Código

**1. Generar el índice en build time**

Script que corre en el build, recorre el contenido y emite un JSON:

```js
// scripts/build-search-index.js
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter'); // parsea frontmatter de los .md

const CONTENT_DIR = 'content';
const docs = [];

for (const file of fs.readdirSync(CONTENT_DIR)) {
  if (!file.endsWith('.md')) continue;
  const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
  const { data, content } = matter(raw);

  docs.push({
    id: file.replace(/\.md$/, ''),
    title: data.title ?? file,
    tags: (data.tags ?? []).join(' '),
    // Solo se indexa un extracto: el cuerpo completo infla el índice
    // sin mejorar mucho la relevancia en un corpus chico.
    body: content.replace(/\s+/g, ' ').slice(0, 2000),
    url: `/${file.replace(/\.md$/, '')}`,
  });
}

fs.writeFileSync('public/search-index.json', JSON.stringify(docs));
console.log(`Indexed ${docs.length} documents`);
```

**2. Cargar y consultar en el navegador**

```js
import FlexSearch from 'flexsearch';

let index = null;
let docsById = null;

async function ensureIndex() {
  if (index) return;

  const docs = await fetch('/search-index.json').then((r) => r.json());
  docsById = new Map(docs.map((d) => [d.id, d]));

  index = new FlexSearch.Document({
    document: {
      id: 'id',
      // Los campos se pesan por orden: title primero = más relevante
      index: ['title', 'tags', 'body'],
    },
    tokenize: 'forward', // permite match parcial mientras se tipea
  });

  for (const doc of docs) index.add(doc);
}

export async function search(query) {
  if (!query || query.length < 2) return [];
  await ensureIndex();

  const raw = index.search(query, { limit: 10, enrich: false });

  // FlexSearch devuelve un resultado por campo; se aplanan y deduplican
  // preservando el orden (los matches de title vienen primero).
  const seen = new Set();
  const ids = [];
  for (const field of raw) {
    for (const id of field.result) {
      if (!seen.has(id)) { seen.add(id); ids.push(id); }
    }
  }

  return ids.map((id) => docsById.get(id));
}
```

**3. Conectarlo al input, cargando el índice de forma diferida**

```js
const input = document.querySelector('#search');

// El índice se descarga recién cuando el usuario muestra intención de
// buscar, no en el load inicial de la página.
input.addEventListener('focus', ensureIndex, { once: true });

input.addEventListener('input', async (e) => {
  const results = await search(e.target.value);
  render(results);
});
```

## Edge cases / errores comunes

- **Cargar el índice en el `load` de la página** anula el beneficio: se le agrega peso a la carga inicial a todos los visitantes, incluidos los que nunca buscan. Cargarlo en el primer `focus` del input (o en `requestIdleCallback`) es la diferencia entre una mejora y una regresión de performance.
- **Indexar el cuerpo completo de cada documento**: en un sitio con artículos largos, el índice se multiplica por diez sin mejorar la relevancia percibida. Un extracto de los primeros ~2000 caracteres suele alcanzar.
- **Olvidar deduplicar entre campos**: `FlexSearch.Document` devuelve un array de resultados **por campo indexado**, no una lista plana. Sin el paso de deduplicación, un documento que matchea en `title` y en `body` aparece dos veces.
- **`tokenize: 'full'` en corpus grandes** genera un índice muchísimo más pesado. `'forward'` (prefijos) cubre bien el caso "buscar mientras se tipea" con una fracción del tamaño.
- **Acentos y mayúsculas**: FlexSearch normaliza por defecto, pero si el contenido está en español conviene verificar que "búsqueda" y "busqueda" den el mismo resultado antes de dar el índice por bueno.

## Compatibilidad

Funciona en cualquier navegador evergreen; no usa APIs recientes más allá de
`fetch`. En sitios muy grandes conviene mover la construcción del índice a un
Web Worker para no bloquear el hilo principal durante el `index.add()`
inicial.

## Fuentes

- **FlexSearch** (13.8k ⭐): la librería que hace posible este enfoque; su diferencial frente a alternativas como Lunr es el tamaño del índice generado y la velocidad de búsqueda en memoria.
- **Meilisearch** (58.8k ⭐) y **Typesense** (26.4k ⭐): resuelven el mismo problema de "búsqueda instantánea tolerante a typos" pero como servicio. Son el paso siguiente cuando el corpus crece o el contenido deja de ser estático — este skill es deliberadamente el escalón anterior a necesitarlos.
- **Elasticsearch** (77.6k ⭐): el extremo opuesto del espectro. Su modelo (cluster, shards, agregaciones) resuelve problemas que un sitio de contenido no tiene, y por eso es la elección incorrecta acá pese a ser el motor más potente.

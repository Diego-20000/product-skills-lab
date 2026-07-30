---
title: Elegir motor de búsqueda — cliente, Meilisearch/Typesense o Elasticsearch
platform: web
pillar: search
tags: [search, elasticsearch, meilisearch, typesense, decision, architecture]
summary: Criterio para elegir dónde vive la búsqueda según tamaño del corpus, frecuencia de cambio y complejidad de las consultas, evitando el sobredimensionamiento clásico.
---

# Elegir motor de búsqueda — cliente, Meilisearch/Typesense o Elasticsearch

## Las tres preguntas que deciden

En orden de importancia:

1. **¿Cuánto pesa el índice?** Si entra cómodo en el navegador (menos de ~1 MB comprimido), la búsqueda puede vivir en el cliente y no hace falta servidor.
2. **¿Con qué frecuencia cambia el contenido?** Si cambia entre deploys, un índice generado en build alcanza. Si cambia constantemente, hace falta un motor con indexación incremental.
3. **¿Qué tipo de consulta hay que resolver?** Buscar texto es un problema; agregar, filtrar por múltiples dimensiones con conteos y hacer analítica es otro mucho más grande.

Casi todos los proyectos que terminan con Elasticsearch respondieron mal la
primera o la tercera.

## Búsqueda en el cliente

**Cuándo:** blog, documentación, portfolio, sitio de marketing. Corpus de
cientos a pocos miles de documentos, conocido en tiempo de build.

**Qué se gana:** latencia cero (no hay round-trip), funciona offline, costo
operativo nulo, y lo que el usuario tipea no sale de su navegador.

**Qué se pierde:** el índice se descarga entero. Hasta ~1 MB comprimido es
imperceptible; por encima de ~5 MB deja de ser razonable. No sirve para
contenido que cambia seguido, ni para resultados personalizados por permisos
—si distintos usuarios deben ver distintas cosas, el índice no puede ser
público, y eso es un problema de seguridad, no de tamaño.

Implementación concreta: el skill
[`client-side-site-search`](../../skills/client-side-site-search/SKILL.md).

## Meilisearch o Typesense

**Cuándo:** el corpus creció, el contenido cambia con frecuencia, o hace
falta búsqueda instantánea tolerante a errores de tipeo sobre datos reales
(un catálogo, una base de usuarios, un buscador interno).

**Qué se gana:** relevancia y tolerancia a typos que funcionan bien sin
configurar casi nada, indexación incremental, filtros y facetas básicas.
Operativamente son simples: un binario, un archivo de configuración.

**Qué se pierde:** poder analítico. Las agregaciones complejas, los
pipelines de análisis de texto personalizados y la escala distribuida no son
su terreno.

**Entre los dos:** Meilisearch tiene comunidad más grande y mejor
experiencia de desarrollo; Typesense se posiciona más explícitamente como
reemplazo de Algolia y prioriza latencia predecible. Para la mayoría de los
casos, cualquiera de los dos funciona y la elección pasa por cuál se integra
mejor con el stack.

## Elasticsearch (u OpenSearch)

**Cuándo:** hace falta lo que solo él hace bien — agregaciones analíticas
sobre volúmenes grandes, filtros cruzados por muchas dimensiones con
conteos, análisis de texto personalizado por idioma, o el mismo cluster
sirviendo búsqueda y observabilidad de logs.

**Qué se gana:** el motor más potente y flexible de la categoría, con un
ecosistema enorme.

**Qué se pierde:** simplicidad operativa. Administrar cluster, shards,
réplicas y tuning de JVM es trabajo real y recurrente. Ese costo es
exactamente el que Meilisearch y Typesense existen para evitar, y asumirlo
sin necesitar las agregaciones es el sobredimensionamiento más común de esta
categoría.

**OpenSearch** es el fork mantenido por AWS tras el cambio de licencia de
Elastic; técnicamente equivalente para la mayoría de los usos, y la elección
suele ser contractual más que técnica.

## Búsqueda vectorial — cuándo entra en juego

Los motores vectoriales (Qdrant, Weaviate, LanceDB) resuelven un problema
distinto: encontrar por **significado** en vez de por palabras. Buscar "cómo
devuelvo un producto" y encontrar un artículo titulado "Política de
reembolsos" no lo resuelve un índice invertido.

Corresponde cuando la búsqueda es en lenguaje natural, cuando alimenta un
sistema de RAG, o cuando el vocabulario del usuario no coincide con el del
contenido. En la práctica, lo que mejor funciona hoy es **híbrido**:
combinar búsqueda por keywords con búsqueda vectorial y fusionar los
resultados. Elasticsearch, Meilisearch, Typesense y Qdrant soportan alguna
forma de esto.

No es un reemplazo: para "buscar el pedido #48213", el índice invertido gana
siempre.

## Errores frecuentes en esta decisión

- **Elegir Elasticsearch por defecto** porque es el nombre conocido, y terminar con un cluster que nadie sabe operar para resolver un buscador de 5000 documentos.
- **Usar la base de datos principal con `LIKE '%texto%'`**: no usa índices, hace scan completo, y no tolera typos ni ordena por relevancia. Funciona en desarrollo y colapsa con datos reales. Postgres con `tsvector` es un punto intermedio válido y muy subestimado cuando ya se usa Postgres.
- **Indexar todo el contenido "por las dudas"**: infla el índice sin mejorar la relevancia. Casi siempre alcanza con título, tags y un extracto.
- **No medir la relevancia**: se ajustan pesos a ojo sin un set de consultas de prueba con resultados esperados, así que nadie sabe si un cambio mejoró o empeoró.
- **Ignorar el idioma**: en español, acentos, plurales y conjugaciones importan. Un motor sin configuración de idioma va a fallar en casos obvios para el usuario.

## Qué NO responde esta guía

- **No cubre cómo diseñar la relevancia** (pesos por campo, boosting, sinónimos), que es donde está el trabajo real una vez elegido el motor.
- **No cubre la UI de búsqueda** (autocompletado, facetas, paginación), que impacta en la percepción de calidad tanto como el motor.
- **No cubre SEO**: que Google encuentre el sitio es un problema distinto de que el sitio tenga buscador propio.
- **No cubre búsqueda en mobile nativo** sobre datos locales, donde las opciones son otras (SQLite FTS, Core Spotlight).

## Fuentes

- **Elasticsearch** (77.6k ⭐): el estándar de la categoría; su modelo distribuido sobre Lucene es lo que le da poder y también lo que explica su costo operativo.
- **Meilisearch** (58.8k ⭐): escrito en Rust, optimizado explícitamente para búsqueda instantánea con tolerancia a typos y configuración mínima; sacrifica analítica a propósito.
- **Typesense** (26.4k ⭐): mismo nicho, posicionado como alternativa self-hosteable a Algolia, con foco en latencia predecible.
- **OpenSearch** (13.4k ⭐): el fork de AWS; relevante sobre todo por la decisión de licencia.
- **FlexSearch** (13.8k ⭐): hace viable la búsqueda en el navegador; su tamaño de índice comparado con alternativas es lo que define el límite práctico de esa estrategia.
- **Qdrant** (33.7k ⭐), **Weaviate** (16.7k ⭐) y **tantivy** (15.6k ⭐): el eje vectorial y el caso de embeber el motor en la aplicación en vez de correrlo como servicio.
- **sonic** (21.3k ⭐): el extremo minimalista — búsqueda en pocos MB de RAM; útil para saber que existe un escalón por debajo de Meilisearch.

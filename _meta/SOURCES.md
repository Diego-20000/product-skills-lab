# Fuentes de investigación

Este archivo documenta los repositorios exitosos que se **estudian** para
escribir cada skill/snippet/guide del repo. Ninguno se vendoriza ni se copia
— el objetivo es entender cómo resuelve cada uno el problema y qué lo
distingue de los demás de su categoría, para después escribir un recurso
propio que sintetice esos enfoques. Es la misma lógica que comparar varias
ediciones de un libro de historia sobre el mismo período: cada "editorial"
tiene su enfoque, y lo que entra en este repo es la síntesis, no la
fotocopia de una sola.

## Cómo leer este catálogo

Cada pilar tiene dos secciones:
- **Referencias principales** — los proyectos que definen la categoría, con
  explicación de qué es, cómo funciona por dentro y qué lo distingue.
- **Otros repos verificados** — tabla de amplitud, para saber qué más existe
  y por qué es distinto, sin el desarrollo largo.

**Sobre las estrellas:** todas las cifras de este catálogo están marcadas ✅,
lo que significa que fueron verificadas directamente contra GitHub (páginas
de Topics o del propio repo) en julio de 2026 — no queda ninguna cifra sin
verificar. Las cifras de blogs y resúmenes de IA demostraron ser poco
confiables: en una revisión previa de este archivo, GSAP figuraba con 66.5k
cuando su cifra real es 27.2k, y Tailwind con 35k cuando tiene 96.1k. Ante
la duda, se verifica contra GitHub, nunca contra un artículo.

La vara general para entrar acá es **10k estrellas**. Se admiten excepciones
por debajo cuando el proyecto es el estándar de facto indiscutido de un
nicho (están marcadas explícitamente).

---

## `web/animation`

### Referencias principales

**[anime.js](https://github.com/juliangarnier/anime)** — 71.6k ⭐ ✅
Motor liviano con API declarativa basada en objetos de configuración: se le
pasa un target y un objeto de propiedades finales, y la librería resuelve la
interpolación. Trata CSS, atributos SVG y propiedades de objetos JS de forma
uniforme bajo la misma API. Lo distingue: mucho más simple de aprender para
animaciones puntuales, sin el ecosistema de plugins ni el control de
orquestación fina de GSAP.

**[three.js](https://github.com/mrdoob/three.js)** — 114k ⭐ ✅
La librería 3D de referencia de la web. Abstrae WebGL detrás de un modelo de
escena/cámara/renderer, permitiendo animación 3D real (no transformaciones
CSS que simulan profundidad). Entra en este pilar porque cualquier animación
web que supere el plano 2D pasa por acá o por sus competidores directos.

**[GSAP](https://github.com/greensock/GSAP)** — 27.2k ⭐ ✅
Motor basado en timelines: en vez de animar una propiedad a la vez, orquesta
secuencias donde cada tween tiene una posición temporal exacta, permitiendo
sincronizar decenas de elementos con precisión de frame. Anima cualquier
propiedad numérica (CSS, SVG, canvas, objetos JS arbitrarios). Su plugin
`ScrollTrigger` es el estándar de facto para animaciones ligadas al scroll
con scrubbing (avanza y retrocede con la posición de scroll, no solo se
dispara una vez). Nota sobre su popularidad: tiene menos estrellas que
anime.js pese a ser más usado profesionalmente, porque durante años su
licencia fue comercial y el repo funcionaba más como mirror que como el
lugar donde vivía la comunidad.

**[Motion (antes Framer Motion)](https://github.com/motiondivision/motion)** — 33k ⭐ ✅
Pensado nativamente para React: se anima declarando props (`animate`,
`whileHover`, `whileTap`) sobre el componente, y la librería sincroniza los
cambios con el ciclo de render. Incluye gestos y animaciones de layout
automáticas (técnica FLIP). Lo distingue: se integra al modelo mental de
React en vez de pelear contra él, al costo de no tener sentido fuera de él.

**[ScrollReveal](https://github.com/jlmakes/scrollreveal)** — 22.5k ⭐ ✅
Resuelve específicamente el patrón "animar elementos al entrar en el
viewport" con una API mínima. Es la referencia directa contra la que
comparar una implementación propia con `IntersectionObserver`: hace lo mismo
que 15 líneas de código propio, pero con configuración declarativa y
manejo de casos borde ya resuelto.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [pixi.js](https://github.com/pixijs/pixijs) | 47.9k ✅ | Renderer 2D WebGL de alto rendimiento; el estándar para animación 2D con miles de sprites donde el DOM no da abasto |
| [phaser](https://github.com/phaserjs/phaser) | 40k ✅ | Framework de juegos 2D HTML5; incluye motor de animación por spritesheets y física |
| [lottie-android](https://github.com/airbnb/lottie-android) | 35.7k ✅ | Reproductor de animaciones exportadas de After Effects como JSON (Bodymovin); elimina el paso de reimplementar a mano lo que diseñó el diseñador |
| [lottie-ios](https://github.com/airbnb/lottie-ios) | 26.8k ✅ | El mismo reproductor Lottie para iOS nativo |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | 25.9k ✅ | Motor 3D/juegos más "batteries-included" que three.js, con editor visual propio |
| [popmotion](https://github.com/Popmotion/popmotion) | 20.2k ✅ | Librería funcional de animación; base histórica sobre la que se construyó Motion |
| [mo.js](https://github.com/mojs/mojs) | 18.7k ✅ | Enfocado en motion graphics declarativos (bursts, shapes animadas), no en animar UI existente |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | 12.7k ✅ | Un solo efecto resuelto muy bien; ejemplo de librería de propósito único |
| [svg.js](https://github.com/svgdotjs/svg.js) | 11.8k ✅ | Manipulación y animación de SVG con API encadenable, alternativa liviana a D3 para gráficos animados |
| [lax.js](https://github.com/alexfoxy/lax.js) | 10.5k ✅ | Animaciones ligadas al scroll sin dependencias, alternativa mínima a ScrollTrigger |

---

## `web/responsive`

### Referencias principales

**[Bootstrap](https://github.com/twbs/bootstrap)** — 175k ⭐ ✅
Grid de 12 columnas más una librería completa de componentes visuales, con
variables Sass para personalizar el theme. Su identidad visual por defecto
es reconocible al instante, lo que obliga a trabajo real de sobreescritura
si no se quiere que un sitio "se vea a Bootstrap". Es el framework con más
plantillas y temas de terceros ya construidos.

**[Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)** — 96.1k ⭐ ✅
Utility-first: no da componentes prearmados, da primitivas de una sola
responsabilidad (`flex`, `pt-4`, `text-lg`) combinables en el markup.
Requiere paso de build (purga clases no usadas). Cambia dónde se toman las
decisiones de diseño: en vez de "sobreescribir un componente", se define un
sistema de diseño en un archivo de configuración. Es la base sobre la que se
construyen shadcn/ui, daisyUI y buena parte del ecosistema actual.

**[Bulma](https://github.com/jgthms/bulma)** — 50.1k ⭐ ✅
CSS puro, sin una línea de JavaScript. Grid Flexbox y clases modificadoras
similar en espíritu a Bootstrap, pero sin runtime de JS — la interacción de
navbar/dropdown queda a cargo de quien lo implementa.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [Semantic UI](https://github.com/Semantic-Org/Semantic-UI) | 51k ✅ | Clases que se leen como lenguaje natural (`ui three column grid`); desarrollo hoy muy enlentecido |
| [AdminLTE](https://github.com/ColorlibHQ/AdminLTE) | 45.5k ✅ | Plantilla de dashboard admin sobre Bootstrap; referencia de layout responsive complejo ya resuelto |
| [daisyUI](https://github.com/saadeghi/daisyui) | 41.9k ✅ | Capa de componentes semánticos sobre Tailwind; recupera `btn`/`card` sin perder el sistema de utilidades |
| [Materialize](https://github.com/Dogfalo/materialize) | 38.8k ✅ | Material Design de Google aplicado a la web; ata la identidad visual a esa especificación |
| [responsively-app](https://github.com/responsively-org/responsively-app) | 25.1k ✅ | No es un framework: es un navegador que muestra múltiples viewports a la vez para desarrollo responsive |
| [NES.css](https://github.com/nostalgic-css/NES.css) | 21.8k ✅ | Framework de estética retro 8-bit; ejemplo de framework con identidad visual extrema |
| [MJML](https://github.com/mjmlio/mjml) | 18.2k ✅ | Responsive para **email HTML**, un dominio con reglas propias donde el CSS moderno no funciona |
| [Pico.css](https://github.com/picocss/pico) | 16.8k ✅ | Estiliza HTML semántico sin clases; el extremo opuesto a utility-first |
| [Bootswatch](https://github.com/thomaspark/bootswatch) | 14.7k ✅ | Colección de themes drop-in para Bootstrap |
| [tachyons](https://github.com/tachyons-css/tachyons) | 11.7k ✅ | El precursor del enfoque utility-first, anterior a Tailwind |
| [Spectre.css](https://github.com/picturepan2/spectre) | 11.3k ✅ | Framework liviano y responsive con footprint mínimo |
| [milligram](https://github.com/milligram/milligram) | 10.2k ✅ | Framework minimalista (~2KB), el mínimo viable de esta categoría |

---

## `web/security-defense`

### Referencias principales

**[OWASP CheatSheetSeries](https://github.com/OWASP/CheatSheetSeries)** — 32.7k ⭐ ✅
No es código: es la colección de hojas de referencia de OWASP sobre cómo
implementar correctamente cada área de seguridad de aplicaciones (auth,
sesiones, criptografía, validación de input). Complementa al OWASP Top 10:
el Top 10 dice *qué* priorizar, las cheat sheets dicen *cómo* resolverlo.

**[gitleaks](https://github.com/gitleaks/gitleaks)** — 28.4k ⭐ ✅
Escanea el **historial completo de git** (no solo el working tree) buscando
secretos por regex y por entropía del string. Se integra como pre-commit
hook o paso de CI, para bloquear antes de que un secreto llegue a un repo
público — cubre también commits viejos ya pusheados, algo que revisar diffs
a mano no logra.

**[DOMPurify](https://github.com/cure53/DOMPurify)** — 17.1k ⭐ ✅
Sanitizador de HTML/SVG/MathML contra XSS. Su enfoque clave: en vez de
intentar detectar patrones maliciosos con regex (approach que históricamente
siempre termina evadido), parsea el HTML con el propio parser del navegador
y después recorre el árbol resultante eliminando todo lo que no esté en una
allowlist. Es la referencia obligada cuando hay que renderizar HTML que
viene de un usuario.

**[helmet](https://github.com/helmetjs/helmet)** — 10.7k ⭐ ✅
Middleware de Express que setea de una vez una colección de headers HTTP de
seguridad (CSP, HSTS, X-Frame-Options), cada uno configurable
individualmente. Solo endurece la superficie a nivel de headers — no
previene fallas de lógica de negocio ni de validación.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [caddy](https://github.com/caddyserver/caddy) | 74.5k ✅ | Servidor web con HTTPS automático por defecto (obtiene y renueva certificados solo); seguridad por default en vez de opt-in |
| [trivy](https://github.com/aquasecurity/trivy) | 37.1k ✅ | Escanea contenedores, IaC y dependencias buscando CVEs, misconfigs y secretos; la contraparte "supply chain" de gitleaks |
| [better-auth](https://github.com/better-auth/better-auth) | 29.4k ✅ | Framework de autenticación TypeScript-first, self-hosteado, con 2FA/passkeys incluidos |
| [authelia](https://github.com/authelia/authelia) | 28.4k ✅ | Portal SSO + MFA que se pone delante de apps existentes vía reverse proxy |
| [NextAuth / Auth.js](https://github.com/nextauthjs/next-auth) | 28.3k ✅ | Auth para el ecosistema Next.js con manejo de sesión y OAuth ya resuelto |
| [passport](https://github.com/jaredhanson/passport) | 23.5k ✅ | El clásico middleware de auth de Node; modelo de "estrategias" intercambiables por proveedor |
| [casbin](https://github.com/apache/casbin) | 20.3k ✅ | Autorización (no autenticación): implementa ACL/RBAC/ABAC de forma declarativa por política |
| [supertokens](https://github.com/supertokens/supertokens-core) | 15.2k ✅ | Alternativa open-source y self-hosteable a Auth0/Cognito |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 3.3k ✅ | *Excepción bajo la vara:* la referencia directa del ecosistema Express para rate limiting, con headers estándar y stores compartidos |

---

## `web/security-offense`

> Todo este pilar aplica **solo a testing autorizado sobre sistemas propios o
> con permiso explícito**. Ver la nota correspondiente en `TAXONOMY.md`.

### Referencias principales

**[PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings)** — 79.6k ⭐ ✅
Catálogo enciclopédico de payloads y técnicas de bypass organizado por tipo
de vulnerabilidad (SQLi, XSS, SSRF, XXE, deserialización). Es la referencia
que usa tanto quien ataca en un pentest autorizado como quien escribe
defensas, porque muestra concretamente qué formas puede tomar un input
malicioso — información necesaria para escribir una allowlist que realmente
sirva.

**[mitmproxy](https://github.com/mitmproxy/mitmproxy)** — 44.5k ⭐ ✅
Proxy interceptor con capacidad TLS: se pone entre el cliente y el servidor
para inspeccionar y modificar tráfico HTTPS en vivo. Además de pentesting,
es la herramienta estándar para depurar qué está mandando realmente una app
móvil o un SDK de terceros.

**[nuclei](https://github.com/projectdiscovery/nuclei)** — 30.1k ⭐ ✅
Scanner de vulnerabilidades basado en templates YAML declarativos, en vez de
lógica hardcodeada. Eso permite que la comunidad publique un template nuevo
el mismo día que se hace público un CVE, y que un equipo escriba templates
propios para chequear misconfigs específicas de su infraestructura.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [the-book-of-secret-knowledge](https://github.com/trimstray/the-book-of-secret-knowledge) | 236k ✅ | Compendio masivo de listas, manuales y one-liners de sysadmin/seguridad |
| [Awesome-Hacking](https://github.com/Hack-with-Github/Awesome-Hacking) | 117k ✅ | El índice de índices: agrupa decenas de awesome-lists de seguridad por especialidad |
| [x64dbg](https://github.com/x64dbg/x64dbg) | 49k ✅ | Debugger de modo usuario para Windows orientado a ingeniería inversa y análisis de malware |
| [h4cker](https://github.com/The-Art-of-Hacking/h4cker) | 28.7k ✅ | Miles de recursos de ethical hacking, bug bounty y respuesta a incidentes |
| [Awesome-Hacking-Resources](https://github.com/vitalysim/Awesome-Hacking-Resources) | 17.3k ✅ | Recursos de aprendizaje, más orientado a formación que a herramientas |
| [hacker-roadmap](https://github.com/sundowndev/hacker-roadmap) | 15.5k ✅ | Ruta de aprendizaje estructurada por fases de un pentest |
| [dirsearch](https://github.com/maurosoria/dirsearch) | 14.6k ✅ | Descubrimiento de rutas y archivos ocultos por fuerza bruta de diccionario |
| [awesome-web-security](https://github.com/qazbnm456/awesome-web-security) | 13.6k ✅ | Curación específica de seguridad **web** (no infraestructura general) |
| [thc-hydra](https://github.com/vanhauser-thc/thc-hydra) | 12.1k ✅ | Fuerza bruta de credenciales sobre múltiples protocolos de red |
| [Sn1per](https://github.com/1N3/Sn1per) | 10.7k ✅ | Orquestador que encadena varias herramientas de recon en un pipeline automático |
| [OWASP wstg](https://github.com/OWASP/wstg) | 9.6k ✅ | *Excepción bajo la vara:* la guía metodológica oficial de OWASP para testing de seguridad web |

---

## `web/server`

### Referencias principales

**[NestJS](https://github.com/nestjs/nest)** — 76.3k ⭐ ✅
Arquitectura estilo Angular sobre Express o Fastify: módulos, decoradores e
inyección de dependencias como ciudadanos de primera clase. Favorece
convención y estructura explícita para equipos grandes, con soporte
integrado de GraphQL, microservicios y generación de OpenAPI.

**[Express](https://github.com/expressjs/express)** — 69.3k ⭐ ✅
Sin opinión: una cadena de middlewares (`req, res, next`) sin estructura
predefinida de rutas, DI ni validación. Esa falta de estructura es
exactamente la razón de su longevidad — cada decisión arquitectónica queda
en manos de quien lo usa.

**[nodebestpractices](https://github.com/goldbergyoni/nodebestpractices)** — 105k ⭐ ✅
No es un framework: es la lista de referencia de buenas prácticas de Node en
producción (estructura de proyecto, manejo de errores, seguridad,
performance), cada una con su justificación y ejemplos de código correcto e
incorrecto. Es la fuente contra la que contrastar cualquier decisión de
arquitectura de backend Node.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [strapi](https://github.com/strapi/strapi) | 72.7k ✅ | Headless CMS Node; resuelve el backend de contenido en vez de construirlo desde cero |
| [socket.io](https://github.com/socketio/socket.io) | 63.2k ✅ | Comunicación bidireccional en tiempo real con fallbacks automáticos si WebSocket no está disponible |
| [prisma](https://github.com/prisma/prisma) | 47.4k ✅ | ORM TypeScript-first con schema declarativo y tipos generados desde la base de datos |
| [payload](https://github.com/payloadcms/payload) | 43.9k ✅ | Backend + admin panel sobre Next.js, TypeScript de punta a punta |
| [fiber](https://github.com/gofiber/fiber) | 40k ✅ | Framework Go con API inspirada en Express; referencia de comparación fuera de Node |
| [apollo-server](https://github.com/apollographql/apollo-server) | 13.9k ✅ | Servidor GraphQL de referencia, alternativa al modelo REST |
| [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) | 11.1k ✅ | Proxy inverso como middleware; patrón habitual para dev servers y BFF |
| [Fastify](https://github.com/fastify/fastify) | 36.9k ✅ | Schema-first: el JSON Schema que valida también acelera la serialización; plugins con encapsulamiento real |

---

## `web/integrations`

**[public-apis](https://github.com/public-apis/public-apis)** — 454.2k ⭐ ✅
Directorio comunitario de APIs públicas gratuitas en más de 40 categorías,
mantenido con apoyo de APILayer. Es **el repo con más estrellas de todo el
catálogo** y uno de los más estrellados de GitHub. Su valor acá es de
descubrimiento: sirve para encontrar y comparar candidatos por categoría
antes de integrar. Importante para la taxonomía de este repo: es una
"awesome-list", así que se referencia como fuente y **no** se reproduce como
contenido — que una API esté listada no dice nada sobre su fiabilidad,
precio real ni política de datos, que es justamente lo que aporta la guía
del pilar.

**[apilayer](https://github.com/apilayer)** (organización) — repos de 60 a
2.3k ⭐ ✅
Marketplace de APIs de nicho: currencylayer (tipos de cambio),
weatherstack (clima), aviationstack (vuelos), marketstack (bolsa),
numverify (teléfonos), mailboxlayer (validación de email). Los repos de la
organización son mayormente documentación de producto, no librerías — el
mayor es [restcountries](https://github.com/apilayer/restcountries) (2.3k ⭐).
Relevantes como **caso de estudio del patrón que hay que evitar**: su
documentación muestra la llamada directa desde el navegador con la
`access_key` en la query string, que es exactamente lo que expone la clave
en el bundle y motiva el snippet de proxy de este pilar.

**[axios](https://github.com/axios/axios)** — 109k ⭐ ✅
El cliente HTTP más adoptado del ecosistema JS. Su sistema de interceptores
es el patrón estándar para inyectar autenticación y manejar errores de forma
transversal, aunque deja timeout, reintentos y circuit breaking al
implementador.

**[TanStack Query](https://github.com/TanStack/query)** — 50.1k ⭐ ✅
Trata la respuesta de una API como **estado asíncrono** en vez de como una
llamada suelta: caché, revalidación en background, deduplicación de requests
concurrentes y reintentos vienen resueltos. Cambia el modelo mental del
consumo de APIs en el frontend, y para React suele ser la respuesta correcta
antes que escribir un cliente propio.

**[OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator)** —
26.6k ⭐ ✅
Genera clientes tipados (SDKs), stubs de servidor y documentación a partir de
una especificación OpenAPI, para 30+ lenguajes. Su existencia es el motivo
práctico por el que "¿el proveedor publica OpenAPI?" es un criterio de
evaluación real: cambia cuánto trabajo cuesta integrar y detectar un cambio
de contrato.

**[MSW](https://github.com/mswjs/msw)** — 18.1k ⭐ ✅
Intercepta requests a nivel de red (Service Worker en el navegador,
interceptación de bajo nivel en Node) en vez de mockear el módulo de fetch.
Permite testear una integración sin depender de la disponibilidad del
proveedor ni consumir cuota, y sin que el código bajo test sepa que está
mockeado.

**[got](https://github.com/sindresorhus/got)** — 14.9k ⭐ ✅
Cliente HTTP para Node con reintentos, timeouts granulares por fase de la
conexión, paginación, HTTP/2 y caché conforme a RFC 7234 incorporados. Es la
vara de qué debería traer un cliente maduro, y la razón para no construir
esa capa a mano cuando se puede sumar la dependencia.

**[http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)**
— 11.1k ⭐ ✅
Middleware de proxy genérico para Express y Next.js. Alternativa cuando hay
que proxear muchas rutas; el trade-off frente a un proxy explícito por
endpoint es que sin allowlist se corre el riesgo de convertirlo en un proxy
abierto.

## `web/search`

### Referencias principales

**[Elasticsearch](https://github.com/elastic/elasticsearch)** — 77.6k ⭐ ✅
Motor distribuido sobre Lucene (índice invertido), con DSL de queries en
JSON que soporta scoring de relevancia, agregaciones analíticas y búsqueda
vectorial/kNN. Operacionalmente pesado (cluster, shards, tuning de JVM) —
que es exactamente el costo que Meilisearch y Typesense existen para evitar.

**[Meilisearch](https://github.com/meilisearch/meilisearch)** — 58.8k ⭐ ✅
Escrito en Rust, optimizado para "búsqueda instantánea mientras se tipea,
con tolerancia a errores de tipeo" sin apenas configuración. Sacrifica a
propósito parte del poder analítico de Elasticsearch a cambio de simplicidad
operativa.

**[Typesense](https://github.com/typesense/typesense)** — 26.4k ⭐ ✅
Nicho similar a Meilisearch, posicionado explícitamente como alternativa
self-hosteable al modelo de precios de Algolia (que no es open-source).
Prioriza latencia predecible por sobre configurabilidad.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [searxng](https://github.com/searxng/searxng) | 34.6k ✅ | Metabuscador: agrega resultados de otros motores sin trackear al usuario |
| [qdrant](https://github.com/qdrant/qdrant) | 33.7k ✅ | Base de datos vectorial; búsqueda semántica por embeddings en vez de por keywords |
| [HEAD](https://github.com/joshbuchea/HEAD) | 30.3k ✅ | Referencia exhaustiva de qué va en `<head>` — la base del SEO técnico y de cómo un buscador lee una página |
| [sonic](https://github.com/valeriansaliou/sonic) | 21.3k ✅ | Backend de búsqueda ultraliviano (corre en pocos MB de RAM); el extremo minimalista |
| [weaviate](https://github.com/weaviate/weaviate) | 16.7k ✅ | Vectorial + filtrado estructurado combinados en una query |
| [tantivy](https://github.com/quickwit-oss/tantivy) | 15.6k ✅ | Librería full-text en Rust inspirada en Lucene; se embebe en la app en vez de correr como servicio |
| [FlexSearch](https://github.com/nextapps-de/flexsearch) | 13.8k ✅ | Búsqueda full-text **en el navegador**, sin servidor; el caso de "site search" de un sitio estático |
| [OpenSearch](https://github.com/opensearch-project/OpenSearch) | 13.4k ✅ | Fork de Elasticsearch tras su cambio de licencia, mantenido por AWS |
| [manticoresearch](https://github.com/manticoresoftware/manticoresearch) | 11.9k ✅ | Base de datos de búsqueda con interfaz SQL, full-text + vectorial |
| [quickwit](https://github.com/quickwit-oss/quickwit) | 11.4k ✅ | Búsqueda cloud-native sobre almacenamiento de objetos, optimizada para logs |

---

## `web/testing`

### Referencias principales

**[Jest](https://github.com/jestjs/jest)** — 45.5k ⭐ ✅
Todo-en-uno: runner, asserts y mocking en un paquete, con snapshot testing
incorporado. Durante años el default de facto en React. Usa jsdom para
simular un navegador, notablemente más lento que correr en un motor real.

**[Testing Library (React)](https://github.com/testing-library/react-testing-library)** — 19.6k ⭐ ✅
No es un runner sino una filosofía de API: obliga a seleccionar elementos
como lo haría un usuario real (por rol accesible o texto visible) en vez de
por detalles de implementación (clases CSS, estado interno). El efecto
secundario buscado es que un test que pasa implica también que el componente
es navegable por un lector de pantalla.

**[javascript-testing-best-practices](https://github.com/goldbergyoni/javascript-testing-best-practices)** — 24.6k ⭐ ✅
El equivalente de `nodebestpractices` para testing: qué testear, en qué
nivel, cómo nombrar los casos y qué anti-patrones evitan que una suite se
vuelva inmantenible.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [hoppscotch](https://github.com/hoppscotch/hoppscotch) | 79.9k ✅ | Cliente de API en el navegador; testing manual/exploratorio de endpoints |
| [localstack](https://github.com/localstack/localstack) | 65.2k ✅ | Emula servicios AWS localmente para testear integraciones sin tocar la nube real |
| [bruno](https://github.com/usebruno/bruno) | 46k ✅ | Cliente de API cuyos requests se versionan como archivos de texto en el repo |
| [mocha](https://github.com/mochajs/mocha) | 22.9k ✅ | Runner clásico y minimalista; se combina con la librería de asserts que se prefiera |
| [ava](https://github.com/avajs/ava) | 20.8k ✅ | Ejecuta cada archivo de test en un proceso aislado y en paralelo por defecto |
| [goreplay](https://github.com/probelabs/goreplay) | 19.3k ✅ | Captura tráfico HTTP real de producción y lo reproduce contra staging |
| [hurl](https://github.com/Orange-OpenSource/hurl) | 19.1k ✅ | Tests HTTP definidos en texto plano, pensados para correr en CI |
| [enzyme](https://github.com/enzymejs/enzyme) | 19.8k ✅ | El approach anterior a Testing Library: inspecciona el estado interno del componente (hoy desaconsejado, útil como contraste) |
| [Vitest](https://github.com/vitest-dev/vitest) | 16.9k ✅ | Reutiliza el pipeline de Vite; API compatible con Jest para migración barata |

---

## `web/accessibility`

### Referencias principales

**[Headless UI](https://github.com/tailwindlabs/headlessui)** — 28.7k ⭐ ✅
Componentes completamente sin estilo pero con todo el comportamiento
accesible resuelto (manejo de foco, roles ARIA, teclado). Del mismo equipo
que Tailwind, diseñado para que el estilo lo ponga el consumidor.

**[Radix UI Primitives](https://github.com/radix-ui/primitives)** — 19.1k ⭐ ✅
Primitivas (dropdown, dialog, tooltip) accesibles sin ningún estilo visual.
Separa a propósito "que funcione bien" de "que se vea de una forma
particular". Es la capa de comportamiento sobre la que shadcn/ui construye.

**[React Spectrum / React Aria](https://github.com/adobe/react-spectrum)** — 15.7k ⭐ ✅
El trabajo de accesibilidad más exhaustivo de los tres: Adobe documenta el
comportamiento esperado por plataforma y lector de pantalla, incluyendo
casos que Radix y Headless UI no cubren (interacciones táctiles con
VoiceOver, internacionalización de fechas y números).

**[axe-core](https://github.com/dequelabs/axe-core)** — 7.4k ⭐ ✅
*Excepción bajo la vara.* Corre contra el DOM ya renderizado: evalúa el
árbol de accesibilidad real, contraste computado y uso efectivo de ARIA.
Detecta más que el linting estático, a costa de necesitar que la página se
renderice. Pese a sus estrellas modestas, es el motor que usan por debajo
Lighthouse, las DevTools de Chrome y la mayoría de herramientas comerciales
de auditoría — su alcance real es mucho mayor que lo que sugiere el número.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [dark-reader](https://github.com/darkreader/darkreader) | 22.2k ✅ | Genera modo oscuro con contraste correcto sobre sitios que no lo implementaron |
| [MathJax](https://github.com/mathjax/MathJax) | 10.9k ✅ | Renderiza matemática accesible (leíble por lector de pantalla), no como imagen |
| [Base UI](https://github.com/mui/base-ui) | 10.5k ✅ | Primitivas sin estilo del equipo de MUI; competidor directo de Radix |
| [ariakit](https://github.com/ariakit/ariakit) | 8.6k ✅ | Componentes accesibles con foco explícito en cumplimiento de las guías WAI-ARIA |
| [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | 3.6k ✅ | *Excepción bajo la vara:* linting estático de accesibilidad en JSX; corre en el editor, antes de ejecutar |

---

## `mobile/ios`

### Referencias principales

**[awesome-ios](https://github.com/vsouza/awesome-ios)** — 52.9k ⭐ ✅
Índice curado del ecosistema iOS por categoría. Mapa de descubrimiento, no
resuelve un problema puntual por sí solo.

**[Alamofire](https://github.com/Alamofire/Alamofire)** — 42.4k ⭐ ✅
La capa de red estándar del ecosistema Swift: envuelve `URLSession` con una
API encadenable, manejo de reintentos, validación de respuestas e
interceptores de request. Es a iOS lo que OkHttp es a Android.

**[Kingfisher](https://github.com/onevcat/Kingfisher)** — 24.4k ⭐ ✅
Descarga y cacheo de imágenes remotas, con cache en memoria y disco,
cancelación automática al reciclarse una celda y procesadores de imagen
encadenables. Resuelve el problema de "listas con imágenes remotas que se
traban al scrollear", que es donde casi toda app falla primero.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [open-source-ios-apps](https://github.com/dkhamsing/open-source-ios-apps) | 51.4k ✅ | Catálogo de apps iOS completas con código abierto; útil para leer arquitectura real, no snippets |
| [UTM](https://github.com/utmapp/UTM) | 34.8k ✅ | App compleja de referencia (virtualización) con código público |
| [lottie-ios](https://github.com/airbnb/lottie-ios) | 26.8k ✅ | Animaciones de After Effects renderizadas nativamente |
| [awesome-swift](https://github.com/matteocrippa/awesome-swift) | 26.2k ✅ | Índice del ecosistema del lenguaje, complementario a awesome-ios |
| [vapor](https://github.com/vapor/vapor) | 26.2k ✅ | Framework de servidor en Swift; permite compartir modelos entre backend y app iOS |
| [SDWebImage](https://github.com/SDWebImage/SDWebImage) | 25.6k ✅ | El competidor histórico de Kingfisher, con más soporte de formatos legacy |
| [RxSwift](https://github.com/ReactiveX/RxSwift) | 24.6k ✅ | Programación reactiva; el enfoque previo a que Combine/async-await fueran nativos |
| [Hero](https://github.com/HeroTransitions/Hero) | 22.5k ✅ | Transiciones entre pantallas declarativas y compartidas |
| [SwifterSwift](https://github.com/SwifterSwift/SwifterSwift) | 15.1k ✅ | 500+ extensiones de conveniencia sobre tipos nativos |
| [SkeletonView](https://github.com/Juanpe/SkeletonView) | 12.9k ✅ | Placeholders animados de carga; patrón de UX percibida |
| [Material](https://github.com/CosmicMind/Material) | 12k ✅ | Material Design en iOS, para apps que quieren consistencia cross-platform |
| [Eureka](https://github.com/xmartlabs/Eureka) | 11.8k ✅ | Construcción declarativa de formularios, un dolor clásico en iOS |
| [AudioKit](https://github.com/AudioKit/AudioKit) | 11.4k ✅ | Síntesis y procesamiento de audio; relevante si la app cruza con `video/` |
| [Swift (lenguaje)](https://github.com/swiftlang/swift) | 70.2k ✅ | Compilador y stdlib; fuente de verdad de features recientes del lenguaje |

---

## `mobile/android`

### Referencias principales

**[OkHttp](https://github.com/square/okhttp)** — 47k ⭐ ✅
Cliente HTTP con pooling de conexiones, gzip transparente y cache de
respuestas incorporados. La mayoría de las librerías de red de Android
(Retrofit incluida) se construyen encima en vez de reemplazarlo.

**[architecture-samples](https://github.com/android/architecture-samples)** — 45.8k ⭐ ✅
La misma app chica implementada varias veces por Google con distintas
decisiones de arquitectura, una al lado de la otra. Pensado para leerse
comparativamente, no para copiarse entero.

**[Now in Android](https://github.com/android/nowinandroid)** — 21.6k ⭐ ✅
App completa y real, no un sample de juguete: es la referencia oficial de
Google de cómo se ve una app moderna de producción con Compose, modularización
por features y testing en todos los niveles.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [leakcanary](https://github.com/square/leakcanary) | 30k ✅ | Detección automática de memory leaks en debug; se integra sin escribir código |
| [BaseRecyclerViewAdapterHelper](https://github.com/CymChad/BaseRecyclerViewAdapterHelper) | 24.6k ✅ | Elimina el boilerplate clásico de adapters de listas |
| [compose-samples](https://github.com/android/compose-samples) | 23.3k ✅ | Ejemplos oficiales de Jetpack Compose por caso de uso |
| [iosched](https://github.com/google/iosched) | 21.6k ✅ | La app del Google I/O; referencia histórica de arquitectura completa |
| [material-dialogs](https://github.com/afollestad/material-dialogs) | 19.6k ✅ | API extensible de diálogos, evitando el `AlertDialog` nativo |
| [compose-multiplatform](https://github.com/JetBrains/compose-multiplatform) | 19.3k ✅ | Compose corriendo también en iOS/desktop/web; puente hacia `cross-platform` |
| [MMKV](https://github.com/Tencent/MMKV) | 18.7k ✅ | Almacenamiento clave-valor mucho más rápido que SharedPreferences |
| [flexbox-layout](https://github.com/google/flexbox-layout) | 18.3k ✅ | Flexbox en Android; puente conceptual con el layout web |

---

## `mobile/cross-platform`

### Referencias principales

**[Flutter](https://github.com/flutter/flutter)** — 178k ⭐ ✅
Dibuja su propia UI vía Skia/Impeller en vez de usar widgets nativos. Por eso
la consistencia visual pixel-a-pixel entre iOS y Android es directa, al costo
de que la app no adopta automáticamente cambios de look-and-feel del sistema
operativo cuando este se actualiza.

**[React Native](https://github.com/facebook/react-native)** — 126k ⭐ ✅
Renderiza a través de componentes de UI nativos reales (históricamente vía
puente, hoy también con JSI). Hereda gratis el look-and-feel y el
comportamiento de accesibilidad nativo, al costo de inconsistencias visuales
ocasionales entre plataformas.

**[Expo](https://github.com/expo/expo)** — 51.1k ⭐ ✅
Capa sobre React Native que elimina la necesidad de tocar Xcode/Android
Studio para la mayoría de los casos: builds en la nube, actualizaciones OTA y
un catálogo de módulos nativos ya integrados. En la práctica, hoy es el punto
de entrada recomendado a React Native más que una alternativa a él.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [awesome-flutter](https://github.com/Solido/awesome-flutter) | 60.8k ✅ | Índice curado del ecosistema Flutter |
| [appwrite](https://github.com/appwrite/appwrite) | 56.7k ✅ | Backend-as-a-service self-hosteado con SDKs para web y mobile |
| [taro](https://github.com/NervJS/taro) | 37.6k ✅ | Cross-platform hacia mini-programas (WeChat) además de apps; otro modelo de target |
| [awesome-react-native](https://github.com/jondot/awesome-react-native) | 35.7k ✅ | Índice curado del ecosistema RN |
| [react-native-elements](https://github.com/react-native-elements/react-native-elements) | 25.9k ✅ | Kit de UI cross-platform sobre RN |
| [NativeScript](https://github.com/NativeScript/NativeScript) | 25.6k ✅ | Acceso directo a APIs nativas desde JS/TS sin puente de componentes |
| [react-navigation](https://github.com/react-navigation/react-navigation) | 24.5k ✅ | El estándar de navegación en RN; decisión arquitectónica temprana clave |
| [flutter-go](https://github.com/alibaba/flutter-go) | 23.7k ✅ | 140+ demos de componentes Flutter en una app navegable |
| [Best-Flutter-UI-Templates](https://github.com/mitesh77/Best-Flutter-UI-Templates) | 22.8k ✅ | Plantillas de UI completas en Dart |
| [react-native-web](https://github.com/necolas/react-native-web) | 22.1k ✅ | Corre componentes RN en el navegador; unifica web y mobile en un código |

---

## `mobile/testing`

### Referencias principales

**[fastlane](https://github.com/fastlane/fastlane)** — 41.9k ⭐ ✅
No es un framework de tests: automatiza todo lo que rodea al release
(screenshots para las tiendas, firma de código, subida a TestFlight/Play
Console). Se incluye acá porque en mobile el ciclo de testing es
inseparable de la distribución: sin automatizar la firma y la subida, cada
build de prueba es un proceso manual de media hora.

**[Appium](https://github.com/appium/appium)** — 21.2k ⭐ ✅
Automatiza la UI real a través del protocolo WebDriver, el mismo modelo que
Selenium pero apuntando al árbol de accesibilidad de la app en vez del DOM.
Una sola API sobre iOS/Android/nativo/híbrido, pagando esa amplitud con
tests más lentos y frágiles que las herramientas nativas de cada plataforma.

**[Maestro](https://github.com/mobile-dev-inc/Maestro)** — 10.8k ⭐ ✅
Tests definidos en YAML plano en vez de código, con esperas implícitas por
defecto (la causa número uno de flakiness en Appium). Su formato declarativo
lo hace notablemente más legible — y, no menor para este repo, mucho más
fácil de generar y mantener por una IA que un test imperativo.

**[Detox](https://github.com/wix/Detox)** — 12k ⭐ ✅
Testing gray-box específico de React Native: en vez de esperar por tiempo o
por aparición de elementos, se sincroniza directamente con el hilo de
JavaScript de la app y sabe cuándo terminó de estar ocupada. Eso elimina de
raíz la causa principal de flakiness, a costa de servir solo para RN.

*Espresso (Android, de Google) vive dentro del monorepo de AndroidX y no
tiene un repo propio con estrellas comparables — se referencia por
documentación oficial, no por repo.*

---

## `mobile/accessibility`

**Sin candidato confirmado por encima de 10k estrellas.** El barrido
completo lo confirmó: las librerías específicas de accesibilidad mobile
(`react-native-aria`, `react-native-a11y`, `GSCXScanner` de Google,
`Accessibility-Test-Framework-for-Android`) están todas muy por debajo de la
vara. Lo más grande que aparece en el topic `accessibility` para mobile es
[gkd](https://github.com/gkd-kit/gkd) (40.5k ⭐ ✅), pero **usa** las APIs de
accesibilidad de Android para automatizar taps — no ayuda a construir apps
accesibles, que es lo contrario de lo que necesita este pilar.

Conclusión: este pilar se apoya en documentación de plataforma (VoiceOver,
TalkBack, tamaños mínimos de touch target) y en criterio propio en `guides/`,
no en repos de referencia. Las primitivas de `web/accessibility` (React Aria
de Adobe) son lo más cercano aplicable a React Native.

---

## `automation/workflows-rpa`

### Referencias principales

**[n8n](https://github.com/n8n-io/n8n)** — 199k ⭐ ✅
Constructor visual de workflows basado en nodos, self-hosteable bajo licencia
fair-code. Se diferencia de Zapier en que permite nodos de código JS
arbitrario intercalados con las integraciones prearmadas.

**[Airflow](https://github.com/apache/airflow)** — 46.3k ⭐ ✅
El otro extremo del espectro: workflows definidos como código Python (DAGs),
no como nodos en un canvas. Pensado para pipelines de datos programados con
dependencias complejas, reintentos y backfills — no para integrar SaaS.

**[Activepieces](https://github.com/activepieces/activepieces)** — 23.5k ⭐ ✅
Mismo modelo visual que n8n pero TypeScript-first, con cada integración
empaquetada de forma aislada al estilo de un paquete npm.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [dify](https://github.com/langgenius/dify) | 151k ✅ | Workflows con LLMs y RAG como ciudadanos de primera clase |
| [Scrapling](https://github.com/D4Vinci/Scrapling) | 71.8k ✅ | Scraping adaptativo que sobrevive a cambios de estructura del sitio |
| [Flowise](https://github.com/FlowiseAI/Flowise) | 55k ✅ | Constructor visual específico de agentes de IA |
| [huginn](https://github.com/huginn/huginn) | 49.7k ✅ | El precursor self-hosted de esta categoría (agentes que monitorean y actúan) |
| [appsmith](https://github.com/appsmithorg/appsmith) | 40.5k ✅ | Herramientas internas y paneles admin sobre bases de datos existentes |
| [ToolJet](https://github.com/ToolJet/ToolJet) | 38.3k ✅ | Competidor directo de Appsmith con enfoque low-code |
| [conductor](https://github.com/conductor-oss/conductor) | 32k ✅ | Orquestación durable de microservicios (originado en Netflix) |
| [Budibase](https://github.com/Budibase/Budibase) | 28.2k ✅ | Apps internas + automatizaciones en una sola plataforma |
| [kestra](https://github.com/kestra-io/kestra) | 27.5k ✅ | Orquestación declarativa en YAML, orientada a eventos |
| [temporal](https://github.com/temporalio/temporal) | 22k ✅ | Ejecución durable: el workflow sobrevive caídas del proceso sin perder estado |
| [dagster](https://github.com/dagster-io/dagster) | 15.9k ✅ | Orquestación de datos centrada en los assets producidos, no en las tareas |
| [trigger.dev](https://github.com/triggerdotdev/trigger.dev) | 15.8k ✅ | Jobs en background para devs, definidos en TypeScript |
| [keep](https://github.com/keephq/keep) | 12.1k ✅ | Automatización de gestión de alertas (AIOps) |

---

## `automation/browser-testing`

### Referencias principales

**[Puppeteer](https://github.com/puppeteer/puppeteer)** — 95.4k ⭐ ✅
Construido por el equipo de Chrome DevTools vía el DevTools Protocol. API
imperativa (`page.click`, `page.type`). El más veterano y probado, hoy con
soporte también de Firefox, aunque su centro sigue siendo Chromium.

**[Playwright](https://github.com/microsoft/playwright)** — 93.7k ⭐ ✅
Construido por ex-ingenieros de Puppeteer en Microsoft, extiende el enfoque a
Chromium, Firefox y WebKit con una sola API. Suma auto-waiting (elimina la
causa principal de tests flaky) y un test runner propio con paralelización.

**[Selenium](https://github.com/SeleniumHQ/selenium)** — 34.2k ⭐ ✅
Usa el protocolo oficial W3C WebDriver, no uno propio. Por eso soporta el
rango más amplio de navegadores y lenguajes de cliente, a costa de ser
históricamente más lento y más propenso a flakiness sin tooling adicional.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [Scrapling](https://github.com/D4Vinci/Scrapling) | 71.8k ✅ | Scraping que se auto-repara ante cambios de selectores |
| [phantomjs](https://github.com/ariya/phantomjs) | 29.5k ✅ | **Archivado.** El precursor de todo esto; relevante solo como contexto histórico |
| [Cypress](https://github.com/cypress-io/cypress) | 50.6k ✅ | Corre los tests dentro del navegador real (no un proceso externo que lo controla), con debugging por viaje en el tiempo |

---

## `automation/ci-cd-infra`

### Referencias principales

**[Terraform](https://github.com/hashicorp/terraform)** — 49.3k ⭐ ✅
Infraestructura como código declarativa en HCL, con archivo de estado que
mapea lo declarado contra lo real en la nube. Su diferencial: calcula y
muestra un plan (diff) antes de aplicar, así el cambio es revisable.

**[act](https://github.com/nektos/act)** — 71.3k ⭐ ✅
Corre GitHub Actions localmente. Resuelve el peor loop de feedback del
CI/CD: tener que pushear un commit para descubrir si el workflow funciona.
Su popularidad es un indicador directo de cuánto duele ese problema.

**[Docker / moby](https://github.com/moby/moby)** — 71.9k ⭐ ✅
El runtime de contenedores sobre el que se apoya casi todo lo demás de este
pilar. Relevante acá no como "cómo usar Docker" (eso ya está documentado)
sino como la unidad de empaquetado que asumen los pipelines modernos.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [netdata](https://github.com/netdata/netdata) | 79.9k ✅ | Observabilidad en tiempo real con auto-descubrimiento de métricas |
| [traefik](https://github.com/traefik/traefik) | 64.2k ✅ | Reverse proxy que se autoconfigura desde las etiquetas de los contenedores |
| [coolify](https://github.com/coollabsio/coolify) | 59.8k ✅ | PaaS self-hosteado, alternativa a Vercel/Heroku |
| [gitea](https://github.com/go-gitea/gitea) | 57.1k ✅ | Git hosting + CI/CD self-hosteado en un binario |
| [dive](https://github.com/wagoodman/dive) | 54.4k ✅ | Inspecciona capa por capa una imagen Docker para reducir su tamaño |
| [sentry](https://github.com/getsentry/sentry) | 44.4k ✅ | Error tracking y performance monitoring en producción |
| [Kong](https://github.com/Kong/kong) | 43.9k ✅ | API gateway; rate limiting y auth en la capa de infraestructura |
| [harness](https://github.com/harness/harness) | 37.6k ✅ | Plataforma de desarrollo end-to-end (SCM + CI/CD + registry) |
| [Dokploy](https://github.com/Dokploy/dokploy) | 36.2k ✅ | Alternativa self-hosteada a Vercel/Netlify |
| [dokku](https://github.com/dokku/dokku) | 32.1k ✅ | PaaS mínimo sobre Docker; deploy por `git push` |
| [gitleaks](https://github.com/gitleaks/gitleaks) | 28.4k ✅ | Escaneo de secretos como paso obligatorio de pipeline |
| [Jenkins](https://github.com/jenkinsci/jenkins) | 26.2k ✅ | El servidor CI/CD histórico; extensible por plugins, con el costo de mantenerlos compatibles |
| [pulumi](https://github.com/pulumi/pulumi) | 25.5k ✅ | IaC en lenguajes de programación reales en vez de un DSL propio |
| [watchtower](https://github.com/containrrr/watchtower) | 24.7k ✅ | Actualiza automáticamente contenedores cuando cambia su imagen base |
| [argo-cd](https://github.com/argoproj/argo-cd) | 23.8k ✅ | GitOps: el estado del cluster se sincroniza desde el repo, no por comandos |
| [sops](https://github.com/getsops/sops) | 22.6k ✅ | Cifra secretos dentro del repo para poder versionarlos sin exponerlos |
| [dagger](https://github.com/dagger/dagger) | 16.1k ✅ | Pipelines como código portable que corren igual local y en CI |
| [saltstack](https://github.com/saltstack/salt) | 15.6k ✅ | Gestión de configuración a escala, competidor histórico de Ansible |
| [terraformer](https://github.com/GoogleCloudPlatform/terraformer) | 14.6k ✅ | Terraform inverso: genera código desde infraestructura ya existente |
| [aws-cdk](https://github.com/aws/aws-cdk) | 12.9k ✅ | Infraestructura AWS definida en TypeScript/Python |
| [infracost](https://github.com/infracost/infracost) | 12.4k ✅ | Muestra el costo en dólares de un cambio de infraestructura en el PR |
| [earthly](https://github.com/earthly/earthly) | 12k ✅ | Builds repetibles con sintaxis a mitad de camino entre Dockerfile y Makefile |
| [crossplane](https://github.com/crossplane/crossplane) | 11.9k ✅ | Gestiona infraestructura cloud desde Kubernetes |
| [Ansible](https://github.com/ansible/ansible) | 69.8k ✅ | Agentless vía SSH; playbooks YAML idempotentes por diseño |

---

## `design/design-tokens`

**Hallazgo del barrido: esta categoría no tiene ninguna herramienta por
encima de 10k estrellas.** Style Dictionary es el estándar de facto
indiscutido del sector y tiene ~4k. Esto no significa que el problema no
importe — significa que se resuelve mayormente con configuración propia y
con las herramientas que ya trae cada design system, no con una librería
dedicada masiva.

**[Style Dictionary](https://github.com/style-dictionary/style-dictionary)** — 4.8k ⭐ ✅
*Excepción bajo la vara.* Toma una única fuente de verdad (JSON/YAML con
colores, espaciados, tipografía) y la transforma a múltiples formatos de
salida (variables CSS, XML de Android, Swift, JS) mediante "transforms"
configurables. La idea de fondo: el diseñador cambia un valor en un lugar y
ese cambio se propaga al código de todas las plataformas, en vez de que cada
una mantenga su copia manual. Nota: el repo migró de `amzn/style-dictionary`
a la organización `style-dictionary`.

| Repo relacionado | ⭐ | Enfoque |
|---|---|---|
| [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | 105k ✅ | Colección de archivos `DESIGN.md` de sistemas de marcas conocidas, escritos para que una IA replique su estilo — el mismo espíritu de documentación-para-IA que este repo |
| [semi-design](https://github.com/DouyinFE/semi-design) | 10.2k ✅ | Design system con 3000+ tokens ya definidos; útil como referencia de granularidad |

---

## `design/component-systems`

### Referencias principales

**[shadcn/ui](https://github.com/shadcn-ui/ui)** — 120k ⭐ ✅
No es una librería que se instala como dependencia: es una CLI que **copia**
el código fuente de cada componente (sobre Radix UI + Tailwind) al proyecto.
Invierte el modelo tradicional — en vez de esperar que el mantenedor agregue
una prop para personalizar algo, el componente ya es código propio editable.

**[Material UI](https://github.com/mui/material-ui)** — 98.6k ⭐ ✅
El modelo opuesto a shadcn: librería instalada como dependencia, con
componentes completos y un sistema de theming propio. Ventaja: recibís
mejoras y fixes con actualizar la versión. Costo: personalizar más allá de
lo que el theme permite implica pelear con la librería.

**[Storybook](https://github.com/storybookjs/storybook)** — 90.7k ⭐ ✅
Entorno aislado donde cada componente se documenta y prueba visualmente en
todos sus estados, sin levantar la app completa ni navegar hasta la pantalla
que lo usa. Es el punto de encuentro real entre diseño y desarrollo.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [awesome-react-components](https://github.com/brillout/awesome-react-components) | 48.1k ✅ | Índice curado por categoría de componente |
| [react-bits](https://github.com/DavidHDev/react-bits) | 44.5k ✅ | Componentes animados copy-paste; modelo shadcn aplicado a animación |
| [daisyUI](https://github.com/saadeghi/daisyui) | 41.9k ✅ | Componentes semánticos sobre Tailwind sin JS |
| [chakra-ui](https://github.com/chakra-ui/chakra-ui) | 40.5k ✅ | Componentes con props de estilo y accesibilidad integrada |
| [headlessui](https://github.com/tailwindlabs/headlessui) | 28.7k ✅ | Comportamiento accesible sin estilo, del equipo de Tailwind |
| [react-virtualized](https://github.com/bvaughn/react-virtualized) | 27.1k ✅ | Renderizado virtualizado de listas enormes; problema de performance específico |
| [docz](https://github.com/pedronauck/docz) | 23.6k ✅ | Documentación de componentes en MDX; alternativa más liviana a Storybook |
| [react-bootstrap](https://github.com/react-bootstrap/react-bootstrap) | 22.6k ✅ | Bootstrap como componentes React reales, sin jQuery |
| [magicui](https://github.com/magicuidesign/magicui) | 21.7k ✅ | Componentes animados copy-paste sobre shadcn |
| [fluentui](https://github.com/microsoft/fluentui) | 20.2k ✅ | El design system de Microsoft en React y web components |
| [radix-ui/primitives](https://github.com/radix-ui/primitives) | 19.1k ✅ | Primitivas accesibles sin estilo; la capa bajo shadcn |
| [awesome-design](https://github.com/gztchan/awesome-design) | 17.3k ✅ | Recursos de diseño en general, no solo componentes |
| [react-spectrum](https://github.com/adobe/react-spectrum) | 15.7k ✅ | El trabajo de accesibilidad más exhaustivo de la categoría |
| [semantic-ui-react](https://github.com/Semantic-Org/Semantic-UI-React) | 13.2k ✅ | Integración oficial de Semantic UI con React |
| [stencil](https://github.com/stenciljs/core) | 13.1k ✅ | Compila a web components estándar, agnósticos de framework |
| [primer/css](https://github.com/primer/css) | 13k ✅ | El design system de GitHub; referencia de sistema en producción a gran escala |
| [hyperui](https://github.com/markmead/hyperui) | 12.2k ✅ | Componentes Tailwind copy-paste sin dependencias |
| [ant-design-mobile](https://github.com/ant-design/ant-design-mobile) | 12k ✅ | Bloques de UI para web móvil; cruce con `mobile/` |
| [98.css](https://github.com/jdan/98.css) | 11.4k ✅ | Design system de estética retro; ejemplo de sistema con identidad extrema |
| [material-web](https://github.com/material-components/material-web) | 11.1k ✅ | Material Design como web components nativos |
| [base-ui](https://github.com/mui/base-ui) | 10.5k ✅ | Primitivas sin estilo del equipo MUI |
| [semi-design](https://github.com/DouyinFE/semi-design) | 10.2k ✅ | Design system completo con foco en tokens |

---

## `design/handoff`

### Referencias principales

**[awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** — 105k ⭐ ✅
Colección de archivos `DESIGN.md` que describen en texto el sistema visual de
marcas conocidas, con el objetivo explícito de que una IA pueda generar UI
consistente con esa marca. Es el ejemplo más directo del handoff moderno:
el traspaso diseño → código ya no es solo "exportá estos assets", sino
"documentá el sistema en un formato que una máquina pueda aplicar".

**[Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP)** — 15.5k ⭐ ✅
Servidor MCP que le da a un agente de código acceso a la información de
layout de un archivo Figma. Representa el handoff automatizado: en vez de
que una persona traduzca medidas y colores a mano, el agente lee la fuente.

**[mitosis](https://github.com/BuilderIO/mitosis)** — 13.9k ⭐ ✅
Se escribe un componente una vez y compila a React, Vue, Svelte, Angular,
Qwik y Solid. Es el handoff llevado al extremo: no traspasar diseño a un
stack, sino a todos a la vez desde una definición única.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [onlook](https://github.com/onlook-dev/onlook) | 26.3k ✅ | Edición visual que escribe directamente en el código React; borra la frontera diseño/código |
| [lucide](https://github.com/lucide-icons/lucide) | 23.7k ✅ | Set de iconos consistente con exports para todos los frameworks; el caso de handoff de assets mejor resuelto |
| [css.gg](https://github.com/astrit/css.gg) | 10k ✅ | 700+ iconos en CSS/SVG/Figma con paridad entre herramienta de diseño y código |

---

## `video/playback`

### Referencias principales

**[video.js](https://github.com/videojs/video.js)** — 39.8k ⭐ ✅
Player HTML5 con la arquitectura de plugins más madura de la categoría,
construido para abstraer diferencias entre navegadores y formatos detrás de
una API consistente. Su ecosistema de plugins de terceros (analytics, ads,
DRM) es el más grande de los players open-source.

**[hls.js](https://github.com/video-dev/hls.js)** — 16.8k ⭐ ✅
Implementa streaming adaptativo HLS en JavaScript puro usando Media Source
Extensions, permitiendo reproducir HLS en navegadores que no lo soportan
nativamente (todos salvo Safari). No es un player con UI: es el motor de
streaming que un player consume por debajo.

**[ijkplayer](https://github.com/bilibili/ijkplayer)** — 33.2k ⭐ ✅
Player nativo Android/iOS basado en FFmpeg con soporte de MediaCodec. La
referencia cuando la reproducción tiene que ocurrir en una app móvil nativa
y no en un navegador — cruce directo entre `video/` y `mobile/`.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [mpv](https://github.com/mpv-player/mpv) | 36.2k ✅ | Reproductor de línea de comandos; el motor de referencia de decodificación en desktop |
| [SRS](https://github.com/ossrs/srs) | 29.1k ✅ | Servidor de streaming (RTMP/WebRTC/HLS); el lado servidor de la reproducción |
| [GSYVideoPlayer](https://github.com/CarGuo/GSYVideoPlayer) | 21.5k ✅ | Player Android con filtros, watermarks y danmaku |
| [mediamtx](https://github.com/bluenviron/mediamtx) | 19.7k ✅ | Servidor multi-protocolo listo para usar (SRT/WebRTC/RTSP/LL-HLS) |
| [ZLMediaKit](https://github.com/ZLMediaKit/ZLMediaKit) | 17.3k ✅ | Framework C++11 de servidor/cliente multi-protocolo |
| [DPlayer](https://github.com/DIYgod/DPlayer) | 16.5k ✅ | Player HTML5 con comentarios superpuestos (danmaku) |
| [go2rtc](https://github.com/AlexxIT/go2rtc) | 13.6k ✅ | Streaming de cámaras con conversión entre protocolos |
| [owncast](https://github.com/owncast/owncast) | 11.4k ✅ | Servidor de live streaming self-hosteado con chat |
| [react-player](https://github.com/cookpete/react-player) | 10.3k ✅ | Componente React que abstrae YouTube/Vimeo/archivos tras una sola API |
| [livego](https://github.com/gwuhaolin/livego) | 10.2k ✅ | Servidor de live streaming en Go |
| [Plyr](https://github.com/sampotts/plyr) | 29.9k ✅ | Capa de **UI** accesible y personalizable por CSS; se combina con hls.js por debajo |
| [Shaka Player](https://github.com/shaka-project/shaka-player) | 8.2k ✅ | *Excepción bajo la vara:* HLS **y** DASH con DRM (Widevine/PlayReady) integrado; el proyecto de referencia de Google |

---

## `video/processing`

### Referencias principales

**[FFmpeg](https://github.com/FFmpeg/FFmpeg)** — 62.5k ⭐ ✅
La herramienta de la que depende, directa o indirectamente, todo lo demás de
este pilar. Decodifica, transcodifica, filtra y multiplexa prácticamente
cualquier formato de audio/video existente. Casi ninguna librería de video
reimplementa esto: la envuelven.

**[Remotion](https://github.com/remotion-dev/remotion)** — 54.9k ⭐ ✅
Genera video real (MP4/PNG) a partir de componentes React, donde cada frame
es una función pura del tiempo (`useCurrentFrame()`). El render corre en un
Chrome headless que captura frame por frame y ensambla con FFmpeg. Es el
puente directo entre `web/animation` y `video/`: permite generar videos
data-driven con el mismo lenguaje de componentes que la UI.

**[ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)** — 17.7k ⭐ ✅
Compila FFmpeg a WebAssembly para recortar, convertir o extraer frames
**en el navegador del cliente**, sin subir el archivo a un servidor. El
costo: el procesamiento corre en la CPU del usuario y el bundle WASM es
grande, así que no reemplaza un pipeline server-side para archivos grandes.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [scrcpy](https://github.com/Genymobile/scrcpy) | 147k ✅ | Captura y control de pantalla Android en tiempo real vía FFmpeg |
| [obs-studio](https://github.com/obsproject/obs-studio) | 74.2k ✅ | El estándar de grabación y transmisión en vivo; referencia de pipeline de captura |
| [lossless-cut](https://github.com/mifi/lossless-cut) | 42.5k ✅ | Corta video **sin recodificar** (opera sobre keyframes); mucho más rápido y sin pérdida |
| [cobalt](https://github.com/imputnet/cobalt) | 41.8k ✅ | Descarga y normalización de media desde múltiples plataformas |
| [lux](https://github.com/iawia002/lux) | 31.6k ✅ | Descarga de video en Go, como librería y CLI |
| [ScreenToGif](https://github.com/NickeManarin/ScreenToGif) | 27.4k ✅ | Grabación de pantalla con editor y exportación optimizada |
| [Anime4K](https://github.com/bloc97/Anime4K) | 21.2k ✅ | Upscaling en tiempo real vía shaders; procesamiento en GPU durante la reproducción |
| [vhs](https://github.com/charmbracelet/vhs) | 20.5k ✅ | Genera GIFs de terminal desde un script declarativo; video como artefacto de documentación |
| [screenity](https://github.com/alyssaxuu/screenity) | 18.5k ✅ | Grabación de pantalla en el navegador, sin subir nada a un servidor |
| [digital_video_introduction](https://github.com/leandromoreira/digital_video_introduction) | 16.3k ✅ | La mejor introducción práctica a codecs y compresión; no es código, es el fundamento teórico |
| [VERT](https://github.com/VERT-sh/VERT) | 15.3k ✅ | Conversor de archivos local en el navegador (usa WASM) |
| [ffmpeg-libav-tutorial](https://github.com/leandromoreira/ffmpeg-libav-tutorial) | 11k ✅ | Cómo usar FFmpeg como librería (libav) en vez de como CLI |

---

## `video/production-marketing`

**Nota de categoría:** a diferencia del resto, acá el criterio editorial
(estructura de guion, formatos por canal) no tiene equivalente en repos.
Lo que sí existe son herramientas de **producción automatizada**, que son
las que se listan.

### Referencias principales

**[Remotion](https://github.com/remotion-dev/remotion)** — 54.9k ⭐ ✅
Ya descrito en `video/processing`. Acá es relevante por su caso de uso de
marketing: generar cientos de variantes personalizadas de un mismo video
(por cliente, idioma o dato) desde una sola plantilla de componentes.

**[lottie-android](https://github.com/airbnb/lottie-android)** — 35.7k ⭐ ✅
Reproduce animaciones de After Effects como JSON en Android, iOS, web y React
Native. Reemplaza el GIF pesado por un archivo vectorial de pocos KB, con
nitidez perfecta a cualquier resolución — la solución estándar para
animaciones de marca dentro de producto.

### Otros repos verificados

| Repo | ⭐ | Enfoque |
|---|---|---|
| [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | 100k ✅ | Genera videos cortos verticales completos desde un tema; el extremo de la automatización de contenido |
| [OpenMontage](https://github.com/calesthio/OpenMontage) | 44k ✅ | Sistema agéntico de producción de video con 100+ herramientas |
| [hyperframes](https://github.com/heygen-com/hyperframes) | 38.7k ✅ | Renderiza video desde HTML, pensado para ser manejado por agentes |
| [jitsi-meet](https://github.com/jitsi/jitsi-meet) | 29.7k ✅ | Videoconferencia self-hosteada; relevante si el producto incluye video en vivo |
| [livekit](https://github.com/livekit/livekit) | 20k ✅ | Infraestructura WebRTC en tiempo real para humanos y agentes |
| [lottie-ios](https://github.com/airbnb/lottie-ios) | 26.8k ✅ | La contraparte iOS de lottie-android |

*Rive (`rive-app/rive-runtime`, ~1.1k ⭐) fue evaluado y descartado como
referencia principal: es una alternativa interesante a Lottie con
animaciones interactivas controladas por estado, pero su adopción medida en
estrellas está dos órdenes de magnitud por debajo.*

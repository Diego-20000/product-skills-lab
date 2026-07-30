# Plantillas de documentación

> **Ejemplos reales y detallados** (además de los esqueletos de abajo):
> - `skill` → [`web/animation/skills/css-scroll-reveal/SKILL.md`](../web/animation/skills/css-scroll-reveal/SKILL.md)
> - `snippet` → [`web/server/snippets/rate-limit-express/README.md`](../web/server/snippets/rate-limit-express/README.md)
> - `guide` → [`mobile/cross-platform/guides/flutter-vs-react-native/README.md`](../mobile/cross-platform/guides/flutter-vs-react-native/README.md)

Cada recurso vive en su propia carpeta dentro de `skills/`, `snippets/` o
`guides/` de un pilar, por ejemplo:

```
web/animation/skills/css-scroll-reveal/SKILL.md
web/server/snippets/rate-limit-express/README.md
mobile/ios/guides/swiftui-state-management/README.md
```

El nombre de la carpeta usa `kebab-case` y describe el recurso, no la
tecnología sola (`css-scroll-reveal`, no `gsap`).

## Regla de fondo: profundidad, no tarjeta de referencia

Un recurso de este repo **no es un resumen ni una hoja de trucos**. El
`summary` del frontmatter existe solo para que una IA lo descarte o lo elija
rápido entre muchos candidatos — el cuerpo del documento tiene que explicar
el problema con profundidad real: por qué existe, qué alternativas hay, por
qué se descartaron, qué falla si se hace mal, y cómo se ve el código
completo, no un fragmento ilustrativo.

Al mismo tiempo, nada acá se copia palabra por palabra de una fuente. Cada
recurso se escribe **de cero**, en base a haber estudiado cómo resuelven el
mismo problema varios repos exitosos (ver [`SOURCES.md`](SOURCES.md)),
sintetizando el enfoque común y señalando dónde difieren — nunca
transcribiendo su código o su documentación.

---

## 1. `skills/` — formato Claude Code

El archivo se llama **`SKILL.md`** y el frontmatter sigue el formato oficial
de [Claude Code Skills](https://docs.claude.com/claude-code/skills) (solo
`name` + `description`) para que sea invocable directamente. Todo el resto
del detalle va en el cuerpo, no en el frontmatter. Para ver ejemplos
oficiales de referencia de este mismo formato (fuera del scope de este
repo, pero útil para calibrar estilo), ver
[`anthropics/skills`](https://github.com/anthropics/skills).

```markdown
---
name: css-scroll-reveal
description: Revela elementos con una animación al hacer scroll, usando solo CSS (IntersectionObserver + clases). Usar cuando se pide "animar al scrollear" sin querer sumar una librería de animación.
---

# CSS Scroll Reveal

## Contexto
Párrafo real: qué problema resuelve, por qué existe (qué pasa si no se hace
esto — ej. animaciones que corren fuera de pantalla y desperdician CPU), y
en qué categoría de soluciones se ubica frente a las alternativas conocidas.

## Cuándo usarlo
Varios bullets con la situación concreta, no una sola línea genérica.

## Cuándo NO usarlo
Varios bullets explicando *por qué* falla en cada caso, no solo el caso.

## Pasos / Código
Código completo y funcional (no un fragmento cortado), con comentarios
solo donde el "por qué" no sea obvio, y una explicación en prosa de las
partes no triviales (ej. por qué se usa `unobserve` acá).

## Edge cases / errores comunes
Qué falla si se implementa mal, con qué síntoma se nota.

## Compatibilidad
Navegadores / versiones / OS, con la fuente de esa afirmación si aplica.

## Fuentes
Qué repos se estudiaron para escribir esto y qué enfoque tiene cada uno
frente a esta solución (ver sección de abajo).
```

## 2. `snippets/` — código puntual

El archivo se llama **`README.md`** dentro de la carpeta del snippet.

```markdown
---
title: Rate limit básico en Express
platform: web
pillar: server
tags: [express, middleware, rate-limiting]
summary: Middleware de rate limiting en memoria para Express sin dependencias externas.
when_not_to_use: Si necesitás rate limit distribuido entre múltiples instancias, usar Redis en su lugar.
---

# Rate limit básico en Express

## Contexto
Por qué hace falta rate limiting acá, qué pasa sin él, y qué otras formas
de resolverlo existen (proxy, API gateway, librería dedicada) y por qué
este snippet elige la más simple.

## Código completo
Código funcional completo, no truncado.

## Uso
Cómo se integra, con un ejemplo real de llamada.

## Limitaciones conocidas
Qué no resuelve este snippet y cuándo eso importa.

## Fuentes
Qué enfoques existentes se compararon antes de escribir este snippet.
```

## 3. `guides/` — criterio y contexto

El archivo se llama **`README.md`** dentro de la carpeta de la guía.

```markdown
---
title: Cuándo usar Flutter vs React Native
platform: mobile
pillar: cross-platform
tags: [flutter, react-native, decision]
summary: Trade-offs concretos para elegir framework cross-platform según el equipo y el proyecto.
---

# Cuándo usar Flutter vs React Native

Desarrollo completo del criterio, con secciones por escenario, contra-
ejemplos, y explícitamente qué NO responde esta guía.

## Fuentes
Qué se estudió de cada proyecto para llegar a este criterio.
```

---

## Campos de frontmatter comunes a snippets y guides

| Campo | Obligatorio | Descripción |
|---|---|---|
| `title` | sí | Nombre legible del recurso |
| `platform` | sí | `web` \| `mobile` \| `automation` |
| `pillar` | sí | Uno de los pilares definidos en el `README.md` raíz |
| `tags` | sí | Lista corta, en minúsculas, para búsqueda |
| `summary` | sí | Una sola línea — es un filtro rápido para la IA, no un reemplazo del cuerpo |
| `when_not_to_use` | recomendado | Evita que una IA lo aplique mal |
| `compatibility` | si aplica | Navegadores, OS, versiones de framework |

El `summary` corto es intencional (sirve para escanear rápido muchos
recursos), pero **el cuerpo del documento no hereda ese límite** — ahí va el
detalle completo.

## La sección "Fuentes"

Todo recurso termina con una sección `## Fuentes` que lista los repos
estudiados (nombre + link, tomados de [`SOURCES.md`](SOURCES.md)) y, para
cada uno, una frase sobre qué enfoque tiene y en qué se diferencia de la
solución que este recurso propone. No es una bibliografía decorativa: es la
evidencia de que el recurso sintetiza varias fuentes reales y no es una
opinión sin sustento ni una copia de una sola.

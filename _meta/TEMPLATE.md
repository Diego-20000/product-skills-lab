# Plantillas de documentación

> **Ejemplos reales y funcionales** (además de los esqueletos de abajo):
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

---

## 1. `skills/` — formato Claude Code

El archivo se llama **`SKILL.md`** y el frontmatter sigue el formato oficial
de [Claude Code Skills](https://docs.claude.com/claude-code/skills) para que
sea invocable directamente, además de legible por cualquier otra IA o humano.

```markdown
---
name: css-scroll-reveal
description: Revela elementos con una animación al hacer scroll, usando solo CSS (IntersectionObserver + clases). Usar cuando se pide "animar al scrollear" sin querer sumar una librería de animación.
---

# CSS Scroll Reveal

## Contexto
Una línea: qué problema resuelve y por qué existe este skill.

## Cuándo usarlo
- Bullet de la situación concreta que lo dispara.

## Cuándo NO usarlo
- Casos donde este approach es la elección equivocada (ej: si ya hay GSAP en el proyecto, usar ScrollTrigger en su lugar).

## Pasos / Código
Código mínimo y funcional, listo para copiar.

## Compatibilidad
Navegadores / versiones / OS si aplica.
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

(código + una línea de uso)
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

(contenido, con o sin código de apoyo)
```

---

## Campos de frontmatter comunes a snippets y guides

| Campo | Obligatorio | Descripción |
|---|---|---|
| `title` | sí | Nombre legible del recurso |
| `platform` | sí | `web` \| `mobile` \| `automation` |
| `pillar` | sí | Uno de los pilares definidos en el `README.md` raíz |
| `tags` | sí | Lista corta, en minúsculas, para búsqueda |
| `summary` | sí | Una sola línea, qué resuelve |
| `when_not_to_use` | recomendado | Evita que una IA lo aplique mal |
| `compatibility` | si aplica | Navegadores, OS, versiones de framework |

No hace falta un campo `when_to_use` separado si el `summary` ya lo deja claro.

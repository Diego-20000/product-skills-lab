# web-skills-lab

Colección organizada de **skills**, **snippets** y **guías** reutilizables para
construir productos digitales completos: sitios y apps web, apps móviles
(iOS/Android), sistemas de automatización, diseño de producto (UI/UX) y
producción de video.

Pensado para servir tanto a humanos como a **cualquier asistente de IA** capaz
de leer un archivo Markdown con frontmatter — no es específico de Claude,
aunque los `skills/` siguen el formato de [Claude Code Skills](https://docs.claude.com/claude-code/skills)
por ser el más portable y auto-descriptivo disponible hoy.

## Cómo está organizado

```
<plataforma>/<pilar>/<tipo>/<recurso>
```

- **Plataforma**: `web/`, `mobile/`, `automation/`, `design/`, `video/`
- **Pilar**: el dominio temático dentro de esa plataforma (ver tabla abajo)
- **Tipo de recurso**:
  - `skills/` — instrucciones accionables en formato Claude Code (`SKILL.md` + frontmatter). Un asistente de IA los puede ejecutar o seguir paso a paso.
  - `snippets/` — código copy-paste puntual, sin flujo ni pasos, resuelve una cosa concreta.
  - `guides/` — buenas prácticas o contexto más largo, sin código ejecutable obligatorio.

`design/` y `video/` son plataformas propias, no sub-carpetas de `web/` o
`mobile/`, porque ambas atraviesan las dos: un design token o un video de
marketing sirven igual para un sitio web que para una app.

## Pilares actuales

| Plataforma | Pilares |
|---|---|
| `web/` | `animation`, `responsive`, `security-defense`, `security-offense`, `server`, `search`, `testing`, `accessibility` |
| `mobile/` | `ios`, `android`, `cross-platform`, `testing`, `accessibility` |
| `automation/` | `workflows-rpa`, `browser-testing`, `ci-cd-infra` |
| `design/` | `design-tokens`, `component-systems`, `handoff` |
| `video/` | `playback`, `processing`, `production-marketing` |

## Qué entra y qué no

Ver [`_meta/TAXONOMY.md`](_meta/TAXONOMY.md) para el criterio completo antes de agregar un recurso.

## Cómo contribuir

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) y la plantilla en [`_meta/TEMPLATE.md`](_meta/TEMPLATE.md).

## Licencia

[MIT](LICENSE)

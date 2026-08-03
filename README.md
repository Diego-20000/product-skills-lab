# product-skills-lab

Colección organizada de **skills**, **snippets** y **guías** reutilizables para
construir productos digitales completos: sitios y apps web, apps móviles
(iOS/Android), sistemas de automatización, diseño de producto (UI/UX) y
producción de video.

Pensado para servir tanto a humanos como a **cualquier asistente de IA** capaz
de leer un archivo Markdown con frontmatter — no es específico de Claude,
aunque los `skills/` siguen el formato de [Claude Code Skills](https://docs.claude.com/claude-code/skills)
por ser el más portable y auto-descriptivo disponible hoy.

**69 recursos** repartidos en **23 pilares** y **5 plataformas**, escritos de
cero a partir del estudio de **264 repositorios de referencia** con sus
estrellas verificadas contra GitHub.

## Cómo está organizado

```
<plataforma>/<pilar>/<tipo>/<recurso>
```

- **Plataforma**: `web/`, `mobile/`, `automation/`, `design/`, `video/`
- **Pilar**: el dominio temático dentro de esa plataforma
- **Tipo de recurso**:
  - `skills/` — instrucciones accionables en formato Claude Code (`SKILL.md` + frontmatter). Un asistente de IA los puede ejecutar o seguir paso a paso.
  - `snippets/` — código copy-paste puntual, sin flujo ni pasos, resuelve una cosa concreta.
  - `guides/` — criterio y trade-offs para una decisión, con lo que la guía explícitamente **no** responde.

`design/` y `video/` son plataformas propias, no sub-carpetas de `web/` o
`mobile/`, porque ambas atraviesan las dos: un design token o un video de
marketing sirven igual para un sitio web que para una app.

## Índice completo

### 🌐 web

| Pilar | Skill | Snippet | Guide |
|---|---|---|---|
| `animation` | [css-scroll-reveal](web/animation/skills/css-scroll-reveal/SKILL.md) | [respect-reduced-motion](web/animation/snippets/respect-reduced-motion/README.md) | [css-waapi-or-library](web/animation/guides/css-waapi-or-library/README.md) |
| `responsive` | [fluid-layout-without-breakpoints](web/responsive/skills/fluid-layout-without-breakpoints/SKILL.md) | [responsive-images-srcset](web/responsive/snippets/responsive-images-srcset/README.md) | [choosing-css-strategy](web/responsive/guides/choosing-css-strategy/README.md) |
| `security-defense` | [http-security-headers](web/security-defense/skills/http-security-headers/SKILL.md) | [sanitize-user-html](web/security-defense/snippets/sanitize-user-html/README.md) | [sessions-cookies-vs-jwt](web/security-defense/guides/sessions-cookies-vs-jwt/README.md) |
| `security-offense` | [authorized-vuln-scan](web/security-offense/skills/authorized-vuln-scan/SKILL.md) | [custom-nuclei-template](web/security-offense/snippets/custom-nuclei-template/README.md) | [scan-pentest-or-audit](web/security-offense/guides/scan-pentest-or-audit/README.md) |
| `server` | [api-error-handling](web/server/skills/api-error-handling/SKILL.md) | [rate-limit-express](web/server/snippets/rate-limit-express/README.md) | [choosing-node-framework](web/server/guides/choosing-node-framework/README.md) |
| `search` | [client-side-site-search](web/search/skills/client-side-site-search/SKILL.md) | [highlight-search-matches](web/search/snippets/highlight-search-matches/README.md) | [choosing-search-engine](web/search/guides/choosing-search-engine/README.md) |
| `integrations` | [resilient-api-client](web/integrations/skills/resilient-api-client/SKILL.md) | [api-key-proxy-route](web/integrations/snippets/api-key-proxy-route/README.md) | [evaluating-an-api-provider](web/integrations/guides/evaluating-an-api-provider/README.md) |
| `testing` | [testing-by-accessible-role](web/testing/skills/testing-by-accessible-role/SKILL.md) | [custom-render-with-providers](web/testing/snippets/custom-render-with-providers/README.md) | [what-to-test-at-each-level](web/testing/guides/what-to-test-at-each-level/README.md) |
| `accessibility` | [accessible-modal-dialog](web/accessibility/skills/accessible-modal-dialog/SKILL.md) | [skip-link-and-visually-hidden](web/accessibility/snippets/skip-link-and-visually-hidden/README.md) | [accessibility-priorities](web/accessibility/guides/accessibility-priorities/README.md) |

### 📱 mobile

| Pilar | Skill | Snippet | Guide |
|---|---|---|---|
| `ios` | [swiftui-list-image-loading](mobile/ios/skills/swiftui-list-image-loading/SKILL.md) | [keychain-secure-storage](mobile/ios/snippets/keychain-secure-storage/README.md) | [swiftui-vs-uikit](mobile/ios/guides/swiftui-vs-uikit/README.md) |
| `android` | [compose-list-performance](mobile/android/skills/compose-list-performance/SKILL.md) | [okhttp-auth-interceptor](mobile/android/snippets/okhttp-auth-interceptor/README.md) | [compose-vs-views](mobile/android/guides/compose-vs-views/README.md) |
| `cross-platform` | [platform-adaptive-components](mobile/cross-platform/skills/platform-adaptive-components/SKILL.md) | [network-status-hook](mobile/cross-platform/snippets/network-status-hook/README.md) | [flutter-vs-react-native](mobile/cross-platform/guides/flutter-vs-react-native/README.md) |
| `testing` | [maestro-smoke-flow](mobile/testing/skills/maestro-smoke-flow/SKILL.md) | [android-emulator-ci](mobile/testing/snippets/android-emulator-ci/README.md) | [mobile-testing-strategy](mobile/testing/guides/mobile-testing-strategy/README.md) |
| `accessibility` | [mobile-labels-and-touch-targets](mobile/accessibility/skills/mobile-labels-and-touch-targets/SKILL.md) | [accessible-icon-button-rn](mobile/accessibility/snippets/accessible-icon-button-rn/README.md) | [pre-release-a11y-checklist](mobile/accessibility/guides/pre-release-a11y-checklist/README.md) |

### ⚙️ automation

| Pilar | Skill | Snippet | Guide |
|---|---|---|---|
| `workflows-rpa` | [idempotent-webhook-workflow](automation/workflows-rpa/skills/idempotent-webhook-workflow/SKILL.md) | [retry-with-backoff](automation/workflows-rpa/snippets/retry-with-backoff/README.md) | [when-to-automate](automation/workflows-rpa/guides/when-to-automate/README.md) |
| `browser-testing` | [stable-e2e-selectors](automation/browser-testing/skills/stable-e2e-selectors/SKILL.md) | [playwright-auth-state](automation/browser-testing/snippets/playwright-auth-state/README.md) | [playwright-vs-puppeteer-vs-selenium](automation/browser-testing/guides/playwright-vs-puppeteer-vs-selenium/README.md) |
| `ci-cd-infra` | [ci-secret-scanning-gate](automation/ci-cd-infra/skills/ci-secret-scanning-gate/SKILL.md) | [github-actions-cache-concurrency](automation/ci-cd-infra/snippets/github-actions-cache-concurrency/README.md) | [pipeline-stages](automation/ci-cd-infra/guides/pipeline-stages/README.md) |

### 🎨 design

| Pilar | Skill | Snippet | Guide |
|---|---|---|---|
| `design-tokens` | [tokens-to-platform-variables](design/design-tokens/skills/tokens-to-platform-variables/SKILL.md) | [theme-switch-with-tokens](design/design-tokens/snippets/theme-switch-with-tokens/README.md) | [when-tokens-are-worth-it](design/design-tokens/guides/when-tokens-are-worth-it/README.md) |
| `component-systems` | [component-state-coverage](design/component-systems/skills/component-state-coverage/SKILL.md) | [variant-props-with-cva](design/component-systems/snippets/variant-props-with-cva/README.md) | [build-adopt-or-copy](design/component-systems/guides/build-adopt-or-copy/README.md) |
| `handoff` | [design-to-code-spec](design/handoff/skills/design-to-code-spec/SKILL.md) | [svg-icon-sprite](design/handoff/snippets/svg-icon-sprite/README.md) | [who-decides-what](design/handoff/guides/who-decides-what/README.md) |

### 🎬 video

| Pilar | Skill | Snippet | Guide |
|---|---|---|---|
| `playback` | [adaptive-streaming-player](video/playback/skills/adaptive-streaming-player/SKILL.md) | [lazy-video-with-poster](video/playback/snippets/lazy-video-with-poster/README.md) | [video-delivery-strategy](video/playback/guides/video-delivery-strategy/README.md) |
| `processing` | [client-side-video-trim](video/processing/skills/client-side-video-trim/SKILL.md) | [scrubbing-thumbnail-sprite](video/processing/snippets/scrubbing-thumbnail-sprite/README.md) | [client-or-server-processing](video/processing/guides/client-or-server-processing/README.md) |
| `production-marketing` | [channel-export-presets](video/production-marketing/skills/channel-export-presets/SKILL.md) | [lottie-web-embed](video/production-marketing/snippets/lottie-web-embed/README.md) | [choosing-motion-format](video/production-marketing/guides/choosing-motion-format/README.md) |

## Cómo se escribe cada recurso

Nada acá es una copia. Cada recurso se escribe **de cero**, después de
estudiar cómo resuelven el mismo problema varios proyectos exitosos, y
sintetiza el enfoque común señalando dónde difieren. La analogía: varias
ediciones de un libro de historia sobre el mismo período — cada editorial
tiene su enfoque, y lo que entra acá es la síntesis propia.

Por eso cada recurso termina con una sección **"Fuentes"** que declara qué
proyectos se estudiaron y qué aporta cada uno. Es trazabilidad, no
bibliografía decorativa.

El catálogo completo de fuentes está en [`_meta/SOURCES.md`](_meta/SOURCES.md):
256 repositorios con sus estrellas **verificadas contra GitHub**, no contra
artículos. Cuando un pilar no tiene un proyecto de referencia grande (pasa en
`mobile/accessibility` y en `design/design-tokens`), el catálogo lo dice
explícitamente en vez de rellenar con referencias débiles.

## Para agentes de IA

El índice legible por máquina está en **[`_meta/index.json`](_meta/index.json)**.
Trae los 69 recursos con `path`, `platform`, `pillar`, `type`, `tags`,
`summary` y `whenNotToUse`, más las convenciones del repo — sin necesidad de
parsear tablas Markdown ni recorrer el árbol de directorios.

```js
const index = await fetch(
  'https://raw.githubusercontent.com/Diego-20000/product-skills-lab/main/_meta/index.json'
).then((r) => r.json());

// Filtrar por tema, cruzando pilares
index.resources.filter((r) => r.tags.includes('a11y'));

// Solo lo accionable de una plataforma
index.resources.filter((r) => r.platform === 'mobile' && r.type === 'skill');
```

Se regenera con `node scripts/build-index.mjs`, que además valida frontmatter,
secciones obligatorias y links internos. Corre en CI en cada push.

## Documentación del repo

| Archivo | Para qué |
|---|---|
| [`_meta/index.json`](_meta/index.json) | Índice legible por máquina de los 69 recursos |
| [`_meta/TAXONOMY.md`](_meta/TAXONOMY.md) | Qué entra y qué no entra, por pilar |
| [`_meta/TEMPLATE.md`](_meta/TEMPLATE.md) | Plantilla y nivel de detalle exigido para cada tipo |
| [`_meta/SOURCES.md`](_meta/SOURCES.md) | Catálogo de los 264 repos de referencia |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Cómo agregar un recurso nuevo |

## Licencia

[MIT](LICENSE)

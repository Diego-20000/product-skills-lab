# Taxonomía: qué entra y qué no entra

Este documento es la referencia para decidir si un recurso nuevo pertenece a
`web-skills-lab`, y en qué carpeta. Ante la duda, se aplica primero el
**criterio general** y después las notas específicas de cada pilar.

## Criterio general

**Entra un recurso si cumple las tres condiciones:**
1. Es **reutilizable** en más de un proyecto (no es una decisión específica de un proyecto tuyo).
2. Es **accionable**: código, configuración o instrucciones paso a paso — no solo opinión o teoría sin ejemplo.
3. Pertenece a una de las cinco plataformas del repo: **web**, **mobile** (iOS/Android/cross-platform), **automatización** de sistemas/workflows/testing, **diseño** de producto (UI/UX) o **video**.

**No entra:**
- Contenido sin código ni pasos concretos (eso es un blog post, no un skill/snippet/guide).
- Librerías completas de terceros vendorizadas — se referencian con link + un ejemplo de uso mínimo, nunca se copia el código fuente de la librería.
- Recursos que son simplemente una copia de una "awesome-list" ya existente sin curación ni valor agregado propio (contexto de cuándo usarlo, cuándo no, ejemplo probado).
- Contenido específico de un solo proyecto (secretos, configuración con datos reales, nombres de clientes).
- Manuales completos de un framework (para eso ya existe la documentación oficial) — acá va el patrón puntual, no el tutorial de punta a punta.

## Notas por pilar

### `web/`
- **`security-defense/`**: hardening, headers HTTP, gestión de auth/sesiones, buenas prácticas OWASP aplicadas al código propio. El objetivo es proteger un sistema, no atacarlo.
- **`security-offense/`**: pentesting, scanning de vulnerabilidades, herramientas de auditoría. Solo con fines de **testing autorizado sobre sistemas propios o con permiso explícito** — nunca instrucciones de explotación contra terceros sin autorización.
- **`server/`**: patrones de backend web (APIs, middlewares, arquitectura de rutas) — es el **código de la aplicación**. La regla para no confundir con `automation/ci-cd-infra`: si es código que corre como parte de la app, va en `server/`; si es la forma en la que esa app se construye, despliega o hostea (pipelines, infraestructura como código), va en `ci-cd-infra/`, sin importar de qué pilar es la app.
- **`search/`**: integración de motores de búsqueda/indexado en producto (site search), no algoritmos de búsqueda académicos.
- **`testing/`**: patrones de testing unitario/e2e específicos de apps web (Jest, Vitest, Testing Library, estructura de specs de Playwright/Cypress como test, no como automatización de browser genérica — eso es `automation/browser-testing`).
- **`accessibility/`**: patrones de accesibilidad web (ARIA, navegación por teclado, contraste, lectura por screen reader), aplicados a componentes o páginas concretas.

### `mobile/`
- Solo contenido con impacto directo en **apps móviles distribuibles** (App Store / Play Store) o en frameworks cross-platform que compilan a ambas.
- No entran tutoriales genéricos de Swift/Kotlin como lenguaje si no están aplicados a un patrón de app (para eso ya existen `awesome-ios` / `awesome-kotlin`).
- **`testing/`**: patrones de testing específicos de mobile (XCTest, Espresso, testing de widgets en Flutter), no automatización de browser.
- **`accessibility/`**: patrones de accesibilidad mobile (VoiceOver, TalkBack, tamaños de touch target, contraste), aplicados a componentes o pantallas concretas.

### `automation/`
- **`workflows-rpa/`**: automatización de procesos de negocio/integración entre sistemas (tipo n8n, Activepieces).
- **`browser-testing/`**: automatización de navegador para testing o scraping legítimo (Playwright, Puppeteer, Selenium).
- **`ci-cd-infra/`**: pipelines de integración/despliegue continuo e infraestructura como código.

### `design/`
Es una plataforma propia (no una subcarpeta de `web/` ni `mobile/`) porque
un design token o un patrón de componente sirven para las dos por igual —
vive acá cualquier recurso que sea sobre el **diseño de producto en sí**,
no sobre su implementación en un stack particular.
- **`design-tokens/`**: definición y pipeline de tokens (color, tipografía, espaciado, sombras) y cómo se transforman a variables de código para web y mobile.
- **`component-systems/`**: patrones de sistemas de componentes (estados de un botón, specs de un modal, primitivas accesibles sin estilo), independientes de si el consumidor final es React web o una app nativa.
- **`handoff/`**: flujos de traspaso diseño → código (qué exportar, cómo nombrar assets, qué información necesita quien implementa) — no es "cómo usar Figma", es el criterio de qué información cruza la frontera diseño/código.
- No entran tutoriales de manejo de una herramienta de diseño (Figma, Sketch) en sí — eso ya lo cubre la documentación oficial de la herramienta. Acá va el patrón/criterio, no el manual de uso.

### `video/`
También plataforma propia: mezcla código (reproducción/procesamiento en
el navegador) con producción de contenido (guiones, formatos de
exportación), que son disciplinas distintas pero ambas caen bajo "video".
- **`playback/`**: reproducción de video en el navegador (streaming adaptativo HLS/DASH, players con UI custom, accesibilidad de controles de video).
- **`processing/`**: procesamiento/transcodificación de video en el cliente o el servidor (recorte, conversión de formato, extracción de frames).
- **`production-marketing/`**: criterios de producción para video de marketing/producto (estructura de guion, especificaciones de exportación por canal — App Store, redes sociales). Este sub-pilar es mayormente `guides/`, no código — no hay "repos exitosos" equivalentes para esto, así que se apoya en criterio propio documentado igual de explícito que el resto.

## Duda recurrente: ¿"skill", "snippet" o "guide"?

| Si el recurso... | Va en... |
|---|---|
| Le decís a una IA "hacé esto" y sigue pasos con un objetivo | `skills/` |
| Es un bloque de código que resuelve una cosa puntual, sin pasos | `snippets/` |
| Explica un criterio o trade-off, con o sin código de apoyo | `guides/` |

## Cómo se escribe un recurso: síntesis, no copia

Cada skill/snippet/guide se escribe **estudiando cómo resuelven el mismo
problema varios repos exitosos** (ver [`SOURCES.md`](SOURCES.md)) y destilando
el enfoque común entre ellos — no transcribiendo el código o la documentación
de uno solo. La idea es la misma que comparar varios libros de historia sobre
el mismo período: cada "editorial" (repo) tiene su enfoque, y lo que va en
este repo es la síntesis propia, escrita de cero, en un formato parseable
tanto por una persona como por cualquier IA.

En la práctica:
- Antes de escribir un recurso nuevo, revisar qué repos relevantes ya están en `SOURCES.md` para ese pilar (o agregar uno si falta).
- El recurso final no cita ni reproduce código de esos repos — lo referencia por nombre en una sección **"Fuentes"** al final (ver [`TEMPLATE.md`](TEMPLATE.md)), como trazabilidad de qué se estudió para escribirlo.
- Si dos repos resuelven lo mismo de formas distintas, el recurso puede mencionar ambos enfoques (ej. "a diferencia de X, que hace A, acá se opta por B porque...").

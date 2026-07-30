# Taxonomía: qué entra y qué no entra

Este documento es la referencia para decidir si un recurso nuevo pertenece a
`web-skills-lab`, y en qué carpeta. Ante la duda, se aplica primero el
**criterio general** y después las notas específicas de cada pilar.

## Criterio general

**Entra un recurso si cumple las tres condiciones:**
1. Es **reutilizable** en más de un proyecto (no es una decisión específica de un proyecto tuyo).
2. Es **accionable**: código, configuración o instrucciones paso a paso — no solo opinión o teoría sin ejemplo.
3. Pertenece a uno de los tres pilares del repo: **web**, **mobile** (iOS/Android/cross-platform) o **automatización** de sistemas/workflows/testing.

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

## Duda recurrente: ¿"skill", "snippet" o "guide"?

| Si el recurso... | Va en... |
|---|---|
| Le decís a una IA "hacé esto" y sigue pasos con un objetivo | `skills/` |
| Es un bloque de código que resuelve una cosa puntual, sin pasos | `snippets/` |
| Explica un criterio o trade-off, con o sin código de apoyo | `guides/` |

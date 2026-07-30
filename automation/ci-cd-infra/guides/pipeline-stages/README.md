---
title: Qué va en cada etapa del pipeline
platform: automation
pillar: ci-cd-infra
tags: [ci-cd, pipeline, devops, decision, feedback-loop]
summary: Criterio para ordenar las verificaciones de un pipeline según costo y probabilidad de fallo, de modo que el feedback llegue rápido y el CI no se vuelva un peaje.
---

# Qué va en cada etapa del pipeline

## El principio que ordena todo

> Lo que falla más seguido y cuesta menos, va primero.

Un pipeline es una secuencia de filtros. Si el más lento está adelante, cada
error trivial —una coma faltante, un import sin usar— cuesta el tiempo
completo de la etapa cara. Si el más barato está adelante, ese mismo error
se reporta en treinta segundos.

El objetivo no es "tener muchas verificaciones" sino **minimizar el tiempo
entre cometer un error y enterarse**. Un pipeline de 40 minutos que nadie
espera —la gente sigue trabajando y vuelve más tarde— tiene un ciclo de
feedback peor que uno de 8 minutos que se mira completo.

## Etapa 0 — Antes del pipeline: en la máquina de quien programa

Lo más rápido de todo es no llegar al CI. Con hooks pre-commit:

- Formateo automático (Prettier, ktlint, SwiftFormat): no debería fallar nunca en CI porque se arregla solo al commitear.
- Lint de lo que cambió.
- Detección de secretos — ver el skill [`ci-secret-scanning-gate`](../../skills/ci-secret-scanning-gate/SKILL.md).

**Importante:** los hooks son evitables (`--no-verify`) y quien clona el
repo puede no instalarlos. Son una conveniencia, no una garantía; todo lo
que importa hay que verificarlo también en CI.

## Etapa 1 — Verificación estática (segundos)

Corre en paralelo, en un solo job, sin construir nada:

- Lint y chequeo de formato.
- Chequeo de tipos (`tsc --noEmit`, compilación sin artefactos).
- Escaneo de secretos sobre el historial.
- Auditoría de dependencias con CVEs conocidos.

Es la etapa con mejor relación costo/detección: cuesta segundos y atrapa la
mayoría de los errores del día a día.

## Etapa 2 — Tests rápidos (1-3 minutos)

Unitarios y de componentes. Sin base de datos, sin navegador, sin emulador.

Si esta etapa pasa de unos pocos minutos, casi siempre significa que hay
tests que en realidad son de integración mezclados con los unitarios, o que
falta paralelización.

## Etapa 3 — Build (2-5 minutos)

Construir el artefacto real: bundle de producción, imagen de contenedor, APK.

Va después de los tests rápidos porque es más caro, pero antes de los tests
lentos porque muchos de ellos necesitan el artefacto. Es también donde se
detectan errores que solo aparecen en el build de producción
(tree-shaking que rompe algo, minificación, variables de entorno faltantes).

## Etapa 4 — Tests de integración (5-15 minutos)

Contra dependencias reales levantadas en contenedores: base de datos, cola,
servicios mockeados a nivel HTTP.

Es el nivel más subestimado y el que mejor detecta los errores que importan
en producción (consultas mal escritas, migraciones incompatibles, contratos
rotos).

## Etapa 5 — E2E y verificaciones lentas (10-30 minutos)

Los flujos críticos en navegador o emulador, escaneo de vulnerabilidades
contra un entorno desplegado, auditorías de performance y accesibilidad.

**Esta etapa no siempre debe correr en cada push.** Opciones razonables
según el proyecto: solo en PRs a `main`, solo en la rama principal, o de
forma programada. Correr 30 minutos de E2E en cada commit de una rama de
trabajo es el camino más directo a que el equipo empiece a saltear el CI.

## Qué corre cuándo — la tabla de decisión

| Verificación | En cada push | En PR | En `main` | Programado |
|---|---|---|---|---|
| Lint, tipos, formato | ✅ | ✅ | ✅ | |
| Tests unitarios | ✅ | ✅ | ✅ | |
| Build | ✅ | ✅ | ✅ | |
| Tests de integración | | ✅ | ✅ | |
| E2E completo | | ✅ | ✅ | |
| Escaneo de vulnerabilidades | | | ✅ | ✅ semanal |
| Auditoría de dependencias | | ✅ | ✅ | ✅ semanal |
| Tests en matriz de versiones | | | ✅ | ✅ nocturno |

Las verificaciones **programadas** son las que más se olvidan y las que
detectan una categoría propia: hallazgos nuevos sobre código que no cambió
(un CVE publicado sobre una dependencia que ya estaba).

## Reglas que mantienen el pipeline sano

**Paralelizar lo independiente.** Lint, tipos y tests unitarios no dependen
entre sí: van en jobs paralelos, no en secuencia.

**Cachear con claves correctas.** Un caché mal configurado es peor que no
tenerlo — ver el snippet [`github-actions-cache-concurrency`](../../snippets/github-actions-cache-concurrency/README.md).

**Cancelar corridas obsoletas.** Tres pushes seguidos a un PR no deberían
correr tres pipelines completos.

**Fallar rápido, pero reportar todo.** En una matriz de versiones,
`fail-fast: false` permite ver todas las que fallan en vez de solo la
primera.

**Timeout en cada job.** Sin él, un job colgado consume minutos de runner
hasta el límite de la plataforma.

**Permisos mínimos.** El token del CI suele tener más permisos de los
necesarios por defecto; declararlos explícitamente reduce el daño de una
dependencia comprometida.

## Errores frecuentes

- **Poner E2E en la etapa 1** "para detectar antes": produce el efecto contrario, porque cualquier error de lint cuesta 30 minutos.
- **Un solo job monolítico** que hace todo en secuencia: no se puede paralelizar, ni reintentar solo la parte que falló, ni saber qué tardó.
- **Tests intermitentes tapados con reintentos**: el pipeline queda verde y deja de significar algo. Ver el skill [`stable-e2e-selectors`](../../../../automation/browser-testing/skills/stable-e2e-selectors/SKILL.md).
- **Verificaciones que nadie mira**: si un job falla siempre y todos lo ignoran, hay que arreglarlo o sacarlo. Un check permanentemente rojo entrena al equipo a ignorar el rojo.
- **Secretos como variables de entorno en el workflow**: van en el gestor de secretos de la plataforma, y no deben quedar accesibles a jobs de PRs de forks.
- **No medir la duración**: sin datos de cuánto tarda cada etapa, la optimización es a ciegas.

## Qué NO responde esta guía

- **No cubre estrategias de despliegue** (blue-green, canary, feature flags), que empiezan donde termina el pipeline de verificación.
- **No cubre monorepos**, donde aparece un problema propio: determinar qué se afectó para no correr todo en cada cambio.
- **No cubre elección de plataforma de CI.** Los principios aplican igual a GitHub Actions, GitLab CI, Jenkins o Buildkite.
- **No fija duraciones objetivo.** Los números de acá son órdenes de magnitud típicos, no metas.

## Fuentes

- **act** (71.3k ⭐): correr workflows localmente acorta drásticamente el ciclo de iteración sobre el propio pipeline; su popularidad es una medida directa de cuánto duele ese ciclo.
- **dagger** (16.1k ⭐) y **earthly** (12k ⭐): atacan el problema de raíz — pipelines como código portable con caché de contenido, que corren igual local y en cualquier CI. Son la respuesta al "en mi máquina anda" del propio pipeline.
- **Jenkins** (26.2k ⭐): el sistema histórico; su ecosistema de plugins muestra tanto la flexibilidad como el costo de mantener un CI propio.
- **argo-cd** (23.8k ⭐): GitOps — donde termina este pipeline y empieza el despliegue declarativo.
- **gitleaks** (28.4k ⭐) y **trivy** (37.1k ⭐): las dos verificaciones de seguridad que corresponden a etapas distintas — gitleaks en la 1 (rápido, sobre el repo), trivy sobre el artefacto construido en la 3.
- **infracost** (12.4k ⭐): un ejemplo del tipo de verificación que aporta información en el PR sin bloquear — mostrar el costo en dólares de un cambio de infraestructura.
- **moon** (4k ⭐): relevante para el caso de monorepos que esta guía deja fuera, donde la pregunta es qué recompilar y qué no.

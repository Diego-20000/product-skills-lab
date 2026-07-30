---
title: Caché de dependencias y cancelación de corridas en GitHub Actions
platform: automation
pillar: ci-cd-infra
tags: [github-actions, cache, ci, concurrency, performance]
summary: Reduce el tiempo y el costo de CI cacheando dependencias con claves correctas y cancelando corridas obsoletas del mismo PR automáticamente.
when_not_to_use: No cachear el resultado de un build que debe ser reproducible desde cero (release final) — ahí un caché corrupto es peor que la espera.
---

# Caché de dependencias y cancelación de corridas en GitHub Actions

## Contexto

Dos ajustes de pocas líneas resuelven la mayor parte del desperdicio de un
pipeline típico.

El primero es el **caché de dependencias**. Sin él, cada corrida descarga
todo el árbol de `node_modules` desde cero: en un proyecto mediano son
varios minutos por job, multiplicados por cada push. Lo que hace que un
caché funcione o no es la **clave**: si es demasiado genérica, se reutiliza
un caché desactualizado; si incluye algo que cambia siempre (el SHA del
commit), nunca hay acierto y el caché no sirve de nada. La clave correcta es
un hash del lockfile — cambia exactamente cuando cambian las dependencias.

El segundo es la **cancelación de corridas obsoletas**. Por defecto, si
alguien pushea tres commits seguidos a un PR, GitHub corre los tres
pipelines completos aunque solo importe el último. Con `concurrency`, los
dos primeros se cancelan automáticamente.

## Código completo

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

# Cancela corridas anteriores del mismo PR o rama.
# github.head_ref existe en PRs; github.ref en pushes directos.
concurrency:
  group: ci-${{ github.workflow }}-${{ github.head_ref || github.ref }}
  # En main NO se cancela: cada commit de main debe verificarse completo
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

# Permisos mínimos: por defecto el token tiene más de los necesarios
permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      # setup-node ya cachea el store del gestor de paquetes.
      # Para pnpm hay que instalarlo ANTES de setup-node.
      - uses: pnpm/action-setup@v4
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'          # cachea el store, no node_modules

      - name: Instalar dependencias
        run: pnpm install --frozen-lockfile

      # Caché adicional para artefactos de build de herramientas.
      # restore-keys permite un acierto parcial cuando la clave exacta falla.
      - name: Cachear artefactos de build
        uses: actions/cache@v4
        with:
          path: |
            .next/cache
            node_modules/.cache
          key: build-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('src/**') }}
          restore-keys: |
            build-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
            build-${{ runner.os }}-

      - name: Lint
        run: pnpm lint

      - name: Tests
        run: pnpm test --run

      - name: Build
        run: pnpm build
```

**Job matriz reutilizando el mismo caché**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false           # queremos ver TODAS las versiones que fallan
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

**Otros ecosistemas — misma lógica de clave**

```yaml
# Python
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: 'pip'
    cache-dependency-path: requirements*.txt

# Gradle / Android
- uses: gradle/actions/setup-gradle@v4   # cachea dependencias y build cache

# Docker layers con Buildx
- uses: docker/build-push-action@v6
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Job condicional: no correr si solo cambió documentación**

```yaml
on:
  pull_request:
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.github/ISSUE_TEMPLATE/**'
```

## Uso

Para verificar que el caché realmente funciona, mirar el log del step:

```
Cache restored from key: build-Linux-a1b2c3-d4e5f6
```

Si en cada corrida aparece `Cache not found for input keys`, la clave está
mal construida —casi siempre porque incluye algo que cambia siempre— y el
caché no está aportando nada.

## Limitaciones conocidas

- **GitHub limita el caché a 10 GB por repositorio** y desaloja por LRU. Cachear cosas enormes (imágenes de emulador, artefactos de build grandes) puede expulsar los cachés que más se usan.
- **Los cachés no se comparten entre ramas arbitrarias**: una rama solo puede restaurar cachés de sí misma o de su rama base. Por eso conviene que `main` genere el caché "semilla" que las ramas nuevas heredan.
- **`cancel-in-progress` en `main` es peligroso**: si dos merges entran seguidos, cancelar el primero deja un commit sin verificar. Por eso la expresión condicional que solo cancela en PRs.
- **Cachear `node_modules` directamente es frágil**: contiene binarios compilados para una plataforma y versión de Node específicas. Es más seguro cachear el store del gestor (`~/.pnpm-store`, `~/.npm`) y dejar que la instalación reconstruya los enlaces.
- **Un caché corrupto produce fallos inexplicables**: si un job falla de forma incoherente y localmente pasa, vaciar el caché es una prueba diagnóstica válida.
- **`restore-keys` puede traer un caché viejo** que hace pasar el build con dependencias desactualizadas. Es un compromiso consciente: acelera, a costa de precisión.

## Fuentes

- **act** (71.3k ⭐): corre workflows de GitHub Actions localmente, lo que permite iterar sobre esta configuración sin pushear un commit por intento. Su popularidad mide directamente cuánto duele el ciclo de feedback de CI.
- **dagger** (16.1k ⭐): ataca el problema de raíz — pipelines como código portable con caché de contenido, que funciona igual local y en cualquier CI, en vez de depender de la implementación de caché de cada plataforma.
- **earthly** (12k ⭐): misma idea con sintaxis a mitad de camino entre Dockerfile y Makefile; su caché por capas es más granular que el de Actions.
- **moon** (4k ⭐): build system para monorepos con caché de tareas; relevante cuando el problema deja de ser "cachear dependencias" y pasa a ser "no rebuildear lo que no cambió".

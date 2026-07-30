---
title: Reintento con backoff exponencial y jitter
platform: automation
pillar: workflows-rpa
tags: [retry, backoff, jitter, resilience, api]
summary: Reintenta operaciones que fallan por causas transitorias con espera creciente y aleatorizada, distinguiendo errores recuperables de los que no lo son.
when_not_to_use: No reintentar operaciones no idempotentes sin una clave de idempotencia — un reintento de "cobrar" puede cobrar dos veces.
---

# Reintento con backoff exponencial y jitter

## Contexto

Cualquier integración con un sistema externo falla de vez en cuando por
causas temporales: un 503 durante un deploy del proveedor, un timeout de
red, un rate limit alcanzado. Reintentar resuelve la mayoría de esos casos,
pero **cómo** se reintenta hace toda la diferencia.

Reintentar de inmediato y en bucle empeora el problema: si el servicio está
sobrecargado, más requests lo hunden más. Reintentar con espera fija tiene un
problema más sutil y más peligroso — el **efecto manada**: si cien clientes
fallan al mismo tiempo (porque el servicio se cayó), y todos esperan
exactamente 2 segundos, los cien reintentan simultáneamente y vuelven a
tumbarlo apenas se recupera.

El backoff exponencial resuelve lo primero (cada intento espera más que el
anterior) y el **jitter** —aleatorizar la espera— resuelve lo segundo,
dispersando los reintentos en el tiempo. Es la diferencia entre un pico de
carga sincronizado y una curva suave.

La otra mitad del problema es **qué** reintentar: un 400 por payload
inválido va a fallar igual las cinco veces, y reintentarlo solo agrega ruido
y latencia.

## Código completo

```js
/**
 * Errores que vale la pena reintentar: fallas transitorias.
 * Un 4xx (salvo 408 y 429) indica un problema del request que
 * no se arregla repitiéndolo.
 */
function isRetryable(error) {
  // Errores de red sin respuesta
  if (!error.status) {
    const transient = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];
    return transient.includes(error.code) || error.name === 'AbortError';
  }
  // 408 Timeout, 429 Rate limit, y toda la familia 5xx
  return error.status === 408 || error.status === 429 || error.status >= 500;
}

/**
 * Espera con backoff exponencial + jitter completo.
 * "Full jitter": random entre 0 y el delay calculado. Es el que mejor
 * dispersa la carga según los análisis de AWS sobre este problema.
 */
function computeDelay(attempt, { baseMs, maxMs }) {
  const exponential = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.random() * exponential;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {Function} fn        Operación async a ejecutar
 * @param {object}   options
 * @param {number}   options.retries   Reintentos además del intento inicial
 * @param {number}   options.baseMs    Base del backoff
 * @param {number}   options.maxMs     Techo del delay
 * @param {Function} options.shouldRetry  Predicado propio (default: isRetryable)
 * @param {Function} options.onRetry   Callback para loguear cada reintento
 * @param {AbortSignal} options.signal Permite cancelar desde afuera
 */
export async function retry(fn, {
  retries = 3,
  baseMs = 500,
  maxMs = 30_000,
  shouldRetry = isRetryable,
  onRetry,
  signal,
} = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new Error('Aborted');

    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      const isLast = attempt === retries;
      if (isLast || !shouldRetry(error)) throw error;

      // Si el servidor dice cuánto esperar (429 / 503), respetarlo:
      // siempre sabe mejor que nuestro cálculo.
      const retryAfter = Number(error.headers?.['retry-after']);
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : computeDelay(attempt, { baseMs, maxMs });

      onRetry?.({ attempt: attempt + 1, delay, error });
      await sleep(delay);
    }
  }

  throw lastError;
}
```

**Wrapper para `fetch` que normaliza el error**

```js
export async function fetchWithRetry(url, init = {}, retryOptions = {}) {
  return retry(async () => {
    const response = await fetch(url, init);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} en ${url}`);
      error.status = response.status;
      error.headers = Object.fromEntries(response.headers);
      error.body = await response.text().catch(() => '');
      throw error;
    }
    return response;
  }, retryOptions);
}
```

**Versión Python** (para nodos de código de plataformas que usan Python):

```python
import random, time
from typing import Callable, TypeVar

T = TypeVar("T")

RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}

def retry(fn: Callable[[int], T], retries: int = 3,
          base_ms: int = 500, max_ms: int = 30_000) -> T:
    last_error = None
    for attempt in range(retries + 1):
        try:
            return fn(attempt)
        except Exception as error:
            last_error = error
            status = getattr(error, "status", None)
            retryable = status is None or status in RETRYABLE_STATUS
            if attempt == retries or not retryable:
                raise
            delay = random.random() * min(max_ms, base_ms * 2 ** attempt)
            time.sleep(delay / 1000)
    raise last_error
```

## Uso

```js
const data = await fetchWithRetry(
  'https://api.proveedor.example/v1/orders',
  { method: 'POST', body: JSON.stringify(order), headers: { 'Idempotency-Key': order.id } },
  {
    retries: 4,
    baseMs: 300,
    onRetry: ({ attempt, delay, error }) =>
      logger.warn({ attempt, delay, status: error.status }, 'reintentando'),
  }
);
```

```js
// Solo reintentar rate limits, no errores de servidor
await retry(sendEmail, {
  retries: 5,
  shouldRetry: (err) => err.status === 429,
});
```

## Limitaciones conocidas

- **Reintentar operaciones no idempotentes duplica efectos.** Si el request creó el pedido pero la respuesta se perdió, el reintento crea un segundo pedido. La protección es una clave de idempotencia (ver el skill [`idempotent-webhook-workflow`](../../skills/idempotent-webhook-workflow/SKILL.md)), no el reintento en sí.
- **`retries` alto multiplica la latencia del peor caso.** Con `retries: 5` y `maxMs: 30000`, un fallo definitivo puede tardar más de un minuto en reportarse. Si hay un usuario esperando, conviene un presupuesto de tiempo total además del conteo.
- **No implementa circuit breaker**: si el servicio está caído de verdad, cada operación va a agotar sus reintentos igual. Para tráfico alto conviene un breaker que corte el flujo tras N fallos consecutivos y reintente el circuito periódicamente.
- **El jitter completo puede dar delays muy cortos** (random desde 0). Es intencional —maximiza la dispersión— pero si se necesita un piso, la variante "equal jitter" (`delay/2 + random(delay/2)`) lo garantiza.
- **`Retry-After` puede venir como fecha HTTP**, no solo como segundos. Este código solo maneja el formato numérico; con proveedores que usan fecha hay que parsearla.

## Fuentes

- **n8n** (199k ⭐): sus nodos exponen reintentos configurables por nodo, que cubren el caso simple. Este snippet es lo que hace falta cuando la lógica de qué reintentar depende del contenido del error, algo que la configuración declarativa no expresa.
- **Temporal** (22k ⭐): lleva esto al extremo correcto — las políticas de reintento son parte del motor de ejecución durable, así que sobreviven a caídas del proceso. Es la referencia de hacia dónde escalar cuando el reintento en memoria no alcanza.
- **Activepieces** (23.5k ⭐): mismo problema resuelto con configuración por pieza; útil para comparar cuánto viene dado por la plataforma.
- **OkHttp** (47k ⭐): su manejo de reintentos y su distinción entre fallas de conexión y de aplicación es una implementación madura del mismo criterio de `isRetryable`.

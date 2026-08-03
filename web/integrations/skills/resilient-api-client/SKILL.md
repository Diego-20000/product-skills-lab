---
name: resilient-api-client
description: Construye un cliente para una API de terceros que no tumbe tu app cuando el proveedor falla — con timeout, reintentos acotados, circuit breaker, caché y degradación explícita. Usar al integrar cualquier servicio externo cuyo downtime no controlás.
tags: [api, integration, resilience, circuit-breaker, timeout, caching]
---

# Resilient API Client

## Contexto

Integrar una API de terceros introduce una dependencia sobre infraestructura
que no controlás: su uptime, su latencia y sus límites de uso pasan a ser
tuyos. El modo de falla que más daño hace no es que el proveedor devuelva un
error —eso se maneja— sino que **responda lento**. Sin timeout, cada request
a tu app queda esperando; las conexiones se acumulan; y un servicio
secundario (el widget del clima en el footer) termina tumbando el checkout.

Ese es el punto central: una integración mal aislada convierte la caída
parcial de un proveedor en una caída total tuya.

Las cinco piezas de este skill atacan eso en orden de importancia:
**timeout** (nunca esperar indefinidamente), **reintentos acotados** (solo
errores transitorios), **circuit breaker** (dejar de golpear un servicio que
ya sabemos caído), **caché** (servir lo último bueno) y **degradación
explícita** (decidir de antemano qué se muestra cuando no hay dato).

## Cuándo usarlo

- Se integra cualquier API de terceros: pagos, geolocalización, clima, tipos de cambio, verificación de email, envío de mensajes.
- Ya pasó que un proveedor lento o caído degradó la app entera.
- El servicio externo tiene rate limits y hay que respetarlos sin perder requests.
- Se está evaluando un proveedor y hay que saber qué defensas hacen falta antes de depender de él.

## Cuándo NO usarlo

- **Para tu propio backend** desde tu propio frontend: ahí controlás ambos lados y el problema es otro (ver `web/server`).
- **Si el SDK oficial del proveedor ya trae esto**: Stripe, AWS y varios otros incluyen reintentos, timeouts e idempotencia bien resueltos. Envolverlos otra vez agrega capas sin beneficio — conviene leer qué trae antes de construir.
- **Para una llamada única en un script**: un `fetch` con timeout alcanza; el circuit breaker no tiene sentido sin tráfico sostenido.

## Pasos / Código

**1. Timeout — lo primero y lo no negociable**

```js
async function fetchWithTimeout(url, { timeoutMs = 5000, ...init } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    // clearTimeout en finally: sin esto, el timer sigue vivo y
    // mantiene el proceso Node despierto hasta que dispare.
    clearTimeout(timer);
  }
}
```

El valor del timeout debería salir de la latencia real observada del
proveedor (su p99), no de un número redondo elegido a ojo.

**2. Circuit breaker — dejar de insistir con lo que ya sabemos roto**

```js
class CircuitBreaker {
  #failures = 0;
  #openedAt = null;

  constructor({ threshold = 5, cooldownMs = 30_000 } = {}) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  get state() {
    if (this.#openedAt === null) return 'closed';
    // half-open: pasó el cooldown, se permite UN intento de prueba
    return Date.now() - this.#openedAt > this.cooldownMs ? 'half-open' : 'open';
  }

  async run(fn) {
    if (this.state === 'open') {
      const err = new Error('Circuit breaker abierto');
      err.code = 'CIRCUIT_OPEN';
      throw err;
    }

    try {
      const result = await fn();
      // Éxito: se cierra el circuito y se resetea el conteo
      this.#failures = 0;
      this.#openedAt = null;
      return result;
    } catch (error) {
      this.#failures += 1;
      if (this.#failures >= this.threshold) this.#openedAt = Date.now();
      throw error;
    }
  }
}
```

Sin breaker, un proveedor caído recibe todas tus requests, cada una
esperando su timeout completo. Con breaker, después de N fallos las
siguientes fallan de inmediato — la app responde rápido en vez de colgarse,
y el proveedor recibe respiro para recuperarse.

**3. El cliente completo, componiendo las piezas**

```js
import { retry } from './retry.js';   // ver automation/workflows-rpa/snippets/retry-with-backoff

export function createApiClient({
  baseUrl,
  apiKey,
  timeoutMs = 5000,
  cacheTtlMs = 60_000,
}) {
  const breaker = new CircuitBreaker({ threshold: 5, cooldownMs: 30_000 });
  const cache = new Map();

  async function request(path, { params = {}, ...init } = {}) {
    const url = new URL(path, baseUrl);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const cacheKey = url.toString();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < cacheTtlMs) {
      return cached.data;
    }

    try {
      const data = await breaker.run(() =>
        retry(async () => {
          const res = await fetchWithTimeout(url, {
            ...init,
            timeoutMs,
            headers: {
              // La clave va en un header, NUNCA en la query string:
              // las URLs quedan en logs de servidor, proxies y Referer.
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/json',
              ...init.headers,
            },
          });

          if (!res.ok) {
            const err = new Error(`${res.status} en ${path}`);
            err.status = res.status;
            err.headers = Object.fromEntries(res.headers);
            throw err;
          }
          return res.json();
        }, { retries: 2, baseMs: 300 })
      );

      cache.set(cacheKey, { data, at: Date.now() });
      return data;
    } catch (error) {
      // Degradación: si hay dato viejo, servirlo antes que fallar.
      // Un tipo de cambio de hace una hora es mejor que ningún dato.
      if (cached) {
        console.warn(`Sirviendo caché vencido para ${path}`, error.message);
        return cached.data;
      }
      throw error;
    }
  }

  return { request, get breakerState() { return breaker.state; } };
}
```

**4. Degradación explícita en el punto de uso**

La decisión de qué mostrar cuando no hay dato es de producto, no técnica —
por eso se toma acá y no se esconde en el cliente:

```js
async function renderExchangeRate() {
  try {
    const { rates } = await ratesClient.request('/live', { params: { source: 'USD' } });
    return { ok: true, rate: rates.USDARS };
  } catch {
    // Falla el widget, no la página. El usuario ve algo coherente.
    return { ok: false, message: 'Cotización no disponible en este momento' };
  }
}
```

**5. La clave de API nunca va al cliente**

Si el frontend llama directo al proveedor con la clave, cualquiera la lee
del navegador y la usa con tu cuota (y tu factura):

```js
// ❌ la clave queda expuesta en el bundle
fetch(`https://api.proveedor.com/v1/data?access_key=${API_KEY}`);

// ✅ el frontend llama a TU backend, que guarda la clave del lado servidor
fetch('/api/proxy/rates');
```

El proxy propio permite además cachear en un solo lugar para todos los
usuarios, y aplicar tus propios rate limits antes de consumir la cuota del
proveedor.

## Edge cases / errores comunes

- **Sin timeout**: el error más caro. Un proveedor que responde en 60 segundos en vez de fallar agota el pool de conexiones y tumba servicios no relacionados.
- **Reintentar un 4xx**: un 400 o un 401 van a fallar igual las tres veces. Solo se reintentan 408, 429 y 5xx.
- **Reintentar una operación no idempotente**: si el request creó un cobro pero la respuesta se perdió, el reintento cobra dos veces. Con claves de idempotencia del proveedor cuando existan.
- **Ignorar `Retry-After`**: ante un 429, el servidor dice cuánto esperar. Respetarlo siempre gana sobre el cálculo propio.
- **Caché sin TTL o sin límite de tamaño**: el `Map` de este ejemplo crece indefinidamente; en producción hay que purgar entradas vencidas o usar un LRU.
- **La clave en la query string**: aparece en logs de acceso, en proxies intermedios y en el header `Referer` si la página navega. Va en un header.
- **Breaker compartido entre endpoints distintos del mismo proveedor**: si `/rates` está caído pero `/health` responde, un breaker global corta ambos. Conviene uno por endpoint crítico.
- **No monitorear el estado del breaker**: si se abre y nadie se entera, la app degrada en silencio durante días.

## Compatibilidad

`AbortController` y `fetch` son nativos en Node 18+ y en todos los
navegadores evergreen. En Node, librerías como **got** traen reintentos,
timeouts por fase y caché conforme a RFC 7234 ya resueltos — vale evaluarla
antes de construir esto a mano. Para el estado del servidor en el frontend,
**TanStack Query** cubre caché, revalidación y reintentos con mucho menos
código.

## Fuentes

- **got** (14.9k ⭐): implementa reintentos, timeouts granulares por fase de la conexión y caché conforme a RFC 7234; es la referencia de qué debería traer un cliente HTTP maduro y el motivo para no escribir esto a mano en Node si se puede sumar la dependencia.
- **axios** (109k ⭐): el cliente más adoptado; su sistema de interceptores es el patrón que la mayoría usa para inyectar auth y manejar errores de forma transversal, aunque deja timeout y reintentos al implementador.
- **TanStack Query** (50.1k ⭐): resuelve el mismo problema del lado del frontend con otro modelo — trata la respuesta de la API como estado asíncrono con caché, revalidación y reintentos incorporados. Si el consumo es desde React, es la respuesta correcta antes que un cliente propio.
- **public-apis** (454.2k ⭐): el directorio comunitario de APIs públicas mantenido con apoyo de APILayer. Sirve para descubrir y comparar proveedores antes de integrarlos — este skill es lo que hay que hacer **después** de elegir uno.
- **restcountries** (2.3k ⭐, de apilayer): ejemplo concreto de API pública sin autenticación; útil para probar este cliente sin gestionar claves.

---
title: Proxy de API con clave del lado servidor
platform: web
pillar: integrations
tags: [api, proxy, api-key, security, caching, express]
summary: Ruta de backend que llama a una API de terceros guardando la clave del lado servidor, con caché compartido y allowlist de endpoints, para que el frontend nunca la vea.
when_not_to_use: Si la API de terceros está diseñada para el navegador con claves públicas restringidas por dominio (Google Maps, Stripe.js), usar ese mecanismo — el proxy agrega latencia sin beneficio.
---

# Proxy de API con clave del lado servidor

## Contexto

Muchos proveedores de APIs autentican con una `access_key` en la query
string, y sus ejemplos de documentación muestran la llamada directa desde
JavaScript del navegador. Copiar ese ejemplo tal cual es uno de los errores
de seguridad más frecuentes al integrar un servicio: **la clave queda en el
bundle**, visible en el código fuente y en la pestaña de red de cualquier
visitante. Con eso, un tercero puede consumir tu cuota, agotar tu plan pago o
—si la clave permite escritura— operar en tu nombre.

Un proxy propio resuelve eso y trae dos beneficios que suelen pasarse por
alto: la respuesta se puede **cachear una vez para todos los usuarios** en
vez de que cada navegador pida lo mismo, y podés aplicar **tus propios
límites** antes de que el tráfico consuma la cuota del proveedor.

El detalle que hace seguro a un proxy es la **allowlist**: sin ella, un
proxy que reenvía cualquier ruta que le pasen se convierte en un proxy
abierto que otros pueden usar contra el proveedor a tu costa.

## Código completo

```js
// routes/proxy.js
import express from 'express';

const router = express.Router();

const PROVIDER_BASE = 'https://api.exchangerate.host';
const API_KEY = process.env.EXCHANGE_API_KEY;   // nunca hardcodeada

if (!API_KEY) {
  throw new Error('Falta EXCHANGE_API_KEY — la app no arranca sin ella');
}

/**
 * Allowlist explícita: solo estos endpoints se pueden proxear, y cada uno
 * declara qué parámetros acepta. Sin esto, cualquiera puede usar tu proxy
 * (y tu cuota) contra cualquier ruta del proveedor.
 */
const ALLOWED = {
  live: {
    path: '/live',
    params: ['source', 'currencies'],
    ttlMs: 60_000,          // cotizaciones: 1 minuto
  },
  historical: {
    path: '/historical',
    params: ['date', 'source', 'currencies'],
    ttlMs: 24 * 60 * 60_000, // datos históricos: no cambian, 24 h
  },
};

/** Caché en memoria compartido por todos los usuarios. */
const cache = new Map();

// Purga periódica: sin esto el Map crece indefinidamente
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}, 60_000).unref();   // unref: no impide que el proceso termine

router.get('/:endpoint', async (req, res, next) => {
  const config = ALLOWED[req.params.endpoint];
  if (!config) {
    return res.status(404).json({ error: { code: 'UNKNOWN_ENDPOINT' } });
  }

  // Solo se reenvían los parámetros declarados, con los valores del cliente.
  // Nunca se hace un passthrough completo de req.query.
  const url = new URL(config.path, PROVIDER_BASE);
  for (const name of config.params) {
    const value = req.query[name];
    if (typeof value === 'string' && value.length <= 100) {
      url.searchParams.set(name, value);
    }
  }

  const cacheKey = `${req.params.endpoint}:${url.searchParams}`;
  const hit = cache.get(cacheKey);

  if (hit && Date.now() < hit.expiresAt) {
    res.set('X-Cache', 'HIT');
    return res.json(hit.data);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: {
        // La clave se agrega ACÁ, del lado servidor.
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!upstream.ok) {
      // No se propaga el cuerpo del proveedor: puede incluir detalles
      // internos o incluso la clave reflejada en un mensaje de error.
      const err = new Error(`Proveedor respondió ${upstream.status}`);
      err.status = upstream.status >= 500 ? 502 : 400;
      throw err;
    }

    const data = await upstream.json();
    cache.set(cacheKey, { data, expiresAt: Date.now() + config.ttlMs });

    res.set('X-Cache', 'MISS');
    // Cache-Control para el navegador y cualquier CDN intermedio
    res.set('Cache-Control', `public, max-age=${Math.floor(config.ttlMs / 1000)}`);
    res.json(data);
  } catch (error) {
    // Degradación: servir caché vencido antes que fallar del todo
    if (hit) {
      res.set('X-Cache', 'STALE');
      return res.json(hit.data);
    }
    next(error);
  } finally {
    clearTimeout(timer);
  }
});

export default router;
```

**Montaje con rate limit propio**

```js
import proxyRouter from './routes/proxy.js';
import { rateLimit } from './rate-limit.js';   // ver web/server/snippets

// El límite propio protege la cuota del proveedor de abuso desde tu app
app.use('/api/rates', rateLimit({ windowMs: 60_000, max: 30 }), proxyRouter);
```

**Consumo desde el frontend — sin ninguna clave**

```js
const res = await fetch('/api/rates/live?source=USD&currencies=ARS,EUR');
const data = await res.json();
```

## Uso

```bash
# .env  (nunca commiteado — ver .gitignore)
EXCHANGE_API_KEY=tu_clave_real
```

```bash
curl 'http://localhost:3000/api/rates/live?source=USD&currencies=ARS'
# X-Cache: MISS   (primera vez)
# X-Cache: HIT    (dentro del TTL)
```

## Limitaciones conocidas

- **El caché en memoria no se comparte entre instancias.** Con varios procesos o contenedores, cada uno mantiene el suyo y se multiplican las llamadas al proveedor. Para eso hace falta Redis o un CDN por delante.
- **El proxy agrega un salto de latencia.** Para datos que cambian por segundo y no se pueden cachear, ese costo puede no compensar — aunque la alternativa no es exponer la clave, sino revisar si el proveedor ofrece claves públicas restringidas por dominio.
- **`setInterval` de purga no alcanza bajo carga alta**: entre purgas el `Map` puede crecer mucho. Con volumen real conviene un LRU con tamaño máximo.
- **No cubre autenticación de tu propia app**: cualquiera que llegue a `/api/rates` consume tu cuota. Si el servicio es caro, el proxy debe ir detrás de tu auth, no solo del rate limit.
- **Los errores del proveedor se traducen, no se reenvían**: es deliberado (su cuerpo de error puede filtrar información), pero significa que perdés detalle para debuggear. Loguearlo del lado servidor.
- **Un `X-Cache: STALE` sostenido significa que el proveedor está caído** y nadie se enteró. Vale alertar sobre eso.

## Fuentes

- **public-apis** (454.2k ⭐): el catálogo comunitario mantenido con apoyo de APILayer; la mayoría de las APIs listadas ahí autentican con clave en query string, que es exactamente el patrón que este snippet existe para no exponer.
- **apilayer** (org, repos de 60 a 2.3k ⭐ — currencylayer, weatherstack, aviationstack, numverify): sus documentaciones muestran el ejemplo de llamada directa desde el navegador con `access_key` en la URL. Sirven como caso concreto de por qué hace falta el proxy.
- **http-proxy-middleware** (11.1k ⭐): la alternativa genérica cuando hay que proxear muchas rutas; este snippet elige el control explícito por endpoint porque la allowlist es justamente lo que evita convertirlo en un proxy abierto.
- **helmet** (10.7k ⭐) y **express-rate-limit** (3.3k ⭐): las dos capas que rodean a este proxy — headers seguros y límite de uso propio antes de consumir la cuota del proveedor.

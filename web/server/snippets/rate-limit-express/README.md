---
title: Rate limit básico en Express
platform: web
pillar: server
tags: [express, middleware, rate-limiting, nodejs]
summary: Middleware de rate limiting en memoria para Express, sin dependencias externas, para proteger endpoints de abuso básico.
when_not_to_use: Si la app corre en más de una instancia (múltiples procesos/contenedores), este límite es por proceso y no es consistente entre instancias — usar un store compartido (Redis) en su lugar.
---

# Rate limit básico en Express

## Contexto

Un endpoint sin ningún límite de requests es vulnerable a abuso trivial:
scraping agresivo, fuerza bruta sobre un login, o simplemente un cliente
con un bug en un loop de reintentos. La solución completa a este problema
vive en una jerarquía de capas: un API Gateway o WAF delante de la app
(la capa correcta para límites globales de infraestructura), una librería
dedicada como `express-rate-limit` (maneja headers estándar `RateLimit-*`,
varios algoritmos de ventana, stores plugables), o —lo que resuelve este
snippet— un middleware casero cuando el proyecto no tolera una dependencia
más y el caso de uso es simple: un solo proceso, un límite fijo por IP.

El algoritmo usado acá es "ventana fija" (fixed window): se cuenta cuántos
requests entraron desde que arrancó la ventana actual, y si se supera el
máximo, se corta. Es más simple de razonar que "ventana deslizante" (sliding
window) o "token bucket", pero tiene un punto ciego conocido: un cliente
puede hacer `max` requests justo al final de una ventana y otros `max` al
inicio de la siguiente, duplicando el límite nominal en un instante corto.
Para el caso de uso de este snippet (frenar abuso obvio, no garantizar un
límite exacto) ese punto ciego es aceptable.

## Código completo

```js
function rateLimit({ windowMs = 60_000, max = 100 } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

module.exports = { rateLimit };
```

## Uso

```js
const { rateLimit } = require('./rate-limit');

// se aplica solo a las rutas de API, no a todo el server
app.use('/api/', rateLimit({ windowMs: 60_000, max: 100 }));

// límites distintos por ruta: un login soporta un máximo mucho más bajo
app.post('/api/login', rateLimit({ windowMs: 60_000, max: 5 }), loginHandler);
```

## Limitaciones conocidas

- **No es distribuido**: el `Map` vive en la memoria de un solo proceso. Con más de una instancia (PM2 cluster, múltiples contenedores, autoscaling), cada instancia lleva su propio conteo — un atacante rotando entre instancias vía el load balancer puede terminar teniendo, en la práctica, `max × cantidad de instancias` requests disponibles.
- **El `Map` crece indefinidamente si no se purga**: cada IP nueva agrega una entrada que nunca se borra automáticamente. En un proceso de larga duración con tráfico real, esto es una fuga de memoria lenta. Mitigación mínima: un `setInterval` que recorra el `Map` y elimine entradas con `now - entry.start > windowMs`.
- **`req.ip` puede no ser el cliente real** detrás de un proxy/load balancer si Express no está configurado con `app.set('trust proxy', ...)` apuntando correctamente — sin eso, todos los requests pueden verse como si vinieran de la IP del proxy, y el límite termina aplicado global en vez de por cliente.

## Fuentes

- **`express-rate-limit`**: la librería de referencia del ecosistema para este problema. Resuelve además el reporte de headers estándar (`RateLimit-Limit`, `RateLimit-Remaining`) y soporta stores plugables (Redis, Memcached) para el caso distribuido que este snippet explícitamente no cubre. Si el proyecto ya tolera una dependencia más, usar esa en vez de este snippet.
- **Cloudflare / API Gateways** (Kong, AWS API Gateway): resuelven el rate limiting en una capa de infraestructura antes de que el request llegue al proceso Node, con contadores ya distribuidos por naturaleza — la opción correcta cuando el límite debe ser una garantía real de plataforma, no solo un freno best-effort a nivel de aplicación.

---
title: Rate limit básico en Express
platform: web
pillar: server
tags: [express, middleware, rate-limiting, nodejs]
summary: Middleware de rate limiting en memoria para Express, sin dependencias externas, para proteger endpoints de abuso básico.
when_not_to_use: Si la app corre en más de una instancia (múltiples procesos/contenedores), este límite es por proceso y no es consistente entre instancias — usar un store compartido (Redis) en su lugar.
---

# Rate limit básico en Express

Limita requests por IP en una ventana de tiempo fija, usando un `Map` en memoria.

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

Uso:
```js
const { rateLimit } = require('./rate-limit');
app.use('/api/', rateLimit({ windowMs: 60_000, max: 100 }));
```

**Nota:** el `Map` crece indefinidamente si no se purga. Para procesos de larga duración, sumar un `setInterval` que elimine entradas vencidas, o directamente usar `express-rate-limit` si el proyecto ya tolera una dependencia más.

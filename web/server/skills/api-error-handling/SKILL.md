---
name: api-error-handling
description: Centraliza el manejo de errores de una API Node/Express en un solo middleware, con errores tipados, códigos HTTP correctos y respuestas de formato consistente que no filtran detalles internos. Usar cuando una API devuelve errores inconsistentes, stack traces al cliente o 500 para todo.
tags: [nodejs, express, error-handling, api, middleware]
---

# API Error Handling

## Contexto

El patrón por defecto al que llega casi toda API sin un plan explícito es
`try/catch` en cada handler, cada uno devolviendo un formato de error
distinto. Los síntomas concretos: el frontend tiene que parsear tres formas
distintas de error según el endpoint, un error de validación devuelve 500 en
vez de 400 (rompiendo reintentos automáticos y monitoreo), y un stack trace
llega al cliente exponiendo rutas de archivos y estructura interna.

La solución de fondo tiene tres partes que funcionan juntas: **una clase de
error propia** que lleva su código HTTP encima, **un único middleware de
error** al final de la cadena que traduce cualquier excepción a una
respuesta, y **una distinción explícita entre errores operacionales**
(previstos: input inválido, recurso no encontrado, sin permisos) **y bugs**
(no previstos: un `undefined.foo`). Los primeros se reportan al cliente tal
cual; los segundos se loguean completos y al cliente solo le llega un
mensaje genérico.

## Cuándo usarlo

- La API tiene más de un puñado de endpoints y el manejo de errores ya está copiado y pegado entre handlers.
- El frontend está escribiendo lógica defensiva porque no puede confiar en la forma de la respuesta de error.
- Se están devolviendo códigos HTTP incorrectos (200 con `{ error: ... }` adentro, o 500 para errores de validación).

## Cuándo NO usarlo

- **Si el framework ya lo resuelve**: NestJS tiene `HttpException` + exception filters, y Fastify tiene `setErrorHandler` con serialización por schema. Reimplementar esto encima es duplicación — usar el mecanismo del framework y quedarse solo con el criterio de este skill (operacional vs bug, no filtrar internals).
- **Si la API es GraphQL**: el modelo de errores es distinto (siempre 200, errores en el array `errors`), así que este patrón basado en códigos HTTP no aplica directamente.

## Pasos / Código

**1. Una clase de error que conoce su código HTTP**

```js
class AppError extends Error {
  constructor(message, statusCode, { code, details } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;              // código estable para el cliente: 'USER_NOT_FOUND'
    this.details = details;        // info extra opcional (campos inválidos, etc.)
    this.isOperational = true;     // la marca clave: esto lo previmos
    Error.captureStackTrace(this, this.constructor);
  }
}

// Constructores de conveniencia para los casos frecuentes
const notFound   = (msg = 'Not found')    => new AppError(msg, 404, { code: 'NOT_FOUND' });
const badRequest = (msg, details)         => new AppError(msg, 400, { code: 'BAD_REQUEST', details });
const forbidden  = (msg = 'Forbidden')    => new AppError(msg, 403, { code: 'FORBIDDEN' });

module.exports = { AppError, notFound, badRequest, forbidden };
```

**2. Un wrapper para que los errores async lleguen al middleware**

Express 4 no captura rechazos de promesas automáticamente: si un handler
`async` lanza, el error se pierde y el request queda colgado hasta el
timeout. Este wrapper lo resuelve:

```js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

**3. Uso en los handlers — sin try/catch**

```js
app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) throw notFound('User not found');
  res.json(user);
}));
```

**4. El middleware de error, último en la cadena**

```js
// Importante: 4 argumentos. Express identifica los error handlers por aridad.
function errorHandler(err, req, res, next) {
  const isOperational = err.isOperational === true;
  const statusCode = isOperational ? err.statusCode : 500;

  // Los bugs se loguean completos; los operacionales, en nivel bajo.
  if (isOperational) {
    logger.warn({ code: err.code, msg: err.message, path: req.path });
  } else {
    logger.error({ err, path: req.path, body: req.body });
  }

  res.status(statusCode).json({
    error: {
      // Un bug nunca expone su mensaje real al cliente.
      message: isOperational ? err.message : 'Internal server error',
      code: isOperational ? err.code : 'INTERNAL_ERROR',
      ...(isOperational && err.details ? { details: err.details } : {}),
    },
  });
}

// Se registra DESPUÉS de todas las rutas
app.use(errorHandler);
```

**5. Red de seguridad para lo que escapa del ciclo de request**

```js
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  throw reason; // se convierte en uncaughtException
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception - shutting down');
  // El proceso quedó en estado desconocido: salir y dejar que el
  // orquestador (Docker/PM2/k8s) levante uno limpio.
  process.exit(1);
});
```

## Edge cases / errores comunes

- **Registrar el error handler antes de las rutas**: no se ejecuta nunca. Tiene que ir al final, después de todos los `app.use` y `app.get`.
- **Olvidar el 4º parámetro (`next`)**: Express distingue un error handler de un middleware normal contando argumentos. Con 3 parámetros, nunca recibe errores — y como no da ningún aviso, es un bug silencioso difícil de encontrar.
- **Devolver `err.message` de un bug al cliente**: mensajes como `connect ECONNREFUSED 10.0.1.5:5432` exponen topología interna. De ahí la distinción `isOperational`.
- **Loguear el body completo en el error handler**: si el endpoint recibe contraseñas o tokens, terminan en los logs en texto plano. Filtrar campos sensibles antes de loguear.
- **`process.exit(1)` en `uncaughtException` parece drástico**, pero es lo correcto: después de una excepción no capturada el estado del proceso no es confiable (conexiones a medias, locks sin liberar). Reiniciar limpio es más seguro que seguir sirviendo.

## Compatibilidad

Express 4.x requiere el `asyncHandler` mostrado. **Express 5** captura
rechazos de promesas de forma nativa, así que ahí el wrapper es innecesario
—el resto del patrón se mantiene igual—. Node 15+ termina el proceso ante un
`unhandledRejection` por defecto, lo que hace el handler explícito menos
crítico pero igual útil para loguear antes de morir.

## Fuentes

- **nodebestpractices** (105k ⭐): su sección de manejo de errores es la fuente de consenso del ecosistema para la distinción operacional vs programador y para la recomendación de salir del proceso ante errores no capturados. Este skill sintetiza ese criterio en una implementación concreta.
- **NestJS**: resuelve lo mismo con `HttpException` y exception filters declarativos por decorador — misma idea (excepción tipada que conoce su status), con la infraestructura ya provista por el framework.
- **Fastify**: su `setErrorHandler` cumple el mismo rol, con el agregado de que la respuesta de error también pasa por su serialización basada en JSON Schema, lo que fuerza un formato consistente por diseño en vez de por convención.

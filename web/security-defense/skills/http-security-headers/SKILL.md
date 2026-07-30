---
name: http-security-headers
description: Configura y explica los headers HTTP de seguridad esenciales (CSP, HSTS, X-Content-Type-Options, Referrer-Policy) en una app Express/Node, yendo más allá de instalar helmet con su configuración por defecto. Usar cuando piden "hardening" o "seguridad básica" de un backend web.
---

# HTTP Security Headers

## Contexto

Los headers de seguridad HTTP no previenen vulnerabilidades de lógica
(inyección SQL, auth rota) — mitigan clases específicas de ataque que
ocurren en el navegador del cliente incluso cuando el backend es correcto:
XSS que igual logra inyectar un script, clickjacking, sniffing de MIME
type, filtración de URLs internas vía el header `Referer`. `helmet` (ver
Fuentes) instala un set razonable de estos headers con una sola línea, y
para la mayoría de esos headers el default alcanza. La excepción real es
`Content-Security-Policy` (CSP): su default es o bien inexistente o bien
tan restrictivo que rompe la app, porque **no hay un default correcto
posible** — CSP declara explícitamente qué orígenes de script/estilo/imagen
son válidos para esa app en particular, y eso solo lo sabe quien construyó
la app.

Este skill no reemplaza a `helmet`, sino que documenta la parte que
`helmet` no puede resolver por vos: escribir una política de CSP real.

## Cuándo usarlo

- Se está haciendo un hardening inicial de un backend Express que hoy no setea ningún header de seguridad.
- Ya se usa `helmet()` con la config por defecto, pero nunca se configuró `Content-Security-Policy` de forma explícita para la app (el caso más común).
- Un audit de seguridad (interno o de un pentest) marcó "missing security headers" como hallazgo.

## Cuándo NO usarlo

- Si el proyecto sirve una SPA con muchos scripts inline generados dinámicamente y no hay tiempo de auditar cada uno: activar CSP mal configurado en `enforce` mode puede romper la app en producción sin aviso. Usar primero en modo `report-only` (ver abajo).
- Si el riesgo real del proyecto es de lógica de negocio (autorización, validación de input) y no hay headers básicos configurados: priorizar eso primero — headers HTTP son la última capa, no la primera.

## Pasos / Código

Instalación base con `helmet` (cubre HSTS, X-Content-Type-Options,
X-Frame-Options, Referrer-Policy con defaults razonables):

```js
const helmet = require('helmet');
app.use(helmet());
```

CSP explícito — esto es lo que hay que escribir a mano, adaptado a los
orígenes reales de la app (ejemplo con un CDN de scripts y fuentes de
Google Fonts):

```js
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.example.com'],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      // upgradeInsecureRequests: fuerza que recursos http:// se pidan por https://
      upgradeInsecureRequests: [],
    },
  })
);
```

Modo de prueba antes de aplicar en serio — reporta violaciones sin
bloquear nada, útil para descubrir qué orígenes hacen falta antes de
romper producción:

```js
app.use(
  helmet.contentSecurityPolicy({
    reportOnly: true,
    directives: { /* misma config de arriba */ },
  })
);
```

## Edge cases / errores comunes

- **`scriptSrc` sin `'unsafe-inline'` rompe cualquier `<script>` inline** (incluido código de analytics pegado directo en el HTML). La solución correcta no es agregar `'unsafe-inline'` (anula buena parte de la protección) sino mover ese script a un archivo servido desde un origen permitido, o usar nonces (`'nonce-<random>'` generado por request).
- **CSP se evalúa por header, no por `<meta>` tag heredado de un proxy**: si la app corre detrás de un proxy/CDN que reescribe headers, verificar que el proxy no esté pisando o eliminando el `Content-Security-Policy` que la app setea.
- **HSTS mal configurado es difícil de revertir**: una vez que un navegador recibe `Strict-Transport-Security` con un `max-age` largo, va a forzar HTTPS para ese dominio durante todo ese tiempo — includiendo si el certificado se rompe. Empezar con un `max-age` corto y subirlo gradualmente, no con el máximo desde el día uno.

## Compatibilidad

Todos los navegadores modernos respetan CSP nivel 2/3 y HSTS. Navegadores
muy viejos simplemente ignoran los headers que no reconocen (fallan
"abierto", no "cerrado") — estos headers son una capa adicional, no la
única línea de defensa.

## Fuentes

- **helmet**: resuelve los headers con default razonable (HSTS, X-Content-Type-Options, Referrer-Policy, etc.) en una sola llamada — este skill documenta específicamente la parte de CSP que helmet deja en manos de quien integra la librería, porque no tiene forma de adivinar los orígenes válidos de una app particular.
- **OWASP Top 10**: la categoría "Security Misconfiguration" y los hallazgos de XSS del Top 10 son el motivo por el que estos headers importan en primer lugar — CSP es, en la práctica, la mitigación más efectiva de XSS a nivel de navegador cuando la sanitización de input falla o queda incompleta.

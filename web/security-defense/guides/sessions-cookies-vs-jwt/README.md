---
title: Sesiones — cookies de servidor vs JWT
platform: web
pillar: security-defense
tags: [auth, sessions, jwt, cookies, security, decision]
summary: Criterio para elegir entre sesiones con estado en el servidor y tokens autocontenidos, con foco en el problema que casi siempre se subestima: la revocación.
---

# Sesiones — cookies de servidor vs JWT

## El eje real de la decisión

La comparación se suele plantear como "stateless vs stateful" y eso lleva a
la conclusión equivocada de que JWT es la opción moderna. El eje que
realmente decide es otro:

> ¿Necesitás poder **revocar** una sesión de inmediato?

Una sesión con estado en el servidor se revoca borrando una fila. Un JWT es
válido hasta que expira, por definición — nadie puede "desactivarlo" sin
agregar exactamente el estado del lado del servidor que JWT venía a
eliminar. Cerrar sesión en todos los dispositivos, banear una cuenta,
invalidar tokens tras un cambio de contraseña o responder a un token robado
son operaciones triviales con sesiones y estructuralmente difíciles con JWT
puro.

Todo lo demás —rendimiento, escalabilidad, elegancia— pesa menos que esto en
la mayoría de las aplicaciones.

## Elegir sesiones con estado cuando

- Es una aplicación web tradicional o una SPA con su propio backend: el caso más común, y donde las sesiones son la respuesta correcta por default.
- Hace falta revocación inmediata: logout en todos los dispositivos, baneo, expiración forzada tras cambio de contraseña.
- Se quiere poder listar y cerrar sesiones activas ("estás conectado en 3 dispositivos"), una funcionalidad que los usuarios esperan.
- El equipo prefiere una superficie de ataque chica: la cookie es un identificador opaco sin información adentro.

La objeción habitual —"no escala porque hay que consultar el store en cada
request"— es en la práctica menor: un `GET` a Redis por sesión ronda el
milisegundo, muy por debajo de cualquier consulta a la base de datos que el
endpoint vaya a hacer igual.

## Elegir JWT cuando

- Hay **múltiples servicios independientes** que deben validar la identidad sin llamar a un servicio central de auth en cada request. Este es el caso de uso para el que JWT fue diseñado.
- La validación ocurre en un lugar sin acceso al store de sesiones: un edge worker, un API gateway, una función serverless de otro proveedor.
- Es un token de **vida corta y propósito acotado**: un enlace de descarga válido por 5 minutos, un token de invitación, un webhook firmado. Acá la imposibilidad de revocar no importa porque expira antes de que sea un problema.
- Se implementa OAuth/OIDC, donde el formato está definido por el estándar.

## El patrón híbrido, que es lo que usa casi todo el mundo

En la práctica, la mayoría de los sistemas que "usan JWT" implementan esto:

- **Access token JWT de vida muy corta** (5-15 minutos): se valida sin consultar nada, se usa en cada request.
- **Refresh token opaco y con estado** (días o semanas): se guarda en la base, se puede revocar, y solo se usa para pedir un access token nuevo.

Así se obtiene la validación sin estado donde importa (el camino caliente) y
la revocación donde importa (el ciclo de vida de la sesión). El costo real
es que la ventana de revocación es la vida del access token: revocar deja al
usuario dentro hasta 15 minutos más.

Si se elige este camino, la rotación de refresh tokens (cada uso emite uno
nuevo e invalida el anterior) permite además detectar robo: si llega un
refresh token ya usado, alguien lo copió.

## Dónde guardar el token — la decisión que más se erra

| Lugar | XSS | CSRF | Veredicto |
|---|---|---|---|
| `localStorage` | **Expuesto**: cualquier script lo lee | No aplica | Evitar para tokens de sesión |
| Cookie `HttpOnly` | Protegido: JS no puede leerla | Requiere `SameSite` y/o token anti-CSRF | **La opción correcta** |
| Memoria (variable JS) | Expuesto pero efímero | No aplica | Aceptable para access tokens de vida corta |

Guardar un token en `localStorage` es el error más frecuente al implementar
JWT, y anula buena parte de las defensas: cualquier XSS —propio o de una
dependencia comprometida— se lleva la sesión completa.

La configuración correcta de la cookie:

```
Set-Cookie: session=<id>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...
```

`SameSite=Lax` cubre la mayoría de los casos de CSRF sin romper la
navegación normal. `Strict` es más seguro pero rompe el flujo de llegar
desde un link externo ya logueado. Si la API se consume desde otro origen,
hace falta `SameSite=None; Secure` **y** un token anti-CSRF explícito.

## Errores que aparecen en los dos modelos

- **Sesiones que no expiran**: una sesión válida por siempre es equivalente a una contraseña que nunca caduca. Conviene expiración absoluta además de por inactividad.
- **No rotar el identificador al iniciar sesión**: permite fijación de sesión — el atacante planta un ID, la víctima se loguea, y el ID sigue siendo válido.
- **Meter datos sensibles en el JWT**: el payload va en base64, no cifrado. Cualquiera con el token lee su contenido.
- **Confiar en el campo `alg` del propio token**: la vulnerabilidad clásica de JWT es aceptar `alg: none` o permitir que el token declare su propio algoritmo. La librería debe tener el algoritmo fijado por configuración.
- **No verificar `exp`, `iss` y `aud`**: un token válido emitido para otro servicio no debería servir acá.

## Qué NO responde esta guía

- **No cubre cómo autenticar** (contraseña, OAuth, passkeys, magic link): eso es el paso anterior. Esta guía es sobre qué pasa **después** de verificar la identidad.
- **No cubre autorización** (qué puede hacer el usuario una vez identificado), que es un problema distinto y suele ser donde están las fallas más graves.
- **No cubre sesiones en mobile nativo**, donde no hay cookies y el almacenamiento seguro es Keychain/Keystore.

## Fuentes

- **OWASP CheatSheetSeries** (32.7k ⭐): sus hojas de gestión de sesiones y de JWT son la referencia de consenso para los atributos de cookie, la rotación de identificadores y las validaciones obligatorias de un token.
- **passport** (23.5k ⭐): el modelo clásico de sesiones en Node; su arquitectura de estrategias separa autenticar (quién sos) de mantener la sesión, que es la distinción que esta guía asume.
- **NextAuth / Auth.js** (28.3k ⭐): implementa ambos modelos y expone la elección como configuración, lo que lo hace útil para ver los trade-offs concretos sin construirlos.
- **better-auth** (29.4k ⭐): representa el enfoque actual —sesiones con estado por defecto, TypeScript-first— y su default es una señal de hacia dónde volvió el consenso tras años de JWT por moda.
- **supertokens** (15.2k ⭐): implementa explícitamente el patrón híbrido con rotación de refresh tokens y detección de robo, que es la referencia concreta de esa sección.
- **casbin** (20.3k ⭐): cubre el problema hermano que esta guía deja fuera —autorización— y sirve para tener claro dónde termina el alcance de una sesión.

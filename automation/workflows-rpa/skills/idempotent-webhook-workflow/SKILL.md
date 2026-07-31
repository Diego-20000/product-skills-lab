---
name: idempotent-webhook-workflow
description: Diseña un workflow de automatización disparado por webhook que tolera reintentos y entregas duplicadas sin ejecutar la acción dos veces, usando deduplicación por clave, respuesta inmediata y reintentos con backoff. Usar al construir integraciones en n8n, Activepieces o similares.
tags: [automation, webhooks, idempotency, n8n, reliability]
---

# Idempotent Webhook Workflow

## Contexto

Casi todos los proveedores de webhooks (Stripe, GitHub, Shopify, Twilio)
garantizan entrega **at-least-once**, no exactly-once. Eso significa que el
mismo evento puede llegar dos, tres o más veces: porque la respuesta del
receptor tardó más que el timeout del proveedor, porque hubo un
redeploy en el medio, o simplemente porque el proveedor reintenta ante
cualquier respuesta que no sea 2xx.

En un workflow sin protección, esto produce consecuencias visibles y a veces
irreversibles: el cliente recibe tres emails idénticos, se crean tres filas
en la base, se cobra tres veces. El problema empeora cuando el workflow es
lento —si tarda 45 segundos en procesar y el proveedor corta a los 10, el
proveedor considera que falló y reintenta, mientras la primera ejecución
sigue corriendo, generando duplicados en paralelo.

La solución tiene tres piezas que se refuerzan: **responder rápido** (aceptar
el evento y procesarlo después, para que el proveedor nunca reintente por
timeout), **deduplicar por una clave estable** del evento, y **usar
operaciones idempotentes** aguas abajo donde sea posible.

## Cuándo usarlo

- Se construye un workflow disparado por webhook que causa efectos visibles: enviar emails, cobrar, crear registros, notificar por Slack.
- Ya aparecieron duplicados en producción (registros repetidos, notificaciones dobles).
- El procesamiento del webhook tarda más de unos pocos segundos.
- El proveedor documenta reintentos automáticos, que es prácticamente siempre.

## Cuándo NO usarlo

- **Si el workflow es de solo lectura y sin efectos** (consultar y devolver datos): procesar dos veces no hace daño y la complejidad extra no se justifica.
- **Si la plataforma ya lo resuelve**: algunos nodos de n8n y Activepieces tienen deduplicación incorporada. Conviene verificarlo antes de construirla a mano.
- **Para automatizaciones disparadas por schedule** (cron): no hay entrega duplicada de un proveedor externo; el problema ahí es distinto (ejecuciones solapadas) y se resuelve con un lock, no con deduplicación por evento.

## Pasos / Código

**1. Verificar la firma antes que nada**

Un endpoint de webhook es público. Sin verificar la firma, cualquiera puede
disparar el workflow con datos inventados:

```js
// Nodo Code de n8n, primer paso del flujo
const crypto = require('node:crypto');

const signature = $input.first().headers['x-webhook-signature'];
const rawBody = $input.first().body;
const secret = $env.WEBHOOK_SECRET;

const expected = crypto
  .createHmac('sha256', secret)
  .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
  .digest('hex');

// timingSafeEqual, no ===: la comparación normal filtra información
// por el tiempo que tarda en fallar.
const valid =
  signature &&
  signature.length === expected.length &&
  crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

if (!valid) throw new Error('Invalid webhook signature');

return $input.all();
```

**2. Responder de inmediato, procesar después**

Este es el cambio estructural que más duplicados evita. En n8n se configura
en el nodo Webhook:

```
Respond: Immediately
Response Code: 200
```

El proveedor recibe el 200 en milisegundos y no reintenta; el resto del
workflow sigue corriendo por su cuenta. El trade-off consciente: si el
procesamiento falla después de haber respondido, el proveedor no se entera
— por eso hace falta el manejo de errores del punto 5.

**3. Deduplicar por una clave estable del evento**

La clave tiene que venir del **proveedor**, no generarse localmente:

```js
// Nodo Code: calcular la clave de idempotencia
const event = $input.first().json;

// Preferir el ID del evento del proveedor. Si no existe, derivar una
// clave determinista del contenido — nunca usar timestamp ni random,
// porque cambian entre reintentos del mismo evento.
const key =
  event.id ??
  event.event_id ??
  require('node:crypto')
    .createHash('sha256')
    .update(`${event.type}:${event.object?.id}:${event.created}`)
    .digest('hex');

return [{ json: { ...event, idempotencyKey: key } }];
```

Y el chequeo contra un store persistente (Redis es ideal por su TTL nativo):

```js
// SET key value NX EX 86400
//   NX = solo si no existe  →  devuelve null si ya estaba
//   EX = expira en 24h      →  no crece para siempre
const wasSet = await redis.set(
  `webhook:${key}`,
  new Date().toISOString(),
  { NX: true, EX: 86400 }
);

if (!wasSet) {
  // Ya procesado: se corta acá, sin error.
  return [];
}
return $input.all();
```

`SET NX` en una sola operación atómica es lo correcto. Hacer `GET` y después
`SET` deja una ventana en la que dos entregas simultáneas pasan ambas el
chequeo.

**4. Preferir operaciones idempotentes aguas abajo**

Donde el sistema destino lo permita, esto vuelve la deduplicación una
segunda línea de defensa en vez de la única:

```sql
-- En vez de INSERT, que falla o duplica
INSERT INTO orders (external_id, amount, status)
VALUES ($1, $2, $3)
ON CONFLICT (external_id) DO UPDATE
  SET amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      updated_at = now();
```

Muchas APIs aceptan además una cabecera de idempotencia propia
(`Idempotency-Key` en Stripe, por ejemplo): pasarle la misma clave del
evento hace que el proveedor deduplique del lado suyo.

**5. Reintentos con backoff y una cola de fallos**

Para los errores transitorios (la API destino devolvió 503):

```
Nodo HTTP Request → Settings:
  Retry On Fail: true
  Max Tries: 3
  Wait Between Tries: 2000 ms   (n8n aplica el intervalo entre intentos)
```

Reintentar solo tiene sentido en errores transitorios. Un 400 por payload
inválido va a fallar igual las tres veces y solo agrega ruido — conviene
ramificar por código de estado.

Y una rama de error que no pierda el evento:

```
Error Trigger → guardar el payload completo + el error en una tabla
                de "dead letter" → notificar al canal del equipo
```

Sin esto, un evento que falla después del 200 inmediato desaparece sin
rastro.

## Edge cases / errores comunes

- **Generar la clave de idempotencia con timestamp o random**: cambia en cada reintento, así que la deduplicación nunca detecta nada. La clave debe ser determinista respecto del evento.
- **Guardar las claves procesadas en memoria del workflow**: se pierden en cada redeploy o reinicio, y no funcionan si hay más de una instancia. Tiene que ser un store compartido y persistente.
- **Claves sin TTL**: el store crece indefinidamente. 24-48 horas suele cubrir de sobra la ventana de reintentos de cualquier proveedor.
- **Marcar como procesado *antes* de procesar**: si el procesamiento falla, el evento queda marcado y el reintento del proveedor se descarta — se pierde el evento. El orden correcto es reservar la clave (para bloquear concurrentes) y liberarla explícitamente si el procesamiento falla de forma no recuperable.
- **Verificar la firma sobre el JSON ya parseado**: muchos proveedores firman los bytes crudos del body. Si la plataforma parsea antes, el HMAC recalculado no coincide aunque el secreto sea correcto — hay que acceder al raw body.
- **Comparar firmas con `===`**: la comparación normal termina apenas encuentra una diferencia, lo que filtra información sobre la firma correcta por el tiempo de respuesta. Siempre `timingSafeEqual`.
- **Responder 200 a un evento inválido**: si la firma no verifica, hay que devolver 401 — un 200 le dice al atacante que el evento fue aceptado.

## Compatibilidad

Los conceptos aplican a cualquier plataforma de automatización. En n8n, la
respuesta inmediata se configura en el nodo Webhook y los reintentos en las
Settings de cada nodo. Activepieces tiene equivalentes directos. Para el
store de deduplicación sirve Redis (ideal por `SET NX EX`), una tabla con
índice único, o el almacenamiento de la propia plataforma si es
persistente y compartido entre instancias.

## Fuentes

- **n8n** (199k ⭐): su modelo de nodos con configuración de reintentos por nodo y de respuesta del webhook es el que estructura este skill; el nodo Code permite además la lógica de firma y deduplicación que ningún nodo prearmado cubre de forma genérica.
- **Activepieces** (23.5k ⭐): resuelve lo mismo con "pieces" empaquetadas de forma aislada; útil para comparar cuánto de esto viene resuelto por la plataforma frente a cuánto hay que construir.
- **Temporal** (22k ⭐): el enfoque más riguroso del problema — su modelo de ejecución durable garantiza que un workflow sobreviva caídas del proceso sin perder estado, lo que hace innecesaria buena parte de esta plumbing manual. Es la referencia a considerar cuando la confiabilidad de la automatización deja de ser negociable.
- **Apache Airflow** (46.3k ⭐): resuelve idempotencia desde otro ángulo (tareas re-ejecutables por diseño, backfills), pensado para pipelines programados más que para eventos externos.

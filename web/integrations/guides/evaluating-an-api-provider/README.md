---
title: Evaluar un proveedor de API antes de depender de él
platform: web
pillar: integrations
tags: [api, integration, vendor, decision, risk, build-vs-buy]
summary: Criterio para decidir si integrar un servicio externo y cuál elegir, evaluando el costo real de la dependencia más allá del precio de lista.
---

# Evaluar un proveedor de API antes de depender de él

## La decisión previa: ¿hace falta un proveedor?

Antes de comparar opciones conviene descartar que el problema tenga una
solución más barata:

- **¿Existe un dataset estático que alcance?** Para lista de países, códigos de moneda o husos horarios, un JSON en el repo evita una dependencia de red completa. Actualizarlo una vez por año es más barato que integrarlo.
- **¿Es una función que se puede escribir?** Validar el formato de un email es una expresión regular; verificar que la casilla exista requiere un servicio. Son problemas distintos y muchas veces se contrata el segundo cuando alcanzaba el primero.
- **¿La plataforma ya lo trae?** `Intl` resuelve formateo de fechas, monedas y números sin ninguna API.

Cada dependencia externa agrega latencia, un modo de falla, un costo
recurrente y un riesgo de discontinuación. Solo se justifica cuando resuelve
algo que genuinamente no podés mantener vos.

## Los siete criterios, en orden de importancia

### 1. Qué pasa cuando el proveedor se cae

Es lo primero porque define el impacto sobre tu producto, no sobre tu
integración. Preguntas concretas:

- ¿Este dato es **crítico** (sin él la app no funciona) o **decorativo** (el widget del clima)?
- ¿Se puede **degradar**? Un tipo de cambio de hace una hora sirve; un código de verificación de dos factores no.
- ¿Hay **alternativa** con la que hacer failover, o quedás sin nada?

Si el dato es crítico y no hay degradación posible, el uptime del proveedor
pasa a ser el techo del uptime tuyo. Eso hay que decidirlo a conciencia, no
descubrirlo el día de la caída.

### 2. Costo real, no el de la página de precios

El precio por request es lo visible. Lo que suele sorprender:

- **Qué cuenta como request.** Algunos cobran por resultado devuelto, no por llamada — una búsqueda que devuelve 50 filas puede contar como 50.
- **Qué pasa al pasarse del plan.** ¿Corta el servicio, cobra excedente, o degrada? Los tres tienen consecuencias muy distintas en producción.
- **Costo del plan gratuito real.** Muchos limitan features clave (HTTPS, volumen de histórico) en el tier gratuito, así que el prototipo funciona y producción no.
- **Cuánto ahorra el caché.** Si el dato cambia una vez por día, cachearlo puede reducir el costo en dos órdenes de magnitud y cambiar la decisión de plan.

### 3. Costo de salida

El criterio que más se ignora y el que más caro sale después:

- ¿Cuánto trabajo es cambiar de proveedor? Si el modelo de datos del proveedor se filtró a toda tu aplicación, mucho.
- ¿Se puede **exportar** lo que acumulaste ahí?
- ¿Hay más de un proveedor con una API razonablemente equivalente?

La mitigación es estructural: envolver el proveedor en una interfaz propia
desde el día uno, para que tu código dependa de tu abstracción y no de la
forma de su respuesta.

```js
// ❌ el modelo del proveedor se filtra a toda la app
const { rates } = await fetch(providerUrl).then(r => r.json());
render(rates.USDARS);

// ✅ una interfaz propia: cambiar de proveedor toca un archivo
export interface RateProvider {
  getRate(from: string, to: string): Promise<number>;
}
```

### 4. Calidad del contrato

- **¿Publica una especificación OpenAPI?** Si sí, se puede generar el cliente tipado y detectar cambios de contrato automáticamente. Es una señal fuerte de madurez.
- **¿Versiona la API?** Un proveedor sin versionado puede romperte sin aviso.
- **¿Tiene changelog y política de deprecación?** Saber con cuánta anticipación avisan de un breaking change.
- **¿Los errores son informativos?** Un proveedor que devuelve `200 OK` con `{"success": false}` adentro obliga a lógica especial y suele indicar poco cuidado en el diseño.

### 5. Límites y comportamiento bajo carga

- ¿Cuál es el **rate limit** y qué devuelve al superarlo? ¿Manda `Retry-After`?
- ¿Cuál es la **latencia real** (p95, p99), no la promedio? El promedio esconde exactamente los casos que te van a doler.
- ¿Hay **página de estado** e historial de incidentes públicos? Un proveedor sin status page es un proveedor sin transparencia.

### 6. Datos y cumplimiento

- ¿Qué información tuya (o de tus usuarios) le estás mandando? Enviar emails de usuarios a un servicio de validación **es** compartir datos personales.
- ¿Dónde se procesan y por cuánto tiempo se retienen?
- Si hay obligaciones (GDPR, normativa local), ¿el proveedor las cumple y lo documenta?

Este criterio sube al primer lugar si el dato es sensible: ahí puede
descartar a un proveedor por más que gane en todo lo demás.

### 7. Señales de salud del proyecto

- Frecuencia de actualizaciones de la documentación y del changelog.
- Tiempo de respuesta del soporte, probado antes de contratar, no después.
- Si tiene SDK open source: ¿está mantenido o abandonado? Un SDK sin commits en tres años suele indicar el estado real del producto.
- Cuántos años lleva operando y quién está detrás.

## Cómo comparar en la práctica

Una prueba de dos horas dice más que cualquier comparativa:

1. **Crear cuenta gratuita en los dos o tres candidatos.**
2. **Hacer la llamada real** que tu producto necesita, con tus datos reales, no con el ejemplo de la documentación.
3. **Medir latencia** desde donde va a correr tu servidor, no desde tu máquina.
4. **Provocar un error**: mandar parámetros inválidos, superar el rate limit, usar una clave vencida. Ver qué devuelve.
5. **Buscar el dato menos favorable**: no el caso de la demo, sino el registro raro que tu producto también tiene que resolver.
6. **Leer los términos** sobre retención de datos y qué pasa si cancelás.

El paso 4 es el más informativo y el que casi nadie hace antes de decidir.

## Señales de alarma

- **No hay página de estado ni historial de incidentes.**
- **La documentación muestra la clave en la query string** desde JavaScript del navegador — indica que no pensaron el modelo de seguridad de sus clientes.
- **No hay versionado de API.**
- **El plan gratuito no permite probar el caso real** (sin HTTPS, sin el endpoint que necesitás).
- **Los errores llegan con `200 OK`.**
- **El SDK oficial no tiene commits recientes.**
- **No hay forma de exportar tus datos.**

## Qué NO responde esta guía

- **No recomienda proveedores concretos.** Los precios y la calidad cambian; el criterio no.
- **No cubre negociación de contratos ni SLAs** empresariales, que es terreno legal y comercial.
- **No cubre construir la API vos mismo**, que es una decisión de otro orden (build vs buy a nivel producto).
- **No cubre integraciones vía webhooks entrantes**, donde el problema es el inverso — ver el skill [`idempotent-webhook-workflow`](../../../../automation/workflows-rpa/skills/idempotent-webhook-workflow/SKILL.md).

Para la implementación una vez elegido el proveedor, ver el skill
[`resilient-api-client`](../../skills/resilient-api-client/SKILL.md) y el
snippet [`api-key-proxy-route`](../../snippets/api-key-proxy-route/README.md).

## Fuentes

- **public-apis** (454.2k ⭐): el directorio comunitario de APIs públicas, mantenido con apoyo de APILayer y uno de los repos más estrellados de GitHub. Es el punto de partida para descubrir candidatos por categoría — pero es un índice, no una evaluación: que una API esté listada no dice nada sobre su fiabilidad ni su modelo de precios, que es justamente lo que esta guía cubre.
- **apilayer** (org): marketplace de APIs de nicho (currencylayer, weatherstack, aviationstack, numverify, mailboxlayer). Sus repos son mayormente documentación de producto —de 60 a 2.3k ⭐, salvo restcountries— y su patrón de autenticación por `access_key` en la URL es el ejemplo concreto del criterio 4 sobre calidad del contrato.
- **OpenAPI Generator** (26.6k ⭐): genera clientes tipados a partir de una especificación OpenAPI; su existencia es la razón práctica por la que "¿publica OpenAPI?" es una pregunta de evaluación y no un detalle — cambia cuánto trabajo es integrar y detectar cambios de contrato.
- **MSW** (18.1k ⭐): permite testear la integración sin depender de la disponibilidad del proveedor ni consumir cuota, interceptando a nivel HTTP. Es lo que hace viable el paso 4 de la prueba práctica de forma repetible.
- **got** (14.9k ⭐) y **TanStack Query** (50.1k ⭐): definen la vara de qué debería resolver la capa cliente (reintentos, caché, timeouts), y por lo tanto cuánto de eso te toca construir según el proveedor elegido.

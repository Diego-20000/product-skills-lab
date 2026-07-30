---
title: Estrategia de testing móvil — qué cubrir y dónde
platform: mobile
pillar: testing
tags: [testing, mobile, appium, maestro, detox, strategy, decision]
summary: Criterio para decidir qué testear en cada nivel en una app móvil, donde los tests de UI son mucho más caros y lentos que en web.
---

# Estrategia de testing móvil — qué cubrir y dónde

## Por qué en móvil el cálculo es distinto

La lógica de niveles es la misma que en web, pero los costos son mucho más
desparejos y eso cambia las conclusiones. Un test unitario en JVM corre en
milisegundos; un test instrumentado necesita un emulador que tarda minutos
en arrancar y consume gigas de RAM en CI. En iOS el simulador solo corre en
runners macOS, que cuestan varias veces más que los de Linux.

A eso se suma un factor que en web casi no existe: la **matriz de
dispositivos**. Versiones de OS, tamaños de pantalla, densidades, fabricantes
con capas propias sobre Android. Probar todo es imposible, así que la
estrategia tiene que elegir explícitamente qué combinaciones importan.

La consecuencia práctica: en móvil conviene empujar mucho más peso hacia los
niveles baratos de lo que se haría en web, y ser deliberadamente estricto
con qué merece un test de UI.

## Nivel 1 — Unitarios: donde debe estar la mayoría

**Qué va acá:** ViewModels, casos de uso, mapeo de modelos, validaciones,
cálculos, parsing de respuestas de API.

**Por qué:** corren en la JVM (Android) o en el simulador sin UI (iOS), en
segundos, sin emulador. Es el único nivel que escala a miles de tests.

**La condición para que esto funcione:** la lógica tiene que estar fuera de
la UI. Si el `ViewModel` depende de `Context` o el modelo de vista de iOS
importa `UIKit`, no se puede testear barato. Cuando escribir el test
unitario es difícil, el problema suele ser el acoplamiento, no el test.

```kotlin
@Test fun `calcula el total con envío gratis sobre 5000`() {
    val cart = Cart(items = listOf(Item(price = 6000)))
    assertEquals(6000, cart.total)
}
```

## Nivel 2 — Componentes de UI: barato y subestimado

**Qué va acá:** que una pantalla muestre sus estados (carga, error, vacío,
con datos), que un componente responda a la interacción, que los textos
correctos aparezcan.

**Android:** tests de Compose (`createComposeRule`) o Robolectric — corren
en JVM sin emulador, lo que los hace órdenes de magnitud más rápidos que un
test instrumentado.

**iOS:** XCTest con vistas SwiftUI, o snapshot testing de vistas.

Este nivel es el más desaprovechado en móvil. Cubre gran parte de lo que la
gente termina testeando con E2E, a una fracción del costo.

## Nivel 3 — Integración: la capa de datos contra algo real

**Qué va acá:** DAOs contra una base en memoria, el cliente de red contra un
servidor mockeado (MockWebServer en OkHttp), migraciones de base de datos.

**Por qué importa especialmente en móvil:** las migraciones de base son una
fuente clásica de crashes en producción que ningún otro nivel detecta —
falla solo en dispositivos que venían de una versión anterior, que es
justamente lo que el desarrollo con instalación limpia nunca ejercita.

## Nivel 4 — E2E en dispositivo: pocos, y solo lo crítico

**Qué va acá:** los flujos sin los cuales la app no sirve. Típicamente:
onboarding/login, la acción principal del producto, y el flujo de pago si
existe. Cinco a diez flujos, no cien.

**Por qué tan pocos:** cada uno necesita emulador, es lento, y es el nivel
más propenso a fallar por razones ajenas al código (el emulador se colgó, la
red del runner falló, apareció un diálogo del sistema).

**Herramienta según el caso:**

| Situación | Elección |
|---|---|
| Se busca algo legible y de bajo mantenimiento, cualquier stack | **Maestro** — flows en YAML, esperas implícitas |
| App React Native con necesidad de precisión | **Detox** — se sincroniza con el hilo de JS, casi sin flakiness |
| Hace falta cubrir plataformas o lenguajes que los otros no soportan | **Appium** — el más amplio, a costa de verbosidad y fragilidad |
| Android nativo, tests ya existentes | **Espresso** — nativo, rápido, pero solo Android |

Ver el skill [`maestro-smoke-flow`](../../skills/maestro-smoke-flow/SKILL.md)
y el snippet [`android-emulator-ci`](../../snippets/android-emulator-ci/README.md).

## La matriz de dispositivos: elegir en vez de aspirar

No se puede probar todo. Un criterio razonable:

- **Dos versiones de OS**: la mínima soportada y la más reciente. Los bugs suelen aparecer en los extremos.
- **Dos tamaños de pantalla**: un teléfono chico y uno grande. Tablet solo si es un target real del producto.
- **En Android, un fabricante con capa pesada** (Samsung, Xiaomi) si los datos de usuarios lo justifican: sus modificaciones al sistema causan bugs que el emulador de AOSP no reproduce.

Todo lo demás se cubre con datos de producción (Crashlytics, reportes de la
tienda) en vez de con tests preventivos.

## Lo que ningún nivel de esta pirámide cubre

- **Crashes específicos de dispositivo o fabricante**: se detectan con monitoreo en producción, no testeando.
- **Consumo de batería y memoria en uso real**: requiere profiling con herramientas dedicadas.
- **Regresiones visuales**: un layout que se rompe con texto ampliado o en pantalla chica no lo detecta ningún test funcional. Para eso hace falta snapshot testing visual.
- **El proceso de release**: que la app compile y pase tests no significa que se pueda firmar, subir y aprobar. Automatizar eso (fastlane) es parte de la estrategia, aunque no sea "testing".

## Errores frecuentes

- **Testear todo con E2E** porque "prueba lo mismo que el usuario": produce suites de 40 minutos que nadie mira y que fallan por razones ajenas al código.
- **No testear la capa de datos**: las migraciones rotas son de los bugs más caros porque afectan solo a usuarios existentes y aparecen después del release.
- **Correr toda la suite en cada push**: los tests instrumentados en cada commit hacen el ciclo insoportable. Unitarios en cada push, instrumentados en el PR, E2E completo antes del release.
- **Ignorar la separación entre lógica y UI**: sin ella, todo tiene que testearse caro y la estrategia colapsa hacia E2E.
- **Suponer que el emulador equivale al dispositivo**: para performance, cámara, sensores y comportamiento de fabricante, no lo es.

## Qué NO responde esta guía

- **No cubre testing de accesibilidad móvil**, que tiene su propio criterio — ver `mobile/accessibility`.
- **No cubre A/B testing ni feature flags**, que son mecanismos de producto, no de verificación.
- **No cubre distribución beta** (TestFlight, Play Internal Testing), que es la validación con humanos y suele detectar más que la suite automatizada.
- **No fija porcentajes por nivel**: cualquier número concreto fuera de contexto es arbitrario.

## Fuentes

- **Maestro** (10.8k ⭐): su formato declarativo en YAML con esperas implícitas es lo que hace que E2E móvil sea sostenible; el argumento de esta guía para mantenerlo acotado sigue valiendo, pero el costo por test baja mucho.
- **Appium** (21.2k ⭐): el más amplio en cobertura de plataformas vía WebDriver, y el origen de la reputación de fragilidad del E2E móvil.
- **Detox** (12k ⭐): la sincronización con el hilo de JS elimina la causa raíz de flakiness en React Native; es la referencia de que el problema es resoluble cuando la herramienta conoce el runtime.
- **Now in Android** (21.6k ⭐): muestra la separación entre tests unitarios, de Compose y instrumentados en un proyecto real modularizado — la condición estructural para que esta estrategia funcione.
- **architecture-samples** (45.8k ⭐): las distintas arquitecturas y sus estrategias de testing asociadas; útil para ver cómo el acoplamiento define qué se puede testear barato.
- **OkHttp** (47k ⭐): MockWebServer, incluido en el proyecto, es la herramienta estándar del nivel 3 en Android.
- **fastlane** (41.9k ⭐): automatiza el proceso de release que rodea a los tests; sin eso, correr E2E en CI queda a medias.

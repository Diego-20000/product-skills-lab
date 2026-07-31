---
name: maestro-smoke-flow
description: Escribe un test E2E de humo para una app móvil en YAML con Maestro, cubriendo el camino crítico (login, acción principal, salida) con esperas implícitas y selectores estables. Usar cuando una app no tiene tests E2E y hace falta cobertura mínima rápido.
tags: [mobile, testing, maestro, e2e, yaml]
---

# Maestro Smoke Flow

## Contexto

El testing E2E móvil tiene mala fama por una razón concreta: los tests
tradicionales con Appium son lentos de escribir, frágiles y caros de
mantener, así que muchos equipos terminan sin ninguna cobertura E2E. El
resultado es que los bugs que rompen el camino crítico —el login no
funciona, el botón de comprar no responde— se descubren en producción.

Un smoke test resuelve el 80% de ese riesgo con una fracción del esfuerzo:
no intenta cubrir todos los casos, verifica que **los caminos críticos no
estén rotos**. Maestro encaja especialmente bien acá porque los flows se
escriben en YAML declarativo en vez de código imperativo, y porque tiene
esperas implícitas por defecto —cada comando reintenta hasta que el
elemento aparece—, que es exactamente lo que elimina la causa principal de
flakiness en Appium (los `sleep` fijos puestos a ojo).

Un efecto secundario relevante para este repo: el formato YAML declarativo
es mucho más fácil de generar y mantener por una IA que un test imperativo
lleno de esperas y condicionales.

## Cuándo usarlo

- La app no tiene ningún test E2E y hace falta cobertura del camino crítico rápido.
- Existe una suite de Appium tan lenta o frágil que en la práctica nadie la corre.
- Se quiere un gate de CI que verifique que cada build al menos arranca y permite loguearse.
- La app es React Native o Flutter y se busca una herramienta que no dependa del framework.

## Cuándo NO usarlo

- **Para testear lógica de negocio**: eso va en tests unitarios, que son mil veces más rápidos. Un E2E que verifica un cálculo es un desperdicio de minutos de CI.
- **Si el proyecto es React Native y ya usa Detox**: Detox se sincroniza con el hilo de JS, lo que le da una precisión que Maestro no tiene. Migrar sin motivo no aporta.
- **Para cobertura exhaustiva**: un smoke test cubre el camino feliz. Los casos borde y los estados de error se cubren en niveles más baratos.
- **Si hace falta lógica compleja en el test** (cálculos, generación de datos, aserciones sobre respuestas de API): el YAML se queda corto rápido y conviene una herramienta con lenguaje completo.

## Pasos / Código

**1. Instalación y estructura**

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

```
.maestro/
├── login.yaml
├── checkout.yaml
└── helpers/
    └── do-login.yaml
```

**2. Un flow de humo completo**

```yaml
# .maestro/login.yaml
appId: com.miempresa.miapp
name: Smoke - login y pantalla principal
---
- launchApp:
    clearState: true          # arranca siempre desde cero: sin esto el test
                              # pasa por estar ya logueado de la corrida anterior

- assertVisible: "Iniciar sesión"

- tapOn:
    id: "email_input"         # testID/accessibilityIdentifier, no el texto
- inputText: "qa@example.com"

- tapOn:
    id: "password_input"
- inputText: ${MAESTRO_TEST_PASSWORD}

- tapOn: "Ingresar"

# No hace falta ningún sleep: assertVisible reintenta hasta el timeout
- assertVisible:
    id: "home_header"
    timeout: 10000            # más tiempo solo donde hay red de por medio

- assertVisible: "Mis pedidos"
```

**3. Reutilizar pasos entre flows**

```yaml
# .maestro/helpers/do-login.yaml
appId: com.miempresa.miapp
---
- tapOn:
    id: "email_input"
- inputText: ${EMAIL}
- tapOn:
    id: "password_input"
- inputText: ${PASSWORD}
- tapOn: "Ingresar"
- assertVisible:
    id: "home_header"
```

```yaml
# .maestro/checkout.yaml
appId: com.miempresa.miapp
name: Smoke - flujo de compra
---
- launchApp:
    clearState: true

- runFlow:
    file: helpers/do-login.yaml
    env:
      EMAIL: "qa@example.com"
      PASSWORD: ${MAESTRO_TEST_PASSWORD}

- tapOn:
    id: "product_card_0"
- tapOn: "Agregar al carrito"
- tapOn:
    id: "cart_button"
- assertVisible: "1 artículo"
```

**4. Poner IDs estables en la app**

Los selectores por texto se rompen con cada cambio de copy o de idioma.
En React Native:

```tsx
<TextInput
  testID="email_input"
  accessibilityLabel="Email"   // sirve para el test y para accesibilidad
/>
```

En Flutter:

```dart
TextField(key: const ValueKey('email_input'))
```

En Compose:

```kotlin
TextField(
    modifier = Modifier.testTag("email_input"),
    // ...
)
```

**5. Correr local y en CI**

```bash
maestro test .maestro/login.yaml          # un flow
maestro test .maestro/                     # todos
maestro studio                             # inspector interactivo para escribir flows
```

```yaml
# .github/workflows/e2e.yml
- name: Run Maestro smoke tests
  run: |
    curl -Ls "https://get.maestro.mobile.dev" | bash
    export PATH="$PATH:$HOME/.maestro/bin"
    maestro test .maestro/ --format junit --output report.xml
  env:
    MAESTRO_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
```

## Edge cases / errores comunes

- **Olvidar `clearState: true`**: el test pasa localmente porque el simulador quedó logueado de la corrida anterior, y falla en CI donde arranca limpio. Es la causa número uno de "en mi máquina anda".
- **Seleccionar por texto visible**: `tapOn: "Ingresar"` se rompe al traducir la app o al cambiar el copy. Para elementos con los que se interactúa, siempre `id`; el texto se reserva para `assertVisible`, donde verificar el contenido es justamente el punto.
- **Meter la contraseña en el YAML**: el archivo se versiona en el repo. Siempre por variable de entorno desde el gestor de secretos del CI.
- **Agregar `wait` fijos**: Maestro ya reintenta cada comando hasta su timeout. Un `wait` explícito solo hace el test más lento sin hacerlo más estable; si algo falla, se sube el `timeout` de ese comando puntual.
- **Smoke tests que crecen hasta ser suites completas**: cuando un flow de humo tarda 5 minutos, dejó de ser humo. Si hace falta más cobertura, van en flows separados que no bloquean cada build.
- **Datos de prueba compartidos entre corridas**: si el test de compra usa siempre el mismo usuario, dos corridas en paralelo interfieren. Conviene un usuario por corrida o limpiar el estado en el backend.

## Compatibilidad

Maestro soporta Android (emulador y dispositivo), iOS (simulador; los
dispositivos físicos requieren configuración extra), React Native, Flutter y
web. Necesita Java instalado. En CI, iOS solo corre en runners macOS, que
son notablemente más caros — una estrategia habitual es correr el set
completo en Android en cada PR y el de iOS solo en la rama principal.

## Fuentes

- **Maestro** (10.8k ⭐): su decisión de diseño central —esperas implícitas por defecto y flows declarativos en YAML— es lo que este skill aprovecha; elimina de raíz la clase de flakiness que domina las suites de Appium.
- **Appium** (21.2k ⭐): el estándar previo, con mucha más cobertura de plataformas y lenguajes de cliente, a costa de tests más verbosos y frágiles. Sigue siendo la elección correcta cuando hace falta control fino o soporte de plataformas que Maestro no cubre.
- **Detox** (12k ⭐): la alternativa gray-box para React Native; se sincroniza directamente con el hilo de JS de la app, así que sabe cuándo terminó de estar ocupada en vez de reintentar. Más preciso que Maestro, pero solo para RN.
- **fastlane** (41.9k ⭐): complementario y casi obligatorio — sin automatizar la firma y la subida del build, cada corrida de E2E en CI arranca con un proceso manual que anula el beneficio.

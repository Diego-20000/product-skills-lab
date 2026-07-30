---
title: Emulador Android en CI con caché
platform: mobile
pillar: testing
tags: [ci, android, emulator, github-actions, cache]
summary: Levanta un emulador Android en GitHub Actions con AVD cacheado y las opciones que evitan los cuelgues y la lentitud típicos de correr tests de UI en CI.
when_not_to_use: Para tests unitarios puros (JVM) no hace falta emulador — corren en segundos con Robolectric o sin nada.
---

# Emulador Android en CI con caché

## Contexto

Correr tests instrumentados de Android en CI es notoriamente frágil, y casi
siempre por las mismas tres causas. La primera es el **tiempo de arranque**:
crear un AVD desde cero y esperar a que el sistema termine de bootear puede
llevar varios minutos en cada corrida. La segunda son las **animaciones**,
que hacen que los tests fallen de forma intermitente porque el elemento
todavía se está moviendo cuando el test intenta tocarlo. La tercera son los
**diálogos del sistema** —actualizaciones de Play Services, sugerencias de
configuración— que aparecen encima de la app y rompen cualquier aserción.

Este snippet resuelve las tres: cachea el AVD entre corridas (de minutos a
segundos), desactiva animaciones vía `settings put`, y arranca el emulador
con las opciones que suprimen la mayoría de las interferencias.

## Código completo

```yaml
# .github/workflows/android-tests.yml
name: Android instrumented tests

on:
  pull_request:
  push:
    branches: [main]

# Cancelar corridas viejas del mismo PR: el emulador es caro
concurrency:
  group: android-tests-${{ github.ref }}
  cancel-in-progress: true

jobs:
  instrumented:
    runs-on: ubuntu-latest
    timeout-minutes: 45

    strategy:
      fail-fast: false
      matrix:
        api-level: [29, 34]   # una vieja y una reciente

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v4

      # KVM es lo que hace que el emulador use virtualización por hardware.
      # Sin esto el emulador corre por software y es inutilizablemente lento.
      - name: Habilitar KVM
        run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' \
            | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm

      - name: Cachear AVD
        uses: actions/cache@v4
        id: avd-cache
        with:
          path: |
            ~/.android/avd/*
            ~/.android/adb*
          key: avd-${{ matrix.api-level }}

      # Primer arranque: crea la imagen y la deja lista para cachear.
      # Solo corre si el caché falló.
      - name: Crear snapshot del AVD
        if: steps.avd-cache.outputs.cache-hit != 'true'
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: ${{ matrix.api-level }}
          target: google_apis
          arch: x86_64
          force-avd-creation: false
          emulator-options: -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim -camera-back none
          disable-animations: false
          script: echo "AVD creado y cacheado"

      - name: Correr tests instrumentados
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: ${{ matrix.api-level }}
          target: google_apis
          arch: x86_64
          force-avd-creation: false
          emulator-options: -no-snapshot-save -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim -camera-back none
          disable-animations: true
          script: |
            # Redundante con disable-animations, pero garantiza el estado
            adb shell settings put global window_animation_scale 0
            adb shell settings put global transition_animation_scale 0
            adb shell settings put global animator_duration_scale 0

            # Suprimir diálogos del sistema que tapan la app
            adb shell settings put secure immersive_mode_confirmations confirmed

            ./gradlew connectedDebugAndroidTest --stacktrace

      - name: Subir reportes
        if: always()   # también cuando los tests fallan, que es cuando más sirven
        uses: actions/upload-artifact@v4
        with:
          name: test-reports-api-${{ matrix.api-level }}
          path: |
            **/build/reports/androidTests/
            **/build/outputs/androidTest-results/
```

**Script equivalente para correr localmente igual que en CI**

```bash
#!/usr/bin/env bash
# scripts/test-instrumented.sh
set -euo pipefail

DEVICE="${1:-emulator-5554}"

echo "→ Desactivando animaciones en $DEVICE"
adb -s "$DEVICE" shell settings put global window_animation_scale 0
adb -s "$DEVICE" shell settings put global transition_animation_scale 0
adb -s "$DEVICE" shell settings put global animator_duration_scale 0

echo "→ Corriendo tests"
./gradlew connectedDebugAndroidTest --stacktrace

echo "✓ Reportes en app/build/reports/androidTests/"
```

**Desactivar animaciones también desde el propio test**

Como red de seguridad, por si el dispositivo no fue preparado:

```kotlin
// androidTest/.../AnimationRule.kt
class DisableAnimationsRule : TestWatcher() {
    override fun starting(description: Description) {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        listOf(
            "window_animation_scale",
            "transition_animation_scale",
            "animator_duration_scale"
        ).forEach { setting ->
            instrumentation.uiAutomation
                .executeShellCommand("settings put global $setting 0")
                .close()
        }
    }
}
```

## Uso

```kotlin
class CheckoutTest {
    @get:Rule val animations = DisableAnimationsRule()
    @get:Rule val composeRule = createAndroidComposeRule<MainActivity>()

    @Test fun completaLaCompra() {
        composeRule.onNodeWithText("Agregar al carrito").performClick()
        composeRule.onNodeWithTag("cart_badge").assertTextEquals("1")
    }
}
```

## Limitaciones conocidas

- **El caché del AVD ocupa varios GB**: GitHub Actions limita el caché total por repositorio (10 GB), así que cachear muchos niveles de API en paralelo puede desalojar otros cachés (el de Gradle, por ejemplo).
- **`-no-snapshot-save` es intencional en el paso de tests**: guardar el snapshot al terminar hace que cada corrida escriba varios GB, anulando el beneficio. Solo el paso de creación guarda.
- **KVM no está disponible en todos los runners**: los runners de macOS y algunos self-hosted no lo tienen, y ahí el emulador es inviablemente lento. Para iOS, el simulador no tiene este problema pero exige runners macOS, mucho más caros.
- **API 34+ arranca más lento** y consume más memoria; si el runner se queda sin RAM el emulador muere sin mensaje claro. Ante cuelgues inexplicables, probar con un nivel de API menor aísla la causa.
- **Los tests instrumentados son el nivel más caro de la pirámide**: si la suite tarda 40 minutos, conviene revisar cuánto de eso podría ser test unitario. Este snippet hace que corran, no que sean la elección correcta.
- **`fail-fast: false` en la matriz** es deliberado: se quiere saber si falla en API 29 **y** en 34, no solo en la primera que rompa.

## Fuentes

- **Now in Android** (21.6k ⭐): su configuración de CI es la referencia oficial de Google para una app moderna, incluyendo cómo separa tests unitarios de instrumentados para no pagar el costo del emulador en cada push.
- **architecture-samples** (45.8k ⭐): muestra la misma app con distintas arquitecturas y sus respectivas estrategias de testing, útil para decidir qué merece test instrumentado.
- **Maestro** (10.8k ⭐): la alternativa que evita buena parte de esta configuración — sus flows corren contra el dispositivo sin depender del runner de instrumentación de Android, aunque siguen necesitando el emulador levantado.
- **fastlane** (41.9k ⭐): resuelve la otra mitad del pipeline (firma, build, distribución); junto con este snippet cubre el ciclo completo de CI móvil.

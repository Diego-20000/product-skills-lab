---
name: compose-list-performance
description: Corrige listas de Jetpack Compose que se traban al scrollear, aplicando keys estables, estado elevado correctamente, lambdas diferidas y clases estables para evitar recomposiciones innecesarias. Usar cuando una LazyColumn se siente lenta o pierde frames.
---

# Compose List Performance

## Contexto

Cuando una `LazyColumn` se traba, la causa casi nunca es la cantidad de
elementos: es que Compose está **recomponiendo** ítems que no cambiaron. El
modelo de Compose es que cualquier cambio de estado dispara la recomposición
de todo lo que lee ese estado, y el compilador solo puede saltearse esa
recomposición si puede probar que las entradas del composable no cambiaron.
Cuando no puede probarlo —porque el tipo es inestable, o porque cada
recomposición crea una lambda nueva— recompone por las dudas.

Los cuatro problemas concretos que producen esto, en orden de frecuencia:
falta de `key` en los ítems (Compose no puede saber que la fila 3 sigue
siendo la misma tras insertar una arriba), estado leído demasiado arriba en
el árbol (un contador que cambia recompone toda la pantalla en vez del
número), lambdas recreadas en cada recomposición (rompen la comparación de
igualdad de los parámetros), y clases de datos que Compose considera
inestables (`List`, tipos de módulos sin el compilador de Compose).

## Cuándo usarlo

- Una `LazyColumn`/`LazyRow` pierde frames al scrollear, especialmente en dispositivos de gama media.
- Al modificar un ítem, la lista entera parpadea o se reordena mal.
- El Layout Inspector o las métricas del compilador muestran recomposiciones altas en ítems que visualmente no cambian.

## Cuándo NO usarlo

- **Si la lentitud está en obtener los datos** (una query lenta, una llamada de red por ítem): esto es optimización de UI y no arregla un problema de datos. Medir primero dónde está el tiempo.
- **Para listas cortas y estáticas** (menos de ~20 ítems que no cambian): el costo de recomposición es irrelevante y estas optimizaciones agregan complejidad sin beneficio medible.
- **Si el problema son imágenes**: el cuello de botella ahí es la decodificación, no la recomposición — es el equivalente Android del skill `swiftui-list-image-loading`, y se resuelve con Coil/Glide bien configurados.

## Pasos / Código

**1. `key` estable en los ítems — lo primero siempre**

```kotlin
LazyColumn {
    items(
        items = users,
        key = { user -> user.id },          // identidad estable, no la posición
        contentType = { "user" }            // ayuda a reusar composables del mismo tipo
    ) { user ->
        UserRow(user = user)
    }
}
```

Sin `key`, Compose identifica los ítems por posición: insertar uno al
principio hace que todos los siguientes se consideren "cambiados" y se
recompongan, además de perder el estado interno de cada fila (un checkbox
marcado salta a otra fila).

**2. Diferir la lectura de estado que cambia seguido**

El caso típico es reaccionar al scroll. Leer el valor directamente recompone
todo el composable en cada pixel de scroll:

```kotlin
// ❌ recompone el contenedor entero en cada frame de scroll
val showButton = listState.firstVisibleItemIndex > 0

// ✅ el estado se lee dentro de derivedStateOf: solo emite cuando
//    el booleano realmente cambia de valor, no en cada scroll
val showButton by remember {
    derivedStateOf { listState.firstVisibleItemIndex > 0 }
}
```

**3. Pasar lambdas estables, no recreadas**

```kotlin
// ❌ una lambda nueva en cada recomposición: UserRow nunca puede saltearse
items(users, key = { it.id }) { user ->
    UserRow(user = user, onClick = { viewModel.select(user.id) })
}

// ✅ referencia estable + el id como parámetro
items(users, key = { it.id }) { user ->
    UserRow(user = user, onClick = viewModel::select)
}

@Composable
fun UserRow(user: User, onClick: (String) -> Unit) {
    Row(Modifier.clickable { onClick(user.id) }) { /* ... */ }
}
```

**4. Hacer estables los tipos que Compose no puede analizar**

`List<T>` es inestable para Compose porque la interfaz no garantiza
inmutabilidad. Dos salidas:

```kotlin
// Opción A: colecciones inmutables de kotlinx.collections.immutable
@Immutable
data class UiState(
    val users: ImmutableList<User> = persistentListOf()
)

// Opción B: marcar la clase como estable bajo responsabilidad propia
@Stable
data class UiState(val users: List<User>)
```

`@Immutable` es una promesa al compilador: si se incumple (se muta la lista
por debajo), la UI queda desactualizada sin error visible. Solo aplicarlo
cuando realmente se garantiza.

**5. Elevar el estado lo justo, no de más**

```kotlin
// ❌ el contador vive arriba: cambiar el número recompone la lista entera
@Composable
fun Screen(users: List<User>) {
    var count by remember { mutableStateOf(0) }
    Column {
        Text("Seleccionados: $count")
        UserList(users)          // se recompone aunque no dependa de count
    }
}

// ✅ el estado se lee solo donde se usa
@Composable
fun Screen(users: List<User>, countProvider: () -> Int) {
    Column {
        SelectedCount(countProvider)   // solo esto se recompone
        UserList(users)
    }
}
```

**6. Medir, no adivinar**

Activar las métricas del compilador para ver qué composables son
`restartable` pero no `skippable` (los candidatos a optimizar):

```kotlin
// build.gradle.kts del módulo
composeCompiler {
    reportsDestination = layout.buildDirectory.dir("compose_compiler")
    metricsDestination = layout.buildDirectory.dir("compose_compiler")
}
```

Y siempre medir en **build de release**: el modo debug de Compose es
significativamente más lento y da conclusiones equivocadas.

## Edge cases / errores comunes

- **Medir performance en build de debug**: Compose en debug no aplica optimizaciones del compilador y puede ser varias veces más lento. Una lista que "se traba" en debug puede estar perfecta en release.
- **`key` derivada del índice** (`key = { index -> index }`): es equivalente a no poner key. Tiene que ser una identidad del dato, estable entre reordenamientos.
- **`derivedStateOf` sin `remember`**: se recrea en cada recomposición y no sirve de nada. Siempre `remember { derivedStateOf { ... } }`.
- **Usar `@Immutable` sobre una clase que después se muta**: la UI deja de actualizarse y el bug es dificilísimo de rastrear, porque no hay error — simplemente no pasa nada.
- **Poner `Modifier.clickable` con una lambda inline en cada ítem** es aceptable si el resto de los parámetros son estables; el problema aparece cuando esa lambda captura variables que cambian.
- **Clases de otro módulo sin el compilador de Compose** se consideran inestables aunque sean `data class` inmutables. La solución es aplicar el plugin de Compose también a ese módulo, o declarar el tipo en un archivo de configuración de estabilidad.

## Compatibilidad

Aplica a Jetpack Compose 1.x en adelante. Desde Kotlin 2.0 el compilador de
Compose se configura con el bloque `composeCompiler` (antes se pasaba por
`kotlinOptions.freeCompilerArgs`). `ImmutableList` requiere la dependencia
`kotlinx-collections-immutable`. `contentType` en `items` está disponible
desde Compose 1.2.

## Fuentes

- **Now in Android** (21.6k ⭐): la app de referencia oficial de Google; su código muestra estas decisiones aplicadas en un proyecto real y modularizado, no en un sample de juguete — especialmente el uso de tipos estables en los `UiState`.
- **compose-samples** (23.3k ⭐): ejemplos oficiales por caso de uso; útiles para contrastar cómo se resuelve la misma lista en distintos contextos (feed, chat, catálogo).
- **architecture-samples** (45.8k ⭐): la misma app implementada con distintas arquitecturas, lo que ayuda a ver cómo el lugar donde vive el estado (el punto 5 de este skill) cambia según el patrón elegido.
- **leakcanary** (30k ⭐): complementario — este skill ataca recomposiciones, LeakCanary ataca la otra causa habitual de listas lentas en apps grandes, que son los objetos retenidos que nunca se liberan.

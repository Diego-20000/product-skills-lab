---
title: Compose o Views — cuándo migrar y cuánto
platform: mobile
pillar: android
tags: [jetpack-compose, android-views, decision, migration, architecture]
summary: Criterio para elegir entre Jetpack Compose y el sistema de Views en Android, y estrategia de migración incremental para una base existente.
---

# Compose o Views — cuándo migrar y cuánto

## El estado real de la discusión

Google declaró a Compose el camino recomendado para UI nueva en Android, y
sus propias apps de referencia (Now in Android) están construidas
enteramente con él. Para un proyecto nuevo, la decisión está tomada.

La discusión real es sobre bases existentes en Views, y ahí la pregunta
útil no es "¿Compose es mejor?" sino:

> ¿Cuánto de esta app se va a tocar en los próximos doce meses?

Migrar código que nadie va a modificar no aporta nada. Migrar código que se
va a rediseñar igual es casi gratis. Ese es el criterio, no la pureza
tecnológica.

Igual que en iOS, la decisión **no es binaria**: `ComposeView` mete Compose
dentro de una jerarquía de Views, y `AndroidView` hace lo contrario. Las
apps grandes reales son mixtas por años, y eso es un estado estable, no una
transición inacabada.

## Elegir Compose cuando

- Es un proyecto nuevo, o un módulo nuevo dentro de uno existente.
- La UI tiene estados que cambian seguido: listas que se actualizan, formularios con validación en vivo, pantallas con carga/error/vacío. El modelo declarativo elimina la clase entera de bugs de "la vista quedó desincronizada del estado".
- Se quiere reducir código de forma sustancial: un `RecyclerView` con su adapter, ViewHolder y DiffUtil se reemplaza por unas líneas de `LazyColumn`.
- Hace falta también Wear OS, o compartir UI con iOS/desktop vía Compose Multiplatform.
- Se valoran los previews de Android Studio y el theming basado en Material 3, que en Compose es mucho más directo.

## Quedarse en Views cuando

- La app es grande, funciona, y el equipo tiene capacidad limitada: una migración a medias es peor que ninguna.
- Se depende de librerías de terceros que solo exponen Views y no tienen wrapper razonable.
- Hay pantallas con **animaciones de transición muy custom** o con manejo de scroll anidado complejo, donde el sistema de Views todavía ofrece control más directo.
- El equipo no tiene experiencia en programación declarativa y el proyecto está bajo presión de plazos: la curva es real, sobre todo el modelo de estado y recomposición.
- Es una app en mantenimiento, sin desarrollo activo.

## Estrategia de migración incremental

El orden que funciona, de menor a mayor riesgo:

1. **Pantallas nuevas en Compose**, embebidas en la navegación existente con `ComposeView` dentro de un Fragment.
2. **Ítems de listas**: reemplazar el layout de una celda de `RecyclerView` por un `ComposeView` es un cambio acotado y de alto impacto en legibilidad.
3. **Pantallas que se van a rediseñar**: aprovechar el rediseño para reescribirlas.
4. **Componentes compartidos** (botones, cards, inputs): una vez que hay suficientes pantallas en Compose, construir la librería de componentes propia.
5. **La navegación**, al final y solo si conviene. Migrar de Navigation Component con Fragments a Navigation Compose es de las partes más entrelazadas y menos redituables.

```kotlin
// Compose dentro de un Fragment existente
class ProfileFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = ComposeView(requireContext()).apply {
        setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
        setContent {
            AppTheme { ProfileScreen(viewModel = viewModel) }
        }
    }
}
```

`setViewCompositionStrategy` importa: sin él, la composición puede sobrevivir
al ciclo de vida de la vista y provocar fugas.

```kotlin
// Una View de terceros dentro de Compose
@Composable
fun MapView(modifier: Modifier = Modifier) {
    AndroidView(
        factory = { context -> com.google.android.gms.maps.MapView(context) },
        modifier = modifier,
        update = { view -> /* actualizar según el estado */ }
    )
}
```

## Lo que cambia además del framework

Compose no es solo otra forma de declarar UI: cambia dónde vive el estado y
cómo se razona sobre el rendimiento.

- **El estado se eleva**: los composables reciben estado y emiten eventos, no lo guardan. Es el cambio conceptual más grande para un equipo que viene de Views con estado en el propio widget.
- **La recomposición hay que entenderla**: un composable se re-ejecuta cuando cambian sus entradas. Si el compilador no puede probar que no cambiaron, recompone por las dudas. De ahí que las claves, la estabilidad de tipos y las lambdas importen tanto — ver el skill [`compose-list-performance`](../../skills/compose-list-performance/SKILL.md).
- **El debugging es distinto**: el Layout Inspector muestra composables, no una jerarquía de Views, y hay que aprender a leer los conteos de recomposición.
- **Medir en release**: Compose en debug es notablemente más lento, y evaluar performance ahí lleva a conclusiones equivocadas.

## Errores frecuentes en esta decisión

- **Migrar todo de una** en un proyecto grande: consume meses, introduce regresiones en funcionalidad que andaba, y el usuario no percibe nada.
- **Mezclar sin criterio**: Compose y Views en la misma pantalla, alternando, produce problemas de foco, de scroll anidado y de theming. La frontera conviene que sea por pantalla o por componente completo, no entrelazada.
- **Evaluar Compose por una experiencia de 2021**: las primeras versiones tenían problemas reales de rendimiento y de API que ya no aplican.
- **Ignorar el tamaño del APK**: Compose agrega peso. Con R8 y shrinking bien configurados es manejable, pero es un factor si el tamaño importa.
- **Copiar la arquitectura de Views tal cual**: mantener estado mutable dentro del composable en vez de elevarlo reproduce en Compose los mismos bugs que Compose venía a eliminar.

## Qué NO responde esta guía

- **No cubre arquitectura** (MVVM, MVI, Clean): es ortogonal, aplicable a ambos. Ver `architecture-samples` para comparar.
- **No cubre la elección entre nativo y cross-platform**, que es anterior.
- **No cubre Compose Multiplatform** como decisión de compartir UI con iOS, que es un problema distinto al de elegir framework dentro de Android.
- **No fija un minSdk recomendado**: Compose requiere API 21+, pero la decisión real depende de los datos de la base de usuarios.

## Fuentes

- **Now in Android** (21.6k ⭐): la app de referencia oficial de Google, construida enteramente en Compose y modularizada; es el mejor ejemplo de cómo se ve una base moderna completa, no un sample de una pantalla.
- **compose-samples** (23.3k ⭐): ejemplos por caso de uso; útiles para verificar si un patrón concreto ya tiene solución idiomática antes de inventarla.
- **architecture-samples** (45.8k ⭐): la misma app con distintas arquitecturas, lo que ayuda a separar la decisión de UI de la decisión de arquitectura.
- **Compose Multiplatform** (19.3k ⭐): la extensión del modelo a iOS, desktop y web; relevante como factor de decisión si compartir UI está en el horizonte.
- **flexbox-layout** (18.3k ⭐) y **BaseRecyclerViewAdapterHelper** (24.6k ⭐): representan el ecosistema de utilidades construido sobre Views, y por lo tanto parte del costo real de migrar en apps que dependen de ellas.
- **leakcanary** (30k ⭐): relevante durante la migración — el manejo incorrecto de `ViewCompositionStrategy` es una fuente concreta de fugas en apps mixtas.

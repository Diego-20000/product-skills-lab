---
name: mobile-labels-and-touch-targets
description: Corrige los dos problemas de accesibilidad más frecuentes en apps móviles — controles sin etiqueta para VoiceOver/TalkBack y áreas táctiles por debajo del mínimo — en iOS nativo, Android nativo, React Native y Flutter. Usar al revisar accesibilidad de una app o antes de publicar.
---

# Mobile Labels and Touch Targets

## Contexto

En apps móviles, dos problemas concentran la mayoría de los reportes reales
de accesibilidad, y ambos son baratos de arreglar si se detectan a tiempo.

El primero son los **controles sin nombre accesible**. Un botón que muestra
solo un ícono —una papelera, tres puntos, una flecha— es perfectamente claro
visualmente y completamente opaco para un lector de pantalla, que anuncia
"botón" o directamente el nombre del archivo del ícono. El usuario que
navega con VoiceOver o TalkBack se encuentra con una fila de botones
indistinguibles.

El segundo son las **áreas táctiles chicas**. Apple recomienda un mínimo de
44×44 pt y Google 48×48 dp, y no es una cifra arbitraria: corresponde
aproximadamente al área de contacto de un dedo adulto. Un ícono de 24 px sin
padding alrededor produce errores de toque constantes, que afectan más a
personas con temblor, con movilidad reducida, o simplemente a cualquiera
usando el teléfono con una mano en movimiento.

Este skill no depende de ninguna librería porque —como confirmó la
investigación de fuentes— en accesibilidad móvil no existe un proyecto de
referencia masivo: lo que hay es documentación de plataforma y criterio.

## Cuándo usarlo

- Antes de publicar una app en App Store o Play Store.
- Al revisar accesibilidad de una app existente y hace falta priorizar por dónde empezar.
- Al construir componentes reutilizables con íconos, para que nazcan bien etiquetados.
- Cuando llegan reportes de usuarios sobre dificultad para tocar controles.

## Cuándo NO usarlo

- **Como auditoría completa de accesibilidad**: esto cubre dos categorías, no todo. Faltan contraste de color, orden de foco, soporte de texto ampliado, respeto por "reducir movimiento" y navegación por switch control.
- **Para elementos puramente decorativos**: una imagen de fondo o un separador **no** debe tener etiqueta — al contrario, hay que ocultarlos explícitamente del lector de pantalla para que no ensucien la navegación.

## Pasos / Código

### Etiquetas accesibles

**iOS (SwiftUI)**

```swift
// ❌ VoiceOver anuncia solo "botón"
Button(action: deleteItem) {
    Image(systemName: "trash")
}

// ✅ anuncia "Eliminar, botón"
Button(action: deleteItem) {
    Image(systemName: "trash")
}
.accessibilityLabel("Eliminar")
// hint opcional: explica QUÉ pasa, cuando no es obvio
.accessibilityHint("Elimina el pedido de la lista")
```

Ocultar lo decorativo:

```swift
Image("background-pattern")
    .accessibilityHidden(true)
```

Agrupar lo que conceptualmente es una unidad, para que VoiceOver no obligue
a recorrer cuatro elementos sueltos:

```swift
HStack {
    Image(systemName: "star.fill")
    Text("4.8")
    Text("(120 reseñas)")
}
.accessibilityElement(children: .combine)
.accessibilityLabel("Calificación 4.8 de 5, 120 reseñas")
```

**Android (Jetpack Compose)**

```kotlin
// ❌
IconButton(onClick = ::deleteItem) {
    Icon(Icons.Default.Delete, contentDescription = null)
}

// ✅
IconButton(onClick = ::deleteItem) {
    Icon(Icons.Default.Delete, contentDescription = "Eliminar")
}

// Decorativo: null es lo correcto acá, no un string vacío
Icon(Icons.Default.ChevronRight, contentDescription = null)
```

Agrupar:

```kotlin
Row(
    modifier = Modifier
        .semantics(mergeDescendants = true) {
            contentDescription = "Calificación 4.8 de 5, 120 reseñas"
        }
) { /* estrella, número, texto */ }
```

**React Native**

```tsx
<Pressable
  onPress={deleteItem}
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Eliminar"
  accessibilityHint="Elimina el pedido de la lista"
>
  <TrashIcon />
</Pressable>
```

**Flutter**

```dart
Semantics(
  label: 'Eliminar',
  button: true,
  child: IconButton(icon: const Icon(Icons.delete), onPressed: deleteItem),
)

// Decorativo
ExcludeSemantics(child: Image.asset('assets/pattern.png'))
```

### Áreas táctiles

**iOS** — el `frame` del contenido no es el área táctil; hay que expandirla:

```swift
Button(action: close) {
    Image(systemName: "xmark")
        .frame(width: 44, height: 44)   // área táctil completa
        .contentShape(Rectangle())      // toda el área responde, no solo el glifo
}
```

`contentShape(Rectangle())` es el detalle que más se olvida: sin él, solo
los pixeles opacos del ícono responden al toque, aunque el frame sea grande.

**Android (Compose)** — Material ya aplica un mínimo, pero conviene ser explícito:

```kotlin
IconButton(
    onClick = ::close,
    modifier = Modifier.size(48.dp)     // mínimo recomendado por Material
) {
    Icon(Icons.Default.Close, contentDescription = "Cerrar")
}
```

**React Native** — `hitSlop` expande el área sin cambiar el layout visual:

```tsx
<Pressable
  onPress={close}
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  accessibilityLabel="Cerrar"
>
  <CloseIcon width={20} height={20} />
</Pressable>
```

### Verificación

- **iOS**: Xcode → Accessibility Inspector, con auditoría automática que marca targets chicos y elementos sin etiqueta. Y probar con VoiceOver real en dispositivo.
- **Android**: Accessibility Scanner (app de Google en Play Store) escanea la pantalla y sugiere correcciones. Y probar con TalkBack.
- Probar de verdad con el lector de pantalla es irreemplazable: las herramientas automáticas no detectan una etiqueta que existe pero es incomprensible ("botón1").

## Edge cases / errores comunes

- **Etiqueta que repite el rol**: `accessibilityLabel="Botón eliminar"` hace que VoiceOver anuncie "Botón eliminar, botón". El rol lo agrega el sistema; la etiqueta dice solo *qué hace*.
- **`contentDescription = ""` en vez de `null` en Compose**: el string vacío deja el elemento en el árbol de accesibilidad como algo sin nombre. Para decorativos va `null`.
- **Etiquetar todo, incluido lo decorativo**: satura la navegación por lector de pantalla y la vuelve más lenta que la visual. Menos elementos bien etiquetados es mejor que todos etiquetados.
- **Confiar en `hitSlop` para resolver superposiciones**: si dos controles con `hitSlop` generoso se solapan, el resultado es impredecible. En layouts densos hay que separar los controles, no solo agrandar sus áreas.
- **No agrupar filas de lista**: sin `accessibilityElement(children: .combine)` o `mergeDescendants`, una lista de 20 productos con 4 elementos cada una obliga a hacer 80 swipes para recorrerla.
- **Textos que no escalan**: si la app usa tamaños fijos en px en vez de tipografía dinámica, un usuario con texto ampliado no puede leer nada — es la tercera falla más común, aunque quede fuera del alcance de este skill.

## Compatibilidad

Las APIs de accesibilidad de SwiftUI requieren iOS 13+; las de Compose,
Compose 1.0+. En React Native, `accessibilityRole` y `accessibilityLabel`
funcionan en ambas plataformas y se mapean a las APIs nativas
correspondientes. Los mínimos de área táctil son recomendaciones de las
guías de diseño (Human Interface Guidelines y Material Design), no
restricciones técnicas: el sistema no las impone, así que la verificación es
responsabilidad de quien desarrolla.

## Fuentes

Este pilar es la excepción del repo: el barrido de repositorios confirmó que
**no existe un proyecto de referencia por encima de 10k estrellas**
específico de accesibilidad móvil. Las librerías dedicadas
(`react-native-aria`, `react-native-a11y`, `GSCXScanner` y
`Accessibility-Test-Framework-for-Android` de Google) están todas muy por
debajo de esa vara.

- **Human Interface Guidelines (Apple)** y **Material Design (Google)**: son las fuentes reales de los mínimos de 44 pt y 48 dp, y de las convenciones de etiquetado. No son repos, son documentación de plataforma.
- **React Spectrum / React Aria** (15.7k ⭐): el trabajo de accesibilidad más exhaustivo que sí tiene repo grande; aunque apunta a web, su documentación de comportamiento esperado por lector de pantalla es lo más cercano a una referencia aplicable también a React Native.
- **gkd** (40.5k ⭐): aparece alto en el topic `accessibility` pero **usa** las APIs de accesibilidad de Android para automatizar toques — es lo contrario de lo que cubre este skill, y se menciona solo para evitar la confusión.

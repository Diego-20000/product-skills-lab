---
title: SwiftUI o UIKit — cuándo cada uno
platform: mobile
pillar: ios
tags: [swiftui, uikit, ios, decision, architecture]
summary: Criterio para elegir framework de UI en iOS, y para decidir cuánto migrar de una base UIKit existente sin reescribir por reescribir.
---

# SwiftUI o UIKit — cuándo cada uno

## El estado real de la discusión

La pregunta ya no es si SwiftUI está listo: para la enorme mayoría de las
pantallas, lo está. La pregunta útil es más específica:

> ¿Qué versión mínima de iOS hay que soportar, y hay algún control cuya
> personalización SwiftUI todavía no expone?

Esas dos cosas deciden casi todos los casos. Todo lo demás —elegancia,
cantidad de código, velocidad de desarrollo— favorece a SwiftUI de forma
bastante consistente.

Un dato que ordena la decisión: **no es binaria**. `UIHostingController`
permite meter SwiftUI dentro de UIKit y `UIViewRepresentable` permite lo
contrario. La mayoría de las apps reales son mixtas, y eso está bien.

## Elegir SwiftUI cuando

- Es un proyecto nuevo y el mínimo soportado es iOS 16 o superior. Cada versión desde la 14 cerró huecos importantes; a partir de 16 el framework se siente completo para UI de producto.
- La pantalla es principalmente declarativa: listas, formularios, detalles, ajustes. Ahí SwiftUI es dramáticamente menos código.
- Hace falta llegar también a watchOS, macOS o visionOS: es el único camino razonable para compartir UI entre plataformas Apple.
- Se valora el preview en vivo de Xcode, que acorta mucho el ciclo de iteración visual.
- Se necesita soporte automático de Dynamic Type, modo oscuro y accesibilidad básica: SwiftUI los da con mucho menos trabajo manual.

## Elegir UIKit cuando

- Hay que soportar iOS 14 o anterior. Las limitaciones de SwiftUI en esas versiones son reales y se pelean mucho.
- La pantalla necesita **control fino de scroll o de layout**: una galería con paginación custom, un editor con gestos complejos, una vista con reciclado de celdas muy específico. `UICollectionViewCompositionalLayout` sigue ofreciendo control que SwiftUI no expone.
- Hay que personalizar un control más allá de lo que su API de SwiftUI permite. Es el caso más frecuente de frustración: se llega al 90% en una tarde y el 10% restante requiere bajar a UIKit igual.
- La app ya es grande en UIKit y funciona: reescribirla no agrega valor de producto.
- Se depende de un SDK de terceros que solo expone vistas de UIKit.

## Estrategia para una base UIKit existente

El error caro es decidir "migramos todo a SwiftUI" como proyecto propio. Una
reescritura completa consume meses, introduce bugs en funcionalidad que ya
andaba, y no le mejora nada al usuario.

Lo que funciona es migrar **por pantalla, cuando esa pantalla se toca igual**:

1. **Pantallas nuevas en SwiftUI**, embebidas con `UIHostingController` en la navegación existente.
2. **Pantallas que requieren rediseño**: aprovechar y reescribirlas en SwiftUI, ya que se iban a tocar de todos modos.
3. **Pantallas que funcionan y nadie toca**: dejarlas en UIKit indefinidamente. No hay premio por convertirlas.
4. **La navegación**, al final. Es lo más entrelazado y lo que menos beneficio da migrar.

```swift
// Meter SwiftUI en una navegación UIKit
let view = ProfileView(viewModel: viewModel)
let controller = UIHostingController(rootView: view)
navigationController?.pushViewController(controller, animated: true)
```

```swift
// Meter UIKit en SwiftUI, para el control que SwiftUI no expone
struct MapViewRepresentable: UIViewRepresentable {
    func makeUIView(context: Context) -> MKMapView { MKMapView() }
    func updateUIView(_ view: MKMapView, context: Context) { /* ... */ }
}
```

## Lo que cambia además del framework

SwiftUI no es solo otra forma de escribir vistas: arrastra un modelo de
estado distinto, y ese suele ser el ajuste más difícil para un equipo que
viene de UIKit.

- El estado maneja la UI, no al revés. No se "actualiza la vista": se cambia el estado y la vista se recalcula.
- Las herramientas de estado (`@State`, `@Binding`, `@Observable`, `@Environment`) tienen reglas de propiedad que hay que entender; usarlas mal produce vistas que no se actualizan o que se recomponen de más.
- El debugging es distinto: no hay una jerarquía de vistas que inspeccionar de la misma forma, y los errores del compilador en vistas complejas siguen siendo poco claros (aunque mejoraron mucho).

## Errores frecuentes en esta decisión

- **Reescribir una app que funciona** para "modernizarla". El usuario no percibe el framework; percibe bugs nuevos.
- **Evitar SwiftUI por una mala experiencia en iOS 13 o 14.** El framework cambió sustancialmente; una evaluación de hace tres años no describe el estado actual.
- **Vistas SwiftUI gigantes.** El compilador se degrada con vistas de cientos de líneas y los mensajes de error se vuelven inservibles. Dividir en subvistas no es solo estilo, es lo que mantiene el proyecto compilable.
- **Asumir que SwiftUI resuelve la accesibilidad sola.** Da buenos defaults, pero un botón de solo ícono sigue necesitando `accessibilityLabel`.

## Qué NO responde esta guía

- **No cubre arquitectura** (MVVM, TCA, Clean): es una decisión ortogonal, aplicable a ambos frameworks.
- **No cubre la elección entre nativo y cross-platform**, que es anterior — ver el pilar `mobile/cross-platform`.
- **No cubre Objective-C**: si la base es ObjC, la pregunta previa es cuánto migrar a Swift.
- **No fija una versión mínima recomendada.** Depende de los datos de adopción de la base de usuarios real, no de una recomendación general.

## Fuentes

- **Swift** (70.2k ⭐): el repo del lenguaje; relevante acá porque features como macros y concurrencia estructurada cambian lo que es idiomático en ambos frameworks.
- **awesome-ios** (52.9k ⭐) y **open-source-ios-apps** (51.4k ⭐): la mejor forma de calibrar el estado real de adopción — ver qué usan apps completas y recientes dice más que cualquier artículo de opinión.
- **Kingfisher** (24.4k ⭐) y **Alamofire** (42.4k ⭐): ambas soportan los dos mundos; que las librerías centrales del ecosistema no obliguen a elegir es lo que hace viable la estrategia mixta.
- **Hero** (22.5k ⭐): transiciones custom en UIKit; ejemplo concreto de la categoría de control fino que motiva quedarse en UIKit para ciertas pantallas.
- **Compose Multiplatform** (19.3k ⭐): el equivalente del otro lado — sirve para ver que la tensión entre imperativo y declarativo se dio igual en Android, con la misma conclusión.

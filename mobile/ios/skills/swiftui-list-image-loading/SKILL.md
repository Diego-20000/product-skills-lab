---
name: swiftui-list-image-loading
description: Carga imágenes remotas en listas de SwiftUI sin trabas al scrollear, con cacheo en memoria y disco, cancelación al reciclarse la celda y redimensionado antes de decodificar. Usar cuando una lista con imágenes de red se siente lenta o consume demasiada memoria.
tags: [ios, swiftui, performance, images, caching]
---

# SwiftUI List Image Loading

## Contexto

Una lista con imágenes remotas es donde casi toda app móvil falla primero en
performance percibida, y el motivo es que el problema no es la descarga sino
la **decodificación**. Un JPEG de 3 MB y 4000×3000 px se descomprime en
memoria a unos 48 MB de bitmap (ancho × alto × 4 bytes por pixel), sin
importar que se muestre en una miniatura de 80 pt. Con veinte celdas
visibles eso es casi un giga de RAM, y la decodificación ocurre en el hilo
principal si no se toman precauciones, produciendo el tirón clásico al
scrollear.

`AsyncImage`, el componente que trae SwiftUI, resuelve el caso simple pero
tiene tres limitaciones conocidas: **no cachea** de forma efectiva entre
apariciones (al scrollear hacia atrás vuelve a descargar), **no redimensiona
antes de decodificar**, y **no permite cancelar** de forma controlada. Este
skill cubre esas tres cosas.

## Cuándo usarlo

- Una `List` o `LazyVStack` muestra imágenes que vienen de la red.
- Al scrollear rápido se nota tirón, o la app crece mucho en memoria.
- Las imágenes se recargan al volver a una pantalla ya visitada.

## Cuándo NO usarlo

- **Si el proyecto ya usa Kingfisher o SDWebImage**: ambas resuelven esto y bastante más (formatos progresivos, transiciones, procesadores encadenables). Escribir esto a mano solo tiene sentido si sumar una dependencia no es opción.
- **Para pocas imágenes que no se repiten** (un header, un avatar en una pantalla de detalle): `AsyncImage` alcanza y es mucho menos código.
- **Si las imágenes son locales** (assets del bundle): no hay descarga ni cache que resolver.

## Pasos / Código

**1. Un loader con cache de dos niveles y redimensionado**

```swift
import SwiftUI
import UIKit

actor ImageLoader {
    static let shared = ImageLoader()

    // NSCache se vacía solo bajo presión de memoria — a diferencia de un
    // Dictionary, que crecería hasta que el sistema mate la app.
    private let memoryCache = NSCache<NSURL, UIImage>()
    private var inFlight: [URL: Task<UIImage, Error>] = [:]

    private init() {
        memoryCache.totalCostLimit = 50 * 1024 * 1024  // ~50 MB
    }

    func image(from url: URL, maxPixelSize: CGFloat) async throws -> UIImage {
        if let cached = memoryCache.object(forKey: url as NSURL) {
            return cached
        }

        // Si ya hay una descarga en curso para esta URL, se reusa en vez
        // de arrancar otra (pasa seguido con avatares repetidos).
        if let existing = inFlight[url] {
            return try await existing.value
        }

        let task = Task<UIImage, Error> {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let image = Self.downsample(data: data, to: maxPixelSize) else {
                throw URLError(.cannotDecodeContentData)
            }
            return image
        }
        inFlight[url] = task

        defer { inFlight[url] = nil }
        let image = try await task.value
        memoryCache.setObject(image, forKey: url as NSURL, cost: image.estimatedCost)
        return image
    }

    /// Decodifica ya redimensionado: nunca existe el bitmap a tamaño completo.
    private static func downsample(data: Data, to maxPixelSize: CGFloat) -> UIImage? {
        let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
        guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions) else {
            return nil
        }

        let scale = UIScreen.main.scale
        let options = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceShouldCacheImmediately: true,   // decodifica acá, no en el hilo principal
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixelSize * scale,
        ] as CFDictionary

        guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options) else {
            return nil
        }
        return UIImage(cgImage: cgImage)
    }
}

private extension UIImage {
    var estimatedCost: Int { Int(size.width * size.height * scale * scale * 4) }
}
```

**2. Una vista que cancela sola al desaparecer la celda**

```swift
struct RemoteImage: View {
    let url: URL
    let size: CGFloat

    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Color.gray.opacity(0.15)
            }
        }
        .frame(width: size, height: size)
        .clipped()
        // .task se cancela automáticamente cuando la vista desaparece,
        // que es exactamente lo que hace falta al reciclar celdas.
        .task(id: url) {
            image = try? await ImageLoader.shared.image(from: url, maxPixelSize: size)
        }
    }
}
```

**3. Uso en la lista**

```swift
struct UserList: View {
    let users: [User]

    var body: some View {
        List(users) { user in
            HStack(spacing: 12) {
                RemoteImage(url: user.avatarURL, size: 56)
                    .clipShape(.circle)
                Text(user.name)
            }
        }
    }
}
```

**4. Cache en disco: configurar `URLCache`, no reinventarlo**

`URLSession` ya cachea en disco si el servidor manda los headers correctos.
Ampliar el tamaño suele ser todo lo que hace falta:

```swift
// En el arranque de la app
URLCache.shared = URLCache(
    memoryCapacity: 20 * 1024 * 1024,   // 20 MB
    diskCapacity: 200 * 1024 * 1024     // 200 MB
)
```

Si el servidor no manda `Cache-Control`, esto no sirve y hay que escribir
los archivos a mano en `caches` directory — pero conviene arreglar el
servidor antes de escribir esa capa.

## Edge cases / errores comunes

- **Usar un `Dictionary` en vez de `NSCache`**: el diccionario nunca libera memoria, así que la app crece hasta que iOS la mata. `NSCache` responde a la presión de memoria del sistema automáticamente.
- **Decodificar en el hilo principal**: sin `kCGImageSourceShouldCacheImmediately`, la decodificación real ocurre cuando UIKit va a dibujar la imagen — o sea, en el hilo principal, en pleno scroll. La opción fuerza que ocurra en el hilo de fondo donde se creó.
- **No deduplicar descargas en vuelo**: sin el diccionario `inFlight`, una lista con el mismo avatar repetido veinte veces dispara veinte descargas idénticas.
- **Olvidar `.task(id: url)`**: con `.task` a secas, si la celda se recicla y cambia de URL, la vista no vuelve a cargar. El `id:` reinicia la tarea cuando cambia la URL.
- **Guardar en `Documents` en vez de `Caches`**: `Documents` se respalda en iCloud y no lo limpia el sistema. Las imágenes cacheadas van en `Caches`, que iOS puede vaciar cuando falta espacio.
- **`maxPixelSize` sin multiplicar por `UIScreen.main.scale`**: la imagen se ve borrosa en pantallas Retina, porque 56 pt son 168 px reales en un dispositivo @3x.

## Compatibilidad

Requiere iOS 15+ por `.task` y `async/await`; el `actor` requiere Swift 5.5+.
Para iOS 14 y anteriores hay que reemplazar el actor por una cola serial con
`DispatchQueue` y `.task` por `.onAppear`/`.onDisappear` con cancelación
manual. `UIScreen.main` está deprecado en iOS 18 en apps multi-escena — ahí
conviene tomar la escala del `Environment` en vez de la pantalla global.

## Fuentes

- **Kingfisher** (24.4k ⭐): la referencia de esta categoría en Swift; su arquitectura (cache de memoria + disco, procesadores encadenables, cancelación ligada al ciclo de vida de la vista) es la que este skill reproduce en versión mínima. Si se puede sumar la dependencia, es la opción correcta.
- **SDWebImage** (25.6k ⭐): el competidor histórico, con más soporte de formatos legacy y una base de código más antigua pero muy probada. Su manejo de decodificación fuera del hilo principal es la fuente del criterio de `kCGImageSourceShouldCacheImmediately`.
- **Alamofire** (42.4k ⭐): resuelve la capa de red que acá se usa cruda con `URLSession`; relevante si la app ya lo tiene, porque su `AlamofireImage` cubre este mismo caso integrado con el resto de la configuración de red.

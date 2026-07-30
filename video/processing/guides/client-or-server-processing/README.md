---
title: Procesar video en el cliente o en el servidor
platform: video
pillar: processing
tags: [ffmpeg, wasm, video, architecture, decision, privacy]
summary: Criterio para decidir dónde ocurre el procesamiento de video según tamaño de archivo, volumen de uso, privacidad y costo, con el punto de corte donde cada opción deja de servir.
---

# Procesar video en el cliente o en el servidor

## Las cuatro variables que deciden

1. **Tamaño del archivo.** Es el límite duro: WASM carga el archivo entero en memoria, así que por encima de unos cientos de MB la pestaña muere. No es una cuestión de rendimiento sino de viabilidad.
2. **Tipo de operación.** Cortar sin recodificar es casi instantáneo; recodificar un video largo puede tardar minutos en el cliente y segundos en un servidor con aceleración por hardware.
3. **Volumen de uso.** El bundle de WASM pesa 25-30 MB comprimido. Si todos los usuarios lo descargan siempre, el ahorro de servidor se paga en ancho de banda.
4. **Privacidad.** Si el contenido no debe salir del dispositivo, la decisión ya está tomada y las otras tres solo definen qué es factible.

## Procesar en el cliente cuando

- **El contenido es sensible** y no debe subirse a infraestructura de terceros: material médico, legal, grabaciones personales. Es el argumento más fuerte y el que sobrescribe a los demás.
- **La operación es liviana**: cortar por keyframes (`-c copy`), extraer un frame como miniatura, convertir de contenedor sin recodificar.
- **Se preprocesa antes de subir**: recortar en el cliente para subir 10 MB en vez de 200 MB ahorra tiempo de subida, ancho de banda y almacenamiento. Este caso combina lo mejor de ambos.
- **El uso es ocasional**: una herramienta que se usa de vez en cuando amortiza mejor la descarga del WASM que una que se usa constantemente.
- **No se quiere operar infraestructura de transcodificación**, y el caso de uso entra dentro de los límites.

Ver el skill [`client-side-video-trim`](../../skills/client-side-video-trim/SKILL.md).

## Procesar en el servidor cuando

- **Los archivos son grandes** (más de ~500 MB): el modelo de memoria del cliente no da.
- **Hay que recodificar de verdad**: cambiar códec, generar múltiples calidades, aplicar filtros pesados. Un servidor con aceleración por hardware (NVENC, QSV) es de dos a tres órdenes de magnitud más rápido.
- **Hay que generar streaming adaptativo** (HLS/DASH): implica producir varias variantes y los manifiestos; es un pipeline, no una operación.
- **El uso es masivo y recurrente**: descargar 30 MB de WASM a cada usuario en cada sesión es peor que centralizar.
- **El resultado tiene que ser consistente**: en el cliente, el rendimiento y la memoria disponible varían enormemente entre un desktop y un teléfono de gama media.
- **Es parte de un pipeline automatizado** sin usuario esperando (procesar al subir, en background).

## El punto de corte, en números aproximados

| Operación | Archivo | Recomendación |
|---|---|---|
| Cortar sin recodificar | < 500 MB | Cliente |
| Extraer frame / miniatura | cualquiera | Cliente |
| Convertir contenedor (MP4↔MKV) | < 300 MB | Cliente |
| Comprimir para subir | < 200 MB | Cliente, si el usuario acepta esperar |
| Recodificar completo | cualquiera | Servidor |
| Generar HLS/DASH | cualquiera | Servidor |
| Procesamiento por lotes | cualquiera | Servidor |

Los números son órdenes de magnitud, no umbrales exactos: dependen del
dispositivo, y en móvil hay que dividirlos por dos o tres.

## Lo que casi siempre se subestima

**La diferencia entre copiar y recodificar es enorme.** Cortar con `-c copy`
opera sobre keyframes sin decodificar nada: un video de una hora se corta en
segundos, en cualquier lado. Recodificar el mismo video implica decodificar
y volver a codificar cada frame. Antes de decidir dónde procesar, conviene
verificar si la operación realmente necesita recodificar — muchas veces no.

**El costo del bundle de WASM.** 30 MB comprimido es más que la mayoría de
las aplicaciones web completas. Cargarlo de forma diferida, solo cuando el
usuario elige un archivo, es la diferencia entre una mejora y una regresión
de rendimiento para todos los demás visitantes.

**Móvil no es desktop.** El mismo código que procesa un video de 200 MB sin
problemas en una laptop puede matar la pestaña en un teléfono de gama media.
Si el procesamiento en cliente es parte del producto, hay que detectar
dispositivo y ofrecer el camino de servidor como alternativa.

## La estrategia híbrida

Casi siempre es la respuesta correcta cuando el producto tiene volumen:

1. **En el cliente**: validar el archivo, extraer la miniatura, recortar a la
   parte que interesa, y comprimir a una resolución razonable.
2. **Subir** el resultado, que ahora pesa una fracción del original.
3. **En el servidor**: generar las variantes de streaming, los sprites de
   miniaturas para el scrubbing, y cualquier procesamiento pesado.

Así el usuario sube menos, el servidor procesa archivos más chicos, y el
resultado final tiene la calidad y consistencia que solo un pipeline
controlado garantiza.

## Errores frecuentes

- **Cargar el WASM en el arranque de la app**: penaliza a todos los usuarios, incluidos los que nunca procesan video.
- **No liberar el sistema de archivos virtual**: `ffmpeg.wasm` mantiene los archivos en memoria; sin borrarlos, procesar tres videos seguidos agota la pestaña.
- **Recodificar cuando alcanzaba con copiar**: minutos en vez de segundos, sin ninguna ganancia.
- **Bloquear el hilo principal**: aunque el procesamiento corre en un worker, leer un archivo enorme a `ArrayBuffer` puede trabar la UI.
- **No dar feedback de progreso**: un procesamiento de dos minutos sin indicador hace que el usuario cierre la pestaña.
- **Suponer que el servidor es infinito**: transcodificar es de las operaciones más caras en CPU; sin cola y sin límites, unos pocos usuarios simultáneos tumban el servicio.

## Qué NO responde esta guía

- **No cubre cómo montar el pipeline de servidor** (colas, workers, almacenamiento, notificación de resultado), que es infraestructura con su propia complejidad.
- **No cubre servicios gestionados de transcodificación** (Mux, Cloudflare Stream, MediaConvert), que suelen ser la respuesta correcta cuando el video no es el producto — ver la guía de entrega en `video/playback`.
- **No cubre edición en tiempo real** ni composición de video, donde entran WebCodecs y WebGPU con trade-offs distintos.
- **No cubre generación de video desde código**, que es el terreno de Remotion.

## Fuentes

- **FFmpeg** (62.5k ⭐): la herramienta de ambos lados; que los flags sean los mismos en WASM y en servidor hace que migrar de una estrategia a la otra sea directo.
- **ffmpeg.wasm** (17.7k ⭐): hace viable el procesamiento en cliente; su peso de bundle y su modelo de memoria son exactamente los límites que definen el punto de corte de esta guía.
- **lossless-cut** (42.5k ⭐): una aplicación construida enteramente sobre el principio de cortar sin recodificar; demuestra hasta dónde llega ese enfoque cuando se lo toma como decisión de diseño.
- **VERT** (15.3k ⭐): conversor de archivos totalmente local; el ejemplo de referencia de un producto real basado en procesamiento client-side y de sus límites prácticos.
- **digital_video_introduction** (16.3k ⭐): el fundamento de por qué copiar es instantáneo y recodificar no — entender keyframes y códecs es lo que permite decidir bien esta pregunta.
- **Remotion** (54.9k ⭐): el caso que queda fuera de esta guía — generar video en vez de procesarlo, donde el render siempre ocurre del lado del servidor.

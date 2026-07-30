---
name: client-side-video-trim
description: Recorta, convierte o extrae frames de un video en el navegador con ffmpeg.wasm, sin subir el archivo a un servidor, incluyendo carga diferida del binario WASM y reporte de progreso. Usar cuando el procesamiento debe ocurrir del lado del cliente por privacidad, costo o latencia.
---

# Client-Side Video Trim

## Contexto

El flujo habitual para procesar un video es subirlo, transcodificarlo en el
servidor y descargar el resultado. Para un recorte de 10 segundos sobre un
archivo de 200 MB eso significa varios minutos de subida, costo de cómputo y
almacenamiento, y —lo que a veces importa más— que un archivo privado del
usuario pase por infraestructura de terceros.

`ffmpeg.wasm` compila FFmpeg a WebAssembly, así que el mismo procesamiento
ocurre en la máquina del usuario: nada sale del navegador, no hay costo de
servidor y no hay espera de subida.

El precio de esto es concreto y hay que tenerlo presente al decidir: el
binario WASM pesa unos 25-30 MB comprimido, el procesamiento usa la CPU del
usuario (mucho más lento que un servidor con aceleración por hardware), y el
archivo entero se carga en memoria, lo que impone un techo práctico de unos
cientos de MB antes de que la pestaña muera.

La consecuencia de diseño más importante: **recortar sin recodificar**
(copiando los streams) es casi instantáneo, mientras que recodificar un
video de 5 minutos puede tardar varios minutos. Cuando el caso lo permite,
la diferencia es de dos órdenes de magnitud.

## Cuándo usarlo

- Privacidad: el video no debe salir del dispositivo del usuario (contenido médico, legal, personal).
- Operaciones simples sobre archivos moderados: recortar, convertir formato, extraer un frame como miniatura.
- Se quiere evitar el costo y la complejidad de infraestructura de transcodificación.
- Preprocesamiento antes de subir: recortar en el cliente para subir 10 MB en vez de 200 MB.

## Cuándo NO usarlo

- **Archivos grandes** (más de ~500 MB): el modelo de memoria de WASM no da; la pestaña se queda sin memoria.
- **Transcodificación pesada** (reencodear un video largo, cambiar de códec): un servidor con aceleración por hardware lo hace órdenes de magnitud más rápido. Hacerlo en el cliente deja el navegador trabado varios minutos.
- **Uso masivo y repetido**: si todos los usuarios procesan videos siempre, descargar 30 MB de WASM a cada uno es peor que un servicio central.
- **Si hace falta salida en múltiples calidades** (generar un HLS): eso es un pipeline de transcodificación, terreno de FFmpeg nativo en servidor.

## Pasos / Código

**1. Cargar el binario de forma diferida — nunca en el load inicial**

```js
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;

export async function ensureFFmpeg(onProgress) {
  if (ffmpeg?.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => console.debug('[ffmpeg]', message));
  ffmpeg.on('progress', ({ progress }) => onProgress?.(Math.round(progress * 100)));

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}
```

Cargar esto en el arranque de la app le agrega 30 MB a **todos** los
usuarios, incluidos los que nunca van a procesar un video. Se carga cuando
el usuario elige un archivo, no antes.

**2. Recortar sin recodificar — el camino rápido**

```js
export async function trimVideo(file, startSeconds, durationSeconds, onProgress) {
  const ff = await ensureFFmpeg(onProgress);

  await ff.writeFile('input.mp4', new Uint8Array(await file.arrayBuffer()));

  await ff.exec([
    // -ss ANTES de -i: salta por keyframes sin decodificar (rapidísimo).
    // Después de -i sería exacto al frame, pero decodifica todo lo anterior.
    '-ss', String(startSeconds),
    '-i', 'input.mp4',
    '-t', String(durationSeconds),
    // -c copy: copia los streams tal cual, sin recodificar.
    // Es la diferencia entre 1 segundo y varios minutos.
    '-c', 'copy',
    'output.mp4',
  ]);

  const data = await ff.readFile('output.mp4');

  // Liberar memoria del sistema de archivos virtual: sin esto,
  // procesar varios videos seguidos agota la memoria.
  await ff.deleteFile('input.mp4');
  await ff.deleteFile('output.mp4');

  return new Blob([data.buffer], { type: 'video/mp4' });
}
```

**3. Extraer un frame como miniatura**

```js
export async function extractThumbnail(file, atSecond = 1) {
  const ff = await ensureFFmpeg();
  await ff.writeFile('input.mp4', new Uint8Array(await file.arrayBuffer()));

  await ff.exec([
    '-ss', String(atSecond),
    '-i', 'input.mp4',
    '-frames:v', '1',
    '-vf', 'scale=640:-1',   // -1 mantiene la proporción
    'thumb.jpg',
  ]);

  const data = await ff.readFile('thumb.jpg');
  await ff.deleteFile('input.mp4');
  await ff.deleteFile('thumb.jpg');

  return new Blob([data.buffer], { type: 'image/jpeg' });
}
```

**4. Comprimir antes de subir — acá sí hay que recodificar**

```js
export async function compressForUpload(file, onProgress) {
  const ff = await ensureFFmpeg(onProgress);
  await ff.writeFile('input.mp4', new Uint8Array(await file.arrayBuffer()));

  await ff.exec([
    '-i', 'input.mp4',
    '-vf', "scale='min(1280,iw)':-2",  // -2 mantiene proporción y paridad
    '-c:v', 'libx264',
    '-crf', '28',          // 18 = casi sin pérdida, 28 = buen balance, 51 = pésimo
    '-preset', 'ultrafast', // en WASM la velocidad importa más que el tamaño
    '-c:a', 'aac', '-b:a', '96k',
    'output.mp4',
  ]);

  const data = await ff.readFile('output.mp4');
  await ff.deleteFile('input.mp4');
  await ff.deleteFile('output.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}
```

**5. Uso con feedback al usuario**

```js
async function handleFile(file) {
  setStatus('Cargando procesador de video…');   // los 30 MB de WASM
  setProgress(0);

  try {
    const blob = await trimVideo(file, 10, 30, setProgress);
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    setStatus('Listo');
  } catch (err) {
    setStatus('No se pudo procesar el video');
    console.error(err);
  }
}

// Al desmontar o al reemplazar el resultado:
URL.revokeObjectURL(url);
```

## Edge cases / errores comunes

- **Cargar el WASM en el arranque de la app**: 30 MB para todos los visitantes, incluidos los que nunca procesan nada. Siempre diferido.
- **No borrar los archivos del FS virtual**: `ffmpeg.wasm` mantiene un sistema de archivos en memoria. Sin `deleteFile`, procesar tres videos seguidos agota la memoria de la pestaña.
- **Usar `-ss` después de `-i` sin necesidad**: es preciso al frame, pero decodifica todo el video hasta el punto de corte. Antes de `-i` salta por keyframes y es casi instantáneo. Si la precisión exacta importa, hay que aceptar el costo — pero pocas veces importa.
- **Recodificar cuando alcanzaba con `-c copy`**: la diferencia es de segundos contra minutos. Solo hace falta recodificar si cambia la resolución, el códec o el bitrate.
- **Bloquear el hilo principal**: `ffmpeg.wasm` corre en un worker, pero `file.arrayBuffer()` sobre un archivo enorme sí puede trabar la UI. Para archivos grandes conviene procesar en chunks o mover todo a un worker propio.
- **Faltan headers COOP/COEP**: la versión multi-hilo requiere `SharedArrayBuffer`, que exige `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp`. Sin ellos hay que usar la versión de un solo hilo, notablemente más lenta.
- **No liberar los object URLs**: cada `createObjectURL` sin su `revokeObjectURL` retiene el blob completo en memoria.

## Compatibilidad

Requiere soporte de WebAssembly (universal en navegadores evergreen). La
versión multi-hilo necesita `SharedArrayBuffer` y por lo tanto los headers
de aislamiento cruzado; sin ellos funciona en modo single-thread. En
**móviles el rendimiento es notablemente peor** y el límite de memoria mucho
más bajo — conviene detectar dispositivo y ofrecer procesamiento en servidor
como alternativa. Safari tuvo históricamente más limitaciones de memoria en
WASM que Chrome.

## Fuentes

- **ffmpeg.wasm** (17.7k ⭐): la compilación de FFmpeg a WebAssembly que hace posible este enfoque; su valor es exactamente el trade-off que documenta este skill — cero servidor a cambio de peso de bundle y CPU del cliente.
- **FFmpeg** (62.5k ⭐): la herramienta original. Los flags de este skill son los mismos de FFmpeg nativo, así que aprender uno sirve para el otro — y cuando el caso supera lo que aguanta el navegador, la migración a servidor es directa.
- **lossless-cut** (42.5k ⭐): una app entera construida sobre la idea del punto 2 —cortar sin recodificar— que demuestra hasta dónde llega ese enfoque cuando se toma como principio de diseño y no como optimización puntual.
- **VERT** (15.3k ⭐): conversor de archivos totalmente local en el navegador; el ejemplo de referencia de un producto real basado en procesamiento client-side.
- **digital_video_introduction** (16.3k ⭐): el fundamento teórico de por qué `-c copy` es instantáneo y recodificar no lo es, y de qué significan realmente CRF, keyframes y códecs.

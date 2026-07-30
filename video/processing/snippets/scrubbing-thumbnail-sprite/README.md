---
title: Sprite de miniaturas para previsualizar el scrubbing
platform: video
pillar: processing
tags: [ffmpeg, video, thumbnails, webvtt, sprite, ux]
summary: Genera con FFmpeg una hoja de miniaturas y su archivo WebVTT para mostrar una vista previa al arrastrar la barra de progreso, con una sola imagen en vez de cientos.
when_not_to_use: Para videos de menos de un minuto no aporta — el usuario encuentra el punto que busca sin previsualización.
---

# Sprite de miniaturas para previsualizar el scrubbing

## Contexto

Cuando alguien arrastra la barra de progreso de un video largo buscando una
escena, sin previsualización lo hace a ciegas: suelta, ve dónde cayó,
corrige, repite. La vista previa que aparece sobre la barra —esa miniatura
que muestra qué hay en cada segundo— convierte ese proceso en uno solo.

La implementación ingenua es generar un JPEG por segundo y cargarlos bajo
demanda. Para un video de una hora son 3600 requests HTTP, cada una con su
latencia: la previsualización llega tarde y el servidor recibe una ráfaga
por cada usuario que arrastra la barra.

La solución estándar de la industria es un **sprite**: todas las miniaturas
en una sola imagen, más un archivo **WebVTT** que le dice al reproductor qué
región de esa imagen corresponde a cada rango de tiempo. Una request en vez
de miles, y el formato WebVTT es el que consumen video.js, Plyr y la
mayoría de los reproductores sin configuración extra.

## Código completo

**Script de generación**

```bash
#!/usr/bin/env bash
# scripts/generate-thumbnail-sprite.sh
set -euo pipefail

VIDEO="${1:?Uso: ./generate-thumbnail-sprite.sh video.mp4 [salida]}"
OUT_DIR="${2:-thumbnails}"
INTERVAL=5          # una miniatura cada N segundos
THUMB_W=160         # ancho de cada miniatura
COLUMNS=10          # miniaturas por fila en el sprite

mkdir -p "$OUT_DIR"

# --- 1. Duración y proporción del video ---
DURATION=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 "$VIDEO")
DURATION=${DURATION%.*}

DIMS=$(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0 "$VIDEO")
SRC_W=${DIMS%,*}
SRC_H=${DIMS#*,}

# Alto proporcional, redondeado a par (los codecs lo exigen)
THUMB_H=$(( (THUMB_W * SRC_H / SRC_W + 1) / 2 * 2 ))

COUNT=$(( DURATION / INTERVAL + 1 ))
ROWS=$(( (COUNT + COLUMNS - 1) / COLUMNS ))

echo "Video: ${DURATION}s → ${COUNT} miniaturas de ${THUMB_W}x${THUMB_H} (${COLUMNS}x${ROWS})"

# --- 2. Generar el sprite en una sola pasada ---
# fps=1/N  → un frame cada N segundos
# scale    → redimensiona
# tile     → arma la grilla
ffmpeg -y -i "$VIDEO" \
  -vf "fps=1/${INTERVAL},scale=${THUMB_W}:${THUMB_H},tile=${COLUMNS}x${ROWS}" \
  -frames:v 1 \
  -q:v 4 \
  "$OUT_DIR/sprite.jpg"

# --- 3. Generar el WebVTT que mapea tiempo → región ---
VTT="$OUT_DIR/thumbnails.vtt"
echo "WEBVTT" > "$VTT"
echo "" >> "$VTT"

format_time() {
  printf '%02d:%02d:%02d.000' $(( $1 / 3600 )) $(( ($1 % 3600) / 60 )) $(( $1 % 60 ))
}

for (( i = 0; i < COUNT; i++ )); do
  start=$(( i * INTERVAL ))
  end=$(( start + INTERVAL ))
  (( end > DURATION )) && end=$DURATION

  x=$(( (i % COLUMNS) * THUMB_W ))
  y=$(( (i / COLUMNS) * THUMB_H ))

  {
    echo "$(format_time $start) --> $(format_time $end)"
    echo "sprite.jpg#xywh=${x},${y},${THUMB_W},${THUMB_H}"
    echo ""
  } >> "$VTT"
done

echo "✓ $OUT_DIR/sprite.jpg + $OUT_DIR/thumbnails.vtt"
```

**Salida del WebVTT**

```
WEBVTT

00:00:00.000 --> 00:00:05.000
sprite.jpg#xywh=0,0,160,90

00:00:05.000 --> 00:00:10.000
sprite.jpg#xywh=160,0,160,90

00:00:10.000 --> 00:00:15.000
sprite.jpg#xywh=320,0,160,90
```

El fragmento `#xywh=` es un identificador de fragmento de media estándar —
no una convención propia del reproductor.

**Consumo manual, sin librería**

```js
/** Parsea el VTT y devuelve una función que da la miniatura de un segundo dado. */
export async function loadThumbnailTrack(vttUrl) {
  const text = await fetch(vttUrl).then((r) => r.text());
  const base = vttUrl.slice(0, vttUrl.lastIndexOf('/') + 1);
  const cues = [];

  const blocks = text.trim().split(/\n\s*\n/).slice(1);   // saltear "WEBVTT"

  for (const block of blocks) {
    const [timing, source] = block.split('\n');
    const [startStr, endStr] = timing.split(' --> ');
    const [file, fragment] = source.trim().split('#xywh=');
    const [x, y, w, h] = fragment.split(',').map(Number);

    cues.push({ start: toSeconds(startStr), end: toSeconds(endStr), url: base + file, x, y, w, h });
  }

  return (seconds) => cues.find((c) => seconds >= c.start && seconds < c.end) ?? null;
}

function toSeconds(str) {
  const [h, m, s] = str.trim().split(':');
  return Number(h) * 3600 + Number(m) * 60 + parseFloat(s);
}
```

```js
// Aplicar la miniatura a un elemento de preview
const getThumb = await loadThumbnailTrack('/thumbnails/thumbnails.vtt');

function showPreviewAt(seconds, el) {
  const cue = getThumb(seconds);
  if (!cue) return;

  el.style.width = `${cue.w}px`;
  el.style.height = `${cue.h}px`;
  el.style.backgroundImage = `url(${cue.url})`;
  // Offset negativo: se corre el sprite para mostrar la región correcta
  el.style.backgroundPosition = `-${cue.x}px -${cue.y}px`;
}
```

## Uso

```bash
./scripts/generate-thumbnail-sprite.sh curso-leccion-01.mp4 public/thumbs/leccion-01
```

Con video.js (plugin oficial de vtt-thumbnails):

```js
player.vttThumbnails({ src: '/thumbs/leccion-01/thumbnails.vtt' });
```

Con Plyr:

```js
new Plyr('#player', {
  previewThumbnails: { enabled: true, src: '/thumbs/leccion-01/thumbnails.vtt' },
});
```

## Limitaciones conocidas

- **El sprite tiene un límite de tamaño real**: los navegadores móviles limitan las dimensiones máximas de una imagen (típicamente 4096 o 8192 px por lado). Un video de 2 horas con intervalo de 5s genera 1440 miniaturas — a 160 px de ancho y 10 columnas serían 1600×12960 px, por encima del límite. Para videos largos hay que subir el intervalo o partir en varios sprites.
- **El intervalo es un compromiso**: cada 5s da buena precisión y sprites grandes; cada 10s pesa la mitad pero la previsualización es menos exacta. Para contenido largo (películas, webinars), 10s suele alcanzar.
- **La imagen se descarga entera** al primer hover sobre la barra. Con un sprite de varios MB, la primera previsualización tarda. Conviene mantenerlo por debajo de ~500 KB con `-q:v` y miniaturas chicas.
- **`fps=1/N` toma el frame que corresponde, sin elegir el mejor**: si cae en una transición a negro, la miniatura es negra. Para contenido donde eso importa, el filtro `thumbnail` de FFmpeg elige frames más representativos, a costa de perder la correspondencia exacta con el tiempo.
- **La generación es un paso de pipeline, no de runtime**: para un video de una hora tarda minutos. Va después de la subida, en background, no en el request del usuario.
- **El script asume bash**: en Windows conviene correrlo en WSL o Git Bash, o portarlo a Node.

## Fuentes

- **FFmpeg** (62.5k ⭐): el filtro `tile` combinado con `fps` es lo que permite generar toda la grilla en una sola pasada de decodificación, en vez de invocar FFmpeg una vez por miniatura.
- **video.js** (39.8k ⭐): su plugin de vtt-thumbnails consume exactamente este formato, lo que confirma que WebVTT + `#xywh` es la convención de facto y no una solución ad hoc.
- **Plyr** (29.9k ⭐): implementa `previewThumbnails` con el mismo formato; que dos players independientes lo soporten sin configuración es la razón para generar VTT en vez de un JSON propio.
- **digital_video_introduction** (16.3k ⭐): explica por qué extraer frames de un video comprimido tiene el costo que tiene (hay que decodificar hasta el keyframe anterior), que es lo que hace que este paso sea lento y deba ser offline.

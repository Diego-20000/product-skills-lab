---
name: channel-export-presets
description: Exporta un master de video a los formatos exactos que exige cada canal (App Store, Google Play, TikTok/Reels, YouTube, web) con comandos FFmpeg reproducibles, en vez de re-exportar a mano desde el editor. Usar al preparar la entrega de un video para varios destinos.
---

# Channel Export Presets

## Contexto

Un mismo video suele tener que salir a cinco destinos con requisitos
distintos y no negociables: vertical 9:16 para TikTok y Reels, horizontal
16:9 para YouTube, un formato específico y con reglas de contenido para App
Store (Apple rechaza previews que muestren dispositivos Android), y web
donde el peso importa más que la calidad absoluta.

Hacer esto a mano desde el editor tiene tres problemas concretos: es lento,
es inconsistente entre exportaciones (alguien cambia un parámetro sin
querer), y no es reproducible — si hay que rehacer la entrega tres meses
después, nadie recuerda exactamente qué configuración se usó.

La solución es tratar la exportación como código: un master de máxima
calidad exportado una sola vez desde el editor, y de ahí un script que
genera todas las variantes con parámetros versionados. Cambiar el master y
volver a correr el script regenera todo de forma idéntica.

Este pilar es la excepción del repo en un punto: no hay repositorios de
referencia para el criterio editorial (estructura de guion, duración por
canal), porque eso no es código. Lo que sí es código —y es donde este skill
se concentra— son las especificaciones técnicas de salida.

## Cuándo usarlo

- Un mismo video tiene que salir a más de un canal.
- Hay que preparar assets promocionales para App Store o Google Play.
- Las exportaciones manuales del editor están saliendo inconsistentes.
- Se produce contenido de forma recurrente y el proceso de exportación se repite.

## Cuándo NO usarlo

- **Para un video único a un solo destino**: exportar desde el editor es más rápido que armar el script.
- **Si el recorte necesita criterio visual**: pasar 16:9 a 9:16 recortando el centro funciona para planos generales, pero decapita a una persona descentrada. Ahí el reencuadre es una decisión humana, y el script solo debería aplicarse después de definir el encuadre.
- **Si hace falta rehacer la edición** por canal (versión de 15s y de 60s con distinto ritmo): eso es otro montaje, no otra exportación.

## Pasos / Código

**1. Exportar un master de alta calidad, una sola vez**

Todo lo demás se deriva de acá, así que este archivo tiene que ser el mejor
posible: máxima resolución de la fuente, bitrate alto, sin recortes.

```
master.mp4 — 3840×2160 o 1920×1080, H.264/H.265, bitrate alto, audio 48kHz
```

Nunca derivar una exportación de otra exportación: cada recodificación pierde
calidad de forma acumulativa.

**2. Tabla de especificaciones por canal**

| Destino | Resolución | Aspecto | Códec | Notas |
|---|---|---|---|---|
| App Store preview | 1080×1920 (o la del dispositivo) | 9:16 | H.264 | 15-30 s. **No** puede mostrar dispositivos ni UI de Android |
| Google Play | 1920×1080 | 16:9 | H.264 | Se sube a YouTube y se enlaza; no se sube el archivo |
| TikTok / Reels / Shorts | 1080×1920 | 9:16 | H.264 | Dejar márgenes de seguridad: la UI tapa arriba y abajo |
| YouTube | 1920×1080 o 3840×2160 | 16:9 | H.264/H.265 | Bitrate alto: YouTube recodifica igual, conviene darle buen material |
| Web (hero/background) | 1920×1080 | 16:9 | **WebM (VP9)** + MP4 | WebM pesa ~30-50% menos; MP4 como fallback para Safari viejo |

**3. El script de exportación**

```bash
#!/usr/bin/env bash
# export-presets.sh — genera todas las variantes desde un master
set -euo pipefail

MASTER="${1:?Uso: ./export-presets.sh master.mp4}"
OUT="exports"
mkdir -p "$OUT"

echo "→ Vertical 9:16 (TikTok / Reels / Shorts / App Store)"
ffmpeg -y -i "$MASTER" \
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  -c:v libx264 -profile:v high -crf 20 -preset slow \
  -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ar 48000 \
  "$OUT/vertical-1080x1920.mp4"

echo "→ Horizontal 16:9 (YouTube / Google Play)"
ffmpeg -y -i "$MASTER" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -profile:v high -crf 18 -preset slow \
  -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 \
  "$OUT/horizontal-1920x1080.mp4"

echo "→ Web WebM (VP9) — el formato liviano"
ffmpeg -y -i "$MASTER" \
  -vf "scale=1920:-2" \
  -c:v libvpx-vp9 -crf 33 -b:v 0 -row-mt 1 \
  -an \
  "$OUT/web-hero.webm"

echo "→ Web MP4 (fallback)"
ffmpeg -y -i "$MASTER" \
  -vf "scale=1920:-2" \
  -c:v libx264 -crf 26 -preset slow \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  "$OUT/web-hero.mp4"

echo "→ Poster (primer frame útil)"
ffmpeg -y -ss 2 -i "$MASTER" -frames:v 1 -vf "scale=1920:-1" "$OUT/poster.jpg"

echo "✓ Listo en $OUT/"
```

**4. Los tres flags que más importan y por qué**

- **`-pix_fmt yuv420p`**: sin esto, un master con submuestreo 4:2:2 o 4:4:4 genera un archivo que Safari y QuickTime **no reproducen**. Es la causa número uno de "el video anda en Chrome pero no en iPhone".
- **`-movflags +faststart`**: mueve el índice del MP4 al principio del archivo, para que empiece a reproducirse mientras se descarga. Sin esto, un video web espera a la descarga completa antes de mostrar el primer frame.
- **`-an`** en los videos de fondo web: quitar el audio ahorra peso y evita que el navegador bloquee el autoplay, que solo se permite en videos silenciados.

**5. Márgenes de seguridad para vertical**

La UI de TikTok e Instagram tapa una franja arriba y abajo. Si hay texto en
el video, hay que mantenerlo dentro del ~80% central vertical. Para
verificar visualmente antes de publicar:

```bash
ffmpeg -i vertical-1080x1920.mp4 \
  -vf "drawbox=y=0:h=250:c=red@0.3:t=fill,drawbox=y=1670:h=250:c=red@0.3:t=fill" \
  -frames:v 1 safe-area-check.jpg
```

## Edge cases / errores comunes

- **Recortar 16:9 a 9:16 automáticamente**: el `crop` centrado funciona para planos generales y arruina cualquier toma donde el sujeto no esté centrado. Para contenido con personas hay que definir el encuadre a mano.
- **Exportar desde una exportación**: cada recodificación degrada. Siempre desde el master.
- **Olvidar `-pix_fmt yuv420p`**: el archivo se ve perfecto en la computadora de quien lo exportó y no reproduce en iPhone.
- **Mostrar dispositivos Android en un preview de App Store**: causa de rechazo documentada por Apple. La versión vertical de App Store suele necesitar su propio montaje, no solo su propia exportación.
- **Subir el archivo a Google Play**: Play no acepta el archivo de video; espera un enlace de YouTube. Es un error de proceso, no de formato.
- **CRF sin entender la escala**: es logarítmica e inversa — 18 es casi sin pérdida, 23 es el default, 28 ya se nota. Copiar un CRF de otro contexto sin verificar produce archivos enormes o feos.
- **No versionar el script**: si los parámetros viven en la cabeza de alguien o en el historial de la terminal, la entrega no es reproducible.

## Compatibilidad

Requiere FFmpeg instalado con `libx264` y `libvpx-vp9` (las builds
estándar los incluyen). VP9 codifica notablemente más lento que H.264 —
para un video largo conviene correrlo aparte. Las especificaciones de las
tiendas cambian: conviene verificar los requisitos vigentes de App Store
Connect y Play Console antes de una entrega importante, porque las
resoluciones y duraciones aceptadas se actualizan.

## Fuentes

Este sub-pilar es el único del repo **sin repositorios de referencia para su
criterio editorial**: la estructura de un guion o la duración óptima por
canal no son problemas de software y no tienen un proyecto open-source
equivalente. Lo que sigue son las fuentes de la parte técnica:

- **FFmpeg** (62.5k ⭐): la herramienta de todos los comandos de este skill; su capacidad de expresar cada especificación como flags reproducibles es lo que convierte la exportación en algo versionable.
- **digital_video_introduction** (16.3k ⭐): el fundamento de por qué CRF funciona como funciona, qué hace realmente el submuestreo de croma (y por qué `yuv420p` es necesario) y cómo se relacionan bitrate, resolución y percepción.
- **Remotion** (54.9k ⭐): el caso extremo de este mismo problema — generar cientos de variantes personalizadas de un video desde una plantilla de componentes React. Si las variantes no son solo de formato sino de contenido (por cliente, idioma o dato), este script se queda corto y Remotion es la herramienta.
- **lossless-cut** (42.5k ⭐): la referencia de qué se puede hacer sin recodificar; útil para separar qué operaciones de este pipeline realmente necesitan reencodear y cuáles no.

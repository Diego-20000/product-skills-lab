---
title: Estrategia de entrega de video — formato, hosting y streaming
platform: video
pillar: playback
tags: [video, streaming, hls, cdn, decision, performance]
summary: Criterio para decidir cómo servir video según duración, audiencia y presupuesto, desde un MP4 estático hasta streaming adaptativo con DRM.
---

# Estrategia de entrega de video — formato, hosting y streaming

## Las tres preguntas que deciden

1. **¿Cuánto dura el video?** Es la variable dominante. Un clip de 15 segundos y una clase de dos horas tienen soluciones completamente distintas.
2. **¿Cuánta gente lo va a ver?** Determina si el ancho de banda es un costo relevante o ruido.
3. **¿El contenido tiene que estar protegido?** Restringir el acceso es un problema, y evitar la copia es otro mucho más caro.

Casi todas las decisiones malas de esta categoría vienen de responder solo
la primera y saltar directo a la solución más compleja.

## Escalón 1 — MP4/WebM directo

**Cuándo:** clips cortos (menos de ~1 minuto), video de fondo, demos de
producto, GIFs reemplazados por video.

**Cómo:** archivo estático servido desde el mismo hosting o un CDN, con
`<video>` nativo. Dos formatos: WebM (VP9) primero porque pesa 30-50% menos,
MP4 (H.264) como fallback universal.

**Lo que hay que hacer bien:**
- `-movflags +faststart` en el MP4, para que empiece a reproducirse mientras descarga en vez de esperar el archivo completo.
- `-pix_fmt yuv420p`, sin lo cual Safari no reproduce.
- Un poster comprimido, que es lo que se ve mientras carga.
- `preload="none"` y carga diferida si hay varios en la página — ver el snippet [`lazy-video-with-poster`](../../snippets/lazy-video-with-poster/README.md).

**Dónde deja de servir:** el archivo se descarga en calidad fija. Con
conexión lenta, el usuario espera; con buena conexión, recibe la misma
calidad mediocre. Y saltar a un punto arbitrario requiere descargar todo lo
anterior.

## Escalón 2 — Streaming adaptativo (HLS/DASH)

**Cuándo:** el video pasa de unos minutos, la audiencia tiene conexiones
variables, o hace falta saltar a cualquier punto.

**Cómo:** el video se parte en segmentos de pocos segundos codificados en
varias calidades. El reproductor mide el ancho de banda real y elige calidad
segmento a segmento.

**Qué se gana:** arranca casi instantáneo en baja calidad y sube; el
seek es inmediato; el usuario en 3G ve algo en vez de esperar.

**Qué cuesta:** hace falta un pipeline de transcodificación que genere las
variantes y los manifiestos. Ese es el salto real de complejidad, no el
reproductor.

**HLS vs DASH:** HLS es el formato dominante y el único que Safari reproduce
nativamente. DASH es el estándar abierto, con mejor soporte de DRM
multiplataforma. Para la mayoría de los casos, HLS con hls.js cubre todo —
ver el skill [`adaptive-streaming-player`](../../skills/adaptive-streaming-player/SKILL.md).

## Escalón 3 — DRM

**Cuándo:** contenido con licencia donde el contrato exige protección
(catálogo de una distribuidora, contenido premium con obligación
contractual).

**Qué cuesta:** licencias de Widevine, PlayReady y FairPlay; un servidor de
licencias; y la restricción de que solo funciona en navegadores y
dispositivos que lo soportan.

**La advertencia importante:** DRM **no impide la copia**. Impide la copia
casual y cumple requisitos contractuales, pero quien quiera grabar la
pantalla lo va a lograr. Si el objetivo es "que no lo pirateen", DRM no es
la solución que se cree que es.

Para restringir **acceso** (que solo los suscriptores puedan ver), alcanza
con URLs firmadas de vida corta y verificación de sesión — mucho más barato
y suficiente para la mayoría de los casos.

## Construir el pipeline o contratarlo

Este es el trade-off que más impacta en el costo total, y suele decidirse
por inercia.

**Contratar** (Mux, Cloudflare Stream, Bunny Stream, api.video): se sube el
archivo y devuelven el manifiesto listo, con CDN, miniaturas y analíticas.
Se paga por minuto codificado y por minuto reproducido. Para la mayoría de
los productos que no son plataformas de video, es más barato en costo total
que construirlo — porque el costo real no es el servidor sino el tiempo de
mantenerlo.

**Construir** (FFmpeg + almacenamiento de objetos + CDN + un servidor como
SRS o mediamtx): tiene sentido cuando el volumen es alto y el precio por
minuto del servicio se vuelve significativo, cuando hay requisitos de
residencia de datos, o cuando el video **es** el producto.

La señal de que conviene construir: el gasto mensual del servicio supera el
costo de una persona dedicada a operarlo. Antes de ese punto, casi nunca.

## El costo que se subestima: el ancho de banda

Un video de 100 MB visto por 10.000 personas son 1 TB de tráfico. Según el
proveedor, eso puede ser desde unos pocos dólares hasta cientos. Es el
componente que más sorprende en la factura, y el que más se reduce con
decisiones simples:

- Un CDN, siempre. Servir video desde el origen es caro y lento.
- Codificar bien: un CRF adecuado puede reducir a la mitad el peso sin
  diferencia perceptible.
- Streaming adaptativo, que evita mandar 1080p a quien está mirando en un
  teléfono a 360p.

## Errores frecuentes

- **HLS para un video de 20 segundos**: toda la complejidad del pipeline para un caso que un MP4 resuelve mejor y más rápido.
- **Servir video desde el mismo servidor de la aplicación**: satura el ancho de banda y degrada la app entera.
- **Un solo formato**: solo MP4 desperdicia el ahorro de WebM; solo WebM rompe en Safari viejo.
- **Autoplay con sonido**: los navegadores lo bloquean. Autoplay solo con `muted`.
- **Ignorar `playsinline`**: en iPhone el video salta a pantalla completa y se pierde el control de la interfaz.
- **Subtítulos como archivo descargable aparte**: los `<track>` son parte del reproductor y cumplen una función de accesibilidad que un link a un `.srt` no cumple.
- **Poster pesado**: se optimizó el video y la imagen de espera pesa 800 KB.

## Qué NO responde esta guía

- **No cubre video en vivo**, que agrega latencia como restricción central y otras herramientas (WebRTC para baja latencia, RTMP/SRT para ingesta).
- **No cubre videoconferencia**, que es un problema completamente distinto (WebRTC, servidores SFU).
- **No cubre reproducción en mobile nativo**, donde las opciones son ExoPlayer/AVPlayer o wrappers como ijkplayer.
- **No cubre analíticas de reproducción** (retención, abandono), que suelen venir con los servicios gestionados y son trabajo aparte si se construye.

## Fuentes

- **video.js** (39.8k ⭐): el player con el ecosistema de plugins más maduro; su arquitectura separa el motor de streaming de la UI, que es la distinción que ordena esta categoría.
- **hls.js** (16.8k ⭐): hace posible HLS fuera del ecosistema Apple vía Media Source Extensions; es el motor, no el reproductor.
- **Shaka Player** (8.2k ⭐): cubre HLS y DASH con DRM integrado — la opción obligada del escalón 3, donde hls.js no llega.
- **Plyr** (29.9k ⭐): la capa de UI accesible; se combina con hls.js cuando el motor está resuelto pero se quiere control del aspecto.
- **SRS** (29.1k ⭐) y **mediamtx** (19.7k ⭐): el lado servidor si se decide construir; generan los segmentos y manifiestos que el reproductor consume.
- **FFmpeg** (62.5k ⭐): la herramienta de transcodificación de la que depende cualquier pipeline propio.
- **ijkplayer** (33.2k ⭐): el equivalente para apps móviles nativas, recordatorio de que la decisión de reproductor cambia por plataforma.

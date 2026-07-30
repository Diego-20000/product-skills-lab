---
title: Elegir formato de movimiento — CSS, Lottie, video o Rive
platform: video
pillar: production-marketing
tags: [lottie, video, animation, rive, decision, motion]
summary: Criterio para elegir en qué formato entregar una pieza de movimiento según quién la produce, si necesita interactividad y cuánto peso tolera el proyecto.
---

# Elegir formato de movimiento — CSS, Lottie, video o Rive

## La pregunta que ordena la decisión

No es "¿cuál se ve mejor?" sino:

> ¿Quién produce esta pieza y qué tiene que hacer una vez incrustada?

De ahí salen dos ejes que definen casi todo: **quién la crea** (alguien que
diseña en una herramienta de animación, o alguien que la escribe en código) y
**si tiene que reaccionar** a algo (al scroll, a un estado, al usuario) o
solo reproducirse.

## CSS o Web Animations API

**Cuándo:** el movimiento es simple y lo define quien programa. Transiciones
de estado, fades, desplazamientos, un spinner, un hover.

**Qué se gana:** peso cero, rendimiento óptimo, control total desde el
código.

**Dónde deja de servir:** cuando la animación tiene una identidad visual
propia que alguien diseñó. Reimplementar a mano una animación de marca en
CSS es lento, sale distinto, y hay que rehacerlo cada vez que el diseño
cambia.

Ver la guía [`css-waapi-or-library`](../../../web/animation/guides/css-waapi-or-library/README.md).

## Lottie

**Cuándo:** la animación la diseñó alguien en After Effects y hay que
reproducirla tal cual, en web y en las apps.

**Qué se gana:**
- El archivo pesa una fracción de un GIF equivalente (decenas de KB contra megabytes).
- Es vectorial: nítido a cualquier resolución, con transparencia real.
- **El mismo JSON funciona en web, iOS y Android.** Este es el argumento más fuerte y el que suele decidir: una sola pieza para todas las plataformas.
- Se puede controlar por código: pausar, saltar a un frame, reproducir un segmento.

**Qué cuesta:** el runtime pesa entre 100 y 250 KB según la variante. Y no
todas las funciones de After Effects se exportan — expresiones, ciertos
efectos y máscaras complejas pueden romperse, así que quien diseña tiene que
conocer las limitaciones antes de animar, no después.

Ver el snippet [`lottie-web-embed`](../../snippets/lottie-web-embed/README.md).

## Video (MP4/WebM)

**Cuándo:** la pieza tiene imagen real, texturas fotográficas, efectos
complejos, o es lo bastante larga como para que cualquier otra cosa no
tenga sentido. Un video de producto, un testimonial, una pieza de marketing.

**Qué se gana:** cualquier cosa que se pueda filmar o renderizar entra acá;
no hay límite de complejidad visual.

**Qué cuesta:** peso (megabytes, no kilobytes), transparencia complicada
—WebM con canal alfa no tiene soporte universal—, y control limitado: se
reproduce, se pausa, poco más. Además el autoplay está restringido por los
navegadores y requiere `muted`.

## Rive

**Cuándo:** la animación tiene que **reaccionar a estados** de forma no
lineal: un botón que cambia según se esté cargando, con éxito o con error;
un personaje que sigue el cursor; una animación que responde a la posición
del scroll con transiciones entre estados.

**Qué se gana:** es la única de las cuatro con una máquina de estados
incorporada. En Lottie habría que orquestar segmentos desde el código; en
Rive el estado es parte del archivo.

**Qué cuesta:** ecosistema mucho más chico. Como registra
[`SOURCES.md`](../../../_meta/SOURCES.md), su runtime está dos órdenes de
magnitud por debajo de Lottie en adopción, lo que significa menos ejemplos,
menos gente que lo conozca y más riesgo de dependencia. Además su editor es
propio, así que quien diseña tiene que aprenderlo.

## Tabla de decisión

| Situación | Formato |
|---|---|
| Transición de estado, hover, fade | **CSS/WAAPI** |
| Animación de marca diseñada en After Effects, misma pieza en web y apps | **Lottie** |
| Ilustración animada en loop, estado vacío, celebración | **Lottie** |
| Imagen real, textura fotográfica, pieza larga | **Video** |
| Animación que cambia según el estado de la app | **Rive** |
| Icono animado que reacciona al hover | **Lottie** (segmentos) o **CSS** si es simple |
| Fondo decorativo en movimiento | **Video** silenciado, o **CSS** si es geométrico |

## Lo que aplica a los cuatro formatos

**Respetar `prefers-reduced-motion`.** Una animación en loop es exactamente
el tipo de movimiento que causa malestar a personas sensibles. Con
cualquiera de los cuatro formatos hay que consultar la preferencia y ofrecer
una versión estática — ver el snippet
[`respect-reduced-motion`](../../../web/animation/snippets/respect-reduced-motion/README.md).

**Carga diferida.** Ninguna animación decorativa debería descargarse (ni su
runtime) antes de estar por entrar en pantalla.

**Accesibilidad.** El SVG que genera Lottie no tiene semántica; el video
tampoco. Si la pieza comunica algo, necesita `role="img"` y una etiqueta; si
es decorativa, `aria-hidden`.

**Peso presupuestado.** Vale definir de antemano cuánto puede pesar el
movimiento en una página. Sin ese límite, se acumulan cuatro Lotties y un
video de fondo y la página pesa más que la aplicación.

## Errores frecuentes

- **GIF para animación vectorial.** Es el error más caro y el más común: megabytes, bordes duros sin transparencia real, y borroso al escalar. Lottie o video lo superan en todo.
- **Video para una animación de interfaz simple**: se descargan megabytes para algo que CSS resuelve gratis.
- **Lottie para un fade**: cargar 150 KB de runtime para lo que hace una línea de CSS.
- **JSON de Lottie con imágenes embebidas en base64**: si el archivo pesa megabytes, casi siempre es esto, y anula la ventaja principal del formato.
- **Elegir Rive por sus capacidades sin evaluar el riesgo de ecosistema**: si la persona que lo eligió se va, puede quedar una dependencia que nadie sabe mantener.
- **No involucrar a quien diseña en la decisión de formato**: si anima libremente en After Effects sin saber que va a Lottie, la exportación va a fallar y hay que rehacer el trabajo.

## Qué NO responde esta guía

- **No cubre la producción en sí** (cómo animar, principios de motion design), que es trabajo de diseño.
- **No cubre animación 3D** (three.js, WebGL), que es una categoría aparte con otras restricciones.
- **No cubre generación programática de video** — para producir cientos de variantes de una pieza desde datos, ver el skill [`channel-export-presets`](../../skills/channel-export-presets/SKILL.md) y Remotion.
- **No cubre animación en juegos**, con motores y limitaciones propias.

## Fuentes

- **lottie-android** (35.7k ⭐) y **lottie-ios** (26.8k ⭐): la evidencia del argumento central de Lottie — el mismo archivo JSON reproducido nativamente en las tres plataformas es lo que ningún otro formato de esta lista ofrece.
- **Remotion** (54.9k ⭐): el caso de video generado desde código; relevante cuando la pieza no es una sola animación sino cientos de variantes personalizadas.
- **GSAP** (27.2k ⭐) y **anime.js** (71.6k ⭐): las alternativas cuando la animación se puede definir en código. Si quien la diseña trabaja en código, Lottie agrega un paso innecesario.
- **Rive** (~1.1k ⭐ en su runtime): evaluado y documentado con su cifra real. Su modelo de máquina de estados es genuinamente superior para animación interactiva, pero la brecha de adopción es un factor de riesgo que hay que considerar explícitamente.
- **FFmpeg** (62.5k ⭐): la herramienta detrás de la opción "video", incluyendo la generación de WebM con transparencia cuando esa es la elección.

---
title: Imágenes responsive con srcset y sizes
platform: web
pillar: responsive
tags: [html, images, performance, srcset, picture]
summary: Sirve la resolución de imagen adecuada a cada pantalla con srcset y sizes, y formatos modernos con <picture>, evitando descargar un archivo de 2000px para mostrarlo a 400px.
when_not_to_use: Para iconos, logos o cualquier gráfico vectorial, usar SVG — escala sin pérdida y no necesita variantes por resolución.
---

# Imágenes responsive con srcset y sizes

## Contexto

Las imágenes son casi siempre el mayor peso de una página, y el desperdicio
más común es servir el mismo archivo grande a todos: un teléfono con pantalla
de 390 px descarga la versión de 2000 px pensada para desktop, paga el ancho
de banda y el tiempo de decodificación, y la muestra reducida. En una
conexión móvil esa diferencia se mide en segundos.

`srcset` le da al navegador un menú de variantes y deja que **él** elija,
que es lo correcto porque el navegador conoce datos que el servidor no: el
ancho real del viewport, la densidad de píxeles del dispositivo y, en
algunos casos, la calidad de la conexión. El atributo `sizes` es la pieza
que más se malinterpreta: no describe la imagen, describe **cuánto espacio
va a ocupar en el layout**, y es lo que el navegador necesita para elegir
antes de haber calculado el CSS.

## Código completo

**Caso base: misma imagen en varias resoluciones**

```html
<img
  src="/img/hero-800.jpg"
  srcset="
    /img/hero-400.jpg   400w,
    /img/hero-800.jpg   800w,
    /img/hero-1200.jpg 1200w,
    /img/hero-2000.jpg 2000w
  "
  sizes="(max-width: 600px) 100vw,
         (max-width: 1200px) 50vw,
         600px"
  alt="Vista del panel de control"
  width="1200"
  height="675"
  loading="lazy"
  decoding="async"
/>
```

- **`srcset` con `w`**: declara el ancho real en píxeles de cada archivo.
- **`sizes`**: cuánto espacio ocupa la imagen en el layout, por rango de viewport. La última entrada sin condición es el valor por defecto.
- **`src`**: el fallback para navegadores sin soporte de `srcset`.
- **`width`/`height`**: reservan el espacio y evitan el salto de layout (CLS) al cargar. Van siempre, aunque el CSS después redimensione.

**Formatos modernos con fallback**

```html
<picture>
  <!-- El navegador toma el primer <source> cuyo tipo soporte -->
  <source
    type="image/avif"
    srcset="/img/hero-400.avif 400w, /img/hero-800.avif 800w, /img/hero-1200.avif 1200w"
    sizes="(max-width: 600px) 100vw, 600px"
  />
  <source
    type="image/webp"
    srcset="/img/hero-400.webp 400w, /img/hero-800.webp 800w, /img/hero-1200.webp 1200w"
    sizes="(max-width: 600px) 100vw, 600px"
  />
  <img
    src="/img/hero-800.jpg"
    alt="Vista del panel de control"
    width="1200" height="675"
    loading="lazy" decoding="async"
  />
</picture>
```

**Art direction: recortes distintos por pantalla**

Cuando no alcanza con escalar y hace falta otro encuadre:

```html
<picture>
  <!-- En móvil, un recorte cuadrado centrado en el sujeto -->
  <source media="(max-width: 600px)" srcset="/img/hero-square-600.jpg" />
  <img src="/img/hero-wide-1200.jpg" alt="..." width="1200" height="675" />
</picture>
```

**Generar las variantes en el build**

```bash
# Con sharp-cli: genera todos los anchos y formatos desde un original
for w in 400 800 1200 2000; do
  npx sharp -i original.jpg -o "hero-${w}.jpg"  resize $w
  npx sharp -i original.jpg -o "hero-${w}.webp" resize $w
  npx sharp -i original.jpg -o "hero-${w}.avif" resize $w
done
```

**CSS que acompaña**

```css
img {
  max-width: 100%;
  height: auto;      /* mantiene la proporción con width/height en el HTML */
  display: block;
}
```

## Uso

La regla práctica para `sizes`: mirar el CSS y traducir cuánto mide la
imagen en cada rango.

| Layout | `sizes` |
|---|---|
| Imagen a ancho completo siempre | `100vw` |
| Ancho completo en móvil, mitad en desktop | `(max-width: 768px) 100vw, 50vw` |
| Ancho fijo en un contenedor centrado | `(max-width: 768px) 100vw, 600px` |
| Grid de 3 columnas con gaps | `(max-width: 768px) 100vw, calc(33vw - 2rem)` |

## Limitaciones conocidas

- **`sizes` mal calculado es peor que no ponerlo**: si se declara `100vw` cuando la imagen ocupa un tercio, el navegador descarga la variante más grande y se pierde todo el beneficio. Vale la pena verificarlo en las DevTools (columna "Resource size" vs tamaño renderizado).
- **Mantener `sizes` sincronizado con el CSS es manual**: si cambia el layout y nadie actualiza el atributo, queda desalineado en silencio. Los frameworks con componente de imagen (Next.js, Astro) lo calculan por vos, y es una razón real para usarlos.
- **`loading="lazy"` en la imagen del hero perjudica**: retrasa justo el elemento que define el LCP. Solo para imágenes debajo del pliegue; en el hero conviene `fetchpriority="high"`.
- **AVIF codifica lento**: generar las variantes en cada build agrega tiempo notable. Conviene cachear los resultados o generarlos una vez.
- **`picture` con `media` no considera densidad de píxeles**: mezclar art direction con `srcset` denso requiere cuidado para no terminar con combinaciones contradictorias.

## Fuentes

- **Tailwind CSS** (96.1k ⭐) y **Bootstrap** (175k ⭐): ambos resuelven el lado CSS (`max-width: 100%`) pero no la selección de recurso; sirve para tener claro que este problema es de HTML, no de framework de estilos.
- **quicklink** (11.3k ⭐, de GoogleChromeLabs): ataca el problema hermano —qué recursos prefetchear— y su criterio de respetar la conexión del usuario es el mismo que justifica no servir siempre la imagen más grande.
- **mozjpeg** (5.7k ⭐): el codificador que muestra cuánto se puede ganar en peso sin pérdida perceptible; complementa a este snippet en la etapa de generación de las variantes.

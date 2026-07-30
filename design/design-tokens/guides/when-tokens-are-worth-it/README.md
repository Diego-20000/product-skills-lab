---
title: Cuándo un sistema de tokens vale la pena
platform: design
pillar: design-tokens
tags: [design-tokens, design-system, decision, roi]
summary: Criterio para decidir si montar un pipeline de design tokens o quedarse con variables CSS, y cómo estructurar las capas si la respuesta es que sí.
---

# Cuándo un sistema de tokens vale la pena

## El problema que los tokens resuelven de verdad

Los design tokens no existen para "tener los colores ordenados". Existen
para resolver un problema específico: **el mismo valor de diseño vive en más
de un lugar y esos lugares derivan con el tiempo**.

Si el producto es solo web, ese problema casi no aparece: las variables CSS
ya son una fuente única de verdad y no hay nada que sincronizar. El problema
real surge cuando el mismo color tiene que existir en un archivo Sass, un
`Colors.swift` y un `colors.xml`, y nadie tiene un mecanismo que garantice
que los tres coincidan. El resultado predecible es que la marca cambia, se
actualiza en web, y meses después alguien nota que la app Android sigue con
el color viejo.

De ahí el criterio central:

> Un pipeline de tokens se justifica cuando hay **más de una plataforma de
> destino**, o más de un producto compartiendo identidad visual.

## Cuándo NO montar un pipeline de tokens

- **Un solo producto web.** Las variables CSS nativas hacen el trabajo. Agregar un paso de build para generar lo que se puede escribir directo es ceremonia.
- **El proyecto usa Tailwind y solo es web.** El archivo de configuración ya cumple el rol de fuente única de verdad, y además genera las utilidades.
- **Quien define los valores es quien programa.** El pipeline resuelve un problema de coordinación entre disciplinas; si no hay dos disciplinas, no hay coordinación que resolver.
- **El sistema visual todavía está cambiando.** Formalizar tokens sobre un diseño que se redefine cada semana genera trabajo de mantenimiento sin beneficio.
- **Es un proyecto chico o con fecha de vencimiento.**

En todos estos casos sigue valiendo la pena la **capa semántica** (ver
abajo): nombrar las decisiones no requiere ningún pipeline.

## Cuándo sí

- **Web + mobile** con la misma identidad: el caso canónico.
- **Varios productos** de la misma marca (app principal, panel admin, sitio de marketing) que deben verse coherentes.
- **Marca blanca**: el mismo producto con la identidad de distintos clientes.
- **Un equipo de diseño que mantiene el sistema** y quiere que sus cambios lleguen al código sin pasar por un ticket.
- **Más de un tema** (claro/oscuro, alto contraste) que hay que mantener sincronizados.

## Lo que sí vale la pena siempre: las capas semánticas

Independientemente de si hay pipeline, la estructura en tres capas es lo que
hace que un sistema visual sea mantenible:

```
Base        →  Semántica de marca  →  Semántica de uso
--gray-950     --brand-primary        --surface
--indigo-600   --brand-accent         --text
                                      --action-background
```

- **Base**: la paleta cruda, sin significado. Nadie la usa en un componente.
- **Marca**: qué color *es* la marca.
- **Uso**: para qué sirve cada color. Es la única capa que consumen los componentes.

El valor concreto de esto: cambiar el fondo de todos los botones de acción
es tocar un token, no buscar y reemplazar hexadecimales. Y rebrandear es
cambiar la capa de marca sin tocar ni la paleta ni los componentes.

Un componente que referencia `--indigo-600` en vez de `--action-background`
rompe todo el sistema, tenga pipeline o no.

## Qué tokenizar y qué no

**Vale la pena tokenizar:**
- Color (con las tres capas).
- Espaciado, sobre una escala consistente (4 u 8 px de base).
- Tipografía: familias, tamaños, pesos, interlineado.
- Radios de borde, sombras, duraciones de animación.

**Casi nunca vale la pena:**
- Valores que se usan una sola vez. Un token con un solo consumidor es una indirección sin beneficio.
- Layout específico de una pantalla.
- Valores calculados que dependen del contexto.

La señal de que se tokenizó de más: un archivo de tokens con cientos de
entradas de las que la mitad no se usa, y donde encontrar el token correcto
es más lento que escribir el valor.

## El costo real, para tenerlo en cuenta

- **Un paso de build más** que puede fallar y que hay que mantener.
- **Archivos generados** que nadie debe editar a mano — y alguien lo va a hacer igual, así que conviene no versionarlos o validar en CI que coincidan.
- **Aprendizaje del equipo**: entender la diferencia entre las capas no es obvio y hay que documentarlo.
- **El nombrado es difícil.** Es la parte que más discusión genera y la que más impacta: un token mal nombrado se usa mal, y renombrarlo después rompe consumidores.

## Señales de que el sistema está funcionando

- Cambiar el color primario de la marca es un pull request de una línea.
- Nadie escribe hexadecimales en un componente.
- El equipo de diseño puede proponer un cambio de valores sin depender de que alguien lo traduzca.
- Agregar un tema nuevo no duplica la paleta.

## Señales de que no está funcionando

- Los componentes usan tokens base directamente → falta la capa semántica o no se entendió.
- Hay tokens con un solo consumidor → se tokenizó de más.
- Alguien editó un archivo generado → falta validación en CI, o no está claro que sean generados.
- Los nombres describen el valor y no el uso (`--color-azul-claro`) → el sistema no sobrevive a un rebrand.
- Web y mobile siguen desincronizados → el pipeline existe pero no está integrado a los builds reales.

## Qué NO responde esta guía

- **No cubre cómo elegir la paleta ni la escala tipográfica**: eso es diseño, no infraestructura.
- **No cubre sincronización bidireccional con Figma** (que los tokens se editen en la herramienta de diseño y bajen al código automáticamente), que agrega su propia complejidad.
- **No cubre tokens de componente** (`--button-primary-background`), una cuarta capa que algunos sistemas usan y que agrega granularidad a cambio de mucho más mantenimiento.

Para la implementación concreta, ver el skill
[`tokens-to-platform-variables`](../../skills/tokens-to-platform-variables/SKILL.md)
y el snippet [`theme-switch-with-tokens`](../../snippets/theme-switch-with-tokens/README.md).

## Fuentes

- **Style Dictionary** (4.8k ⭐): el estándar de facto del sector pese a su cifra modesta. Como registra [`SOURCES.md`](../../../../_meta/SOURCES.md), **esta categoría no tiene ninguna herramienta por encima de 10k estrellas** — lo cual es en sí mismo un dato: el problema se resuelve mayormente con configuración propia, no con una librería masiva.
- **semi-design** (10.2k ⭐): más de 3000 tokens definidos; útil como referencia de hasta dónde llega la granularidad en un sistema grande, y como advertencia de cuánto es demasiado.
- **Tailwind CSS** (96.1k ⭐): su configuración cumple el mismo rol para web; verlo ayuda a decidir cuándo Style Dictionary agrega valor real (hay mobile) y cuándo duplica lo que Tailwind ya hace.
- **awesome-design-md** (105k ⭐): el mismo problema atacado desde otro ángulo — describir el sistema en prosa para que una IA lo aplique, en vez de generar constantes para un compilador. Señal de que la "fuente única de verdad" del diseño puede tomar más de una forma.
- **primer/css** (13k ⭐): el design system de GitHub, con su estructura de tokens visible en un sistema que corre a escala real.

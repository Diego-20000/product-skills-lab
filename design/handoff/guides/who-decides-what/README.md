---
title: Quién decide qué — fronteras entre diseño y desarrollo
platform: design
pillar: handoff
tags: [handoff, collaboration, process, decision, design-system]
summary: Reparto explícito de decisiones entre diseño y desarrollo, para evitar tanto las idas y vueltas como el retrabajo por asumir que el otro lo iba a resolver.
---

# Quién decide qué — fronteras entre diseño y desarrollo

## El problema no es de comunicación

Cuando un handoff sale mal, la explicación habitual es "faltó comunicación".
Casi nunca es cierto. El problema real es que **hay decisiones que nadie
asumió como propias**, y cada lado supuso que el otro las iba a resolver.

Los dos síntomas son opuestos y aparecen en el mismo proyecto:

- **Vacío de decisión**: nadie definió qué pasa con un nombre de 80 caracteres, así que quien programa elige truncar, quien diseñó esperaba dos líneas, y se pierde un ciclo de revisión.
- **Doble decisión**: diseño especifica un padding de 14 px y desarrollo lo ajusta a 16 para que respete la escala del sistema. Ninguno está equivocado; el problema es que ambos creían tener la última palabra sobre eso.

La solución no es más documentación, es **acordar de antemano quién decide
cada categoría**.

## El reparto que funciona

### Decide diseño

- **Jerarquía visual**: qué es lo más importante de la pantalla, qué se ve primero.
- **Sistema visual**: paleta, escala tipográfica, escala de espaciado, radios, sombras. No los valores sueltos por pantalla — el sistema.
- **Comportamiento esperado**: qué pasa al tocar, qué se muestra mientras carga, qué se ve cuando no hay datos. Esto **es** diseño, no un detalle de implementación.
- **Copy de interfaz**: los textos de botones, mensajes de error y estados vacíos.
- **Orden de lectura y de foco**: en qué secuencia se recorre la pantalla. Es una decisión de diseño con impacto directo en accesibilidad.
- **Nombre accesible de los controles**: cómo se llama el botón de ícono. Quien diseñó sabe qué representa; quien programa lo inventa si no viene definido.

### Decide desarrollo

- **Estructura del código**: componentes, composición, dónde vive el estado.
- **Elección técnica**: qué librería, qué patrón, cómo se implementa una animación.
- **Rendimiento**: cómo lograr el efecto pedido sin trabar el scroll.
- **Adaptación al sistema real**: si el diseño pide 14 px y la escala es de 4, desarrollo redondea a 16 y lo comunica. La escala gana sobre el valor puntual.
- **Casos técnicos no contemplados**: qué pasa si la API tarda 30 segundos, si devuelve un error, si el usuario está offline.
- **Qué es factible en el plazo**: si algo lleva tres semanas y hay una, es una decisión técnica informar el costo — pero la de recortar es conjunta.

### Se decide en conjunto

- **Alcance de la funcionalidad**: qué entra en esta versión y qué no.
- **Recortes por tiempo**: cuando no entra todo, qué se sacrifica. Diseño aporta qué duele menos, desarrollo aporta qué cuesta menos.
- **Nuevos componentes del sistema**: si hace falta uno que no existe, ambos lados cargan con el mantenimiento.
- **Excepciones al sistema**: romper la escala o usar un color fuera de la paleta debería ser una decisión consciente y compartida, no una que se cuela.

## La regla que resuelve las dudas

> Si la decisión afecta lo que el usuario **percibe**, decide diseño.
> Si afecta cómo se **construye**, decide desarrollo.
> Si afecta **cuánto cuesta**, se decide en conjunto.

El caso que más confunde es el comportamiento (qué pasa al tocar, qué se ve
al cargar). Se siente técnico, pero el usuario lo percibe: es diseño.

## Lo que reduce la necesidad de decidir

Cuanto más resuelto está el sistema, menos decisiones quedan abiertas en cada
pantalla:

- **Design tokens con nombres semánticos**: si el diseño dice `action-background` en vez de un hexadecimal, no hay nada que especificar ni que interpretar.
- **Componentes existentes**: "usá el `Button` variante primary" es más preciso que describir un botón, y elimina la negociación.
- **Cobertura de estados como estándar del equipo**: si todos saben que un componente no está listo sin sus ocho estados, no hace falta especificarlo cada vez.
- **Storybook como contra-entrega**: quien implementa devuelve los estados en Storybook y quien diseñó revisa ahí. Cierra el círculo sin levantar la app ni abrir un ticket.

Esta es la inversión que más reduce fricción a largo plazo: **cada decisión
tomada a nivel de sistema es una que no hay que tomar por pantalla**.

## Antipatrones frecuentes

- **"Ya está en Figma"**: el archivo tiene medidas y colores, no comportamiento. Asumir que el handoff está completo porque el diseño está terminado es el origen de la mitad de las idas y vueltas.
- **"Lo resuelvo en el código"** sin avisar: desarrollo toma una decisión de percepción y diseño se entera en la revisión. La decisión puede ser correcta; el problema es no comunicarla.
- **Especificar el píxel exacto de todo**: ahoga las decisiones que corresponden a desarrollo y se desactualiza al primer cambio del sistema.
- **Diseñar con contenido perfecto**: nombres cortos, imágenes de igual tamaño, listas de cinco elementos. La realidad tiene nombres larguísimos e imágenes verticales.
- **Revisión solo al final**: cuando la única instancia de feedback es "está terminado", cualquier corrección es cara. Revisar el primer componente antes de construir los otros diez cuesta mucho menos.
- **Diseño sin restricciones técnicas**: proponer una interacción que el framework no soporta sin haberlo consultado genera retrabajo del lado del diseño, no del código.

## Qué NO responde esta guía

- **No cubre el formato del documento de handoff**: eso es el skill [`design-to-code-spec`](../../skills/design-to-code-spec/SKILL.md).
- **No cubre metodología de trabajo** (sprints, kanban, cuándo entra diseño en el ciclo), que es organización de equipo.
- **No aplica igual cuando la misma persona hace ambas cosas.** Ahí el reparto es innecesario, pero el criterio sigue sirviendo para saber qué decisiones conviene anotar para el futuro.
- **No cubre la relación con producto**, que agrega un tercer actor y decisiones de otro orden.

## Fuentes

- **awesome-design-md** (105k ⭐): colecciones de `DESIGN.md` que describen un sistema visual en prosa para que una IA lo aplique. Es la evidencia más clara de que el handoff maduro es documentar el sistema, no especificar cada pantalla.
- **Storybook** (90.7k ⭐): el mecanismo concreto de contra-entrega; convierte "¿quedó como el diseño?" en algo revisable estado por estado.
- **Figma-Context-MCP** (15.5k ⭐): automatiza la parte mecánica (medidas, colores) y por contraste deja en evidencia qué es lo que la herramienta de diseño no puede transmitir — que es exactamente lo que este reparto de decisiones cubre.
- **Radix UI Primitives** (19.1k ⭐): al separar comportamiento de estilo, define implícitamente una frontera útil — lo que Radix resuelve no necesita especificarse, y lo que deja abierto sí.
- **primer/css** (13k ⭐): el design system de GitHub, con documentación pública de cómo reparten decisiones entre sistema y producto en un equipo grande.

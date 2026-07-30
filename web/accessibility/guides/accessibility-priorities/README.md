---
title: Prioridades de accesibilidad — por dónde empezar
platform: web
pillar: accessibility
tags: [a11y, wcag, priorities, decision, audit]
summary: Orden de trabajo para hacer accesible un sitio existente, priorizando por cuántas personas quedan bloqueadas en vez de por el orden del checklist de WCAG.
---

# Prioridades de accesibilidad — por dónde empezar

## El problema de empezar por el checklist

Una auditoría automática sobre un sitio real suele arrojar cientos de
hallazgos. Recorrerlos en el orden en que aparecen —o en el orden de los
criterios de WCAG— es la forma más eficaz de gastar semanas sin que la
experiencia mejore para nadie en particular, porque mezcla cosas que
**bloquean por completo** a una persona con cosas que son molestias
menores.

El criterio útil para ordenar es otro:

> ¿Cuánta gente queda **bloqueada** por esto, y cuán caro es arreglarlo?

Bloqueado significa que no puede completar la tarea de ninguna forma. Eso va
primero, siempre, aunque el criterio de WCAG asociado sea de nivel A o AAA.

## Nivel 1 — Bloqueantes: arreglar ya

**Trampas de teclado.** Un modal o un widget del que no se puede salir con
Tab o Escape deja a quien navega por teclado sin poder hacer nada más que
recargar la página. Es el peor problema posible y suele venir de un
componente de terceros o de un modal casero.

**Controles no operables por teclado.** Un `<div onclick>` sin rol ni
`tabindex` es invisible para quien no usa mouse. Si es el botón de comprar,
esa persona no puede comprar.

**Contenido crítico sin nombre accesible.** Un botón de solo ícono sin
etiqueta, un input sin label, una imagen informativa sin `alt`. El usuario
escucha "botón, botón, botón" y no puede saber cuál es cuál.

**Foco invisible.** Un `outline: none` sin reemplazo hace que quien navega
por teclado no sepa dónde está parado. Es una línea de CSS que rompe la
navegación entera.

Estos cuatro suelen ser pocos elementos y de arreglo barato. Es donde está
el mayor retorno.

## Nivel 2 — Impacto alto: en el sprint

**Contraste insuficiente.** Afecta a mucha más gente de la que se suele
suponer: baja visión, daltonismo, y cualquiera usando el teléfono al sol.
El mínimo es 4.5:1 para texto normal y 3:1 para texto grande.

**Errores de formulario solo por color.** Si el campo inválido solo se pone
rojo, quien no distingue rojo del resto no percibe nada. Hace falta texto,
ícono y asociación programática (`aria-describedby`) con el mensaje.

**Estructura de encabezados rota.** Los lectores de pantalla navegan por
encabezados. Una página sin `<h1>` o que salta de `h2` a `h5` obliga a
recorrer todo linealmente.

**Contenido dinámico que no se anuncia.** Si al enviar un formulario aparece
"Guardado" sin `role="status"`, quien usa lector de pantalla no se entera de
que funcionó.

**Textos de link sin contexto.** Veinte links que dicen "Leer más" son
inútiles cuando el lector de pantalla los lista fuera de contexto.

## Nivel 3 — Refinamiento: cuando lo anterior está cubierto

- Orden de tabulación que no sigue el orden visual.
- Textos alternativos que existen pero son pobres (`alt="imagen1"`).
- Falta de un skip link (ver el snippet [`skip-link-and-visually-hidden`](../../snippets/skip-link-and-visually-hidden/README.md)).
- Movimiento que no respeta `prefers-reduced-motion`.
- Soporte de zoom al 200% sin scroll horizontal.
- Idioma del documento sin declarar (`<html lang="es">`).

## Lo que las herramientas automáticas NO encuentran

Este es el punto que más falsa seguridad genera. Las herramientas detectan
alrededor de un tercio de los problemas reales de accesibilidad — el resto
requiere criterio humano:

- **Un `alt` que existe pero no describe nada útil.** `alt="foto"` pasa cualquier validación automática.
- **Orden de tabulación ilógico**: técnicamente todo es focusable, pero el recorrido salta de un lado a otro.
- **Etiquetas que no coinciden con lo visible**: un botón que dice "Enviar" con `aria-label="Continuar"` confunde a quien usa control por voz.
- **Contenido que tiene sentido visualmente y no linealmente**: una tabla usada para maquetar, o información que depende de la posición en pantalla.
- **Un modal que atrapa el foco correctamente pero no lo devuelve al cerrar.**

La única forma de detectar esto es **probar navegando con teclado** y
**probar con un lector de pantalla real**. Media hora haciendo eso encuentra
más que una semana de arreglar hallazgos automáticos.

## Un orden de trabajo concreto

1. **Recorrer la página entera con Tab**, sin tocar el mouse. Anotar: dónde se pierde el foco, dónde no se ve, qué no se puede alcanzar, dónde queda atrapado.
2. **Correr axe** (extensión de navegador o en CI) y filtrar solo los de impacto crítico y serio.
3. **Arreglar los bloqueantes** del nivel 1.
4. **Probar con lector de pantalla** el flujo principal — no toda la app, solo el camino crítico. VoiceOver en Mac o NVDA en Windows, ambos gratuitos.
5. **Agregar linting** (`eslint-plugin-jsx-a11y`) para que los problemas nuevos no entren.
6. **Recién ahí** trabajar los niveles 2 y 3.

El paso 5 es el que evita repetir todo esto en seis meses.

## Qué NO responde esta guía

- **No es una guía de cumplimiento normativo.** Si hay una obligación legal (EN 301 549, ADA, Ley 26.653 en Argentina), el alcance lo define la norma y suele requerir una auditoría formal, no esta priorización pragmática.
- **No cubre accesibilidad cognitiva** (lenguaje claro, carga de información, tiempo de respuesta), que está menos formalizada y no se detecta con herramientas.
- **No cubre accesibilidad mobile nativa**, que tiene sus propias convenciones — ver el pilar `mobile/accessibility`.
- **No sustituye probar con usuarios reales.** Todo lo anterior es aproximación; la validación real es que alguien que usa lector de pantalla a diario complete la tarea.

## Fuentes

- **axe-core** (7.4k ⭐): el motor detrás de Lighthouse, las DevTools de Chrome y la mayoría de las herramientas comerciales. Su documentación de impacto por regla (crítico / serio / moderado) es la base de la priorización de esta guía.
- **eslint-plugin-jsx-a11y** (3.6k ⭐): la capa preventiva; corre en el editor y evita que los problemas ya resueltos vuelvan a entrar.
- **Radix UI Primitives** (19.1k ⭐) y **Headless UI** (28.7k ⭐): resuelven de raíz la mayoría de los bloqueantes del nivel 1 (foco, teclado, roles) en los componentes donde más se rompen.
- **React Spectrum / React Aria** (15.7k ⭐): la referencia más exhaustiva de comportamiento esperado por plataforma y lector de pantalla; útil cuando un caso concreto no está claro.
- **dark-reader** (22.2k ⭐): relevante para el nivel 2 — muestra cuántos sitios rompen el contraste al cambiar de tema, y por qué el contraste hay que verificarlo por tema y no una sola vez.
- **MathJax** (10.9k ⭐): el caso de contenido especializado (matemática) que sin tratamiento específico es completamente inaccesible; recordatorio de que hay dominios con reglas propias.

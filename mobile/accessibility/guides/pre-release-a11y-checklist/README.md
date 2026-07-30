---
title: Accesibilidad móvil antes de publicar
platform: mobile
pillar: accessibility
tags: [a11y, mobile, voiceover, talkback, checklist, decision]
summary: Orden de verificación de accesibilidad antes de subir una app a las tiendas, priorizado por cuántas personas quedan bloqueadas y no por el orden del checklist.
---

# Accesibilidad móvil antes de publicar

## Por qué en móvil se descubre tarde

En web, una parte de los problemas de accesibilidad los detecta una
herramienta automática. En móvil eso casi no existe: como confirma el
catálogo de fuentes de este repo, **no hay un proyecto de referencia
equivalente a axe-core** con adopción masiva. Los escáneres que existen
(Accessibility Scanner de Google, Accessibility Inspector de Xcode) cubren
menos y hay que correrlos a mano, pantalla por pantalla.

La consecuencia práctica es que en móvil la verificación es principalmente
**manual**, y por lo tanto hay que priorizar bien: intentar cubrir todo
antes de cada release no es realista. Este es el orden que más impacto tiene
por tiempo invertido.

## Nivel 1 — Bloqueantes: no publicar sin esto

**Controles sin etiqueta.** Un botón de solo ícono sin `accessibilityLabel`
(iOS) o `contentDescription` (Android) se anuncia como "botón" a secas. Una
barra de acciones con cinco íconos se vuelve cinco elementos
indistinguibles. Es el problema número uno en apps móviles.

**Áreas táctiles por debajo del mínimo.** 44×44 pt en iOS, 48×48 dp en
Android. No es una convención estética: corresponde al área de contacto de
un dedo. Un ícono de 24 px sin padding produce errores de toque constantes,
y afecta especialmente a personas con temblor o movilidad reducida.

**Elementos interactivos sin rol.** Una `View` con un gesto de toque, sin
declararse como botón, es invisible como control para el lector de pantalla:
se lee su texto pero no se anuncia que se puede activar.

**Texto que no escala.** Si la app usa tamaños fijos en píxeles en vez de la
tipografía dinámica del sistema, alguien con la fuente al 200% no puede leer
nada. Peor: si el layout no fue pensado para eso, el texto se corta y la
información desaparece.

Estos cuatro se resuelven casi siempre en los componentes compartidos, no
pantalla por pantalla. Ver el skill
[`mobile-labels-and-touch-targets`](../../skills/mobile-labels-and-touch-targets/SKILL.md).

## Nivel 2 — Impacto alto: antes del próximo release

**Contraste insuficiente.** El mínimo es 4.5:1 para texto normal. En móvil
importa más que en desktop porque la app se usa al sol, en movimiento y con
brillo bajo para ahorrar batería.

**Estado comunicado solo por color.** Un chip "activo" que solo cambia de
color no dice nada a quien no distingue esos colores ni a quien usa lector
de pantalla. Hace falta texto o `accessibilityState`.

**Listas sin agrupar.** Sin `accessibilityElement(children: .combine)` en
iOS o `mergeDescendants` en Android, una lista de 20 productos con 4
elementos cada uno obliga a 80 gestos para recorrerla. Es de los arreglos
que más mejora la experiencia real.

**Acciones sin confirmación audible.** Si al guardar aparece un toast
visual, quien usa lector de pantalla no se entera. Hace falta
`announceForAccessibility` (Android) o un anuncio de accesibilidad (iOS).

**Contenido que depende del orden visual.** Si el orden de foco no sigue el
orden lógico de lectura, la pantalla se vuelve confusa aunque todo esté
etiquetado.

## Nivel 3 — Refinamiento

- Etiquetas que existen pero son pobres (`"botón1"`, `"imagen"`).
- Falta de `accessibilityHint` donde la acción no es obvia por el label.
- Animaciones que no respetan "reducir movimiento" del sistema.
- Soporte de navegación por teclado externo o switch control.
- Textos alternativos de imágenes decorativas que deberían estar ocultas.

## Cómo verificar, en orden

1. **Activar el lector de pantalla y recorrer el flujo principal.** VoiceOver (iOS: triple click lateral) o TalkBack (Android: Ajustes → Accesibilidad). Media hora haciendo esto encuentra más que cualquier otra actividad de esta lista.
2. **Subir el tamaño de fuente del sistema al máximo** y recorrer las mismas pantallas. Los layouts rotos aparecen de inmediato.
3. **Correr el escáner automático**: Accessibility Scanner en Android, Accessibility Inspector en Xcode. Cubre poco, pero lo que marca suele ser real.
4. **Revisar el contraste** de los colores del design system, una vez, en vez de pantalla por pantalla.
5. **Agregar los `accessibilityLabel` faltantes** en los componentes compartidos.

El paso 1 es el que no se puede saltear. Un `accessibilityLabel` que existe
pero dice "botón1" pasa cualquier verificación automática y es inútil para la
persona que lo escucha.

## Lo que las tiendas exigen (y lo que no)

Ni App Store ni Google Play rechazan una app por ser inaccesible en general.
Lo que sí existe:

- **Play Store** tiene un informe de accesibilidad previo al lanzamiento (pre-launch report) que marca problemas detectados automáticamente. No bloquea, pero es información gratuita.
- **App Store** pide declarar la etiqueta de accesibilidad ("Accessibility Nutrition Labels") en la ficha, lo que hace visible al usuario qué soporta la app.
- En algunos contextos hay **obligación legal** (sector público, ciertos mercados), y ahí el requisito lo define la norma, no el criterio de esta guía.

Que no sea obligatorio no cambia el cálculo: la cantidad de personas que usan
lector de pantalla o tamaño de fuente aumentado en móvil es mucho mayor de
lo que la mayoría de los equipos supone.

## Qué NO responde esta guía

- **No es una guía de cumplimiento normativo.** Si hay una obligación legal, el alcance lo define la norma.
- **No cubre accesibilidad cognitiva** (lenguaje claro, carga de información, tiempo para completar tareas), menos formalizada y no detectable con herramientas.
- **No cubre accesibilidad web**, que tiene su propio criterio y mejores herramientas — ver `web/accessibility`.
- **No reemplaza probar con usuarios reales.** Todo lo anterior es aproximación; la validación es que alguien que usa lector de pantalla a diario complete la tarea.

## Fuentes

Como documenta [`SOURCES.md`](../../../_meta/SOURCES.md), **este pilar no
tiene proyectos de referencia por encima de 10k estrellas**. Las fuentes
reales son:

- **Human Interface Guidelines (Apple)** y **Material Design (Google)**: el origen de los mínimos de 44 pt y 48 dp, de las convenciones de etiquetado y de las expectativas de comportamiento de VoiceOver y TalkBack. Documentación de plataforma, no repos.
- **React Spectrum / React Aria** (15.7k ⭐): el trabajo de accesibilidad más exhaustivo con repo grande; apunta a web, pero su documentación de qué debe anunciar cada rol y estado es directamente trasladable.
- **Now in Android** (21.6k ⭐): app de referencia de Google donde se pueden ver las decisiones de accesibilidad aplicadas en código real, no en un sample aislado.
- **awesome-ios** (52.9k ⭐): incluye la categoría de accesibilidad, útil para descubrir herramientas del ecosistema aunque ninguna sea masiva.
- **gkd** (40.5k ⭐): aparece alto en el topic `accessibility` pero **usa** las APIs de accesibilidad para automatizar toques; se menciona solo para evitar la confusión de tomarlo como referencia de esta categoría.

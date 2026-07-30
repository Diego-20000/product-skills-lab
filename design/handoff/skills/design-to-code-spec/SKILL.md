---
name: design-to-code-spec
description: Define qué información debe cruzar la frontera entre diseño y código para que un componente se implemente sin adivinar — comportamiento, estados, breakpoints, contenido variable y accesibilidad — más allá de medidas y colores. Usar al preparar o recibir un handoff.
---

# Design to Code Spec

## Contexto

Las herramientas de diseño resolvieron hace años la parte fácil del handoff:
cualquiera puede inspeccionar un archivo de Figma y sacar el hexadecimal, el
padding exacto y el tamaño de fuente. Lo que **no** está en el archivo es
todo lo demás, y es justamente lo que genera las idas y vueltas: qué pasa al
tocar el botón, qué se muestra mientras carga, cómo se comporta con un
nombre de 60 caracteres, qué anuncia un lector de pantalla, cuál es el orden
de tabulación.

El síntoma de un handoff incompleto es reconocible: quien implementa hace
suposiciones razonables, quien diseñó las revisa después y pide cambios, y
se pierde un ciclo entero en cosas que se podían haber definido antes de
escribir una línea. El costo no es el rediseño, es el retrabajo.

Este skill es una **lista de lo que falta**, no un reemplazo de la
herramienta de diseño. Se apoya en que las medidas ya son inspeccionables y
se concentra en lo que solo existe en la cabeza de quien diseñó.

## Cuándo usarlo

- Se prepara la entrega de un diseño para que alguien lo implemente.
- Se recibe un diseño y hay que saber qué preguntar antes de empezar.
- Un componente ya implementado generó varias rondas de "no era así".
- Se define el proceso de handoff de un equipo.

## Cuándo NO usarlo

- **Si quien diseña e implementa es la misma persona**: el documento formal es ceremonia; alcanza con anotar las decisiones no obvias para el futuro.
- **Para exploración o prototipos descartables**: especificar algo que se va a tirar es desperdicio.
- **Para cambios triviales** (mover un elemento, cambiar un color): el diff visual alcanza.

## Pasos / Código

**1. Lo que la herramienta de diseño ya da (no hace falta especificar)**

Medidas, espaciados, colores, tipografía, radios, sombras. Si alguien los
está transcribiendo a mano en un documento, está duplicando información que
va a quedar desactualizada. Se referencia el archivo y listo.

**2. Lo que hay que especificar — la plantilla**

```markdown
# Componente: OrderCard

## Propósito
Muestra un pedido en la lista de "Mis pedidos" y permite ver su detalle.

## Anatomía
Referencia: [link al frame de Figma]
Tokens usados: color.action.background, size.spacing.md, radius.md

## Comportamiento

| Interacción | Resultado |
|---|---|
| Click / tap en la tarjeta | Navega a /orders/:id |
| Click en "Cancelar" | Abre diálogo de confirmación; no cancela directo |
| Confirmación aceptada | Estado pasa a "cancelando", la tarjeta queda deshabilitada |
| Falla la cancelación | Toast de error; la tarjeta vuelve a su estado anterior |

## Estados

- **Loading**: skeleton con la misma altura que la tarjeta real (no debe saltar el layout)
- **Error al cargar**: no aplica (la lista entera maneja el error)
- **Vacío**: no aplica a nivel tarjeta
- **Disabled**: durante la cancelación, opacidad 0.6, sin interacción

## Contenido variable

| Campo | Mínimo | Máximo | Qué pasa al exceder |
|---|---|---|---|
| Nombre del producto | 1 char | sin límite | 2 líneas y ellipsis |
| Cantidad de items | 1 | 99+ | Se muestra "99+" |
| Estado | — | — | Enum fijo: pendiente / enviado / entregado / cancelado |

## Responsive

| Ancho del contenedor | Layout |
|---|---|
| < 480px | Imagen arriba, datos debajo |
| >= 480px | Imagen a la izquierda, datos a la derecha |

Nota: depende del **contenedor**, no del viewport — la tarjeta también se
usa en un sidebar angosto.

## Accesibilidad

- Rol: la tarjeta entera es un link (`<a>`), no un `div` con onClick
- Nombre accesible: "Pedido #1234, 3 artículos, enviado"
- Orden de foco: tarjeta → botón Cancelar
- El estado (enviado/cancelado) se comunica por texto, no solo por color
- El botón Cancelar tiene área táctil mínima de 44×44

## Fuera de alcance
- Animación de entrada al aparecer en la lista (fase 2)
- Modo oscuro (se define cuando existan los tokens)
```

**3. Las cinco preguntas que resuelven el 80% de las idas y vueltas**

Si no hay tiempo para el documento completo, estas cinco cubren la mayoría:

1. **¿Qué pasa cuando no hay datos?** (estado vacío)
2. **¿Qué pasa mientras carga?** (skeleton, spinner, o nada)
3. **¿Qué pasa si el texto es el doble de largo?** (trunca, wrap, o crece)
4. **¿Qué pasa cuando falla?** (mensaje, reintento, o silencio)
5. **¿En qué se convierte esto en pantalla chica?** (o en un contenedor angosto)

**4. Reducir lo que hay que especificar a mano**

Cuanta más información esté en el sistema, menos hay que escribir:

- **Tokens con nombres semánticos** (ver el skill `tokens-to-platform-variables`): si el diseño dice `color.action.background` en vez de `#4F46E5`, no hace falta especificar el color — está resuelto por el sistema.
- **Componentes ya existentes**: "usa el `Button` variante primary" es más preciso y más corto que describir un botón desde cero.
- **Storybook como contra-entrega**: quien implementa devuelve el componente con sus estados en Storybook, y quien diseñó revisa ahí. Eso cierra el círculo sin tener que levantar la app.

**5. Automatizar la parte mecánica**

Para equipos que trabajan con agentes de código, herramientas como
Figma-Context-MCP dan acceso directo al layout del archivo, eliminando la
transcripción manual de medidas. Eso no reemplaza este documento — lo
complementa: la máquina resuelve las medidas, el documento resuelve el
comportamiento, que sigue sin estar en el archivo.

## Edge cases / errores comunes

- **Especificar solo el camino feliz**: es exactamente lo que ya está en el diseño. El valor del documento está en lo demás.
- **Transcribir medidas a mano**: se desactualiza apenas alguien mueve algo en Figma, y genera dos fuentes de verdad en conflicto. Se referencia el archivo.
- **Diseñar con contenido perfecto**: nombres cortos, imágenes del mismo tamaño, listas de exactamente cinco elementos. La realidad tiene nombres larguísimos, imágenes verticales y listas de un elemento.
- **Pensar breakpoints en vez de contenedores**: un componente reutilizable puede aparecer en un ancho que no corresponde a ningún breakpoint del viewport.
- **Dejar la accesibilidad para el final**: el orden de foco y el nombre accesible son decisiones de diseño (¿en qué orden se recorre esto? ¿cómo se llama este botón de ícono?), no detalles de implementación. Si no vienen definidas, quien programa las inventa.
- **No decir qué está fuera de alcance**: sin eso, quien implementa no sabe si la animación que no está especificada se olvidó o se descartó.

## Compatibilidad

El formato del documento es agnóstico de herramienta (Figma, Sketch, Penpot).
La sección de tokens asume que existe un sistema de tokens; si no lo hay, se
referencian los valores del archivo directamente y se acepta el costo de
mantenimiento.

## Fuentes

- **awesome-design-md** (105k ⭐): la colección de archivos `DESIGN.md` de marcas conocidas, escritos para que una IA replique un sistema visual. Es la evidencia más clara de hacia dónde va el handoff: de "exportá estos assets" a "documentá el sistema en un formato que una máquina pueda aplicar" — exactamente el mismo espíritu de este skill.
- **Figma-Context-MCP** (15.5k ⭐): da a un agente de código acceso directo a la información de layout del archivo, automatizando la parte mecánica del handoff y dejando en evidencia qué es lo que la herramienta **no** puede transmitir.
- **Storybook** (90.7k ⭐): el mecanismo de contra-entrega; convierte la revisión de "¿quedó como el diseño?" en algo que se puede hacer estado por estado sin levantar la aplicación.
- **mitosis** (13.9k ⭐): el extremo del handoff automatizado — un componente escrito una vez que compila a seis frameworks. Muestra el límite del enfoque: puede generar la estructura, pero las decisiones de comportamiento y accesibilidad siguen siendo humanas.
- **Radix UI Primitives** (19.1k ⭐): al separar comportamiento de estilo, define implícitamente qué parte del handoff es "diseño" (lo visual) y cuál es "comportamiento" (lo que Radix ya resolvió y no hace falta especificar).

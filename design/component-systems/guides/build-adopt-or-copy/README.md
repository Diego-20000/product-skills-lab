---
title: Construir, adoptar o copiar — estrategia de librería de componentes
platform: design
pillar: component-systems
tags: [design-system, components, shadcn, mui, radix, decision]
summary: Criterio para elegir entre construir componentes propios, instalar una librería completa o copiar el código al proyecto, según cuánto control de diseño se necesita.
---

# Construir, adoptar o copiar — estrategia de librería de componentes

## Las tres estrategias y qué compran

**Adoptar** (Material UI, Chakra, Ant Design): se instala como dependencia.
Los componentes vienen completos, con estilos, comportamiento y
accesibilidad. Compra **velocidad**: hay UI funcional el primer día, y las
mejoras llegan actualizando la versión.

**Copiar** (shadcn/ui y el modelo que popularizó): una CLI copia el código
fuente del componente al proyecto. Compra **control sin costo inicial**: se
arranca con algo hecho, pero el código es propio desde el minuto uno.

**Construir** (sobre primitivas headless como Radix, Headless UI o React
Aria): se implementa cada componente, apoyándose en librerías que resuelven
solo el comportamiento accesible. Compra **control total** y paga con
tiempo.

Ninguna es "la correcta". El eje que decide es qué tan distintiva tiene que
ser la interfaz y cuánta capacidad hay para mantenerla.

## Adoptar una librería completa cuando

- La velocidad importa más que la identidad visual: herramientas internas, paneles de administración, MVPs, back-offices.
- El equipo es chico y no hay nadie dedicado a diseño de sistema.
- El producto encaja razonablemente con el lenguaje visual de la librería (Material, Ant, etc.) y no hay intención de pelearlo.
- Se valoran los componentes complejos ya resueltos: data grids con virtualización, date pickers con localización, autocompletes con carga asíncrona. Reconstruir eso es semanas de trabajo.

**Contraejemplo:** si el diseño es propio y distintivo, se termina
sobreescribiendo tanto que aparece el peor escenario — se paga el peso
completo de la librería, se pelea con su especificidad, y el resultado ni se
ve como el diseño ni aprovecha la librería. En ese punto costó más de lo que
ahorró.

## Copiar el código al proyecto cuando

- El diseño es propio pero no hace falta empezar de cero.
- Molesta el techo de personalización de las librerías: en vez de esperar que el mantenedor agregue una prop, el componente ya es código editable.
- El proyecto usa Tailwind (el modelo shadcn está construido alrededor de eso).
- Se quiere control de la superficie de dependencias: lo que se copia es código propio, no un paquete que puede cambiar su API o quedar sin mantenimiento.

**El costo que hay que aceptar:** las mejoras y los arreglos del upstream
**no llegan solos**. Si Radix corrige un bug de accesibilidad, hay que
enterarse y aplicarlo a mano. Es un intercambio consciente de mantenimiento
por control, no un almuerzo gratis.

## Construir desde primitivas cuando

- La identidad visual es un diferencial del producto.
- Hay un equipo de diseño y capacidad de mantener un sistema en el tiempo.
- Los requisitos no encajan con ninguna librería: interacciones propias, densidad de información inusual, restricciones de marca fuertes.
- Hay varios productos que deben compartir el sistema, y ninguna librería externa va a servir a todos.

**Lo que nunca conviene construir desde cero:** el comportamiento accesible.
Manejo de foco, navegación por teclado, roles ARIA y compatibilidad con
lectores de pantalla son un pozo de complejidad que ya está resuelto en
Radix, Headless UI o React Aria. "Construir" debería significar poner el
estilo y la composición sobre esas primitivas, no reimplementar un dialog.

## La estrategia mixta, que es lo que hace casi todo el mundo

Nada obliga a elegir una sola:

- **Primitivas propias** (Button, Input, Card) copiadas o construidas, porque son las que llevan la identidad y se usan en todas partes.
- **Componentes complejos de una librería** (data grid, date picker, editor de texto rico), porque reconstruirlos no aporta identidad y sí mucho trabajo.
- **Comportamiento de Radix o React Aria** por debajo de los componentes propios.

La frontera razonable: cuanto más visible y más repetido es un componente,
más conviene que sea propio; cuanto más complejo y menos distintivo, más
conviene tomarlo prestado.

## Lo que hay que resolver con cualquiera de las tres

- **Cobertura de estados.** Un componente no está terminado hasta cubrir loading, error, vacío, disabled, focus visible y contenido largo — ver el skill [`component-state-coverage`](../../skills/component-state-coverage/SKILL.md).
- **Documentación visual.** Sin Storybook o equivalente, nadie sabe qué componentes existen ni en qué estados, y se terminan construyendo duplicados.
- **Una API de variantes consistente.** Que un componente use `variant` y otro `type` para lo mismo es la clase de inconsistencia que hace que la librería se sienta ajena — ver el snippet [`variant-props-with-cva`](../../snippets/variant-props-with-cva/README.md).
- **Tokens semánticos** por debajo, para que el sistema sobreviva a un rebrand.

## Señales de que se eligió mal

- **Más CSS de sobreescritura que de componentes propios** → se adoptó una librería cuando el diseño exigía construir.
- **Meses construyendo componentes básicos** mientras el producto no avanza → se construyó cuando alcanzaba con adoptar.
- **Nadie actualiza los componentes copiados** y arrastran bugs corregidos hace un año upstream → se eligió copiar sin asumir el mantenimiento.
- **Tres librerías de componentes en el mismo proyecto** → no hubo estrategia; cada feature eligió por su cuenta.
- **El equipo evita usar la librería propia** porque es más rápido escribir el markup a mano → la API es mala o la documentación no existe.

## Qué NO responde esta guía

- **No cubre el diseño del sistema visual en sí** (paleta, escala tipográfica, principios): eso es trabajo de diseño anterior a esta decisión.
- **No compara frameworks de UI** (React vs Vue vs Svelte), que es una decisión previa.
- **No cubre componentes para mobile nativo**, donde el ecosistema y los trade-offs son otros.
- **No cubre versionado y distribución** de una librería interna entre repos, que es un problema aparte de infraestructura.

## Fuentes

- **shadcn/ui** (120k ⭐): definió la estrategia de copiar en vez de instalar; sus estrellas —por encima de librerías mucho más viejas— son la evidencia más clara de cuánto pesaba el techo de personalización de las librerías tradicionales.
- **Material UI** (98.6k ⭐): el referente de adoptar; su sistema de theming es el más completo de la categoría, y también el ejemplo de hasta dónde se puede personalizar antes de estar peleando con la librería.
- **Storybook** (90.7k ⭐): necesario en las tres estrategias; sin documentación visual, cualquier sistema de componentes se degrada.
- **Radix UI Primitives** (19.1k ⭐), **Headless UI** (28.7k ⭐) y **React Spectrum** (15.7k ⭐): las primitivas de comportamiento; son la razón por la que "construir" ya no significa reimplementar accesibilidad desde cero.
- **Chakra UI** (40.5k ⭐) y **daisyUI** (41.9k ⭐): puntos intermedios — componentes con estilos pero con más flexibilidad que MUI.
- **primer/css** (13k ⭐) y **carbon** (9.3k ⭐): design systems de GitHub e IBM; referencias de cómo se ve un sistema construido a escala real y qué documentan.
- **awesome-react-components** (48.1k ⭐): útil para la estrategia mixta — encontrar el componente complejo específico que no vale la pena construir.

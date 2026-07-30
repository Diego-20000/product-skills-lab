---
title: Qué testear en cada nivel
platform: web
pillar: testing
tags: [testing, pyramid, unit, integration, e2e, decision]
summary: Criterio para decidir en qué nivel cubrir cada comportamiento, evitando tanto la suite de solo unitarios que no detecta nada como la de solo E2E que tarda una hora.
---

# Qué testear en cada nivel

## El criterio que ordena todo

La pregunta correcta no es "¿cuántos tests de cada tipo?" sino:

> ¿Cuál es el **nivel más barato** en el que este comportamiento puede
> fallar de verdad?

Un test caro que verifica lo mismo que uno barato es desperdicio. Un
comportamiento que solo falla cuando varias piezas interactúan no se puede
cubrir con tests aislados, por muchos que se escriban.

De ahí se derivan las dos formas clásicas de equivocarse. La suite de **solo
unitarios** tiene 500 tests en verde y la aplicación no arranca, porque
todos los mocks mienten de forma consistente. La suite de **solo E2E** tarda
50 minutos, falla de forma intermitente, y cuando algo se rompe el reporte
dice "el botón no apareció" sin decir por qué.

## Nivel 1 — Unitarios: lógica pura

**Qué va acá:** funciones sin efectos secundarios. Cálculos, validaciones,
transformaciones de datos, reducers, formateo, reglas de negocio expresadas
como funciones.

**Por qué:** son milisegundos, no necesitan navegador ni red, y cuando
fallan señalan exactamente la línea del problema.

**Señal de que algo está mal:** si un test unitario necesita cinco mocks para
correr, el código bajo test tiene demasiadas dependencias. El test está
reportando un problema de diseño, no de testing.

```js
// Ejemplo del caso ideal: entra un valor, sale otro
test('calcula el descuento por volumen', () => {
  expect(calcularDescuento({ cantidad: 10, precio: 100 })).toBe(50);
});
```

## Nivel 2 — Componentes: comportamiento de una pieza de UI

**Qué va acá:** que un componente renderice sus distintos estados, responda
a interacciones, y comunique correctamente (rol accesible, mensajes de
error). Con Testing Library y jsdom.

**Por qué:** cubre la mayoría de los bugs de UI a una fracción del costo de
un E2E, y —seleccionando por rol accesible— verifica de paso que el
componente sea navegable.

**Qué NO va acá:** la integración real con la API. Se mockea a nivel HTTP
(MSW), no el módulo de fetch, para que el test siga siendo válido si cambia
la librería de red.

Ver el skill [`testing-by-accessible-role`](../../skills/testing-by-accessible-role/SKILL.md)
y el snippet [`custom-render-with-providers`](../../snippets/custom-render-with-providers/README.md).

## Nivel 3 — Integración: varias piezas juntas, sin navegador

**Qué va acá:** un endpoint de API contra una base de datos real (en
contenedor), un flujo que atraviesa varias capas, la integración con un
servicio externo mockeado a nivel HTTP.

**Por qué:** es el nivel más subestimado y el que mejor relación
costo/detección tiene. Encuentra los errores que los unitarios no ven
(consultas mal escritas, migraciones incompatibles, serialización) sin el
costo ni la fragilidad de un navegador.

**Señal de que falta este nivel:** si los bugs que llegan a producción son
del tipo "la query devolvía otra cosa" o "el contrato de la API cambió", la
suite tiene un hueco acá, no en E2E.

## Nivel 4 — E2E: los caminos críticos, en un navegador real

**Qué va acá:** los flujos que, si se rompen, el producto no sirve. En una
tienda: registrarse, buscar un producto, comprar. Cinco o diez flujos, no
cien.

**Por qué:** es lo único que verifica que todas las piezas reales funcionan
juntas en un navegador real.

**Qué NO va acá:** validaciones de formulario campo por campo, estados de
error de cada componente, reglas de negocio. Todo eso ya se cubrió más
barato en los niveles anteriores; repetirlo en E2E multiplica el tiempo de
CI sin agregar información.

Ver el skill [`stable-e2e-selectors`](../../../../automation/browser-testing/skills/stable-e2e-selectors/SKILL.md).

## Cómo decidir en la práctica, caso por caso

| El comportamiento… | Va en |
|---|---|
| Es una función que transforma datos | Unitario |
| Depende de qué se renderiza y cómo responde a un click | Componente |
| Depende de la base de datos o del contrato de la API | Integración |
| Depende de que el navegador, el backend y la sesión funcionen juntos | E2E |
| Se puede verificar de dos formas | Siempre la más barata |

## Cuándo el modelo clásico no aplica

La "pirámide" (muchos unitarios, pocos E2E) es una guía, no una ley. Hay
casos donde la forma correcta es otra:

- **Un sitio principalmente estático** (contenido, marketing): casi no hay lógica que testear unitariamente. Unos pocos E2E de humo y verificación de links cubren más que cien unitarios.
- **Una librería sin UI**: no hay nivel de componente ni E2E; es casi todo unitario y de integración.
- **Una app con lógica de dominio compleja** (cálculos financieros, motores de reglas): el peso se va a unitarios de forma natural, y está bien.
- **Un prototipo o un experimento con fecha de vencimiento**: testear algo que se va a tirar en tres semanas puede ser desperdicio. Vale decirlo explícitamente en vez de fingir que se testeará después.

## Errores que aparecen en cualquier nivel

- **Testear la implementación en vez del comportamiento**: si un refactor sin cambio funcional rompe los tests, los tests están acoplados a detalles internos.
- **Mocks que mienten**: un mock que devuelve una forma de datos que la API real ya no devuelve hace que el test pase y la app falle. Los contratos hay que verificarlos en algún nivel.
- **Perseguir el porcentaje de cobertura**: 100% de cobertura con aserciones triviales no detecta nada. La cobertura sirve para encontrar zonas sin testear, no como objetivo.
- **Tests que dependen del orden**: impiden la paralelización, que es de donde sale la mayor parte de la velocidad de una suite.
- **No testear los casos de error**: el camino feliz es el que menos falla en producción. Los estados vacíos, los errores de red y los datos parciales son donde están los bugs.

## Qué NO responde esta guía

- **No cubre testing de performance ni de carga**, que son disciplinas aparte con herramientas propias.
- **No cubre testing de accesibilidad automatizado** más allá de la selección por rol; para eso hace falta axe-core contra el DOM renderizado.
- **No cubre visual regression testing** (comparar screenshots), que resuelve una categoría que ninguno de estos cuatro niveles detecta.
- **No define un porcentaje objetivo por nivel.** Cualquier número concreto (70/20/10) es arbitrario fuera de un contexto específico.

## Fuentes

- **javascript-testing-best-practices** (24.6k ⭐): la referencia más directa de este criterio; su desarrollo de qué corresponde a cada nivel y por qué es la base de esta guía.
- **Testing Library** (19.6k ⭐): su principio rector —cuanto más se parezca el test al uso real, más confianza da— es lo que empuja el peso del nivel 1 hacia el 2 en aplicaciones de UI.
- **Jest** (45.5k ⭐) y **Vitest** (16.9k ⭐): los runners de los niveles 1 a 3; Vitest reutiliza la config de Vite, lo que reduce la fricción de tener niveles separados en el mismo proyecto.
- **Playwright** (93.7k ⭐) y **Cypress** (50.6k ⭐): el nivel 4; su auto-waiting y aislamiento son lo que hace que E2E sea sostenible cuando se lo usa con moderación.
- **localstack** (65.2k ⭐): habilita tests de integración reales contra servicios cloud sin tocar infraestructura, que es lo que suele faltar para cubrir bien el nivel 3.
- **enzyme** (19.8k ⭐): el enfoque anterior de testing de componentes, acoplado a la implementación; útil como contraejemplo de qué produce testear detalles internos.

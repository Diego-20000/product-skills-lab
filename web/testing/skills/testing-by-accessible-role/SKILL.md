---
name: testing-by-accessible-role
description: Escribe tests de componentes seleccionando elementos por rol accesible y texto visible en vez de por clase CSS, test-id o estado interno, de modo que el test falle solo cuando se rompe algo que el usuario percibe. Usar al escribir o refactorizar tests de UI frágiles.
---

# Testing by Accessible Role

## Contexto

El problema recurrente de las suites de tests de UI no es que fallen, es que
fallan **cuando no deberían** y **no fallan cuando deberían**. Un test que
selecciona `.btn-primary` se rompe al renombrar una clase aunque el botón
siga funcionando perfecto (falso positivo, erosiona la confianza en la
suite). Un test que inspecciona el estado interno del componente pasa aunque
el botón sea un `<div>` sin rol ni foco, invisible para un lector de
pantalla (falso negativo, la falla real no se detecta).

La respuesta a ambos es cambiar el criterio de selección: buscar los
elementos **como los encuentra un usuario** — "el botón que dice Guardar",
"el campo etiquetado Email" — usando el árbol de accesibilidad, que es
exactamente la información que consume un lector de pantalla. El efecto
secundario es el que más valor tiene: un test que pasa implica que el
componente es navegable de forma accesible, porque si no lo fuera el
selector no encontraría nada.

## Cuándo usarlo

- Se están escribiendo tests de componentes o de integración de UI (React, Vue, Svelte, o E2E con Playwright).
- Una suite existente se rompe seguido por refactors de estilos o de estructura del DOM sin cambios de comportamiento.
- El proyecto tiene requisitos de accesibilidad y se busca que el testing empuje en esa dirección sin agregar una herramienta más.

## Cuándo NO usarlo

- **Para testear lógica pura** (una función de cálculo, un reducer): ahí no hay UI y este enfoque no aplica — se testea la función directamente.
- **Cuando el elemento genuinamente no tiene representación accesible**: un canvas de dibujo, un mapa interactivo, un contenedor de layout sin rol. Ahí `data-testid` es la salida correcta y honesta, no una derrota.
- **Para snapshot testing de estructura**: es un objetivo distinto (detectar cambios no intencionales en el markup), con sus propios trade-offs.

## Pasos / Código

**1. La jerarquía de selectores, de mejor a peor**

```js
// 1. Por rol + nombre accesible — el preferido casi siempre
screen.getByRole('button', { name: /guardar/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByRole('heading', { level: 2, name: /resultados/i })

// 2. Por label — para formularios, equivalente en calidad al anterior
screen.getByLabelText(/contraseña/i)

// 3. Por texto visible — para contenido que no es control interactivo
screen.getByText(/no se encontraron resultados/i)

// 4. Último recurso, solo cuando no hay representación accesible posible
screen.getByTestId('canvas-editor')
```

**2. Un test completo, con la interacción como la haría un usuario**

```js
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

test('muestra un error cuando el email es inválido', async () => {
  const user = userEvent.setup();
  render(<LoginForm onSubmit={vi.fn()} />);

  // Se encuentran los campos por su etiqueta, igual que una persona
  await user.type(screen.getByLabelText(/email/i), 'no-es-un-email');
  await user.click(screen.getByRole('button', { name: /ingresar/i }));

  // El error se busca por rol 'alert': verifica de paso que sea
  // anunciado por un lector de pantalla, no solo pintado de rojo.
  expect(await screen.findByRole('alert')).toHaveTextContent(/email inválido/i);
});
```

`userEvent` en vez de `fireEvent` importa: dispara la secuencia real de
eventos (focus, keydown, keypress, input, keyup) en lugar de un único evento
sintético, así que detecta bugs que solo aparecen con interacción real.

**3. El mismo criterio en Playwright (E2E)**

La API cambia, el principio es idéntico:

```js
await page.getByRole('button', { name: 'Guardar' }).click();
await page.getByLabel('Email').fill('user@example.com');
await expect(page.getByRole('alert')).toHaveText(/guardado/i);
```

**4. Cuando el selector no encuentra nada, casi siempre es un bug real**

Si `getByRole('button', ...)` falla sobre lo que visualmente es un botón,
el markup probablemente sea:

```html
<!-- ❌ no tiene rol de botón, no es focusable, no responde a Enter/Espacio -->
<div class="btn" onclick="save()">Guardar</div>

<!-- ✅ -->
<button type="button" onclick="save()">Guardar</button>
```

El test no está siendo quisquilloso: está reportando que ese control no
existe para quien navega por teclado o con lector de pantalla.

## Edge cases / errores comunes

- **`getBy*` vs `findBy*` vs `queryBy*`**: `getBy` falla de inmediato si no encuentra (para lo que ya debe estar), `findBy` devuelve una promesa y reintenta (para lo que aparece tras una operación async), `queryBy` devuelve `null` sin fallar (el **único** correcto para afirmar que algo *no* está). Usar `getBy` para algo asíncrono produce tests intermitentes.
- **Nombre accesible que no es el texto visible**: si el botón tiene `aria-label="Guardar cambios"` pero muestra un ícono, el nombre accesible es el `aria-label`, no lo que se ve. Cuando un selector "obvio" falla, conviene inspeccionar el árbol de accesibilidad real (`screen.logTestingPlaygroundURL()` o el panel Accessibility de las DevTools).
- **Poner `role="button"` sobre un `<div>` para que el test pase** es exactamente el anti-patrón: agrega el rol pero no el foco ni el manejo de teclado. Si hace falta un botón, usar `<button>`.
- **Textos que cambian por i18n**: si los tests corren con traducciones reales, hardcodear el string en español los rompe al cambiar de idioma. La salida habitual es correr los tests con un locale fijo, o buscar por la clave de traducción resuelta.
- **Regex vs string exacto**: `getByText('Guardar')` requiere coincidencia exacta del nodo completo; `/guardar/i` es más tolerante a espacios y mayúsculas. Para texto de UI conviene el regex.

## Compatibilidad

Testing Library tiene adaptadores para React, Vue, Svelte, Angular y DOM
puro, todos con la misma API de queries. Playwright implementa los mismos
selectores por rol de forma nativa. En jsdom (Jest/Vitest) el cálculo del
nombre accesible es una aproximación —no un motor de accesibilidad real—,
así que para auditar accesibilidad de verdad hay que complementar con
axe-core en un navegador real.

## Fuentes

- **Testing Library** (19.6k ⭐): es directamente el origen de este criterio; su "guiding principle" es que mientras más se parezca un test a cómo se usa el software, más confianza da. Este skill sintetiza esa filosofía en reglas aplicables paso a paso.
- **enzyme** (19.8k ⭐): el enfoque anterior y opuesto — inspeccionar estado interno y props del componente. Verlo ayuda a entender por qué se abandonó: acopla los tests a la implementación, así que un refactor sin cambio de comportamiento los rompe igual.
- **Playwright** (93.7k ⭐): adoptó los mismos selectores por rol accesible para E2E, lo que confirma que el criterio no es específico de tests unitarios sino un estándar transversal.
- **axe-core** (7.4k ⭐): complementa a este skill — testing por rol garantiza que los controles principales sean accesibles, pero no evalúa contraste de color ni el árbol completo. Para eso hace falta correr axe contra el DOM renderizado.

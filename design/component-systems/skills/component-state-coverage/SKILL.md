---
name: component-state-coverage
description: Enumera y documenta todos los estados que un componente de UI debe cubrir (default, hover, focus, active, disabled, loading, error, vacío) antes de darlo por terminado, usando Storybook como soporte. Usar al construir o revisar un componente de un design system.
tags: [design-system, components, storybook, states, a11y]
---

# Component State Coverage

## Contexto

El bug de UI más frecuente no es que un componente esté mal hecho, es que
esté **incompleto**. Se diseña y construye el estado "normal" —el botón que
se ve bien y funciona— y el resto aparece en producción: el botón que se
puede clickear tres veces porque no tiene estado de carga, el input que
muestra el error en rojo pero no lo anuncia a un lector de pantalla, la
tabla que se ve rota cuando no hay datos porque nadie diseñó el estado
vacío.

El problema de fondo es que estos estados son **invisibles durante el
desarrollo**: quien construye el componente trabaja con datos de prueba
felices y con el mouse, así que nunca ve el estado de foco por teclado, ni
el de error, ni el de lista vacía. No es descuido, es que el flujo de
trabajo normal no los expone.

Este skill convierte eso en una lista explícita que se recorre antes de dar
un componente por terminado, y usa Storybook para que cada estado sea
visible y revisable sin tener que reproducirlo en la app.

## Cuándo usarlo

- Se está construyendo un componente nuevo para un design system o librería compartida.
- Se revisa un componente existente antes de publicarlo o de un handoff a diseño.
- Aparecieron bugs del tipo "no habíamos pensado en ese caso" en componentes ya entregados.
- Se define el "definition of done" de un componente para el equipo.

## Cuándo NO usarlo

- **Para componentes de un solo uso** en una pantalla específica: cubrir ocho estados de algo que se usa una vez y va a cambiar el mes que viene es desproporcionado.
- **Para componentes puramente de layout** (un `Stack`, un `Grid`): no tienen estados interactivos; la lista no aplica.
- **Si el proyecto usa Radix, Headless UI o MUI**: esos componentes ya traen los estados resueltos. La lista sigue sirviendo para revisar la **composición** propia encima, no para reimplementarlos.

## Pasos / Código

**1. La lista de estados, por categoría**

**Interacción** (aplica a todo lo clickeable o enfocable):

| Estado | Qué verificar |
|---|---|
| Default | El estado en reposo |
| Hover | Solo mouse — nunca la única señal de que algo es interactivo |
| **Focus visible** | Indicador visible al llegar por teclado. El más omitido y el más grave |
| Active / pressed | Feedback inmediato al presionar |
| Disabled | Contraste suficiente para leerse, y *por qué* está deshabilitado debe ser comunicable |

**Datos** (aplica a cualquier cosa que muestre contenido):

| Estado | Qué verificar |
|---|---|
| Loading | Skeleton o spinner; el layout no debe saltar al llegar los datos |
| Empty | Qué se ve con cero elementos, y qué acción se ofrece |
| Error | Qué falló y qué puede hacer el usuario al respecto |
| Partial | Datos incompletos: nombre sin avatar, texto sin traducir |

**Contenido** (los que rompen el layout):

| Estado | Qué verificar |
|---|---|
| Texto largo | Un nombre de 80 caracteres: ¿trunca, hace wrap, o desborda? |
| Texto corto / vacío | ¿El layout colapsa? |
| Texto ampliado | Usuario con tamaño de fuente del sistema al 200% |
| RTL | Si se soporta árabe o hebreo, ¿el layout se espeja? |

**2. Materializarlos en Storybook**

Cada estado como una story hace que sea revisable sin reproducirlo en la app:

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  args: { children: 'Guardar' },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Loading: Story = {
  args: { loading: true },
  parameters: {
    docs: { description: { story: 'El ancho no debe cambiar al entrar en carga.' } },
  },
};

export const LongLabel: Story = {
  args: { children: 'Guardar y continuar con el siguiente paso del formulario' },
};

// Los estados de interacción se pueden forzar con play functions,
// así el reviewer los ve sin tener que interactuar
export const Focused: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.querySelector('button')?.focus();
  },
};
```

**3. Implementar bien los dos que más se rompen**

**Focus visible** — el error clásico es matarlo por estética:

```css
/* ❌ elimina el indicador para todos, incluidos usuarios de teclado */
button:focus { outline: none; }

/* ✅ :focus-visible aparece solo en navegación por teclado, no al clickear */
button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

**Loading sin salto de layout** — reservar el espacio desde el principio:

```tsx
function Button({ loading, children, ...props }) {
  return (
    <button {...props} disabled={loading || props.disabled} aria-busy={loading}>
      {/* El contenido se mantiene en el flujo pero invisible, así el
          ancho del botón no cambia al aparecer el spinner. */}
      <span style={{ visibility: loading ? 'hidden' : 'visible' }}>
        {children}
      </span>
      {loading && <Spinner className="absolute inset-0 m-auto" aria-hidden="true" />}
    </button>
  );
}
```

`aria-busy` comunica el estado de carga a un lector de pantalla; el spinner
lleva `aria-hidden` porque es puramente visual y anunciarlo no aporta nada.

**4. Los estados de datos, con contenido útil**

Un estado vacío que solo dice "Sin resultados" desperdicia una oportunidad:

```tsx
function EmptyState({ onCreate }) {
  return (
    <div role="status">
      <h3>Todavía no tenés pedidos</h3>
      <p>Cuando hagas tu primer pedido, va a aparecer acá.</p>
      <Button onClick={onCreate}>Crear pedido</Button>
    </div>
  );
}
```

Los tres elementos —qué pasa, por qué, y qué hacer— son lo que distingue un
estado vacío diseñado de uno olvidado.

## Edge cases / errores comunes

- **`outline: none` sin reemplazo**: hace la app inutilizable por teclado. Si el outline por defecto no gusta, se reemplaza — no se elimina.
- **Disabled con contraste insuficiente**: el gris claro sobre blanco no cumple contraste mínimo. Además, un control deshabilitado sin explicación frustra: si el botón está deshabilitado porque falta completar un campo, hay que decirlo.
- **Loading que cambia el tamaño del componente**: produce el salto de layout que desplaza el contenido justo cuando el usuario iba a hacer click.
- **Error que solo cambia el color**: quien no distingue rojo de verde no percibe nada. El error necesita ícono o texto, y `role="alert"` para que se anuncie.
- **Probar solo con nombres cortos**: "Ana" cabe en cualquier lado. Los layouts se rompen con nombres largos, y en producción existen los dos.
- **Hover como única señal de interactividad**: en touch no hay hover. Si algo solo se ve clickeable al pasar el mouse, en móvil es invisible.
- **Confundir disabled con readonly**: un input `disabled` no recibe foco y no se puede leer con lector de pantalla; `readonly` sí. Para mostrar un valor no editable, casi siempre corresponde `readonly`.

## Compatibilidad

`:focus-visible` tiene soporte en todos los navegadores evergreen desde
2022. Las play functions de Storybook requieren v6.4+. Los estados de
contenido (texto largo, RTL, texto ampliado) se pueden automatizar con los
addons de viewport y globals de Storybook para verlos sin configurar nada a
mano.

## Fuentes

- **Storybook** (90.7k ⭐): es la herramienta que hace este skill practicable — sin un entorno aislado, la mayoría de estos estados solo se pueden ver reproduciendo la condición en la app, que es exactamente por qué se omiten.
- **Radix UI Primitives** (19.1k ⭐): sus componentes exponen los estados como atributos de datos (`data-state`, `data-disabled`), lo que muestra un modelo concreto de cómo hacer que cada estado sea estilable y testeable en vez de implícito.
- **Material UI** (98.6k ⭐): el catálogo más completo de estados ya resueltos por componente; útil como checklist de referencia de qué estados existen para cada tipo de control.
- **React Spectrum** (15.7k ⭐): documenta el comportamiento esperado de cada estado por plataforma y lector de pantalla, incluyendo los que casi nadie cubre (foco en touch, estados en modo alto contraste).
- **primer/css** (13k ⭐): el design system de GitHub, con la documentación de estados de un sistema que corre en producción a escala muy grande.

---
title: Variantes tipadas de componente con CVA
platform: design
pillar: component-systems
tags: [react, typescript, tailwind, variants, cva]
summary: Define variantes de un componente (intent, size, estado) como configuración declarativa con tipos derivados automáticamente, en vez de cadenas de condicionales de clases.
when_not_to_use: Si el componente tiene una sola apariencia sin variantes, agregar CVA es indirección innecesaria.
---

# Variantes tipadas de componente con CVA

## Contexto

Un componente de design system termina teniendo varias dimensiones
independientes: intención (primary, secondary, danger), tamaño (sm, md, lg),
estado (loading, disabled), y a veces combinaciones especiales (un botón
danger en tamaño chico necesita otro peso de fuente). Resolver esto con
template strings y ternarios anidados produce código ilegible muy rápido:

```jsx
// El punto al que llega todo botón sin estructura
className={`btn ${intent === 'primary' ? 'bg-indigo-600 text-white' : intent === 'danger' ? 'bg-red-600 text-white' : 'bg-gray-100'} ${size === 'sm' ? 'px-2 py-1 text-sm' : 'px-4 py-2'} ${disabled ? 'opacity-50' : ''}`}
```

Además de ilegible, tiene dos problemas concretos: los tipos de las props
hay que declararlos aparte y se desincronizan de las variantes reales, y las
clases de Tailwind pueden entrar en conflicto (dos `bg-*` compitiendo, y
gana la que el CSS ordenó, no la que se quería).

`cva` (class-variance-authority) resuelve ambos: las variantes se declaran
como un objeto, los tipos de props se **derivan** de esa declaración, y
combinado con `tailwind-merge` los conflictos de clases se resuelven a favor
de la última.

## Código completo

**Utilidad base**

```ts
// lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina clases condicionales y resuelve conflictos de Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Componente con variantes**

```tsx
// components/Button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  // Clases base: siempre presentes
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md font-medium transition-colors',
    // El foco visible es parte del componente, no un opcional
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      intent: {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-600',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
        ghost: 'bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-400',
      },
      size: {
        // min-h garantiza el área táctil mínima en touch
        sm: 'h-9 min-h-[36px] px-3 text-sm',
        md: 'h-11 min-h-[44px] px-4 text-base',
        lg: 'h-12 min-h-[48px] px-6 text-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },

    // Combinaciones específicas que no se derivan de las variantes sueltas
    compoundVariants: [
      {
        intent: 'ghost',
        size: 'sm',
        class: 'px-2',   // el ghost chico no necesita tanto padding lateral
      },
    ],

    defaultVariants: {
      intent: 'primary',
      size: 'md',
    },
  }
);

// Los tipos de las props se derivan de la declaración de variantes:
// agregar una variante nueva actualiza el tipo automáticamente.
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, intent, size, fullWidth, loading, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      // El className del consumidor va último: twMerge le da prioridad
      className={cn(buttonVariants({ intent, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

// Exportar las variantes permite reusarlas en otros elementos
// (por ejemplo, un <a> que debe verse como botón).
export { buttonVariants };
```

**Reusar las variantes en otro elemento**

```tsx
import Link from 'next/link';
import { buttonVariants } from '@/components/Button';

<Link href="/precios" className={buttonVariants({ intent: 'secondary', size: 'lg' })}>
  Ver precios
</Link>
```

**Documentar cada variante en Storybook**

```tsx
// Button.stories.tsx
export const AllIntents: Story = {
  render: () => (
    <div className="flex gap-2">
      {(['primary', 'secondary', 'danger', 'ghost'] as const).map((intent) => (
        <Button key={intent} intent={intent}>{intent}</Button>
      ))}
    </div>
  ),
};
```

## Uso

```tsx
<Button>Guardar</Button>                              {/* usa los defaults */}
<Button intent="danger" size="sm">Eliminar</Button>
<Button intent="ghost" fullWidth loading>Cargando</Button>

{/* El className del consumidor gana sobre la variante */}
<Button className="bg-emerald-600 hover:bg-emerald-700">Personalizado</Button>
```

TypeScript rechaza valores inexistentes sin declararlos a mano:

```tsx
<Button intent="warning">…</Button>
//      ^^^^^^ Error: Type '"warning"' is not assignable
```

## Limitaciones conocidas

- **Sin `tailwind-merge`, el `className` del consumidor no gana de forma confiable**: `clsx` solo concatena, así que dos `bg-*` quedan ambos en el atributo y el resultado depende del orden en el CSS generado, no del orden en el string.
- **Las clases deben ser strings completos y estáticos** para que el escaneo de Tailwind las detecte. Construir clases dinámicamente (`` `bg-${color}-600` ``) hace que Tailwind no las incluya en el CSS final y el estilo simplemente no aparece.
- **`compoundVariants` crece rápido**: si hacen falta muchas combinaciones especiales, suele ser señal de que el componente tiene demasiadas responsabilidades y conviene dividirlo.
- **CVA es específico de clases CSS**: no aplica a CSS-in-JS con objetos de estilo ni a React Native, donde el equivalente es una función que devuelve objetos de estilo.
- **`VariantProps` incluye `null` en los tipos** (una variante puede desactivarse pasando `null`), lo que a veces sorprende al tipar props derivadas.
- **No reemplaza a los design tokens**: acá las clases referencian colores de Tailwind directamente. En un sistema con tokens, esas clases deberían apuntar a variables semánticas (`bg-surface-accent`), no a la paleta cruda.

## Fuentes

- **shadcn/ui** (120k ⭐): usa exactamente este patrón (cva + tailwind-merge) en todos sus componentes; su modelo de copiar el código al proyecto en vez de instalarlo es lo que hace que la legibilidad de las variantes importe tanto — el código lo va a editar quien lo consume.
- **Material UI** (98.6k ⭐): resuelve lo mismo con su sistema de theming y `styled`, un enfoque de CSS-in-JS. Comparar ambos aclara el trade-off: MUI da más poder de composición en runtime, cva genera clases estáticas sin costo de runtime.
- **Radix UI Primitives** (19.1k ⭐): provee el comportamiento accesible que este snippet asume resuelto; cva se ocupa solo de la apariencia, que es justamente la separación que Radix propone.
- **Storybook** (90.7k ⭐): el complemento necesario — declarar variantes es la mitad, documentarlas visualmente para que el equipo sepa que existen es la otra.
- **daisyUI** (41.9k ⭐): el enfoque opuesto dentro de Tailwind — componentes con clases semánticas predefinidas (`btn-primary`) en vez de variantes componibles en el código.

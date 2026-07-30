---
title: Render de test con providers
platform: web
pillar: testing
tags: [testing-library, react, setup, providers, vitest]
summary: Envuelve el render de Testing Library con los providers reales de la app (router, query client, tema, i18n) para no repetir el wrapper en cada test.
when_not_to_use: Si el componente bajo test no consume ningún contexto, usar el render normal — envolverlo agrega tiempo de setup sin beneficio.
---

# Render de test con providers

## Contexto

Un componente que consume un contexto (React Query, router, tema, i18n)
falla al testearlo aisladamente con un error del estilo "no QueryClient set"
o "useNavigate() may be used only in the context of a Router". La salida
obvia —envolver cada test a mano— genera dos problemas: mucho boilerplate
repetido, y desincronización silenciosa entre lo que testea cada archivo (uno
envuelve con el tema, otro no, y nadie recuerda por qué).

Un `render` propio que reexporta todo Testing Library resuelve ambos: los
tests importan de un solo lugar, el wrapper vive en un archivo, y agregar un
provider nuevo a la app es un cambio en una línea en vez de en cien archivos.

El detalle que más impacta en la práctica es la configuración del
`QueryClient`: los reintentos por defecto de React Query hacen que un test
de estado de error tarde varios segundos reintentando antes de fallar.
Desactivarlos en tests es lo que hace la diferencia entre una suite rápida y
una lenta.

## Código completo

```tsx
// test/render.tsx
import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/theme';
import { I18nProvider } from '@/i18n';

/**
 * Un QueryClient nuevo por test: sin esto, el caché se comparte entre
 * tests y uno puede pasar por datos que dejó otro.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,        // sin esto, un test de error tarda segundos reintentando
        gcTime: Infinity,    // el caché no se limpia durante el test
        staleTime: Infinity,
      },
      mutations: { retry: false },
    },
  });
}

interface WrapperOptions {
  /** Ruta inicial del router */
  route?: string;
  /** Cliente propio, para inyectar datos precargados */
  queryClient?: QueryClient;
  /** Locale para i18n */
  locale?: string;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'>, WrapperOptions {}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', queryClient, locale = 'es', ...options }: CustomRenderOptions = {}
) {
  const client = queryClient ?? createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <I18nProvider locale={locale}>
          <ThemeProvider>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    );
  }

  return {
    // userEvent.setup() debe llamarse antes del render
    user: userEvent.setup(),
    queryClient: client,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}

// Reexportar todo Testing Library para que los tests importen de un solo lugar
export * from '@testing-library/react';
// El render propio pisa al original
export { renderWithProviders as render };
```

**Setup global de la suite**

```ts
// test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './msw-server';

// MSW: interceptar red a nivel HTTP en vez de mockear el módulo de fetch
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
```

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
});
```

`onUnhandledRequest: 'error'` es un detalle valioso: hace fallar el test si
el componente hace una request que nadie mockeó, en vez de dejarla colgar
hasta el timeout con un error confuso.

## Uso

```tsx
// UserProfile.test.tsx
import { render, screen } from '@/test/render';
import { UserProfile } from './UserProfile';

test('muestra el nombre del usuario', async () => {
  render(<UserProfile userId="1" />);
  expect(await screen.findByRole('heading', { name: /ana garcía/i })).toBeVisible();
});

test('permite editar desde la ruta de edición', async () => {
  const { user } = render(<UserProfile userId="1" />, { route: '/users/1/edit' });

  await user.click(screen.getByRole('button', { name: /guardar/i }));
  expect(await screen.findByRole('status')).toHaveTextContent(/guardado/i);
});

test('muestra el estado de error sin reintentar', async () => {
  server.use(http.get('/api/users/1', () => HttpResponse.error()));
  render(<UserProfile userId="1" />);
  // Gracias a retry: false, esto resuelve de inmediato
  expect(await screen.findByRole('alert')).toBeVisible();
});
```

## Limitaciones conocidas

- **Envolver todo en todos los providers hace los tests más lentos.** Si la suite crece mucho, conviene tener wrappers parciales (`renderWithQuery`, `renderWithRouter`) para los componentes que solo necesitan uno.
- **Un wrapper que oculta configuración real puede dar falsa confianza**: si el `QueryClient` de test tiene opciones muy distintas a producción, un bug de caché o de reintentos no aparece en los tests. Vale mantener las diferencias al mínimo y documentadas.
- **`MemoryRouter` no es el router de producción**: no valida que la app funcione con navegación real del navegador (historial, recarga, deep links). Eso corresponde a E2E.
- **Reexportar `*` y pisar `render`** funciona bien, pero puede confundir a quien no conoce el patrón: parece que se importa Testing Library y en realidad es un módulo propio. Un comentario en el archivo lo aclara.
- **Este patrón es de React**: el equivalente en Vue o Svelte usa los mecanismos de cada framework, aunque la idea (un render propio con el entorno real) es la misma.

## Fuentes

- **Testing Library** (19.6k ⭐): su documentación propone explícitamente este patrón de custom render como forma recomendada de manejar providers; este snippet lo materializa con las opciones que más se necesitan en la práctica.
- **javascript-testing-best-practices** (24.6k ⭐): la fuente del criterio de mantener el entorno de test lo más cercano posible a producción, y de por qué mockear a nivel HTTP (MSW) es preferible a mockear módulos.
- **Vitest** (16.9k ⭐): reutiliza la config de Vite, lo que hace que los alias (`@/test/render`) funcionen en los tests sin duplicar configuración — una de las razones concretas por las que migrar desde Jest simplifica este setup.
- **enzyme** (19.8k ⭐): el enfoque anterior, con `shallow` rendering que evitaba el problema de los providers no montándolos. Verlo aclara por qué el modelo actual (montar de verdad, con el entorno real) da más confianza aunque requiera este setup.

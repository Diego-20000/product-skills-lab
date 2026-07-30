---
title: Login una vez y reusar el estado en Playwright
platform: automation
pillar: browser-testing
tags: [playwright, auth, storage-state, setup, performance]
summary: Autentica una sola vez en un proyecto de setup y reusa el storageState en todos los tests, en vez de repetir el login por cada uno.
when_not_to_use: Si el test verifica el propio flujo de login, debe hacerlo por la UI sin estado precargado — eso es justamente lo que se está probando.
---

# Login una vez y reusar el estado en Playwright

## Contexto

Loguearse por la UI en cada test es el desperdicio más grande de una suite
E2E: si el login tarda 3 segundos y hay 60 tests, son 3 minutos por corrida
gastados en algo que no se está probando. Peor todavía, agrega una
superficie de falla ajena al test — si el formulario de login cambia, fallan
los 60 tests aunque el problema esté en uno solo.

Playwright resuelve esto con `storageState`: un archivo JSON con las cookies
y el `localStorage` del contexto del navegador. Se genera una vez en un
**proyecto de setup** que corre antes que los demás, y todos los tests
arrancan ya autenticados en milisegundos, sin tocar el formulario.

El detalle que hace la diferencia con múltiples roles (admin, usuario común)
es guardar un archivo por rol y declarar proyectos separados, en vez de
condicionales dentro de los tests.

## Código completo

**Configuración con proyecto de setup**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

export const STORAGE_DIR = path.join(__dirname, 'e2e/.auth');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['list']],

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    // 1. Corre primero y genera los archivos de estado
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // 2. Los demás dependen del setup y arrancan autenticados
    {
      name: 'chromium-user',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(STORAGE_DIR, 'user.json'),
      },
      dependencies: ['setup'],
      testIgnore: /.*\.admin\.spec\.ts/,
    },
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(STORAGE_DIR, 'admin.json'),
      },
      dependencies: ['setup'],
      testMatch: /.*\.admin\.spec\.ts/,
    },

    // 3. Los tests del propio login corren sin estado
    {
      name: 'chromium-anon',
      use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } },
      testMatch: /.*\.anon\.spec\.ts/,
    },
  ],
});
```

**El archivo de setup**

```ts
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import { STORAGE_DIR } from '../playwright.config';

const USER_FILE = path.join(STORAGE_DIR, 'user.json');
const ADMIN_FILE = path.join(STORAGE_DIR, 'admin.json');

setup('autenticar usuario común', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!);
  await page.getByLabel('Contraseña').fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Esperar una señal REAL de sesión iniciada antes de guardar.
  // Sin esto se puede guardar el estado antes de que la cookie exista.
  await expect(page.getByRole('heading', { name: 'Mi cuenta' })).toBeVisible();

  await page.context().storageState({ path: USER_FILE });
});

setup('autenticar admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel('Contraseña').fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page.getByRole('link', { name: 'Panel de administración' })).toBeVisible();

  await page.context().storageState({ path: ADMIN_FILE });
});
```

**Variante más rápida: autenticar por API, sin UI**

Cuando el login por formulario no aporta nada al setup:

```ts
// e2e/auth.setup.ts (versión API)
import { test as setup } from '@playwright/test';

setup('autenticar por API', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: { email: process.env.E2E_USER_EMAIL, password: process.env.E2E_USER_PASSWORD },
  });
  if (!response.ok()) throw new Error(`Login falló: ${response.status()}`);

  // request.storageState() captura las cookies que devolvió la API
  await request.storageState({ path: USER_FILE });
});
```

Si la sesión vive en `localStorage` en vez de cookies, hay que inyectarla:

```ts
setup('autenticar con token en localStorage', async ({ page, request }) => {
  const res = await request.post('/api/auth/login', { data: credentials });
  const { token } = await res.json();

  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('auth_token', t), token);
  await page.context().storageState({ path: USER_FILE });
});
```

**Ignorar los archivos de estado**

```gitignore
e2e/.auth/
```

Contienen sesiones válidas: commitearlos es filtrar credenciales.

## Uso

```ts
// e2e/orders.spec.ts — arranca ya autenticado como usuario
import { test, expect } from '@playwright/test';

test('muestra los pedidos del usuario', async ({ page }) => {
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'Mis pedidos' })).toBeVisible();
});
```

```ts
// e2e/users.admin.spec.ts — corre en el proyecto admin
test('permite dar de baja un usuario', async ({ page }) => {
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Dar de baja' }).first().click();
});
```

```ts
// e2e/login.anon.spec.ts — sin estado: acá SÍ se prueba el login
test('rechaza credenciales inválidas', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('no@existe.com');
  await page.getByLabel('Contraseña').fill('mal');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('alert')).toContainText(/credenciales/i);
});
```

## Limitaciones conocidas

- **Un token que expira durante la corrida rompe los tests restantes.** Si la sesión dura 15 minutos y la suite tarda 20, la segunda mitad falla. Se resuelve con un usuario de test cuyo token tenga vida larga, o regenerando el estado a mitad de camino.
- **Los tests comparten el usuario, así que comparten datos.** Dos tests paralelos que modifican el mismo carrito se pisan. Con `fullyParallel: true` conviene un usuario por worker (`workerIndex`) o crear los datos por API en cada test.
- **`storageState` no captura estado del servidor.** Si la sesión depende de algo en la base (un carrito, un onboarding a medias), eso hay que sembrarlo aparte.
- **Guardar el estado sin esperar la confirmación** produce un archivo vacío o incompleto, y el síntoma es que todos los tests fallan con redirección al login. De ahí el `expect` antes de `storageState()`.
- **El estado es específico del origen**: si la app usa subdominios (`app.` y `api.`), hay que verificar que las cookies de ambos queden capturadas.
- **Nunca commitear `e2e/.auth/`**: son sesiones reales.

## Fuentes

- **Playwright** (93.7k ⭐): `storageState` y los proyectos con `dependencies` son mecanismos propios suyos; es la razón por la que este patrón es tan directo comparado con las alternativas.
- **Cypress** (50.6k ⭐): resuelve lo mismo con `cy.session()`, que cachea y restaura la sesión entre tests. Comparar ambos muestra dos filosofías: Playwright genera el estado una vez fuera de los tests, Cypress lo cachea dentro del ciclo de test.
- **Puppeteer** (95.4k ⭐): no tiene equivalente incorporado; hay que guardar y restaurar cookies a mano, lo que deja claro cuánto trabajo evita este mecanismo.
- **javascript-testing-best-practices** (24.6k ⭐): la fuente del criterio de aislamiento entre tests, que es la tensión real de este snippet — reusar estado es más rápido pero acopla los tests entre sí.

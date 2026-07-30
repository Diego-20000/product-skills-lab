---
name: stable-e2e-selectors
description: Elimina tests E2E intermitentes reemplazando esperas fijas por condiciones reales y selectores frágiles por selectores semánticos, con Playwright como referencia. Usar cuando una suite E2E falla de forma aleatoria y el equipo empezó a reintentarla en vez de confiar en ella.
---

# Stable E2E Selectors

## Contexto

Una suite E2E intermitente es peor que no tener suite: consume tiempo de CI,
y cuando falla nadie sabe si encontró un bug o "es el test de siempre". El
final predecible es que alguien agrega `retries: 3` y el equipo deja de
mirar los resultados — con lo cual los bugs reales pasan igual.

Casi toda la intermitencia viene de dos causas que se pueden nombrar con
precisión. La primera es **esperar por tiempo en vez de por estado**: un
`waitForTimeout(2000)` puesto a ojo funciona en la máquina de quien lo
escribió y falla en un runner de CI cargado, donde todo tarda el doble. La
segunda son **selectores acoplados a detalles volátiles**: una clase CSS
generada por el bundler, una posición en el DOM, un texto que cambia al
traducir la app.

La solución no es reintentar más: es que cada espera sea por una condición
verificable y cada selector apunte a algo que solo cambia cuando cambia el
comportamiento.

## Cuándo usarlo

- Una suite E2E falla de forma aleatoria y hay que estabilizarla.
- Alguien propuso subir el número de reintentos como solución.
- Se está escribiendo una suite nueva y se quiere evitar el problema desde el principio.
- Los tests se rompen con cada refactor de estilos aunque el comportamiento no cambie.

## Cuándo NO usarlo

- **Si el problema es la aplicación, no el test**: si la app efectivamente tarda distinto o tiene una race condition real, el test intermitente está reportando un bug legítimo. Estabilizar el test ahí lo esconde.
- **Para tests unitarios**: no hay navegador ni asincronía de red; el problema no existe en ese nivel.
- **Si la app tiene animaciones largas por diseño**: antes de pelear con esperas, conviene desactivar animaciones en el entorno de test (ver más abajo) — es más efectivo que cualquier selector.

## Pasos / Código

**1. Nunca esperar por tiempo; esperar por condición**

```js
// ❌ el número es una apuesta: sobra en local, falta en CI cargado
await page.click('#save');
await page.waitForTimeout(2000);
expect(await page.textContent('.toast')).toBe('Guardado');

// ✅ la aserción espera por la condición real, con reintentos internos
await page.getByRole('button', { name: 'Guardar' }).click();
await expect(page.getByRole('status')).toHaveText('Guardado');
```

Las aserciones `expect()` de Playwright reintentan automáticamente hasta el
timeout configurado. Esa es la diferencia central con el modelo de
Selenium clásico, donde había que envolver todo en esperas explícitas.

**2. Jerarquía de selectores, de más a menos estable**

```js
// 1. Rol accesible + nombre — cambia solo si cambia el comportamiento
page.getByRole('button', { name: 'Guardar' })
page.getByLabel('Email')

// 2. Texto visible — para contenido, no para controles
page.getByText('No hay resultados')

// 3. test-id — cuando no hay representación semántica posible
page.getByTestId('chart-container')

// 4. ❌ evitar: acoplado a estilos y estructura
page.locator('.btn-primary')
page.locator('div > div:nth-child(3) > span')
```

Los selectores por rol tienen el mismo beneficio secundario que en tests de
componentes: si el selector no encuentra el elemento, casi siempre es porque
ese control no es accesible por teclado ni por lector de pantalla.

**3. Esperar la respuesta de red, no un tiempo arbitrario**

```js
// Se declara la espera ANTES de disparar la acción, para no perder
// la respuesta si llega muy rápido.
const responsePromise = page.waitForResponse(
  (res) => res.url().includes('/api/orders') && res.status() === 200
);
await page.getByRole('button', { name: 'Confirmar' }).click();
await responsePromise;

await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible();
```

**4. Controlar el estado en vez de construirlo por la UI**

Loguearse por el formulario en cada test es lento y agrega una superficie de
falla que no es lo que se está testeando:

```js
// playwright.config.js — se loguea una vez y se reusa el estado
// globalSetup guarda storageState en un archivo
export default defineConfig({
  use: {
    storageState: 'e2e/.auth/user.json',
    // Desactivar animaciones elimina una clase entera de intermitencia
    launchOptions: { args: ['--force-prefers-reduced-motion'] },
  },
});
```

Y para los datos que el test necesita, crearlos por API:

```js
test.beforeEach(async ({ request }) => {
  await request.post('/api/test/seed', {
    data: { orders: [{ id: 'test-1', status: 'pending' }] },
  });
});
```

**5. Aislar cada test — sin estado compartido**

```js
// ❌ el test 2 depende de que el test 1 haya corrido y pasado
test('crea el pedido', async ({ page }) => { /* ... */ });
test('cancela el pedido creado antes', async ({ page }) => { /* ... */ });

// ✅ cada test crea lo que necesita y no asume orden
test('cancela un pedido', async ({ page, request }) => {
  const { id } = await createOrderViaApi(request);
  await page.goto(`/orders/${id}`);
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Pedido cancelado')).toBeVisible();
});
```

Los tests que dependen del orden son incompatibles con la ejecución en
paralelo, que es de donde sale la mayor parte de la velocidad de una suite.

**6. Usar reintentos para diagnosticar, no para tapar**

```js
export default defineConfig({
  retries: process.env.CI ? 2 : 0,   // 0 en local: los flaky se ven de inmediato
  reporter: [['html'], ['list']],
  use: {
    trace: 'on-first-retry',         // la traza del fallo queda grabada
    video: 'retain-on-failure',
  },
});
```

`trace: 'on-first-retry'` es la pieza clave: cuando un test falla y pasa al
reintentar, queda una traza completa (DOM, red, screenshots por paso) para
entender por qué. Sin eso, los reintentos solo esconden el problema.

## Edge cases / errores comunes

- **`waitForTimeout` como parche**: cada uno es intermitencia diferida. Si hace falta esperar, hay una condición concreta que se puede expresar.
- **Declarar `waitForResponse` después del click**: si la respuesta llega antes de registrar la espera, el test queda colgado hasta el timeout. Siempre declarar la promesa antes de la acción.
- **Selectores por clase generada por el bundler** (`.css-1a2b3c` de CSS-in-JS): cambian en cada build. Es el caso más frustrante porque el test se rompe sin que nadie haya tocado nada relacionado.
- **Animaciones y transiciones**: un elemento puede estar en el DOM y ser visible pero seguir moviéndose, haciendo que el click caiga fuera. Playwright espera estabilidad de posición, pero desactivar animaciones en el entorno de test es más confiable y más rápido.
- **`page.waitForLoadState('networkidle')`** parece la solución universal pero es frágil en apps con polling o websockets, donde la red nunca queda idle. Esperar por el elemento concreto es mejor.
- **Tests que dependen de la hora o la fecha**: uno que pasa todo el día y falla a las 23:59 casi siempre asume que el día no cambia a mitad de ejecución. Conviene fijar el reloj.
- **Compartir un usuario entre tests paralelos**: dos tests que modifican el mismo carrito se pisan. Un usuario por worker resuelve el problema de raíz.

## Compatibilidad

Los ejemplos usan Playwright, donde las aserciones con reintento y los
selectores por rol son nativos. Los principios aplican igual a Cypress
(tiene reintento automático en su cadena de comandos) y a Selenium, aunque
en Selenium hay que construir las esperas explícitamente con
`WebDriverWait` porque no vienen incorporadas — que es justamente por qué
las suites de Selenium tienden a acumular más `sleep`.

## Fuentes

- **Playwright** (93.7k ⭐): su auto-waiting incorporado —cada acción espera a que el elemento sea accionable— es la razón técnica por la que este skill es más corto de lo que sería con otras herramientas; buena parte del trabajo ya viene resuelto.
- **Puppeteer** (95.4k ⭐): la generación anterior, sin auto-waiting; comparar ambas muestra exactamente qué clase de código de espera manual desaparece y por qué eso reduce la intermitencia.
- **Cypress** (50.6k ⭐): corre los tests dentro del navegador en vez de controlarlo desde afuera, lo que le da reintento natural en su cadena de comandos y debugging por viaje en el tiempo. Su modelo de aislamiento entre tests es una referencia directa del punto 5.
- **Selenium** (34.2k ⭐): el estándar W3C WebDriver, con el mayor alcance de navegadores y lenguajes. Se incluye acá porque su falta de esperas implícitas es el origen histórico del anti-patrón `sleep` que este skill busca eliminar.
- **javascript-testing-best-practices** (24.6k ⭐): su criterio sobre qué nivel de la pirámide debe cubrir cada caso ayuda a evitar el error de fondo — resolver con E2E algo que correspondía a un test más barato.

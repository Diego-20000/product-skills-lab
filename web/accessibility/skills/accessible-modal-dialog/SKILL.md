---
name: accessible-modal-dialog
description: Implementa un modal accesible con foco atrapado, cierre por Escape, restauración de foco al abrir/cerrar y contenido de fondo inerte, usando el elemento nativo <dialog>. Usar cuando hay que construir un modal, drawer o popup desde cero.
tags: [a11y, dialog, focus-trap, keyboard, html]
---

# Accessible Modal Dialog

## Contexto

El modal es el componente donde más seguido se rompe la accesibilidad,
porque su comportamiento correcto es contraintuitivo: no alcanza con mostrar
una caja encima de la página. Un modal bien hecho tiene que **atrapar el
foco** dentro suyo (si no, tabular lo saca a los links de atrás, que están
visualmente tapados: el usuario de teclado queda navegando a ciegas),
**restaurar el foco** al elemento que lo abrió al cerrarse (si no, el foco
vuelve al principio del documento y se pierde el contexto), **cerrarse con
Escape**, y hacer que el resto de la página sea **inerte** para un lector de
pantalla (si no, el usuario puede leer y activar contenido de fondo que
visualmente no está disponible).

Durante años esto requería una librería o ~150 líneas de JavaScript
delicado. Hoy el elemento nativo `<dialog>` con `showModal()` resuelve casi
todo eso por defecto en el navegador — foco atrapado, Escape, inercia del
fondo y capa superior sin `z-index`. Este skill usa el nativo y cubre a mano
solo lo que sigue faltando.

## Cuándo usarlo

- Hay que construir un modal, drawer, popup de confirmación o lightbox desde cero.
- Existe un modal casero (un `<div>` con `position: fixed`) que hay que arreglar.
- Un audit de accesibilidad marcó problemas de manejo de foco.

## Cuándo NO usarlo

- **Si el proyecto ya usa Radix UI, Headless UI o React Aria**: sus componentes de dialog ya resuelven esto y varios casos borde más (scroll lock en iOS, interacción con lectores de pantalla específicos). Reimplementarlo es trabajo duplicado con más superficie de bugs.
- **Para contenido que no es modal**: un tooltip, un menú desplegable o un popover **no** deben atrapar el foco — el usuario tiene que poder tabular fuera. Usar `<dialog>` sin `showModal()` (o `popover`) para esos casos.
- **Si el contenido es largo y navegable**: un modal que requiere scroll extenso probablemente debería ser una página propia; el patrón modal está pensado para interrupciones cortas.

## Pasos / Código

**1. Markup — el elemento nativo hace el trabajo pesado**

```html
<button id="open-btn" type="button">Editar perfil</button>

<dialog id="profile-dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Editar perfil</h2>

  <form method="dialog">
    <label for="name">Nombre</label>
    <input id="name" name="name" type="text" />

    <!-- method="dialog" cierra el dialog y expone returnValue -->
    <button value="cancel" type="submit">Cancelar</button>
    <button value="save" type="submit">Guardar</button>
  </form>
</dialog>
```

`aria-labelledby` apuntando al título es lo que hace que un lector de
pantalla anuncie *qué* modal se abrió, en vez de solo "diálogo".

**2. Abrir y cerrar**

```js
const dialog = document.querySelector('#profile-dialog');
const openBtn = document.querySelector('#open-btn');

openBtn.addEventListener('click', () => {
  // showModal() (no show()) es lo que activa foco atrapado,
  // fondo inerte, cierre por Escape y la top layer del navegador.
  dialog.showModal();
});

dialog.addEventListener('close', () => {
  // El navegador ya devuelve el foco al elemento que lo abrió,
  // siempre que ese elemento siga en el DOM y sea focusable.
  if (dialog.returnValue === 'save') {
    save(new FormData(dialog.querySelector('form')));
  }
});
```

**3. Cerrar al hacer click fuera (backdrop)**

Esto el nativo **no** lo hace, y es la expectativa más común de los usuarios:

```js
dialog.addEventListener('click', (event) => {
  // El click en el backdrop tiene como target el propio <dialog>,
  // porque el ::backdrop no es un elemento separado en el DOM.
  if (event.target === dialog) dialog.close('cancel');
});
```

Para que esto funcione, el contenido del dialog debe estar en un wrapper
con padding propio — si el padding está en el `<dialog>` mismo, un click en
esa zona se cuenta como click en el backdrop y cierra sin querer.

**4. Estilar el fondo y bloquear el scroll**

```css
dialog::backdrop {
  background: rgb(0 0 0 / 0.5);
}

/* El scroll del body sigue activo detrás del modal: hay que frenarlo */
body:has(dialog[open]) {
  overflow: hidden;
}

dialog {
  border: none;
  border-radius: 0.5rem;
  padding: 0;              /* el padding va en un wrapper interno */
  max-width: min(90vw, 32rem);
}

dialog > .content { padding: 1.5rem; }
```

**5. Enfocar el primer control útil**

El navegador enfoca el primer elemento focusable, que a veces es el botón
de cerrar. Para dirigirlo:

```html
<input id="name" autofocus />
```

`autofocus` dentro de un `<dialog>` es respetado por `showModal()` y es la
forma declarativa correcta — no hace falta llamar a `.focus()` a mano.

## Edge cases / errores comunes

- **Usar `show()` en vez de `showModal()`**: se ve casi igual pero no atrapa el foco, no hace el fondo inerte y no cierra con Escape. Es la causa número uno de "usé `<dialog>` y sigue sin ser accesible".
- **El scroll del fondo sigue funcionando**: el modal nativo no bloquea el scroll del `body`. En iOS es especialmente notorio (el fondo se mueve al arrastrar sobre el modal). El `overflow: hidden` de arriba lo cubre en desktop; en iOS puede hacer falta además fijar la posición del body y restaurar el scroll al cerrar.
- **Renderizar el `<dialog>` dentro de un contenedor con `transform` u `overflow: hidden`**: no lo afecta (el dialog modal va a la top layer del navegador, fuera del flujo), pero un modal casero con `position: fixed` sí quedaría recortado — esa es una de las razones para usar el nativo.
- **Botón que abre el modal y desaparece**: si el elemento que disparó la apertura se desmonta mientras el modal está abierto (ej. una fila de tabla que se elimina), el foco al cerrar cae en `<body>`. Hay que guardar una referencia a un elemento estable y enfocarlo a mano en el `close`.
- **Animar la apertura**: `<dialog>` pasa de `display: none` a `block`, lo que corta las transiciones CSS. Se resuelve con `@starting-style` y `transition-behavior: allow-discrete`, o con una animación de entrada por `@keyframes`.

## Compatibilidad

`<dialog>` con `showModal()` tiene soporte en todos los navegadores
evergreen desde marzo de 2022 (Chrome, Edge, Firefox, Safari). `body:has()`
requiere soporte de `:has()`, disponible desde diciembre de 2023 — como
alternativa, alternar una clase en el `body` desde JS. `@starting-style`
para animaciones es más reciente y conviene tratarlo como mejora
progresiva.

## Fuentes

- **Radix UI Primitives** (19.1k ⭐): su `Dialog` es la referencia de qué comportamientos hay que cubrir; resuelve además scroll lock cross-platform y casos borde con lectores de pantalla que el nativo todavía deja al implementador.
- **Headless UI** (28.7k ⭐): mismo problema resuelto sin estilos, del equipo de Tailwind; útil para comparar qué API expone (`open`/`onClose` controlado) frente al modelo imperativo del elemento nativo.
- **React Spectrum / React Aria** (15.7k ⭐): el tratamiento más exhaustivo de los tres — Adobe documenta el comportamiento esperado por combinación de plataforma y lector de pantalla, incluyendo interacciones táctiles con VoiceOver que ni el nativo ni Radix cubren completamente.
- **axe-core** (7.4k ⭐): la herramienta para verificar el resultado; detecta un dialog sin nombre accesible o con roles mal aplicados, que es exactamente lo que se rompe al implementar esto a mano.

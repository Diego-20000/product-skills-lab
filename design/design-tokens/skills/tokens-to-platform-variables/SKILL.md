---
name: tokens-to-platform-variables
description: Define design tokens en un único archivo fuente y los transforma automáticamente a variables CSS, Swift, Kotlin y JS con Style Dictionary, para que un cambio de color se propague a web y mobile sin edición manual. Usar al montar un design system que sirve a más de una plataforma.
tags: [design-tokens, style-dictionary, design-system, build, cross-platform]
---

# Tokens to Platform Variables

## Contexto

Cuando un producto vive en web, iOS y Android, los valores de diseño
—colores, espaciados, tipografía, radios— terminan copiados a mano en tres
lugares: un archivo Sass, un `Colors.swift` y un `colors.xml`. El resultado
predecible es la deriva: la marca cambia su color primario, se actualiza en
web, y meses después alguien descubre que la app Android sigue con el viejo.
Nadie mintió; simplemente no había un mecanismo que garantizara la
propagación.

Los design tokens resuelven esto invirtiendo la dirección: existe **una sola
fuente de verdad** en un formato neutral (JSON), y cada plataforma
**genera** su archivo de constantes desde ahí en tiempo de build. Los
archivos generados no se editan a mano — se regeneran. Un cambio de color es
un cambio en un JSON y un rebuild.

El segundo beneficio, menos obvio pero igual de valioso, es que obliga a
nombrar las decisiones de diseño. Pasar de `#4F46E5` a
`color.brand.primary` y de ahí a `color.action.background` convierte un
valor arbitrario en una intención que se puede discutir y cambiar sin
buscar y reemplazar hexadecimales.

## Cuándo usarlo

- El producto tiene más de una plataforma (web + mobile, o varias apps web con marca compartida).
- Ya ocurrió que un valor de diseño quedó desincronizado entre plataformas.
- Hay que soportar más de un tema (claro/oscuro, marca blanca por cliente).
- Se está montando un design system desde cero y conviene decidir esto temprano.

## Cuándo NO usarlo

- **Para un solo proyecto en una sola plataforma**: las variables CSS nativas alcanzan y sobran. Agregar un paso de build para generar lo que se podría escribir directo es sobre-ingeniería.
- **Si el proyecto usa Tailwind y solo es web**: el `tailwind.config` ya cumple el rol de fuente única de verdad. Style Dictionary suma valor recién cuando hay que exportar esos mismos valores fuera de CSS.
- **Si el equipo de diseño no mantiene los tokens**: si los valores los sigue definiendo quien programa, el pipeline agrega ceremonia sin resolver el problema real, que era la coordinación.

## Pasos / Código

**1. Definir los tokens en capas**

La separación en tres niveles es lo que hace que el sistema escale:

```json
// tokens/color.json
{
  "color": {
    "base": {
      "indigo": { "500": { "value": "#4F46E5" }, "600": { "value": "#4338CA" } },
      "gray":   { "50":  { "value": "#F9FAFB" }, "900": { "value": "#111827" } },
      "red":    { "500": { "value": "#EF4444" } }
    },

    "brand": {
      "primary": { "value": "{color.base.indigo.500}" },
      "primaryHover": { "value": "{color.base.indigo.600}" }
    },

    "action": {
      "background": { "value": "{color.brand.primary}" },
      "text": { "value": "{color.base.gray.50}" },
      "danger": { "value": "{color.base.red.500}" }
    }
  }
}
```

- **Base**: la paleta cruda, sin significado. Nadie la usa directamente en un componente.
- **Semántica de marca**: qué color *es* la marca.
- **Semántica de uso**: para qué se usa. Es la única capa que consumen los componentes.

Esa tercera capa es la que permite cambiar "el fondo de los botones de
acción" sin tocar la paleta, y rebrandear cambiando solo la capa de marca.

```json
// tokens/size.json
{
  "size": {
    "spacing": {
      "xs": { "value": "4" }, "sm": { "value": "8" },
      "md": { "value": "16" }, "lg": { "value": "24" }
    },
    "radius": { "sm": { "value": "4" }, "md": { "value": "8" } }
  }
}
```

**2. Configurar las plataformas de salida**

```js
// style-dictionary.config.js
export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/web/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables',
        options: { outputReferences: true }, // preserva var(--...) en vez de aplanar
      }],
    },

    ios: {
      transformGroup: 'ios-swift',
      buildPath: 'build/ios/',
      files: [{
        destination: 'DesignTokens.swift',
        format: 'ios-swift/enum.swift',
        className: 'DesignTokens',
      }],
    },

    android: {
      transformGroup: 'android',
      buildPath: 'build/android/',
      files: [
        { destination: 'colors.xml', format: 'android/colors' },
        { destination: 'dimens.xml', format: 'android/dimens' },
      ],
    },

    js: {
      transformGroup: 'js',
      buildPath: 'build/js/',
      files: [{ destination: 'tokens.js', format: 'javascript/es6' }],
    },
  },
};
```

`outputReferences: true` en CSS es importante: sin él,
`--color-action-background` se compila al hexadecimal final y se pierde la
cadena de referencias. Con él queda `var(--color-brand-primary)`, así que
cambiar la marca en runtime (para temas) sigue funcionando.

**3. Generar**

```bash
npm install --save-dev style-dictionary
npx style-dictionary build
```

Salida:

```css
/* build/web/variables.css */
:root {
  --color-base-indigo-500: #4F46E5;
  --color-brand-primary: var(--color-base-indigo-500);
  --color-action-background: var(--color-brand-primary);
  --size-spacing-md: 16px;
}
```

```swift
// build/ios/DesignTokens.swift
public enum DesignTokens {
    public static let colorActionBackground = UIColor(red: 0.310, green: 0.275, blue: 0.898, alpha: 1)
    public static let sizeSpacingMd = CGFloat(16.00)
}
```

**4. Integrarlo al build y prohibir la edición manual**

```json
// package.json
{
  "scripts": {
    "tokens": "style-dictionary build",
    "prebuild": "npm run tokens",
    "dev": "npm run tokens && vite"
  }
}
```

Y dejar explícito que lo generado no se toca:

```gitignore
# build/ se regenera: nunca editar a mano
build/
```

Si por razones de pipeline hace falta versionar los archivos generados, al
menos agregar un chequeo en CI que regenere y falle si hay diferencias — así
nadie puede editar el archivo generado sin que se note.

## Edge cases / errores comunes

- **Usar tokens base directamente en los componentes**: si un botón referencia `color.base.indigo.500` en vez de `color.action.background`, se pierde toda la capacidad de rebrandear. La capa semántica existe justamente para eso.
- **Editar el archivo generado**: el cambio desaparece en el próximo build, y como no hay error, se pierde tiempo buscando por qué "no se aplica". De ahí que convenga no versionarlos.
- **Referencias circulares** (`{color.a}` → `{color.b}` → `{color.a}`): Style Dictionary falla con un mensaje poco claro. Aparecen sobre todo al reorganizar capas.
- **Unidades inconsistentes**: definir espaciados en `px` para web pero necesitar `dp`/`pt` en mobile. La solución es guardar el número sin unidad en el token y dejar que cada transform de plataforma agregue la suya.
- **Olvidar `outputReferences` en CSS**: los temas dinámicos dejan de funcionar porque las variables quedan aplanadas a valores literales.
- **Modo oscuro como un set de tokens paralelo completo**: duplica el mantenimiento. Es mejor un solo set semántico cuyos valores cambien por tema, no dos árboles enteros.

## Compatibilidad

Style Dictionary v4+ requiere Node 18+ y usa configuración en ESM. Genera
salidas para CSS, Sass, Less, JS/TS, Swift, Kotlin, XML de Android, Flutter
y JSON, y admite formatos propios. El formato de token del **W3C Design
Tokens Community Group** está estandarizándose y v4 lo soporta — vale
tenerlo en cuenta si se empieza hoy, porque es hacia donde va la
interoperabilidad con Figma y otras herramientas.

## Fuentes

- **Style Dictionary** (4.8k ⭐): es la herramienta de este skill y el estándar de facto del sector pese a su cifra modesta de estrellas. El barrido de fuentes confirmó que **esta categoría no tiene ningún proyecto por encima de 10k** — no porque el problema sea menor, sino porque se resuelve con configuración propia más que con una librería masiva.
- **semi-design** (10.2k ⭐): design system con más de 3000 tokens definidos; útil como referencia de hasta qué granularidad conviene llegar y cómo nombrar las capas.
- **Tailwind CSS** (96.1k ⭐): su archivo de configuración cumple el mismo rol de fuente única de verdad, pero solo para web. Verlo ayuda a decidir cuándo Style Dictionary agrega valor real (hay mobile de por medio) y cuándo es ceremonia.
- **awesome-design-md** (105k ⭐): el mismo problema atacado desde otro ángulo — describir el sistema de diseño en texto para que una IA lo aplique, en lugar de generar constantes para que lo aplique un compilador.

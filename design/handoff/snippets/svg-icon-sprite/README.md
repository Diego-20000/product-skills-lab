---
title: Sprite de iconos SVG desde la carpeta de diseño
platform: design
pillar: handoff
tags: [svg, icons, build, sprite, assets]
summary: Convierte una carpeta de SVG exportados por diseño en un sprite único optimizado, con validación de naming y de que los iconos usen currentColor.
when_not_to_use: Si el proyecto usa una librería de iconos ya mantenida (Lucide, Heroicons), consumirla directamente — este snippet es para iconos propios de la marca.
---

# Sprite de iconos SVG desde la carpeta de diseño

## Contexto

Los iconos son el asset que más veces cruza la frontera entre diseño y
código, y donde más fricción se acumula. El flujo manual —diseño exporta
SVGs, alguien los pega en el proyecto— genera problemas repetidos: cada SVG
trae metadatos del editor (capas de Figma, comentarios, `id` duplicados que
colisionan al inyectarlos en la misma página), los colores vienen
hardcodeados en vez de heredar del contexto, los nombres son inconsistentes
(`Icon_Trash-02_final.svg`), y cada icono es una request HTTP separada.

Un sprite resuelve todo eso de una pasada: un único archivo con todos los
símbolos, referenciables por `<use>`, optimizado y validado. Y como es un
script de build, el handoff pasa a ser "poné los SVG en esta carpeta con
este naming" en vez de una serie de pasos manuales que alguien tiene que
recordar.

La validación importa tanto como la generación: un script que **falla** si
un icono trae un color fijo es lo que evita descubrirlo cuando el modo
oscuro no funciona.

## Código completo

```js
// scripts/build-icon-sprite.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { optimize } from 'svgo';

const SOURCE_DIR = 'design/assets/icons';
const OUTPUT_FILE = 'public/icons/sprite.svg';
const TYPES_FILE = 'src/types/icons.ts';

// kebab-case, sin números de versión ni sufijos del editor
const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*\.svg$/;

const svgoConfig = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // El viewBox es imprescindible para que el <use> escale
          removeViewBox: false,
          // Los ids se prefijan con el nombre del icono, no se eliminan
          cleanupIds: false,
        },
      },
    },
    'removeDimensions',        // width/height los define el CSS, no el SVG
    { name: 'removeAttrs', params: { attrs: '(class|data-name)' } },
  ],
};

async function main() {
  const files = (await fs.readdir(SOURCE_DIR)).filter((f) => f.endsWith('.svg')).sort();
  const errors = [];
  const symbols = [];
  const names = [];

  for (const file of files) {
    const iconName = path.basename(file, '.svg');

    // --- Validación 1: naming ---
    if (!NAME_PATTERN.test(file)) {
      errors.push(`${file}: el nombre debe ser kebab-case (ej: arrow-right.svg)`);
      continue;
    }

    const raw = await fs.readFile(path.join(SOURCE_DIR, file), 'utf8');

    // --- Validación 2: colores hardcodeados ---
    // Los iconos deben usar currentColor para heredar del contexto.
    const hardcoded = raw.match(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8}|rgb\([^)]*\))"/g);
    if (hardcoded) {
      errors.push(
        `${file}: usa colores fijos (${[...new Set(hardcoded)].join(', ')}). ` +
        `Reemplazar por currentColor.`
      );
      continue;
    }

    // --- Validación 3: viewBox presente ---
    const viewBoxMatch = raw.match(/viewBox="([^"]+)"/);
    if (!viewBoxMatch) {
      errors.push(`${file}: falta el atributo viewBox`);
      continue;
    }

    const { data } = optimize(raw, { path: file, ...svgoConfig });

    // Extraer el contenido interno del <svg> y prefijar los ids para
    // que dos iconos con un <clipPath id="a"> no colisionen en el sprite.
    const inner = data
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '')
      .replace(/id="([^"]+)"/g, `id="${iconName}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${iconName}-$1)`)
      .trim();

    symbols.push(`  <symbol id="icon-${iconName}" viewBox="${viewBoxMatch[1]}">${inner}</symbol>`);
    names.push(iconName);
  }

  if (errors.length > 0) {
    console.error('\n✗ Iconos con problemas:\n');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('');
    process.exit(1);
  }

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols.join('\n')}\n</svg>\n`;
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, sprite);

  // Tipos derivados: autocompletado y error de compilación si el icono no existe
  const types = `// Generado por scripts/build-icon-sprite.mjs — no editar\nexport type IconName =\n${names.map((n) => `  | '${n}'`).join('\n')};\n`;
  await fs.mkdir(path.dirname(TYPES_FILE), { recursive: true });
  await fs.writeFile(TYPES_FILE, types);

  console.log(`✓ ${names.length} iconos → ${OUTPUT_FILE}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

**Componente consumidor**

```tsx
// components/Icon.tsx
import type { IconName } from '@/types/icons';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  /** Si el icono aporta significado, pasar una etiqueta */
  label?: string;
}

export function Icon({ name, size = 24, label, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      // currentColor: el icono hereda el color del texto que lo rodea
      fill="currentColor"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      <use href={`/icons/sprite.svg#icon-${name}`} />
    </svg>
  );
}
```

**Integración al build**

```json
{
  "scripts": {
    "icons": "node scripts/build-icon-sprite.mjs",
    "prebuild": "npm run icons",
    "predev": "npm run icons"
  }
}
```

```yaml
# En CI: falla el PR si alguien subió un icono que no cumple las reglas
- name: Validar iconos
  run: npm run icons
```

## Uso

```tsx
<Icon name="arrow-right" />                          {/* decorativo */}
<Icon name="trash" label="Eliminar" size={20} />     {/* con significado */}

{/* Hereda el color del contexto sin configurar nada */}
<button className="text-red-600">
  <Icon name="trash" /> Eliminar
</button>
```

## Limitaciones conocidas

- **`<use>` con href externo no funciona en file://** ni entre orígenes distintos sin CORS. En desarrollo con un server normal no hay problema; si el sprite se sirve desde un CDN de otro dominio, hay que configurar CORS o inyectar el sprite inline en el HTML.
- **Un sprite grande se descarga entero** aunque la página use tres iconos. Con más de ~100 iconos conviene dividirlo por sección o pasar a componentes SVG individuales con tree-shaking.
- **Los iconos multicolor no encajan** con `currentColor`: la validación los rechaza. Para logos o ilustraciones a color conviene una carpeta aparte con otras reglas.
- **El prefijado de ids es una heurística**: cubre `id=` y `url(#...)`, que son los casos habituales, pero un SVG con referencias por `xlink:href` interno podría escaparse.
- **Cambiar el nombre de un icono rompe los consumidores**, aunque al menos TypeScript lo marca en compilación gracias a los tipos generados. Vale tratar los nombres como una API pública.
- **SVGO puede romper iconos con filtros o máscaras complejas**: si un icono se ve mal tras la optimización, hay que desactivar plugins específicos para ese caso.

## Fuentes

- **Lucide** (23.7k ⭐): el ejemplo mejor resuelto de handoff de iconos — un set consistente con exports para todos los frameworks, naming estricto y `currentColor` por defecto. Este snippet aplica sus mismas convenciones a iconos propios.
- **css.gg** (10k ⭐): 700+ iconos con paridad entre Figma y código; útil como referencia de cómo mantener sincronizada la herramienta de diseño con el output.
- **Figma-Context-MCP** (15.5k ⭐): el paso siguiente en automatización — leer los assets directamente del archivo de diseño en vez de esperar que alguien los exporte a una carpeta.
- **Storybook** (90.7k ⭐): el lugar natural para publicar la galería de iconos disponibles; sin eso, el equipo no sabe qué existe y termina pidiendo iconos que ya están.

#!/usr/bin/env node
/**
 * Genera _meta/index.json a partir de los recursos del repo y valida que
 * cada uno cumpla el contrato de _meta/TEMPLATE.md.
 *
 * El índice existe para que un agente de IA pueda descubrir y filtrar los
 * recursos sin parsear tablas Markdown ni recorrer el árbol de directorios.
 *
 * Uso:  node scripts/build-index.mjs [--check]
 *       --check  no escribe nada; falla si el índice está desactualizado
 *                (para usar en CI)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, '_meta', 'index.json');
const CHECK_ONLY = process.argv.includes('--check');

const PLATFORMS = ['web', 'mobile', 'automation', 'design', 'video'];
const TYPES = { skills: 'SKILL.md', snippets: 'README.md', guides: 'README.md' };

const errors = [];

/** Parser de frontmatter YAML acotado a lo que usa el repo (sin dependencias). */
function parseFrontmatter(raw, file) {
  if (!raw.startsWith('---\n')) {
    errors.push(`${file}: no empieza con frontmatter`);
    return null;
  }
  const end = raw.indexOf('\n---', 4);
  if (end === -1) {
    errors.push(`${file}: frontmatter sin cerrar`);
    return null;
  }

  const data = {};
  let key = null;

  for (const line of raw.slice(4, end).split('\n')) {
    if (!line.trim()) continue;

    const match = line.match(/^([a-z_]+):\s*(.*)$/);
    if (match) {
      key = match[1];
      let value = match[2].trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      } else {
        value = value.replace(/^["']|["']$/g, '');
      }
      data[key] = value;
    } else if (key && /^\s+\S/.test(line)) {
      // continuación de un valor multilínea
      data[key] = `${data[key]} ${line.trim()}`.trim();
    }
  }
  return data;
}

/** Verifica que los links relativos del archivo resuelvan. */
async function checkLinks(raw, filePath) {
  const dir = path.dirname(filePath);
  const found = raw.matchAll(/\]\(([^)]+)\)/g);

  for (const [, link] of found) {
    if (/^(https?:|#)/.test(link)) continue;
    const target = link.split('#')[0];
    if (!target) continue;

    try {
      await fs.access(path.resolve(dir, target));
    } catch {
      errors.push(`${path.relative(ROOT, filePath)}: link roto → ${target}`);
    }
  }
}

async function collect() {
  const resources = [];

  for (const platform of PLATFORMS) {
    const platformDir = path.join(ROOT, platform);

    let pillars;
    try {
      pillars = (await fs.readdir(platformDir, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
    } catch {
      errors.push(`falta la plataforma ${platform}/`);
      continue;
    }

    for (const pillar of pillars) {
      for (const [type, filename] of Object.entries(TYPES)) {
        const typeDir = path.join(platformDir, pillar, type);

        let entries;
        try {
          entries = (await fs.readdir(typeDir, { withFileTypes: true }))
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .sort();
        } catch {
          errors.push(`${platform}/${pillar}/${type}/: no existe`);
          continue;
        }

        if (entries.length === 0) {
          errors.push(`${platform}/${pillar}/${type}/: sin recursos`);
        }

        for (const name of entries) {
          const filePath = path.join(typeDir, name, filename);
          let raw;
          try {
            raw = await fs.readFile(filePath, 'utf8');
          } catch {
            errors.push(`${platform}/${pillar}/${type}/${name}/: falta ${filename}`);
            continue;
          }

          const rel = path
            .relative(ROOT, filePath)
            .split(path.sep)
            .join('/');
          const fm = parseFrontmatter(raw, rel);
          if (!fm) continue;

          // --- validaciones del contrato de TEMPLATE.md ---
          if (!raw.includes('\n## Fuentes')) {
            errors.push(`${rel}: falta la sección "## Fuentes"`);
          }

          const fences = (raw.match(/^```/gm) ?? []).length;
          if (fences % 2 !== 0) {
            errors.push(`${rel}: bloques de código sin cerrar (${fences} fences)`);
          }

          await checkLinks(raw, filePath);

          if (type === 'skills') {
            for (const field of ['name', 'description']) {
              if (!fm[field]) errors.push(`${rel}: falta "${field}" en el frontmatter`);
            }
            if (fm.name && fm.name !== name) {
              errors.push(`${rel}: name "${fm.name}" no coincide con la carpeta "${name}"`);
            }
          } else {
            for (const field of ['title', 'platform', 'pillar', 'tags', 'summary']) {
              if (!fm[field]) errors.push(`${rel}: falta "${field}" en el frontmatter`);
            }
            if (fm.platform && fm.platform !== platform) {
              errors.push(`${rel}: platform "${fm.platform}" no coincide con la carpeta "${platform}"`);
            }
            if (fm.pillar && fm.pillar !== pillar) {
              errors.push(`${rel}: pillar "${fm.pillar}" no coincide con la carpeta "${pillar}"`);
            }
          }

          resources.push({
            id: `${platform}/${pillar}/${type.slice(0, -1)}/${name}`,
            path: rel,
            platform,
            pillar,
            type: type.slice(0, -1), // skills → skill
            name,
            title: fm.title ?? fm.name ?? name,
            summary: fm.summary ?? fm.description ?? '',
            tags: Array.isArray(fm.tags) ? fm.tags : [],
            ...(fm.when_not_to_use ? { whenNotToUse: fm.when_not_to_use } : {}),
          });
        }
      }
    }
  }

  return resources;
}

const resources = await collect();

const index = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  name: 'product-skills-lab',
  description:
    'Skills, snippets y guías reutilizables para construir productos digitales: web, mobile, automatización, diseño y video.',
  repository: 'https://github.com/Diego-20000/product-skills-lab',
  license: 'MIT',
  generatedAt: new Date().toISOString().slice(0, 10),
  conventions: {
    layout: '<platform>/<pillar>/<type>/<name>/',
    types: {
      skill: 'Instrucciones accionables paso a paso, en formato Claude Code (SKILL.md).',
      snippet: 'Código copy-paste que resuelve una cosa concreta, sin flujo.',
      guide: 'Criterio y trade-offs para una decisión, incluyendo qué NO responde.',
    },
    sources:
      'Cada recurso se escribe de cero sintetizando varios proyectos de referencia y los declara en su sección "Fuentes". El catálogo completo está en _meta/SOURCES.md.',
  },
  counts: {
    platforms: PLATFORMS.length,
    pillars: new Set(resources.map((r) => `${r.platform}/${r.pillar}`)).size,
    resources: resources.length,
    byType: resources.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] ?? 0) + 1;
      return acc;
    }, {}),
  },
  resources,
};

const json = `${JSON.stringify(index, null, 2)}\n`;

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} problema(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

if (CHECK_ONLY) {
  let current = null;
  try {
    current = await fs.readFile(OUTPUT, 'utf8');
  } catch {
    /* no existe todavía */
  }

  // Se compara ignorando generatedAt, que cambia cada día por diseño.
  const strip = (s) => s.replace(/"generatedAt": "[^"]*",\n/, '');
  if (current === null || strip(current) !== strip(json)) {
    console.error('✗ _meta/index.json está desactualizado. Corré: node scripts/build-index.mjs');
    process.exit(1);
  }
  console.log(`✓ índice actualizado (${resources.length} recursos)`);
} else {
  await fs.writeFile(OUTPUT, json);
  const { byType } = index.counts;
  console.log(
    `✓ _meta/index.json — ${resources.length} recursos ` +
      `(${byType.skill} skills, ${byType.snippet} snippets, ${byType.guide} guides) ` +
      `en ${index.counts.pillars} pilares`
  );
}

# Cómo contribuir

1. **Verificá el criterio** en [`_meta/TAXONOMY.md`](_meta/TAXONOMY.md): el
   recurso tiene que ser reutilizable, accionable y pertenecer a una de las
   cinco plataformas (`web`, `mobile`, `automation`, `design`, `video`) y a
   uno de sus 22 pilares.
2. **Elegí la carpeta correcta**: `<plataforma>/<pilar>/<tipo>/<nombre-kebab-case>/`.
3. **Usá la plantilla correspondiente** en [`_meta/TEMPLATE.md`](_meta/TEMPLATE.md)
   según sea `skill`, `snippet` o `guide`. La vara de detalle está definida
   ahí: el cuerpo tiene que explicar el problema con profundidad, no ser una
   hoja de referencia.
4. **Escribí de cero, sintetizando.** Nada se copia de una fuente. Se estudia
   cómo resuelven el problema varios proyectos de
   [`_meta/SOURCES.md`](_meta/SOURCES.md) y se escribe una síntesis propia
   señalando dónde difieren. Si el proyecto que corresponde no está en el
   catálogo, se agrega ahí primero (con sus estrellas verificadas **contra
   GitHub**, no contra un artículo).
5. **Cerrá con la sección `## Fuentes`**, declarando qué se estudió y qué
   aporta cada proyecto. Es obligatoria en los tres tipos de recurso.
6. **Probá el código** antes de subirlo — nada de snippets sin correr al menos una vez.
7. **Regenerá el índice**: `node scripts/build-index.mjs`. El archivo
   [`_meta/index.json`](_meta/index.json) es lo que consumen los agentes de
   IA; si queda desactualizado, el recurso nuevo es invisible para ellos.
8. Un recurso por PR cuando sea posible, para que sea fácil de revisar.

## Convenciones

- Nombres de carpeta en `kebab-case`, describiendo el recurso (`css-scroll-reveal`), no solo la tecnología (`gsap`).
- Sin datos reales, secretos ni referencias a proyectos/clientes específicos.
- Si el recurso depende de una librería externa, se referencia con link — no se vendoriza el código de la librería.
- Los archivos se escriben en el idioma que se prefiera (español o inglés), pero el frontmatter y los nombres de campo siempre en inglés para que sea parseable de forma consistente.
- Los links entre recursos son relativos. Ojo con la profundidad: un recurso está a **cuatro** niveles de la raíz (`<plataforma>/<pilar>/<tipo>/<nombre>/`), así que referenciar algo de otra plataforma necesita `../../../../`.

## Antes de abrir el PR

```bash
node scripts/build-index.mjs   # regenera _meta/index.json y valida frontmatter
```

El script falla si un recurso no tiene el frontmatter completo, si le falta
la sección `## Fuentes`, o si algún link relativo interno no resuelve.

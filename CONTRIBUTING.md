# Cómo contribuir

1. **Verificá el criterio** en [`_meta/TAXONOMY.md`](_meta/TAXONOMY.md): el
   recurso tiene que ser reutilizable, accionable y pertenecer a uno de los
   tres pilares (`web`, `mobile`, `automation`).
2. **Elegí la carpeta correcta**: `<plataforma>/<pilar>/<tipo>/<nombre-kebab-case>/`.
3. **Usá la plantilla correspondiente** en [`_meta/TEMPLATE.md`](_meta/TEMPLATE.md)
   según sea `skill`, `snippet` o `guide`.
4. **Probá el código** antes de subirlo — nada de snippets sin correr al menos una vez.
5. Un recurso por PR cuando sea posible, para que sea fácil de revisar.

## Convenciones

- Nombres de carpeta en `kebab-case`, describiendo el recurso (`css-scroll-reveal`), no solo la tecnología (`gsap`).
- Sin datos reales, secretos ni referencias a proyectos/clientes específicos.
- Si el recurso depende de una librería externa, se referencia con link — no se vendoriza el código de la librería.
- Los archivos se escriben en el idioma que se prefiera (español o inglés), pero el frontmatter y los nombres de campo siempre en inglés para que sea parseable de forma consistente.

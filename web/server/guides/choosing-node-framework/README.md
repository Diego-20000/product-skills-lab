---
title: Elegir framework Node — Express, Fastify o NestJS
platform: web
pillar: server
tags: [nodejs, express, fastify, nestjs, decision, architecture]
summary: Criterio para elegir framework de backend Node según tamaño de equipo, necesidad de estructura y prioridades, sin que el rendimiento sea el factor decisivo que casi nunca es.
---

# Elegir framework Node — Express, Fastify o NestJS

## El eje real de la decisión

Los tres sirven para lo mismo: recibir requests HTTP y devolver respuestas.
La diferencia no está en lo que pueden hacer sino en **cuántas decisiones
toman por vos**.

- **Express** no toma casi ninguna. Da una cadena de middlewares y nada más: cómo organizar rutas, cómo validar, cómo inyectar dependencias, cómo manejar errores — todo queda por definir.
- **Fastify** toma decisiones sobre validación y serialización (schema-first) y sobre encapsulamiento de plugins, pero deja libre la arquitectura general.
- **NestJS** toma casi todas: módulos, inyección de dependencias, decoradores, estructura de carpetas, convenciones de nombres.

Más decisiones tomadas por el framework significa menos discusiones en el
equipo y más consistencia, a cambio de menos libertad y más framework que
aprender. El punto óptimo depende del equipo, no del proyecto.

## Elegir Express cuando

- El servicio es chico y acotado: un proxy, un webhook receiver, una API de pocos endpoints.
- El equipo ya tiene una arquitectura propia que quiere aplicar sin pelear con la del framework.
- Importa la disponibilidad de ejemplos: es el framework con más años, más respuestas en Stack Overflow y más middlewares de terceros para casos raros.
- Se necesita mínima superficie de dependencia.

**Contraejemplo:** en un equipo de más de tres o cuatro personas sin
convenciones escritas, la falta de estructura de Express produce que cada
módulo esté organizado distinto. El costo aparece a los meses, no al
principio.

**Nota de versión:** Express 5 ya captura rechazos de promesas de forma
nativa, lo que elimina el `asyncHandler` que hacía falta en la 4. Si se
arranca hoy, conviene la 5.

## Elegir Fastify cuando

- Se valora el enfoque **schema-first**: el mismo JSON Schema valida la entrada y acelera la serialización de la respuesta. Además genera documentación OpenAPI sin trabajo extra.
- El servicio maneja volumen alto y la diferencia de rendimiento tiene un impacto de costo real en infraestructura.
- Molesta el problema clásico de Express de middlewares globales con efectos secundarios en rutas no relacionadas: el modelo de plugins encapsulados de Fastify lo resuelve por diseño.
- Se quiere algo estructurado pero sin la ceremonia de NestJS.

**Contraejemplo:** si el equipo no va a escribir schemas, se pierde la mitad
del valor de Fastify y queda solo como "un Express más rápido", lo cual
raramente justifica el cambio.

## Elegir NestJS cuando

- El equipo es grande o rota, y la consistencia entre módulos vale más que la libertad.
- Ya hay experiencia en Angular o en frameworks con inyección de dependencias: el modelo mental se traslada directo.
- El proyecto va a ser grande y de larga vida: la estructura impuesta es lo que evita que cada feature invente su propia forma.
- Se necesitan de fábrica: GraphQL, microservicios, WebSockets, colas, OpenAPI automático. NestJS los trae integrados de forma coherente en vez de como piezas sueltas.

**Contraejemplo:** para una API de seis endpoints, NestJS es más
infraestructura que producto. La cantidad de archivos y conceptos (módulo,
controlador, servicio, provider, DTO) supera al problema que se resuelve.

## La pregunta que resuelve la mayoría de los casos

> ¿El equipo va a mantener convenciones propias de forma disciplinada?

Si sí → Express o Fastify, según si se quieren schemas.
Si no, o si el equipo es grande → NestJS, que las impone.

## El rendimiento casi nunca es el criterio correcto

En benchmarks sintéticos Fastify supera a Express de forma consistente. En
una aplicación real esa diferencia se vuelve marginal, porque el tiempo se
va en la consulta a la base de datos, en las llamadas a servicios externos y
en la latencia de red — no en el enrutamiento HTTP.

Elegir framework por benchmarks es optimizar la parte que no es el cuello de
botella. Si el rendimiento importa de verdad, lo que hay que medir es dónde
se va el tiempo en la aplicación concreta; casi siempre la respuesta está en
las consultas, no en el framework.

NestJS, además, corre **sobre** Express o Fastify: se puede elegir Fastify
como adaptador y obtener su rendimiento con la estructura de Nest.

## Lo que hay que definir igual, con cualquiera de los tres

Estas decisiones son ortogonales al framework y suelen importar más:

- **Manejo de errores centralizado** con distinción entre errores operacionales y bugs (ver el skill [`api-error-handling`](../../skills/api-error-handling/SKILL.md)).
- **Validación en el servidor**, siempre — la del cliente es UX, no seguridad.
- **Estructura por feature, no por tipo**: agrupar `orders/` con su controlador, servicio y tests juntos escala mejor que `controllers/`, `services/`, `models/` en paralelo.
- **Configuración por variables de entorno**, validada al arrancar para fallar temprano.
- **Logging estructurado** (JSON), no `console.log`.

## Qué NO responde esta guía

- **No cubre frameworks fullstack** (Next.js, Remix, Nuxt) donde el backend es parte del framework de frontend. Esa es una decisión de arquitectura anterior a esta.
- **No cubre alternativas fuera de Node**: Go, Rust o Python pueden ser mejores opciones según el equipo y el problema. Elegir el lenguaje es la decisión previa.
- **No cubre serverless**, donde el framework importa menos que el modelo de despliegue y el arranque en frío.
- **No cubre REST vs GraphQL vs tRPC**: es una decisión de contrato de API, ortogonal a esta.

## Fuentes

- **Express** (69.3k ⭐): su falta de opinión es la razón concreta de su longevidad; entender eso evita juzgarlo como "framework incompleto" cuando en realidad es una decisión de diseño.
- **Fastify** (36.9k ⭐): el enfoque schema-first y el encapsulamiento de plugins son sus dos diferenciales reales, muy por encima del argumento de velocidad con el que se lo suele presentar.
- **NestJS** (76.3k ⭐): su modelo de módulos e inyección de dependencias es lo que lo hace previsible en equipos grandes; sus estrellas por encima de Express reflejan adopción en proyectos enterprise más que uso general.
- **nodebestpractices** (105k ⭐): la referencia de todo lo que hay que definir *además* del framework; buena parte de la sección "lo que hay que definir igual" viene de ahí.
- **fiber** (40k ⭐): un Express-like en Go; útil como recordatorio de que la decisión de lenguaje precede a esta y a veces conviene revisarla.
- **payload** (43.9k ⭐) y **strapi** (72.7k ⭐): la opción de no construir el backend — si el problema es principalmente CMS o CRUD sobre contenido, ninguno de los tres frameworks es la respuesta correcta.

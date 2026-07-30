---
title: Cuándo usar Flutter vs React Native
platform: mobile
pillar: cross-platform
tags: [flutter, react-native, decision, cross-platform]
summary: Trade-offs concretos para elegir framework cross-platform según el equipo y el tipo de proyecto, sin declarar un ganador universal.
---

# Cuándo usar Flutter vs React Native

## La diferencia técnica de fondo (de la que se derivan todos los trade-offs)

Flutter no usa los componentes nativos de UI del sistema operativo: dibuja
su propia interfaz completa vía su motor gráfico (Skia, y más
recientemente Impeller), pixel por pixel, sobre un canvas. React Native,
en cambio, renderiza a través de los componentes de UI nativos reales de
cada plataforma — históricamente comunicándose con ellos vía un puente
asíncrono en JSON, y hoy también mediante enlace directo (JSI) sin ese
puente.

Esta única decisión de arquitectura explica casi todos los trade-offs de
abajo: Flutter gana en consistencia visual exacta entre plataformas porque
no depende de cómo cada SO decide renderizar sus widgets; React Native
gana en "sentirse nativo" porque literalmente usa los widgets nativos, con
su comportamiento de accesibilidad y sus micro-interacciones ya resueltos
por el sistema operativo.

## Elegir Flutter cuando

- El equipo no tiene experiencia previa en React/JS y puede invertir en aprender Dart — la curva de aprendizaje de Dart en sí no es mayor que la de TypeScript, el costo real es el ecosistema nuevo.
- La app necesita UI muy custom o animaciones consistentes pixel-a-pixel entre iOS y Android — por ejemplo, un editor de diseño, una app de dibujo, o un producto donde la marca visual es más importante que "sentirse como una app de iOS/Android".
- Se valora un solo lenguaje/toolchain de punta a punta: el mismo código de Flutter también compila a web y desktop, lo cual reduce la superficie de mantenimiento si el producto ya apunta a más de dos plataformas.

## Elegir React Native cuando

- El equipo ya tiene fuerte experiencia en React/TypeScript y quiere reutilizar patrones —y a veces lógica de negocio real, no solo conocimiento— de una app web existente en el mismo monorepo.
- Se necesita acceso rápido a librerías del ecosistema npm o integraciones nativas ya resueltas por la comunidad: al ser un ecosistema más viejo y más grande, es más probable encontrar un paquete ya hecho para un SDK de terceros específico (pagos, analytics, push notifications de un proveedor particular).
- El proyecto prioriza que la UI se sienta "nativa" por plataforma en vez de idéntica entre plataformas — por ejemplo, que un `<Switch>` en iOS se vea y se comporte exactamente como el switch nativo de iOS, y distinto en Android, sin trabajo extra.

## Señales de alerta en cualquiera de los dos

- Si la app depende fuertemente de una feature nativa muy reciente (una API de iOS o Android recién liberada), ambos frameworks van a estar por detrás del SDK nativo hasta que alguien escriba el plugin correspondiente — evaluar si conviene una vista nativa embebida (native module / platform view) en lugar de esperar.
- Si el equipo es una sola persona sin experiencia previa en ninguno de los dos: el criterio de desempate real es "qué lenguaje ya conocés" (JS/TS → React Native, ningún sesgo previo → cualquiera), no cuál framework es objetivamente superior en el papel.
- Si el proyecto es principalmente una capa fina sobre contenido web (básicamente un sitio empaquetado): antes de elegir cualquiera de los dos, evaluar si directamente alcanza con una PWA o un wrapper tipo Capacitor — meter un framework cross-platform completo para eso es sobre-ingeniería.

## Lo que esta guía NO responde

- No es una comparación de rendimiento en benchmarks aislados: en la enorme mayoría de apps de producto real, ambos frameworks bien usados llegan a un rendimiento percibido indistinguible por el usuario final — la diferencia de rendimiento entre ellos rara vez es el criterio de decisión correcto.
- No cubre Kotlin Multiplatform ni otras estrategias de "compartir solo la lógica, UI nativa por separado" — esa es una categoría de decisión distinta (¿compartir UI o solo lógica?), no una tercera opción dentro de esta misma comparación.

## Fuentes

- **Flutter** (repo oficial de Google): la arquitectura de renderizado propio vía Skia/Impeller es la base técnica de todo lo dicho arriba sobre consistencia visual entre plataformas.
- **React Native** (repo oficial de Meta): el modelo de puente/JSI hacia componentes nativos reales es la base técnica de todo lo dicho arriba sobre "sentirse nativo" y reuso de conocimiento del ecosistema web.

---
title: Cuándo usar Flutter vs React Native
platform: mobile
pillar: cross-platform
tags: [flutter, react-native, decision, cross-platform]
summary: Trade-offs concretos para elegir framework cross-platform según el equipo y el tipo de proyecto, sin declarar un ganador universal.
---

# Cuándo usar Flutter vs React Native

## Elegir Flutter cuando
- El equipo no tiene experiencia previa en React/JS y puede invertir en aprender Dart.
- La app necesita UI muy custom o animaciones consistentes pixel-a-pixel entre iOS y Android (Flutter dibuja su propio motor de render, no usa componentes nativos).
- Se valora un solo lenguaje/toolchain de punta a punta (incluye web y desktop con el mismo código).

## Elegir React Native cuando
- El equipo ya tiene fuerte experiencia en React/TypeScript y quiere reutilizar patrones —y a veces código— de una app web existente.
- Se necesita acceso rápido a librerías del ecosistema npm o integraciones nativas ya resueltas por la comunidad (el ecosistema es más grande y más viejo).
- El proyecto prioriza que la UI se sienta "nativa" por plataforma en vez de idéntica entre plataformas.

## Señales de alerta en cualquiera de los dos
- Si la app depende fuertemente de una feature nativa muy reciente (ej. una API de iOS recién liberada), ambos frameworks van a estar por detrás del SDK nativo — evaluar una vista nativa embebida en lugar de esperar el plugin cross-platform.
- Si el equipo es una sola persona sin experiencia previa en ninguno de los dos: el criterio de desempate real es "qué lenguaje ya conocés", no cuál framework es objetivamente mejor.

## No es una guía de rendimiento
Ambos frameworks, bien usados, alcanzan rendimiento aceptable para la enorme mayoría de apps de producto. La diferencia de rendimiento entre ellos rara vez es el criterio de decisión correcto — el criterio real casi siempre es el equipo y el ecosistema.

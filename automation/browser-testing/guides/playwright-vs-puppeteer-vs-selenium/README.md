---
title: Cuándo usar Playwright vs Puppeteer vs Selenium
platform: automation
pillar: browser-testing
tags: [playwright, puppeteer, selenium, decision, browser-automation]
summary: Trade-offs concretos entre los tres frameworks de automatización de navegador según protocolo, navegadores soportados y objetivo (testing vs scraping).
---

# Cuándo usar Playwright vs Puppeteer vs Selenium

## La diferencia técnica de fondo

Puppeteer y Playwright controlan el navegador a través del **DevTools
Protocol** (el mismo protocolo que usan las herramientas de desarrollador
del propio Chrome), lo cual permite interceptar red, emular dispositivos y
esperar eventos del navegador con mucha precisión. Selenium en cambio usa
el protocolo estándar **W3C WebDriver**, más antiguo y más ampliamente
adoptado por todos los fabricantes de navegadores por igual — de ahí que
Selenium soporte el rango más amplio de navegadores y lenguajes de
cliente, mientras Playwright y Puppeteer dependen de que cada motor de
navegador (Chromium, Firefox, WebKit) implemente su propio protocolo de
control.

## Elegir Puppeteer cuando

- El objetivo es específicamente Chromium/Chrome (scraping, generación de PDFs, screenshots) y no hace falta correr contra otros navegadores.
- Ya existe una base de código grande construida sobre Puppeteer — es el más veterano de los tres y tiene la mayor cantidad de ejemplos/Stack Overflow acumulado para casos puntuales.

## Elegir Playwright cuando

- Se necesita correr los mismos tests contra Chromium, Firefox y WebKit sin cambiar de herramienta.
- El caso de uso es testing (no solo automatización/scraping): Playwright trae auto-waiting (espera automáticamente a que un elemento sea interactivable antes de actuar sobre él, reduciendo la necesidad de `sleep`/`waitFor` manuales que son la fuente número uno de tests flaky) y un test runner con paralelización y reportes ya integrados.
- El proyecto es nuevo: la energía de adopción de la comunidad (nuevos proyectos, plugins, contenido) está claramente del lado de Playwright frente a Puppeteer y Selenium en los últimos años.

## Elegir Selenium cuando

- Hace falta soportar navegadores o versiones que Playwright/Puppeteer no cubren (por ejemplo, navegadores legacy en entornos corporativos, o grids de dispositivos reales de proveedores como BrowserStack/Sauce Labs que están construidos sobre WebDriver).
- El equipo ya tiene una suite de tests grande en Selenium y el lenguaje de cliente no es JS/TS (Selenium tiene bindings maduros en Java, Python, C#, Ruby, mientras que Playwright tiene soporte oficial más acotado por lenguaje).
- La organización ya tiene infraestructura (grids, integraciones CI) construida específicamente alrededor de WebDriver.

## Señales de alerta en cualquiera de los tres

- Si el objetivo real es **scraping de datos**, no testing: los tres funcionan, pero conviene evaluar primero si hace falta un navegador real o si un cliente HTTP simple (sin renderizar JS) ya resuelve el caso — meter un navegador headless completo para páginas puramente estáticas es sobre-ingeniería.
- Si los tests son flaky con cualquiera de los tres: el síntoma casi siempre es esperas manuales mal puestas (`sleep` fijo) en vez de esperar una condición real (elemento visible, request de red resuelto) — cambiar de herramienta no arregla un problema de diseño de test.

## Lo que esta guía NO responde

No cubre frameworks de testing end-to-end mobile (Appium, Detox) — ver el
pilar `mobile/testing` para eso — ni la elección entre testing E2E y
testing unitario, que es una decisión de otra capa por completo.

## Fuentes

- **Puppeteer**: origen y limitación a Chromium vía DevTools Protocol.
- **Playwright**: extensión del mismo enfoque a múltiples motores de navegador, más auto-waiting y test runner propio.
- **Selenium**: protocolo W3C WebDriver estándar, la base de por qué soporta el rango más amplio de navegadores/lenguajes de los tres.

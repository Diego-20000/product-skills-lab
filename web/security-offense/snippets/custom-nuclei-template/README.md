---
title: Template propio de nuclei para misconfigs internas
platform: web
pillar: security-offense
tags: [nuclei, scanning, yaml, security, authorized-testing]
summary: Escribe plantillas YAML de nuclei para detectar configuraciones inseguras específicas de tu organización que ningún template público puede conocer.
when_not_to_use: Solo contra sistemas propios o con autorización escrita. Para vulnerabilidades públicas ya existen templates de la comunidad — no reescribirlos.
---

# Template propio de nuclei para misconfigs internas

## Contexto

> **Alcance:** este snippet aplica exclusivamente a sistemas propios o con
> autorización explícita y por escrito. Ver el skill
> [`authorized-vuln-scan`](../../skills/authorized-vuln-scan/SKILL.md) para
> el checklist de autorización completo.

Los templates públicos de nuclei cubren muy bien lo que es universal: CVEs
conocidos, paneles de administración de software popular, archivos expuestos
típicos. Lo que por definición no pueden cubrir son las convenciones propias
de una organización — que los endpoints de debug internos vivan en
`/__internal/`, que los tokens de la API tengan un prefijo particular, o que
haya un header de autenticación propio que nunca debería faltar.

Escribir templates propios convierte ese conocimiento tácito en una
verificación automática que corre en cada deploy. La ventaja del formato de
nuclei es que un template es un archivo YAML declarativo: se versiona junto
al código, se revisa en un PR y no requiere escribir un scanner.

## Código completo

**Detectar un endpoint de debug expuesto**

```yaml
# templates/internal/debug-endpoints.yaml
id: internal-debug-endpoints

info:
  name: Endpoints de debug internos expuestos
  author: equipo-plataforma
  severity: high
  description: |
    Detecta rutas de debug/administración internas accesibles sin
    autenticación desde fuera de la red corporativa.
  tags: misconfig,internal,exposure

http:
  - method: GET
    path:
      - "{{BaseURL}}/__internal/health"
      - "{{BaseURL}}/__internal/config"
      - "{{BaseURL}}/__debug/vars"
      - "{{BaseURL}}/actuator/env"

    # Se detiene en el primer match: no hace falta probar el resto
    stop-at-first-match: true
    redirects: false

    matchers-condition: and
    matchers:
      - type: status
        status:
          - 200

      # Confirmar por contenido evita falsos positivos de un 200
      # genérico o de una SPA que devuelve index.html para todo
      - type: word
        part: body
        words:
          - '"env"'
          - '"buildInfo"'
          - 'DATABASE_URL'
        condition: or

      - type: word
        part: header
        words:
          - "application/json"

    extractors:
      - type: regex
        part: body
        name: leaked_env_keys
        regex:
          - '"([A-Z_]{4,})":'
```

**Verificar que un header de seguridad esté presente** (detección invertida)

```yaml
# templates/internal/missing-security-headers.yaml
id: missing-internal-auth-header

info:
  name: Falta el header de autenticación interna
  author: equipo-plataforma
  severity: medium
  description: Todo servicio interno debe responder con X-Internal-Auth-Required.
  tags: misconfig,internal,headers

http:
  - method: GET
    path:
      - "{{BaseURL}}/api/v1/status"

    matchers-condition: and
    matchers:
      - type: status
        status: [200]

      # negative: true → hace match cuando el header NO está
      - type: word
        part: header
        words:
          - "X-Internal-Auth-Required"
        negative: true
```

**Detectar un formato de token propio filtrado en respuestas**

```yaml
# templates/internal/token-leak.yaml
id: internal-token-leak

info:
  name: Token interno filtrado en respuesta HTTP
  author: equipo-seguridad
  severity: critical
  tags: exposure,token,internal

http:
  - method: GET
    path:
      - "{{BaseURL}}/"
      - "{{BaseURL}}/api/config"
      - "{{BaseURL}}/static/js/main.js"

    matchers:
      - type: regex
        part: body
        regex:
          # El formato de token propio de la organización
          - 'miemp_(live|prod)_[a-zA-Z0-9]{32}'

    extractors:
      - type: regex
        part: body
        regex:
          - 'miemp_(live|prod)_[a-zA-Z0-9]{4}'   # solo el prefijo, no el token completo
```

Extraer solo el prefijo es deliberado: si el reporte de CI queda en un log
accesible, un extractor que imprime el token entero convierte el escáner en
una segunda filtración.

## Uso

```bash
# Validar la sintaxis antes de usarlo
nuclei -t templates/internal/ -validate

# Probar contra un objetivo autorizado, con salida detallada
nuclei -u https://staging.mi-app.example \
       -t templates/internal/ \
       -v

# Combinar templates propios con los públicos de la comunidad
nuclei -u https://staging.mi-app.example \
       -t templates/internal/ \
       -t ~/nuclei-templates/http/misconfiguration/ \
       -severity critical,high \
       -rate-limit 20 \
       -json-export resultados.json
```

En CI:

```yaml
- name: Scan con templates propios
  run: |
    nuclei -u "$STAGING_URL" -t templates/internal/ \
           -severity critical,high \
           -json-export nuclei-report.json
    # Falla el job si hubo hallazgos críticos
    test ! -s nuclei-report.json
```

## Limitaciones conocidas

- **Un template mal escrito genera falsos positivos que hacen ignorar el scanner.** Combinar siempre status + contenido con `matchers-condition: and`; un matcher de status solo dispara con cualquier SPA que devuelve 200 para rutas inexistentes.
- **`negative: true` da falsos positivos si el endpoint no responde**: si el servicio está caído, el header "falta" y el template dispara. Encadenar siempre con un matcher de status 200.
- **Los extractores pueden filtrar secretos a los logs**: extraer un token completo lo escribe en el reporte de CI, que suele ser accesible a más gente que el sistema escaneado.
- **Sin `rate-limit`, nuclei puede tumbar un entorno de staging chico**: la concurrencia por defecto está pensada para infraestructura, no para un contenedor de prueba.
- **Los templates propios no reemplazan a los públicos**: cubren lo específico de la organización. Los CVEs conocidos ya están mantenidos por la comunidad y reescribirlos es trabajo perdido.
- **Un template es detección, no prueba de explotabilidad**: encontrar un endpoint que responde 200 no confirma que sea explotable; requiere verificación manual antes de reportarlo como incidente.

## Fuentes

- **nuclei** (30.1k ⭐): el formato YAML declarativo de este snippet es su decisión de diseño central — permite que detectar algo nuevo sea escribir un archivo de texto en vez de programar un scanner, que es lo que hace viable tener templates propios versionados.
- **PayloadsAllTheThings** (79.6k ⭐): la referencia para saber qué rutas y patrones vale la pena buscar; sus listados de endpoints comunes son el punto de partida para adaptar a las convenciones propias.
- **OWASP wstg** (9.6k ⭐): la metodología de testing que da el criterio de qué categorías cubrir con templates propios en vez de escribir detecciones sueltas sin plan.
- **gitleaks** (28.4k ⭐): resuelve el problema hermano del último template — detectar secretos en el repositorio, mientras que nuclei los detecta ya expuestos en producción. Conviene tener ambos.

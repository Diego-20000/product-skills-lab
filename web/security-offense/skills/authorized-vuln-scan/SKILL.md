---
name: authorized-vuln-scan
description: Monta un escaneo de vulnerabilidades reproducible contra una aplicación propia (o con autorización escrita) usando nuclei y OWASP ZAP, y traduce los hallazgos en trabajo priorizado. Usar para validar el hardening de un sistema propio antes de salir a producción.
tags: [security, scanning, nuclei, zap, authorized-testing]
---

# Authorized Vulnerability Scan

## Alcance y autorización — leer antes de ejecutar nada

Este skill aplica **exclusivamente** a sistemas propios o sobre los que
exista autorización explícita y por escrito (contrato de pentest, programa
de bug bounty con su alcance definido, o un entorno de laboratorio como
OWASP Juice Shop). Escanear infraestructura de terceros sin permiso es
ilegal en la mayoría de las jurisdicciones, independientemente de la
intención.

Antes de correr cualquier comando de acá, verificar tres cosas:
1. **Quién es dueño del objetivo** y que la autorización lo cubre por nombre de dominio o rango de IP.
2. **Que el alcance esté escrito**, incluyendo qué queda explícitamente fuera (subdominios de terceros, endpoints de pago, entornos compartidos).
3. **Que el entorno sea el correcto**: escanear producción puede generar carga, datos basura o disparar alertas del proveedor de hosting. Salvo que la autorización lo indique, se escanea staging.

## Contexto

Un escaneo automatizado no reemplaza una revisión manual ni una auditoría
profesional: encuentra la clase de problemas que son **conocidos y
catalogados** —una versión con CVE público, un header de seguridad faltante,
un endpoint de administración expuesto, credenciales por defecto—. Eso es
justamente lo que un atacante oportunista busca primero, así que cerrar esa
capa tiene una relación costo/beneficio muy alta.

Las dos herramientas de este skill son complementarias y se confunden
seguido. **nuclei** ejecuta plantillas declarativas contra un objetivo: es
rápido, cubre miles de CVEs y misconfigs conocidas, y es ideal para correr
en CI de forma recurrente. **OWASP ZAP** actúa como proxy y explora la
aplicación navegándola: encuentra problemas de la lógica propia de la app
(XSS reflejado en un parámetro específico, falta de CSRF en un formulario)
que ninguna plantilla genérica puede conocer de antemano.

## Cuándo usarlo

- Antes de exponer públicamente una aplicación nueva.
- Como paso recurrente en CI, para detectar regresiones de configuración (un header que se cayó, una dependencia con CVE nuevo).
- Después de un cambio grande de infraestructura o de dependencias.
- Para verificar que el trabajo hecho con el skill `http-security-headers` efectivamente se refleja en producción.

## Cuándo NO usarlo

- **Como sustituto de una auditoría de seguridad real**: un escaneo no encuentra fallas de lógica de negocio (que un usuario pueda leer las facturas de otro cambiando un ID), que suelen ser las más graves. Para eso hace falta revisión humana.
- **Contra sistemas de terceros**, incluidos SaaS que la empresa contrata: escanearlos viola sus términos de servicio salvo autorización expresa.
- **En producción sin coordinación**: puede degradar el servicio, llenar la base de datos de registros de prueba o disparar el bloqueo automático del WAF.

## Pasos / Código

**1. Preparar un entorno de práctica primero**

Antes de apuntar a algo propio, conviene calibrar contra un objetivo
diseñado para eso — así se aprende a leer la salida sin riesgo:

```bash
docker run --rm -p 3000:3000 bkimminich/juice-shop
```

**2. Escaneo de patrones conocidos con nuclei**

```bash
# Actualizar plantillas antes de cada corrida: el valor de nuclei
# está en que la comunidad publica templates el mismo día del CVE.
nuclei -update-templates

# Escaneo base contra el objetivo autorizado
nuclei -u https://staging.mi-app.example \
       -severity critical,high,medium \
       -rate-limit 20 \
       -o resultados-nuclei.txt
```

`-rate-limit` no es opcional en la práctica: sin él, nuclei puede generar
suficiente tráfico como para degradar un entorno de staging chico.

Para limitar el escaneo a categorías concretas:

```bash
nuclei -u https://staging.mi-app.example \
       -tags misconfig,exposure \
       -severity high,critical
```

**3. Escaneo de la aplicación con ZAP**

El escaneo de línea base es el que tiene sentido en CI: es pasivo (no
inyecta payloads), rápido y de bajo riesgo.

```bash
docker run --rm -v "$(pwd):/zap/wrk/:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
    -t https://staging.mi-app.example \
    -r reporte-zap.html
```

El escaneo activo (`zap-full-scan.py`) sí inyecta payloads de prueba y puede
crear registros, disparar emails o modificar datos. Solo en entornos
descartables:

```bash
docker run --rm -v "$(pwd):/zap/wrk/:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py -t https://staging.mi-app.example -r reporte-full.html
```

**4. Integrarlo como gate de CI**

```yaml
# .github/workflows/security-scan.yml
name: Security scan
on:
  schedule:
    - cron: '0 3 * * 1'   # semanal: detecta CVEs nuevos sobre código sin cambios
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: ZAP baseline scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: ${{ secrets.STAGING_URL }}
```

El `schedule` semanal es el punto clave: la mayoría de los hallazgos nuevos
no aparecen porque el código cambió, sino porque se publicó un CVE sobre una
dependencia que ya estaba ahí.

**5. Triaje: convertir hallazgos en trabajo**

Un reporte crudo genera ruido y termina ignorado. El criterio de priorización:

| Prioridad | Qué es | Ejemplo |
|---|---|---|
| Arreglar ya | Explotable sin autenticación, con impacto directo | Panel admin expuesto, CVE crítico en dependencia expuesta a internet |
| Arreglar en el sprint | Requiere condiciones o da poco por sí solo | Header de seguridad faltante, versión filtrada en respuestas |
| Documentar y cerrar | Falso positivo o riesgo aceptado con justificación | Detección de una tecnología que efectivamente se usa y está al día |

Los falsos positivos se documentan explícitamente en el repo (por qué se
descartó) — si no, el mismo hallazgo se vuelve a discutir en cada corrida.

## Edge cases / errores comunes

- **Escanear detrás de un WAF o CDN**: Cloudflare y similares bloquean o limitan el escaneo, produciendo un reporte limpio que no significa que la app sea segura, sino que el escáner nunca llegó. Para evaluar la app hay que apuntar al origen (con autorización) o poner el escáner en la allowlist.
- **Confundir "sin hallazgos" con "seguro"**: un escaneo automatizado no ve fallas de autorización, de lógica de negocio ni de diseño. Es una capa, no un certificado.
- **Escanear una SPA con el baseline pasivo de ZAP**: si el contenido se renderiza en el cliente, el crawler tradicional casi no ve nada. Hay que habilitar el spider con AJAX o alimentar ZAP con la definición OpenAPI de la API.
- **Correr el escaneo activo contra un entorno con datos reales**: puede crear registros, enviar notificaciones a usuarios reales o modificar estado. El escaneo activo va contra entornos descartables.
- **No versionar la configuración del escaneo**: si cada corrida usa flags distintos, los resultados no son comparables entre sí y no se puede saber si algo mejoró.

## Compatibilidad

nuclei y ZAP corren en Linux, macOS y Windows; en CI conviene la imagen
Docker de ZAP para tener versiones reproducibles. Las plantillas de nuclei
se actualizan a diario, así que dos corridas separadas por semanas no son
directamente comparables sin fijar la versión de las plantillas.

## Fuentes

- **nuclei** (30.1k ⭐): su diseño basado en templates YAML declarativos es lo que permite que la comunidad publique detección de un CVE el mismo día que se hace público, y que un equipo escriba plantillas propias para sus misconfigs específicas.
- **OWASP ZAP** (12k+ ⭐): cubre lo que nuclei no puede — problemas de la lógica propia de la aplicación, encontrados navegándola como proxy en vez de por patrones conocidos.
- **PayloadsAllTheThings** (79.6k ⭐): el catálogo de referencia para entender qué forma concreta toma cada tipo de payload. Se usa acá en el sentido defensivo: para interpretar qué está probando el escáner y para escribir validaciones que realmente cubran esas variantes.
- **OWASP CheatSheetSeries** (32.7k ⭐) y **OWASP wstg** (9.6k ⭐): el primero dice cómo implementar bien cada control, el segundo es la metodología de testing. Juntos son el marco contra el que se interpretan los hallazgos, en vez de arreglar síntomas sueltos.
- **OWASP Juice Shop**: la aplicación deliberadamente vulnerable para practicar; el único objetivo contra el que se puede escanear sin autorización previa porque existe exactamente para eso.

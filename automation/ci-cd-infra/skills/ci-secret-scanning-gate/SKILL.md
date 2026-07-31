---
name: ci-secret-scanning-gate
description: Monta una defensa en dos capas contra secretos filtrados — un hook pre-commit que bloquea antes de commitear y un paso de CI que audita el historial completo — con gitleaks. Usar al preparar un repo para hacerse público o al endurecer un pipeline.
tags: [ci-cd, security, gitleaks, secrets, pre-commit]
---

# CI Secret Scanning Gate

## Contexto

Un secreto commiteado no se borra con un commit siguiente: queda en el
historial de git para siempre, y si el repo es público hay bots que lo
indexan en minutos. Las claves de AWS filtradas en GitHub se explotan en
promedio en menos de una hora, y el daño típico es minado de criptomonedas a
costa del dueño de la cuenta.

Lo que hace este problema particularmente traicionero es que el momento de
descubrirlo suele ser muy posterior al de cometerlo, y para entonces la
corrección es cara: hay que rotar la credencial (con todo lo que dependa de
ella) **y** reescribir el historial, lo que rompe todos los clones
existentes.

La defensa correcta tiene dos capas con propósitos distintos. Un **hook
pre-commit** que corre en la máquina del desarrollador y bloquea antes de
que el secreto entre al historial — es la capa que realmente previene. Y un
**paso de CI** que escanea el historial completo — es la capa que detecta lo
que se saltó el hook (porque alguien usó `--no-verify`, o clonó sin
instalarlo). Ninguna de las dos alcanza sola: el hook es evitable, el CI
llega tarde.

## Cuándo usarlo

- Antes de hacer público un repositorio que fue privado.
- Al preparar un repo nuevo donde van a trabajar varias personas.
- Después de un incidente de secreto filtrado, para que no se repita.
- Como parte del endurecimiento general de un pipeline.

## Cuándo NO usarlo

- **Como única medida de gestión de secretos**: escanear es detección, no prevención de raíz. La solución de fondo es que los secretos vivan en un gestor (Vault, AWS Secrets Manager, los secrets del CI) y nunca existan como archivo local.
- **Si la plataforma ya lo cubre**: GitHub tiene secret scanning nativo con notificación automática a los proveedores en repos públicos. Gitleaks lo complementa (patrones propios, control del gate), pero conviene saber qué ya está cubierto antes de duplicar.

## Pasos / Código

**1. Instalar y auditar el historial actual — primero**

Antes de poner cualquier gate, hay que saber qué hay:

```bash
# macOS / Linux
brew install gitleaks

# Escanear TODO el historial, no solo el working tree
gitleaks detect --source . --report-format json --report-path leaks.json --verbose
```

Si aparece algo, el orden de la respuesta importa:

1. **Rotar la credencial primero.** Está comprometida desde el momento en que se commiteó, sin importar si el repo era privado.
2. Recién después limpiar el historial (`git filter-repo` o BFG).
3. Avisar al equipo: reescribir el historial obliga a todos a reclonar.

Invertir el orden —limpiar antes de rotar— deja una ventana en la que la
credencial sigue siendo válida y ya circuló.

**2. El hook pre-commit — la capa que previene**

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.2
    hooks:
      - id: gitleaks
```

```bash
pip install pre-commit
pre-commit install
```

Sin la herramienta `pre-commit`, el hook a mano:

```bash
# .git/hooks/pre-commit  (chmod +x)
#!/bin/sh
if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks no instalado — se omite el chequeo de secretos" >&2
  exit 0
fi

# --staged: solo lo que está por commitearse, así es rápido
gitleaks protect --staged --redact --verbose
```

`--redact` importa: sin él, el mensaje de error imprime el secreto en la
terminal y queda en el scrollback y en los logs del editor.

**3. El paso de CI — la capa que detecta**

```yaml
# .github/workflows/secret-scan.yml
name: Secret scan
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 4 * * 1'   # semanal: detecta patrones nuevos sobre historial viejo

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0    # CRÍTICO: sin esto solo se clona el último commit
                            # y el escaneo del historial no ve nada

      - name: Run gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

El `fetch-depth: 0` es el error más común de esta configuración: por defecto
`actions/checkout` hace un clone superficial, así que el escaneo "del
historial completo" en realidad revisa un solo commit y siempre pasa.

**4. Reglas propias para secretos internos**

Gitleaks trae patrones para los proveedores conocidos, pero no puede saber
cómo se ven los tokens internos de una organización:

```toml
# .gitleaks.toml
[extend]
useDefault = true   # mantener las reglas incorporadas

[[rules]]
id = "miempresa-api-key"
description = "Clave interna de la API de MiEmpresa"
regex = '''miemp_(live|test)_[a-zA-Z0-9]{32}'''
tags = ["key", "miempresa"]

[[rules]]
id = "internal-jwt-secret"
description = "Secreto de firma JWT en configuración"
regex = '''(?i)jwt[_-]?secret['"]?\s*[:=]\s*['"][^'"]{16,}['"]'''

[allowlist]
description = "Rutas y valores que son falsos positivos conocidos"
paths = [
  '''(.*?)(test|spec|fixture)/.*''',
  '''docs/examples/.*''',
]
regexes = [
  '''EXAMPLE_KEY_DO_NOT_USE''',
]
```

**5. Complementar con `.gitignore` y ejemplos**

La prevención más barata es que el archivo con secretos nunca sea candidato
a commitearse:

```gitignore
.env
.env.*
!.env.example
*.pem
*.key
credentials.json
```

Y versionar un `.env.example` con las claves pero sin los valores, para que
quien clona sepa qué necesita configurar sin que nadie tenga que compartir
los valores reales por chat.

## Edge cases / errores comunes

- **Olvidar `fetch-depth: 0`**: el escaneo pasa siempre porque solo ve el último commit. Es un falso sentido de seguridad difícil de notar, porque el job aparece en verde.
- **Limpiar el historial sin rotar la credencial**: la credencial ya circuló; borrarla del repo no la invalida. Rotar siempre primero.
- **Falsos positivos que hacen ignorar el gate**: si el escaneo marca cada fixture de test, el equipo lo desactiva. Configurar la allowlist bien desde el principio es lo que mantiene el gate vivo.
- **Confiar solo en el hook local**: `git commit --no-verify` lo saltea, y quien clona el repo no lo tiene instalado hasta que corre `pre-commit install`. Por eso las dos capas.
- **Imprimir el secreto en los logs del error**: sin `--redact`, el secreto aparece en la salida del CI, que suele ser accesible a más gente que el repo. Un escaneo mal configurado puede filtrar más de lo que previene.
- **Escanear solo en PRs**: los commits directos a `main` (por permisos de admin o por un merge de bot) no pasan por PR. Conviene incluir el evento `push`.
- **Suponer que un repo privado es seguro**: los repos se hacen públicos, se transfieren y los forks quedan. Un secreto en un repo privado sigue siendo un secreto filtrado.

## Compatibilidad

Gitleaks corre en Linux, macOS y Windows, y hay imagen Docker para CI.
La action oficial de GitHub requiere licencia para organizaciones (no para
repos personales ni públicos); como alternativa se puede correr el binario
directamente en un step, sin la action. El framework `pre-commit` necesita
Python instalado; el hook a mano no tiene esa dependencia pero hay que
distribuirlo aparte, porque `.git/hooks/` no se versiona.

## Fuentes

- **gitleaks** (28.4k ⭐): su diferencial frente a escanear diffs a mano es que recorre el historial completo y combina detección por regex con análisis de entropía, lo que atrapa secretos que no siguen un formato conocido.
- **trivy** (37.1k ⭐): cubre la superficie complementaria — CVEs en dependencias, misconfiguraciones de IaC y secretos en imágenes de contenedor. Juntos cubren "qué se filtró" y "qué es vulnerable".
- **sops** (22.6k ⭐): resuelve el problema de raíz en vez de detectarlo: permite versionar secretos **cifrados** dentro del repo, de modo que el archivo esté ahí pero sea inútil sin la clave.
- **OWASP CheatSheetSeries** (32.7k ⭐): su hoja sobre gestión de secretos es el marco de por qué la rotación va antes que la limpieza del historial, y por qué el escaneo es detección y no prevención.

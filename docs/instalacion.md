# Instalación

## Requisitos

- **Claude Code** con soporte de mods (hooks modules), con el comando `claude`
  en el `PATH`.
- **Python 3.6 o superior**, solo la librería estándar. Debian/Ubuntu:
  `sudo apt install python3`; Fedora: `sudo dnf install python3`; macOS ya lo
  trae con las Command Line Tools.
- **Linux o macOS**. En Windows no está probado.

Los porcentajes del plan solo aparecen con un **plan de suscripción** de Claude.
Con una API key el panel muestra igualmente el consumo de tokens.

## Opción 1: desde Claude Code (recomendada)

En una sesión de Claude Code:

```
/plugin install token-usage --marketplace Sayoner-000/claude-token-usage
```

1. Responde `y` cuando pregunte si añade el marketplace
   `github:Sayoner-000/claude-token-usage`.
2. Elige el ámbito **user** para tenerlo en todos tus proyectos.
3. Escribe `/tokens`.

## Opción 2: desde la terminal

```sh
claude plugin marketplace add Sayoner-000/claude-token-usage
claude plugin install token-usage@token-usage-local --scope user
```

Abre una sesión nueva (o ejecuta `/reload-plugins` en una abierta) y escribe
`/tokens`.

## Opción 3: con el instalador incluido

Útil en máquinas sin acceso a GitHub desde Claude Code, o para llevar el mod en
un archivo.

```sh
git clone https://github.com/Sayoner-000/claude-token-usage.git
cd claude-token-usage
./install.sh
```

También funciona desde un `.tar.gz` del repositorio descomprimido en cualquier
carpeta.

El instalador:

1. Comprueba que existen `claude` y `python3` (o `python`).
2. Copia el mod a `~/.claude/mods/token-usage`, o a
   `$CLAUDE_CONFIG_DIR/mods/token-usage` si defines esa variable.
3. Ejecuta el agregador una vez para comprobar que funciona.
4. Registra esa carpeta como marketplace `token-usage-local` y lo instala en el
   ámbito de usuario.

## Comprobar la instalación

```sh
claude plugin list
```

Debe aparecer `token-usage@token-usage-local` con `Status: ✔ enabled`.

## Actualizar

- **Opciones 1 y 2**: `claude plugin marketplace update token-usage-local` y
  luego `claude plugin update token-usage@token-usage-local`. En una sesión
  abierta, `/reload-plugins`.
- **Opción 3**: `git pull` y vuelve a ejecutar `./install.sh`.

## Desinstalar

- **Opciones 1 y 2**:

  ```sh
  claude plugin uninstall token-usage@token-usage-local
  claude plugin marketplace remove token-usage-local
  ```

- **Opción 3**:

  ```sh
  ~/.claude/mods/token-usage/install.sh --uninstall
  ```

  Borra también la caché `~/.claude/token-usage-cache.json`.

## Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| El panel dice `error: python3 no encontrado` | Instala Python 3 y comprueba que `python3 --version` funciona en la misma terminal desde la que abres Claude Code. |
| "Sin lectura del plan todavía" | Los porcentajes llegan con la primera respuesta del modelo en la sesión. Si usas una API key en lugar de una suscripción, no existen. |
| `/tokens` aparece dos veces | Tienes dos copias cargadas (por ejemplo, una instalada y otra con `--plugin-dir`). Deja solo una. |
| No ves los cambios tras actualizar | Abre una sesión nueva o ejecuta `/reload-plugins`. |

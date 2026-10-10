# Desarrollo

## Estructura

```
.claude-plugin/
  plugin.json        manifiesto del mod
  marketplace.json   permite instalarlo desde este repositorio
hooks/
  hooks.json         declara el módulo de hooks
  register.tsx       el mod: comando /tokens, panel, línea de estado
  aggregate.py       suma los tokens de los historiales (Python 3, stdlib)
types/
  index.d.ts         contrato de tipos del estado del mod
tests/
  tokens.test.tsx    tests con el kit de Claude Code
install.sh           instalador para Linux y macOS
docs/                esta documentación
```

## El mod en breve

`register.tsx` registra cuatro hooks:

| Hook | Qué hace |
| --- | --- |
| `session.start` | Registra `/tokens`, lanza un refresco y programa uno cada 60 s. |
| `session.measure` | Guarda las ventanas del plan cuando cambian y actualiza la línea de estado. |
| `command.run` (`/tokens`) | Refresca, abre el panel y responde con un resumen. |
| `ui.render` (panel) | Dibuja el panel a partir del estado. |

El estado vive en tres valores (`summary`, `error`, `limits`) declarados en
`types/index.d.ts`. Al escribir uno, el panel se redibuja solo.

## Trabajar en el mod

Carga tu copia de trabajo en una sesión, sin instalarla:

```sh
claude --plugin-dir /ruta/a/claude-token-usage
```

Si también tienes el mod instalado, desinstálalo antes o verás `/tokens` dos
veces.

## Validar y probar

```sh
claude plugin validate .   # manifiesto, hooks y contrato de estado
claude plugin test .       # tests de tests/*.test.tsx
python3 hooks/aggregate.py --text
```

Los tests simulan `process.run`, `session.usage`, `ui.open` y el reloj, y
comprueban el comando y el panel en las superficies `terminal` y `desktop`.
Comprueban el árbol que dibuja el mod, **no cómo lo pinta la terminal**: para
cambios visuales, ábrelo en una sesión real y míralo. Una forma reproducible:

```sh
tmux new-session -d -s prueba -x 120 -y 50 'claude --plugin-dir .'
tmux send-keys -t prueba '/tokens' Enter
tmux capture-pane -e -p -t prueba    # -e conserva los colores
```

## Contribuir

1. Abre un issue describiendo el problema o la mejora.
2. Haz un fork y una rama: `feat/…`, `fix/…`, `docs/…`.
3. Usa [Conventional Commits](https://www.conventionalcommits.org/es/) en los
   mensajes.
4. Antes del pull request: `claude plugin validate .` y `claude plugin test .`
   sin errores. Añade un test para el comportamiento nuevo.
5. Añade tu cambio en la sección correspondiente de `CHANGELOG.md`.

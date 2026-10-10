#!/bin/sh
# Instalador del mod token-usage para Claude Code (Linux y macOS).
#
#   ./install.sh              instala o actualiza
#   ./install.sh --uninstall  desinstala
#
# Copia el mod a $CLAUDE_CONFIG_DIR/mods/token-usage (por defecto ~/.claude),
# lo registra como marketplace local y lo instala en el ámbito de usuario,
# así queda activo en todas las sesiones y proyectos.
set -eu

PLUGIN=token-usage
MARKET=token-usage-local
SRC=$(cd "$(dirname "$0")" && pwd)
CONFIG=${CLAUDE_CONFIG_DIR:-$HOME/.claude}
DEST=$CONFIG/mods/$PLUGIN

say() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

command -v claude >/dev/null 2>&1 || die "no se encontró 'claude' en el PATH"

if [ "${1:-}" = "--uninstall" ]; then
  claude plugin uninstall "$PLUGIN@$MARKET" >/dev/null 2>&1 || true
  claude plugin marketplace remove "$MARKET" >/dev/null 2>&1 || true
  rm -rf "$DEST"
  rm -f "$CONFIG/token-usage-cache.json"
  say "token-usage desinstalado."
  exit 0
fi

if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  die "el mod necesita python3 (solo librería estándar). Instálalo, p. ej. 'sudo apt install python3'"
fi

say "Copiando el mod a $DEST"
if [ "$SRC" != "$DEST" ]; then
  rm -rf "$DEST"
  mkdir -p "$DEST"
  cp -R "$SRC/.claude-plugin" "$SRC/hooks" "$SRC/types" "$DEST/"
  [ -d "$SRC/tests" ] && cp -R "$SRC/tests" "$DEST/"
  cp "$SRC/install.sh" "$SRC/README.md" "$DEST/" 2>/dev/null || true
  rm -rf "$DEST/.claude-plugin/types"
fi

say "Probando el agregador con $PY"
"$PY" "$DEST/hooks/aggregate.py" >/dev/null || die "aggregate.py falló; revisa la salida de arriba"

if claude plugin marketplace list 2>/dev/null | grep -q "$MARKET"; then
  claude plugin marketplace update "$MARKET" >/dev/null 2>&1 || true
else
  claude plugin marketplace add "$DEST" --scope user
fi

if claude plugin list 2>/dev/null | grep -q "$PLUGIN@$MARKET"; then
  claude plugin update "$PLUGIN@$MARKET" --scope user || true
else
  claude plugin install "$PLUGIN@$MARKET" --scope user
fi

say ""
say "Listo. En una sesión nueva de Claude Code escribe /tokens para abrir el panel;"
say "muestra el uso del plan (sesión y semana) y los tokens de todos los proyectos."
say "En una sesión ya abierta: /reload-plugins."
say "Desde la terminal: $PY $DEST/hooks/aggregate.py --text"

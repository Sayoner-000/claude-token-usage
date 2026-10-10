# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/) y el
proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

## [v0.3.0] - 2026-10-09

Primera versión publicada.

### Added
- Diseño del panel inspirado en el dashboard de ejemplo de
  [Glyph](https://github.com/semos-labs/glyph): paleta oscura sobria, tarjetas
  sin bordes con franja de acento del color del estado, barras sólidas y
  puntos de estado `●` `◑` `○`.
- Cabecera con el estado general y barra de cifras (hoy, 7 días, total,
  salida de hoy).
- Cada ventana del plan muestra cuándo se agota si el ritmo actual no llega al
  reinicio.

### Changed
- Una ventana que se agotará antes de su reinicio se marca en ámbar aunque su
  porcentaje sea bajo.
- La cabecera y la barra de cifras se adaptan a paneles estrechos: las cifras
  saltan de línea completas, nunca a la mitad.

### Fixed
- La franja de acento cubre también las líneas que se parten por ancho.

## [v0.2.0] - 2026-10-09

### Added
- Uso del plan: barras de *Sesión actual* (5 h) y *Esta semana* (7 días) con
  su porcentaje y la hora de reinicio, leídos de Claude Code.
- Proyección: aviso "A este ritmo, se te agotará…" cuando el ritmo actual
  llega al 100 % antes del reinicio.
- La línea de estado muestra `sesión X% · semana Y% · hoy Z`.

### Fixed
- Sin falsas alarmas al empezar una ventana: no se proyecta durante su primer
  10 %.

## [v0.1.0] - 2026-10-09

### Added
- Panel `/tokens` con el consumo de tokens de todos los proyectos y sesiones:
  hoy, últimos 7 días y total, por proyecto y por modelo.
- Agregador `hooks/aggregate.py` (Python 3, solo librería estándar) con caché
  por archivo, que deduplica los mensajes repetidos en los historiales.
- Instalador `install.sh` para Linux y macOS, con `--uninstall`.

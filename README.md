# token-usage

[![Version](https://img.shields.io/badge/version-0.3.0-blue)](https://github.com/Sayoner-000/claude-token-usage/releases/tag/v0.3.0)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Claude Code mod](https://img.shields.io/badge/Claude%20Code-mod-d97757)](https://claude.com/claude-code)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS-lightgrey)](docs/instalacion.md)
[![Python](https://img.shields.io/badge/python-3.6%2B-3776ab)](https://www.python.org/)

Mod de [Claude Code](https://claude.com/claude-code) que muestra el **uso de tu
plan** (sesión actual y semana, con una proyección de cuándo se agotará) y el
**consumo de tokens de todos tus proyectos y sesiones**, en un panel dentro de
la terminal y en la línea de estado.

```
◆ tokens                            ◑ 63 sesiones · 23:06
hoy 30.3M   7 días 449.4M   total 2.7B   salida hoy 138.5k

▌ ▲ Atención. A este ritmo, se te agotará domingo por la
▌   noche, antes del reinicio del miércoles.

▌ Sesión actual                                        14% ●
▌ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
▌ se restablece mañana, 3:40 a.m.

▌ Esta semana                                          53% ◑
▌ ██████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░
▌ se restablece el miércoles, 5:00 p.m. · se agota domingo por la noche

▌ proyectos
▌ …ore_ia/kolmena-core-ia  ██████████████████░░░░░   1.6B  60%
▌ rcw/gomemory             ███████░░░░░░░░░░░░░░░░ 578.7M  22%
```

## Qué hace

- **`/tokens`** abre el panel:
  - **Uso del plan**: *Sesión actual* (ventana de 5 h) y *Esta semana*
    (7 días), con porcentaje, barra y hora de reinicio.
  - **Proyección**: avisa si al ritmo actual llegarás al 100 % antes del
    reinicio, y cuándo.
  - **Tokens de todos los proyectos**: hoy, últimos 7 días y total, con la
    parte de cada proyecto y de cada modelo.
- **Línea de estado**: `sesión 14% · semana 53% · hoy 30.3M`.
- Se actualiza solo: el plan con cada respuesta del modelo y los tokens cada
  60 s.

## Instalación rápida

Requisitos: Claude Code con soporte de mods, `python3` (3.6+), Linux o macOS.

Desde una sesión de Claude Code:

```
/plugin install token-usage --marketplace Sayoner-000/claude-token-usage
```

Responde `y` para añadir el marketplace y elige el ámbito de usuario. Después
escribe `/tokens`.

Otras formas de instalarlo (desde la terminal o con el instalador incluido) en
[docs/instalacion.md](docs/instalacion.md).

## Documentación

| Documento | Contenido |
| --- | --- |
| [Instalación](docs/instalacion.md) | Requisitos, tres formas de instalar, actualizar y desinstalar |
| [Uso](docs/uso.md) | El panel, la línea de estado, colores, refresco y uso sin Claude Code |
| [Cómo funciona](docs/como-funciona.md) | De dónde salen los datos, la proyección y sus límites |
| [Desarrollo](docs/desarrollo.md) | Estructura del código, tests y cómo contribuir |
| [Changelog](CHANGELOG.md) | Historial de versiones |

## Privacidad

Todo se calcula en tu máquina. El mod lee los historiales locales de Claude
Code (`~/.claude/projects`) y los porcentajes que Claude Code ya recibe en cada
respuesta. No envía nada a ningún servicio.

## Créditos

El diseño del panel está inspirado en el dashboard de ejemplo de
[Glyph](https://github.com/semos-labs/glyph), de Semos Labs.

## Licencia

[MIT](LICENSE)

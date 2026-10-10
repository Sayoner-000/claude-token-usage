# Uso

## El panel `/tokens`

Escribe `/tokens` en Claude Code. Se abre un panel junto a la conversación y
el comando responde con un resumen de una línea:

```
token-usage: Sesión actual 16% · Esta semana 54%. Tokens: hoy 31.8M · 7 días 450.8M · total 2.7B.
```

El panel tiene, de arriba abajo:

### Cabecera

```
◆ tokens                            ◑ 63 sesiones · 23:06
hoy 30.3M   7 días 449.4M   total 2.7B   salida hoy 138.5k
```

- El punto indica el estado general del plan (ver *Colores*).
- `63 sesiones` son los historiales que hay en disco; `23:06` es la hora del
  último cálculo.
- Las cifras suman todos los tokens: entrada, salida, escritura y lectura de
  caché. `salida hoy` son solo los tokens generados por el modelo hoy.

### Aviso

Una frase sobre el ritmo de uso:

- `▲ Atención. A este ritmo, se te agotará domingo por la noche, antes del
  reinicio del miércoles.` cuando llegarás al 100 % antes del reinicio.
- `● Vas bien. A este ritmo no llegarás al límite antes del reinicio.` cuando no.
- `Límite alcanzado (…)` cuando una ventana ya está al 100 %.

### Ventanas del plan

Una tarjeta por ventana: *Sesión actual* (5 horas), *Esta semana* (7 días) y,
si tu plan los tiene, límites semanales por modelo o de gasto.

```
▌ Esta semana                                          53% ◑
▌ ██████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░
▌ se restablece el miércoles, 5:00 p.m. · se agota domingo por la noche
```

### Proyectos y modelos

La parte de cada proyecto y de cada modelo sobre el total de tokens. Un
proyecto es la carpeta donde arrancaste la sesión de Claude Code. Si no caben
todos, el panel indica cuántos quedan fuera.

## Colores

| Color | Punto | Significado |
| --- | --- | --- |
| Verde | `●` | Por debajo del 75 % y al ritmo actual llegas al reinicio. |
| Ámbar | `◑` | Desde el 75 %, o se agotará antes del reinicio. Si se agota en menos de 6 h, el aviso sale en rojo. |
| Rojo | `○` | Desde el 90 %, o límite alcanzado. |

## Línea de estado

Debajo del prompt:

```
token-usage: sesión 14% · semana 53% · hoy 30.3M
```

## Cada cuánto se actualiza

| Dato | Cuándo |
| --- | --- |
| % del plan | Al terminar cada respuesta del modelo y cuando una ventana sube un punto entero. |
| Tokens de todos los proyectos | Cada 60 segundos y al ejecutar `/tokens`. |
| Panel y línea de estado | Se redibujan solos con cada cambio. |

El porcentaje del plan es el de la **última respuesta que recibió esta
sesión**. Si gastas en otra sesión o en claude.ai, aquí se refleja con la
siguiente respuesta.

## Sin Claude Code

El agregador funciona solo, desde cualquier terminal:

```sh
python3 ~/.claude/mods/token-usage/hooks/aggregate.py --text   # tabla legible
python3 ~/.claude/mods/token-usage/hooks/aggregate.py          # JSON
```

Esto da los tokens, no los porcentajes del plan, que solo conoce Claude Code.

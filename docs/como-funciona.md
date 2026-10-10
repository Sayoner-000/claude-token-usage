# Cómo funciona

El mod combina dos fuentes de datos que no tienen nada que ver entre sí.

## 1. Uso del plan: lo da Claude Code

Los porcentajes de *Sesión actual* y *Esta semana* son los límites de tu plan
de suscripción. **No están en ningún archivo local**: los envía la API de
Anthropic en cada respuesta y Claude Code se los pasa a los mods.

El mod los recibe de dos formas:

- `$.session.usage()`, al iniciar la sesión, cada 60 s y al ejecutar
  `/tokens`. Devuelve la **última** lectura que tiene Claude Code, no consulta
  al servidor.
- El evento `session.measure`, que Claude Code dispara al terminar cada
  respuesta y cuando una ventana sube un punto entero.

Cada ventana trae `kind` (`five_hour`, `seven_day`, `spend_limit`…),
`percentUsed` y `resetsAt`.

### La proyección

Para cada ventana de duración conocida (5 h o 7 días):

```
inicio    = resetsAt − duración de la ventana
ritmo     = percentUsed / (ahora − inicio)
se agota  = ahora + (100 − percentUsed) / ritmo
```

Si `se agota` cae antes de `resetsAt`, el panel avisa. Es una extrapolación
lineal: supone que seguirás al mismo ritmo medio que llevas desde que empezó
la ventana.

Durante el **primer 10 %** de cada ventana (30 min de la sesión, unas 17 h de
la semana) no se proyecta. Con tan poco tiempo, unos minutos de uso intenso
darían una alarma falsa.

### Hora local

Las horas de reinicio se muestran en la zona horaria de tu máquina. El entorno
donde corre el mod no siempre conoce esa zona, así que el mod toma el desfase
horario que le pasa el agregador de Python, que sí lo conoce.

## 2. Tokens: los historiales locales

Claude Code guarda cada sesión en un archivo JSONL en
`~/.claude/projects/<proyecto>/<sesión>.jsonl`, incluidas las de subagentes.
Cada respuesta del modelo lleva su `usage`: tokens de entrada, de salida, de
escritura en caché y de lectura de caché.

`hooks/aggregate.py` recorre todos esos archivos y suma:

- **Deduplicación**: la misma respuesta aparece varias veces en un historial
  (una por bloque de contenido) y se repite al reanudar sesiones. Se cuenta una
  vez por `message.id` + `requestId`.
- **Proyecto**: el primer `cwd` del archivo, es decir, la carpeta donde
  arrancó la sesión. Así un proyecto no se parte en sus subcarpetas.
- **Caché**: guarda el resultado de cada archivo en
  `~/.claude/token-usage-cache.json`, con su tamaño y fecha de modificación.
  Solo vuelve a leer los archivos que cambiaron: unos 0,6 s la primera vez y
  0,1 s después, con unos 230 MB de historiales.

### Por qué un script de Python

El mod corre en un entorno aislado que solo puede leer archivos de hasta 4 MiB,
y muchos historiales son más grandes. El mod ejecuta el script con
`$.process.run` y lee su salida JSON.

## Límites conocidos

- **"Total" no es todo tu historial**: Claude Code borra los historiales
  antiguos (`cleanupPeriodDays` en sus ajustes). El total cubre lo que sigue en
  disco.
- **Una máquina**: cada equipo tiene sus propios historiales. El mod no suma
  lo que gastes en otros equipos ni en claude.ai, aunque los porcentajes del
  plan sí lo incluyen, porque los calcula Anthropic.
- **El porcentaje se actualiza con las respuestas de esta sesión.** Si esta
  sesión está inactiva, muestra la última lectura que recibió.

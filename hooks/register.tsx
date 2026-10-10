import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Bucket, Limit, NamedBucket, Summary } from '../types'

const PANE = 'token-usage'
const REFRESH_MS = 60_000
const HOUR = 3_600_000
const DAY = 24 * HOUR

const summary = atom({ plugin: 'token-usage', key: 'summary' } as const, null)
const error = atom({ plugin: 'token-usage', key: 'error' } as const, null)
const limits = atom({ plugin: 'token-usage', key: 'limits' } as const, [])

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const human = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return String(n)
}

const sum = (b: Bucket) => b.input + b.output + b.cache_create + b.cache_read

// --- plan windows -----------------------------------------------------------

const windowMs = (kind: string) =>
  kind.startsWith('five_hour') ? 5 * HOUR : kind.startsWith('seven_day') ? 7 * DAY : undefined

const windowLabel = (kind: string) => {
  if (kind === 'five_hour') return 'Sesión actual'
  if (kind === 'seven_day') return 'Esta semana'
  if (kind.startsWith('seven_day_')) return `Esta semana (${kind.slice(10)})`
  if (kind === 'spend_limit') return 'Límite de gasto'
  return kind
}

const shortLabel = (kind: string) =>
  kind === 'five_hour' ? 'sesión' : kind === 'seven_day' ? 'semana' : windowLabel(kind).toLowerCase()

// Calm dark palette after Glyph's showcase (semos-labs/glyph): muted surfaces
// and text, vivid color only where a status is told.
const C = {
  surface: '#1c1c1c',
  track: '#3c3c3c',
  text: '#b3b3b3',
  dim: '#808080',
  muted: '#555555',
  ok: '#22c55e',
  warn: '#f59e0b',
  bad: '#ef4444',
} as const

type Level = 'ok' | 'warn' | 'bad'

const DOT: Record<Level, string> = { ok: '●', warn: '◑', bad: '○' }

const levelOf = (percent: number): Level => (percent >= 90 ? 'bad' : percent >= 75 ? 'warn' : 'ok')

// When the window runs out at the current pace, if that comes before it resets.
// No forecast in the window's first tenth: a few minutes of use would extrapolate wildly.
const exhaustsAt = (limit: Limit, now: number) => {
  const length = windowMs(limit.kind)
  if (!limit.resetsAt || !length || limit.percentUsed <= 0) return undefined
  const reset = Date.parse(limit.resetsAt)
  const elapsed = now - (reset - length)
  if (Number.isNaN(reset) || elapsed < length * 0.1) return undefined
  if (limit.percentUsed >= 100) return now
  const eta = now + ((100 - limit.percentUsed) * elapsed) / limit.percentUsed

  return eta < reset ? eta : undefined
}

// --- dates in the host's time zone ------------------------------------------

// The aggregator stamps generatedAt with the host's UTC offset ("-05:00");
// the module's own environment may not know the host's zone.
const offsetOf = (data: Summary | null) => {
  const match = data?.generatedAt.match(/([+-])(\d\d):(\d\d)$/)
  if (!match) return -new Date().getTimezoneOffset()

  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
}

const local = (ms: number, offset: number) => new Date(ms + offset * 60_000)

const clock = (d: Date) => {
  const h = d.getUTCHours()

  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

const dayWord = (target: number, now: number, offset: number) => {
  const days = Math.round(
    (Date.UTC(...ymd(local(target, offset))) - Date.UTC(...ymd(local(now, offset)))) / DAY,
  )
  if (days === 0) return 'hoy'
  if (days === 1) return 'mañana'

  return `el ${DAYS[local(target, offset).getUTCDay()]}`
}

const ymd = (d: Date): [number, number, number] => [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]

const partOfDay = (d: Date) => {
  const h = d.getUTCHours()
  if (h < 6) return 'de madrugada'
  if (h < 12) return 'por la mañana'
  if (h < 19) return 'por la tarde'

  return 'por la noche'
}

// "hoy a las 3:40 p.m." within a day; "el domingo por la noche" past that.
const when = (target: number, now: number, offset: number) => {
  const d = local(target, offset)
  const day = dayWord(target, now, offset)
  if (target - now < DAY) return `${day} a las ${clock(d)}`

  return `${day.replace(/^el /, '')} ${partOfDay(d)}`
}

const resetText = (limit: Limit, now: number, offset: number) => {
  if (!limit.resetsAt) return ''
  const reset = Date.parse(limit.resetsAt)

  return `Se restablece ${dayWord(reset, now, offset)}, ${clock(local(reset, offset))}`
}

const forecast = (list: Limit[], now: number, offset: number) => {
  const full = list.find(l => l.percentUsed >= 100)
  if (full) {
    const reset = full.resetsAt ? Date.parse(full.resetsAt) : undefined
    return {
      level: 'bad' as Level,
      text: `Límite alcanzado (${windowLabel(full.kind).toLowerCase()})${reset ? `. Se restablece ${when(reset, now, offset)}.` : '.'}`,
    }
  }
  const soonest = list
    .map(l => ({ l, eta: exhaustsAt(l, now) }))
    .filter((x): x is { l: Limit; eta: number } => x.eta !== undefined)
    .sort((a, b) => a.eta - b.eta)[0]
  if (soonest) {
    const reset = Date.parse(soonest.l.resetsAt as string)
    const resetDay = dayWord(reset, now, offset).replace(/^el /, 'del ')
    return {
      level: (soonest.eta - now < 6 * HOUR ? 'bad' : 'warn') as Level,
      text: `Atención. A este ritmo, se te agotará ${when(soonest.eta, now, offset)}, antes del reinicio ${resetDay === 'hoy' || resetDay === 'mañana' ? `de ${resetDay}` : resetDay}.`,
    }
  }

  return { level: 'ok' as Level, text: 'Vas bien. A este ritmo no llegarás al límite antes del reinicio.' }
}

// --- data -------------------------------------------------------------------

const setStatus = async ($: EngineInterface) => {
  const data = await read($, summary)
  const list = await read($, limits)
  const parts = list
    .filter(l => l.kind === 'five_hour' || l.kind === 'seven_day')
    .map(l => `${shortLabel(l.kind)} ${Math.round(l.percentUsed)}%`)
  if (data) parts.push(`hoy ${human(sum(data.today))}`)
  $.ui.status(parts.length ? parts.join(' · ') : undefined)
}

const storeLimits = async ($: EngineInterface, list: readonly Limit[]) => {
  await update($, limits, () =>
    list.map(({ kind, percentUsed, resetsAt }) => (resetsAt ? { kind, percentUsed, resetsAt } : { kind, percentUsed })),
  )
}

// Reads the plan windows from the engine and runs the bundled aggregator
// (python3, falling back to python) for the token totals.
const refresh = async ($: EngineInterface) => {
  try {
    await storeLimits($, (await $.session.usage()).rateLimits)
  } catch {
    // keep the last reading
  }

  const script = `${$.plugin.root}/hooks/aggregate.py`
  let failure = 'python3 no encontrado'
  for (const python of ['python3', 'python']) {
    try {
      const { exitCode, stdout, stderr } = await $.process.run([python, script], { timeoutMs: 120_000 })
      if (exitCode !== 0) {
        failure = stderr.trim().split('\n').pop() || `${python} salió con ${exitCode}`
        continue
      }
      const data = JSON.parse(stdout) as Summary
      await update($, summary, () => data)
      await update($, error, () => null)
      await setStatus($)

      return
    } catch (err) {
      failure = err instanceof Error ? err.message : String(err)
    }
  }
  await update($, error, () => failure)
  await setStatus($)
}

// --- module -----------------------------------------------------------------

export const register: Register = on => {
  let stop: (() => void) | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tokens',
      description: 'Uso del plan y consumo global de tokens de todos los proyectos',
    })
    stop?.()
    stop = $.clock.every(REFRESH_MS, () => void refresh($))
    void refresh($)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await storeLimits($, e.rateLimits)
      await setStatus($)
    }

    return next(e)
  })

  on('command.run', { command: 'tokens' }, async $ => {
    await refresh($)
    await $.ui.open({ id: PANE, title: 'Uso · todos los proyectos' })
    const data = await read($, summary)
    const list = await read($, limits)
    const plan = list.map(l => `${windowLabel(l.kind)} ${l.percentUsed}%`).join(' · ')
    const tokens = data
      ? `Tokens: hoy ${human(sum(data.today))} · 7 días ${human(sum(data.week))} · total ${human(sum(data.total))}.`
      : `No se pudo leer el consumo: ${(await read($, error)) ?? 'sin datos'}`

    return { text: plan ? `${plan}. ${tokens}` : tokens }
  })


  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const data = await read($, summary)
    const problem = await read($, error)
    const list = await read($, limits)
    const now = await $.clock.now()
    const offset = offsetOf(data)

    const cols = Math.max(40, e.props.bodyColumns || e.viewport?.columns || 80)
    const rows = e.viewport?.rows ?? 30
    const inner = cols - 3 // accent stripe + one column of padding each side

    // A solid track as Glyph's Progress draws it: filled cells on a gray track.
    const bar = (percent: number, width: number, color: string) => {
      const filled = Math.min(width, Math.max(percent > 0 ? 1 : 0, Math.round((percent / 100) * width)))
      return (
        <Text>
          <Text backgroundColor={color}>{' '.repeat(filled)}</Text>
          <Text backgroundColor={C.track}>{' '.repeat(width - filled)}</Text>
        </Text>
      )
    }

    // A borderless card on the surface, its left stripe in the status color
    // stretched to the card's full height, wrapped lines included.
    const card = (accent: string, lines: JSX.Element[]) => (
      <Box flexDirection="row" backgroundColor={C.surface}>
        <Box width={1} flexShrink={0} backgroundColor={accent} />
        <Box flexDirection="column" paddingX={1} flexGrow={1} flexShrink={1}>
          {lines}
        </Box>
      </Box>
    )

    const spread = (left: JSX.Element, right: JSX.Element) => (
      <Box flexDirection="row" justifyContent="space-between">
        {left}
        {right}
      </Box>
    )

    const meter = (limit: Limit) => {
      const eta = exhaustsAt(limit, now)
      // A window that runs out before it resets is at least a warning, whatever its percent.
      const level: Level = eta !== undefined && levelOf(limit.percentUsed) === 'ok' ? 'warn' : levelOf(limit.percentUsed)
      return card(C[level], [
        spread(
          <Text bold color={C.text}>{windowLabel(limit.kind)}</Text>,
          <Text>
            <Text bold color={C.text}>{`${limit.percentUsed}%`}</Text>
            <Text color={C[level]}>{` ${DOT[level]}`}</Text>
          </Text>,
        ),
        bar(limit.percentUsed, inner, C[level]),
        <Text>
          <Text color={C.muted}>{resetText(limit, now, offset).toLowerCase()}</Text>
          {eta !== undefined && <Text color={C.warn}>{` · se agota ${when(eta, now, offset)}`}</Text>}
        </Text>,
      ])
    }

    const stat = (label: string, value: string) => (
      <Box flexShrink={0}>
        <Text wrap="truncate">
          <Text color={C.muted}>{`${label} `}</Text>
          <Text bold color={C.text}>{value}</Text>
        </Text>
      </Box>
    )

    const panel = (title: string, items: NamedBucket[], total: number, extra?: string) => {
      const nameW = Math.min(34, Math.max(12, Math.floor(inner * 0.4)))
      const shareW = Math.max(6, inner - nameW - 14)
      return card(C.muted, [
        <Text bold color={C.text}>{title}</Text>,
        ...items.map(b => {
          const share = total ? (sum(b) / total) * 100 : 0
          return (
            <Box flexDirection="row">
              <Box width={nameW}>
                <Text color={C.dim} wrap="truncate-start">
                  {b.name.replace(/^.*[\\/](?=[^\\/]+[\\/][^\\/]+$)/, '')}
                </Text>
              </Box>
              <Box marginLeft={1}>{bar(share, shareW, C.text)}</Box>
              <Text>
                <Text color={C.text}>{human(sum(b)).padStart(7)}</Text>
                <Text color={C.muted}>{`${Math.round(share)}%`.padStart(5)}</Text>
              </Text>
            </Box>
          )
        }),
        ...(extra ? [<Text color={C.muted}>{extra}</Text>] : []),
      ])
    }

    const head = list.length ? forecast(list, now, offset) : undefined
    const status: Level = head?.level ?? 'ok'
    const used = 6 + list.length * 4 + (head ? 2 : 0) + (data ? 6 + data.models.length : 0)
    const room = Math.max(1, rows - used)
    const shown = data ? data.projects.slice(0, room) : []

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Box flexDirection="row" justifyContent="space-between" backgroundColor={C.surface} paddingX={2}>
            <Text wrap="truncate">
              <Text bold color={C.text}>◆ tokens</Text>
              {cols >= 90 && <Text color={C.muted}> · uso del plan y de todos los proyectos</Text>}
            </Text>
            <Text color={C.dim} wrap="truncate">
              <Text color={C[status]}>{DOT[status]}</Text>
              {data ? ` ${data.sessions} sesiones · ${data.generatedAt.slice(11, 16)}` : ' calculando…'}
            </Text>
          </Box>
          {data && (
            <Box flexDirection="row" flexWrap="wrap" columnGap={3} backgroundColor={C.surface} paddingX={2}>
              {stat('hoy', human(sum(data.today)))}
              {stat('7 días', human(sum(data.week)))}
              {stat('total', human(sum(data.total)))}
              {stat('salida hoy', human(data.today.output))}
            </Box>
          )}
        </Box>

        {head
          ? card(C[head.level], [
              <Text bold color={head.level === 'ok' ? C.text : C[head.level]}>
                {`${head.level === 'ok' ? '●' : '▲'} ${head.text}`}
              </Text>,
            ])
          : card(C.muted, [
              <Text color={C.dim}>
                Sin lectura del plan todavía: llega con la próxima respuesta del modelo (solo en planes de suscripción).
              </Text>,
            ])}

        {list.map(meter)}

        {problem && card(C.bad, [<Text color={C.bad}>{`error: ${problem}`}</Text>])}

        {data &&
          panel(
            'proyectos',
            shown,
            sum(data.total),
            data.projects.length > shown.length ? `… y ${data.projects.length - shown.length} más` : undefined,
          )}
        {data && panel('modelos', data.models, sum(data.total))}

        <Text color={C.muted}>/tokens para refrescar · se actualiza cada minuto</Text>
      </Box>
    )
  })
}

import { expect, mock, test } from 'claude-code/testing'

const HOUR = 3_600_000
const DAY = 24 * HOUR

const bucket = (n: number) => ({ input: n, output: n, cache_create: n, cache_read: n, messages: 1 })
const SUMMARY = {
  generatedAt: '2026-10-09T22:00:00-05:00',
  configDir: '/home/me/.claude',
  sessions: 3,
  total: bucket(1_000_000),
  today: bucket(1_000),
  week: bucket(10_000),
  projects: [{ name: '/home/me/work/alpha', ...bucket(600_000) }],
  models: [{ name: 'claude-opus-5-5', ...bucket(1_000_000) }],
}

const PROCESS = {
  value: {
    exitCode: 0,
    stdout: JSON.stringify(SUMMARY),
    stderr: '',
    isStdoutTruncated: false,
    isStderrTruncated: false,
  },
}

const usage = (rateLimits: unknown[]) => ({
  value: { startedAt: 0, context: {}, rateLimits } as never,
})

const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0], surface: 'terminal' | 'desktop') =>
  $.ui.mount({
    plugin: 'token-usage',
    surface,
    component: 'Pane',
    requestId: 'token-usage',
    viewport: { columns: 100, rows: 40 } as never,
    props: { title: 'Uso', isFocused: false, bodyColumns: 100 } as never,
  })

test('the pane warns when the week runs out before it resets', async ($, on) => {
  const now = mock.clock(on).now()
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => PROCESS)
  // 53% used three days into the week: at that pace it runs out before day 7.
  on('session.usage', () =>
    usage([
      { kind: 'five_hour', percentUsed: 8, resetsAt: new Date(now + HOUR).toISOString() },
      { kind: 'seven_day', percentUsed: 53, resetsAt: new Date(now + 4 * DAY).toISOString() },
    ]),
  )

  const { text } = await $.command.run({ command: 'tokens' })
  expect(text).toBe(
    'Sesión actual 8% · Esta semana 53%. Tokens: hoy 4.0k · 7 días 40.0k · total 4.0M.',
  )

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    expect(await ui.find({ type: 'Text', text: /^▲ Atención\. A este ritmo, se te agotará .+, antes del reinicio del / })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '53%' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '8%' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /work\/alpha/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /claude-opus-5-5/ })).toBeDefined()
    await ui.unmount()
  }
})

test('the pane says all is well when the pace fits the window', async ($, on) => {
  const now = mock.clock(on).now()
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => PROCESS)
  on('session.usage', () =>
    usage([{ kind: 'seven_day', percentUsed: 20, resetsAt: new Date(now + DAY).toISOString() }]),
  )

  await $.command.run({ command: 'tokens' })
  const ui = await mountPane($, 'terminal')
  expect(await ui.find({ type: 'Text', text: /^● Vas bien\./ })).toBeDefined()
  await ui.unmount()
})

test('no alarm in the first minutes of a window', async ($, on) => {
  const now = mock.clock(on).now()
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => PROCESS)
  // 3% five minutes into the session would extrapolate to running out within the hour.
  on('session.usage', () =>
    usage([{ kind: 'five_hour', percentUsed: 3, resetsAt: new Date(now + 5 * HOUR - 5 * 60_000).toISOString() }]),
  )

  await $.command.run({ command: 'tokens' })
  const ui = await mountPane($, 'terminal')
  expect(await ui.find({ type: 'Text', text: /^● Vas bien\./ })).toBeDefined()
  await ui.unmount()
})

test('the command reports the error when python is missing', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.usage', () => usage([]))
  on('process.run', () => ({ deny: 'spawn python3 ENOENT' }))

  const { text } = await $.command.run({ command: 'tokens' })
  expect(text).toMatch(/No se pudo leer el consumo/)
})

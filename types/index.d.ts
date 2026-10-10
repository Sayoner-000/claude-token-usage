export type Bucket = {
  input: number
  output: number
  cache_create: number
  cache_read: number
  messages: number
}

export type NamedBucket = Bucket & { name: string }

export type Summary = {
  generatedAt: string
  configDir: string
  sessions: number
  total: Bucket
  today: Bucket
  week: Bucket
  projects: NamedBucket[]
  models: NamedBucket[]
}

/** One plan window as the engine reports it: five_hour, seven_day or spend_limit. */
export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'token-usage': { summary: Summary | null; error: string | null; limits: Limit[] }
  }
}

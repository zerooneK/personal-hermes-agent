import { describe, expect, it } from 'vitest'

import type { UsageStats } from '@/types/hermes'

import { contextGauge, contextMeterTone } from './context-meter'

const streamed: UsageStats = {
  calls: 3,
  context_max: 128_000,
  context_percent: 10,
  context_used: 12_800,
  input: 0,
  output: 0,
  total: 0
}

describe('contextGauge', () => {
  it('uses the breakdown when it knows the window', () => {
    const gauge = contextGauge(
      { context_estimated: true, context_max: 200_000, context_percent: 25, context_used: 50_000 },
      streamed
    )

    expect(gauge).toMatchObject({ context_estimated: true, context_max: 200_000, context_used: 50_000, calls: 3 })
  })

  it('keeps the streamed reading mid-turn or when the breakdown has no window', () => {
    expect(contextGauge(null, streamed)).toBe(streamed)
    expect(contextGauge({ context_max: 0, context_percent: 0, context_used: 0 }, streamed)).toBe(streamed)
  })
})

describe('contextMeterTone', () => {
  it('warns ahead of compression and flags a nearly full window', () => {
    expect(contextMeterTone(59)).toBe('normal')
    expect(contextMeterTone(60)).toBe('warn')
    expect(contextMeterTone(80)).toBe('danger')
  })
})

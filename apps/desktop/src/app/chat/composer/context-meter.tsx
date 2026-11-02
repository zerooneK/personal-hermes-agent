import { compactNumber } from '@hermes/shared'
import { useStore } from '@nanostores/react'
import { atom } from 'nanostores'
import { useMemo, useState } from 'react'

import { EMPTY_SESSION_USAGE, useSessionView } from '@/app/chat/session-view'
import type { GatewayRequester } from '@/app/contrib/types'
import { ContextUsagePanel } from '@/app/shell/context-usage-panel'
import { useContextBreakdown } from '@/app/shell/hooks/use-context-breakdown'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { releaseTypingFocus } from '@/components/ui/keyboard-first'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import type { UsageStats } from '@/types/hermes'

const NO_USAGE = atom<UsageStats>(EMPTY_SESSION_USAGE)

// Compression fires well before the window fills (Hermes defaults to 75% on
// sub-512K windows), so the meter warns ahead of it rather than at the wall.
const WARN_PERCENT = 60
const DANGER_PERCENT = 80

const RING_RADIUS = 6
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/** The breakdown wins whenever it knows the window: it is keyed to this
 *  session and reports measured occupancy once the backend has it, falling
 *  back to the estimate before the first turn. Mid-turn the breakdown hook
 *  returns null and the streamed usage carries the reading — the same
 *  precedence the statusbar's context item uses. */
export function contextGauge(
  breakdown: Pick<UsageStats, 'context_estimated' | 'context_max' | 'context_percent' | 'context_used'> | null,
  usage: UsageStats
): UsageStats {
  if (!breakdown || !(breakdown.context_max && breakdown.context_max > 0)) {
    return usage
  }

  return {
    ...usage,
    context_estimated: breakdown.context_estimated,
    context_max: breakdown.context_max,
    context_percent: breakdown.context_percent,
    context_used: breakdown.context_used
  }
}

export function contextMeterTone(percent: number): 'danger' | 'normal' | 'warn' {
  if (percent >= DANGER_PERCENT) {
    return 'danger'
  }

  return percent >= WARN_PERCENT ? 'warn' : 'normal'
}

const TONE_CLASS = {
  danger: 'text-(--ui-danger,#f87171)',
  normal: 'text-(--ui-text-tertiary)',
  warn: 'text-amber-500'
} as const

/**
 * How full this session's context window is, beside the model it applies to:
 * a ring plus a percentage, always on screen, opening the per-category
 * breakdown on click. Reads this surface's SessionView so side-by-side panes
 * each show their own session. A session whose window the backend does not
 * know yet (no resident agent until its first turn after a restart) shows an
 * empty ring and a dash instead of vanishing; a fresh draft shows nothing.
 */
export function ContextMeter({
  busy,
  disabled,
  requestGateway,
  sessionId
}: {
  busy: boolean
  disabled: boolean
  requestGateway: GatewayRequester
  sessionId: null | string
}) {
  const { t } = useI18n()
  const copy = t.shell.statusbar.contextUsagePanel
  const view = useSessionView()
  const usage = useStore(view.$usage ?? NO_USAGE)
  const [open, setOpen] = useState(false)

  const { breakdown, loading } = useContextBreakdown({ busy, enabled: true, requestGateway, sessionId })
  const gauge = useMemo(() => contextGauge(breakdown, usage), [breakdown, usage])

  const max = gauge.context_max ?? 0
  const known = max > 0

  if (!known && !sessionId) {
    return null
  }

  const used = gauge.context_used ?? 0
  const percent = known ? Math.max(0, Math.min(100, Math.round(gauge.context_percent ?? (used / max) * 100))) : 0
  const approx = gauge.context_estimated ? '~' : ''

  const title = known
    ? `${copy.title}: ${copy.tokenSummary(`${approx}${compactNumber(used)}`, compactNumber(max))}`
    : `${copy.title}: ${copy.empty}`

  const setMenuOpen = (next: boolean) => {
    setOpen(next)

    if (!next) {
      releaseTypingFocus()
    }
  }

  return (
    <DropdownMenu onOpenChange={setMenuOpen} open={open}>
      <Tip label={title} side="top">
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={title}
            className={cn(
              'h-(--composer-control-size) shrink-0 gap-1.5 rounded-md px-2 text-xs font-normal tabular-nums',
              'hover:bg-(--chrome-action-hover) hover:text-foreground',
              TONE_CLASS[contextMeterTone(percent)]
            )}
            data-testid="composer-context-meter"
            disabled={disabled}
            type="button"
            variant="ghost"
          >
            <svg aria-hidden="true" className="size-3.5 shrink-0 -rotate-90" viewBox="0 0 16 16">
              <circle cx="8" cy="8" fill="none" opacity="0.25" r={RING_RADIUS} stroke="currentColor" strokeWidth="2" />
              <circle
                cx="8"
                cy="8"
                fill="none"
                r={RING_RADIUS}
                stroke="currentColor"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - percent / 100)}
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
            <span>{known ? `${approx}${percent}%` : '—'}</span>
          </Button>
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className="w-auto border-(--ui-stroke-secondary) p-0" side="top">
        <ContextUsagePanel breakdown={breakdown} loading={loading} usage={gauge} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

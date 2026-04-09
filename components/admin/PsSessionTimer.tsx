'use client'

import { useState, useEffect } from 'react'
import { computeElapsedSeconds, formatDuration, formatRupiah } from '@/lib/ps-pricing'
import type { PsPricingRule } from '@/lib/types'

interface PsSessionTimerProps {
  startedAt: string
  pausedAt: string | null
  totalPausedSeconds: number
  pricingRule?: PsPricingRule | null
}

export function PsSessionTimer({ startedAt, pausedAt, totalPausedSeconds, pricingRule }: PsSessionTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    computeElapsedSeconds(startedAt, pausedAt, totalPausedSeconds)
  )

  useEffect(() => {
    if (pausedAt) {
      // Frozen when paused
      setElapsed(computeElapsedSeconds(startedAt, pausedAt, totalPausedSeconds))
      return
    }

    const interval = setInterval(() => {
      setElapsed(computeElapsedSeconds(startedAt, null, totalPausedSeconds))
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, pausedAt, totalPausedSeconds])

  // Calculate running cost
  let runningCost = 0
  if (pricingRule) {
    const minutes = Math.ceil(elapsed / 60)
    if (pricingRule.rule_type === 'package' && pricingRule.duration_minutes) {
      const packages = Math.ceil(minutes / pricingRule.duration_minutes)
      runningCost = packages * pricingRule.price
    } else {
      const hours = Math.ceil(minutes / 60)
      runningCost = hours * pricingRule.price
    }
  }

  return (
    <div>
      <p className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
        {formatDuration(elapsed)}
      </p>
      {pricingRule && runningCost > 0 && (
        <p className="text-[12px] text-green-400 font-semibold mt-0.5">
          {formatRupiah(runningCost)}
        </p>
      )}
    </div>
  )
}

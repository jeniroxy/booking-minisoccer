'use client'

import { PsSessionTimer } from './PsSessionTimer'
import type { PsUnit, PsSession, PsPricingRule } from '@/lib/types'

interface PsTimerCardProps {
  unit: PsUnit
  session?: PsSession | null
  pricingRule?: PsPricingRule | null
  onStart: (unitId: string) => void
  onPause: (sessionId: string) => void
  onResume: (sessionId: string) => void
  onStop: (sessionId: string) => void
  loading?: boolean
}

export function PsTimerCard({
  unit,
  session,
  pricingRule,
  onStart,
  onPause,
  onResume,
  onStop,
  loading,
}: PsTimerCardProps) {
  const isOccupied = session && session.status !== 'completed'
  const isPaused = session?.status === 'paused'
  const isMaintenance = unit.status === 'maintenance'

  const borderColor = isMaintenance
    ? 'border-amber-500/40'
    : isOccupied
    ? isPaused
      ? 'border-amber-500/40'
      : 'border-red-500/40'
    : 'border-green-500/40'

  const statusBg = isMaintenance
    ? 'bg-amber-500/10'
    : isOccupied
    ? isPaused
      ? 'bg-amber-500/10'
      : 'bg-red-500/10'
    : 'bg-green-500/10'

  return (
    <div className={`bg-slate-900/50 rounded-2xl border-2 ${borderColor} ${statusBg} p-4 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-bold text-slate-100">{unit.name}</h3>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
            unit.type === 'PS5'
              ? 'text-blue-400 bg-blue-500/15 border border-blue-500/30'
              : 'text-slate-400 bg-slate-700 border border-slate-600'
          }`}>
            {unit.type}
          </span>
        </div>
        <div className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
          isMaintenance
            ? 'text-amber-400 bg-amber-500/20'
            : isOccupied
            ? isPaused
              ? 'text-amber-400 bg-amber-500/20'
              : 'text-red-400 bg-red-500/20'
            : 'text-green-400 bg-green-500/20'
        }`}>
          {isMaintenance ? 'Maintenance' : isOccupied ? (isPaused ? 'Paused' : 'Terpakai') : 'Tersedia'}
        </div>
      </div>

      {/* Timer or Available State */}
      <div className="flex-1 flex flex-col justify-center items-center py-3">
        {isOccupied && session ? (
          <>
            <PsSessionTimer
              startedAt={session.started_at}
              pausedAt={session.paused_at}
              totalPausedSeconds={session.total_paused_seconds}
              pricingRule={pricingRule}
            />
            <p className="text-[11px] text-slate-400 mt-2">{session.customer_name}</p>
          </>
        ) : isMaintenance ? (
          <p className="text-[13px] text-amber-400/60">Dalam perbaikan</p>
        ) : (
          <p className="text-[13px] text-green-400/60">Siap dipakai</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        {isMaintenance ? null : isOccupied ? (
          <>
            {isPaused ? (
              <button
                onClick={() => onResume(session!.id)}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
              >
                Resume
              </button>
            ) : (
              <button
                onClick={() => onPause(session!.id)}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-xl text-[12px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 disabled:opacity-40 transition-colors"
              >
                Pause
              </button>
            )}
            <button
              onClick={() => onStop(session!.id)}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-xl text-[12px] font-bold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 disabled:opacity-40 transition-colors"
            >
              Stop
            </button>
          </>
        ) : (
          <button
            onClick={() => onStart(unit.id)}
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
          >
            Start
          </button>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { PsTimerCard } from './PsTimerCard'
import { PsStartModal } from './PsStartModal'
import { PsStopModal } from './PsStopModal'
import type { PsUnit, PsSession, PsPricingRule } from '@/lib/types'

interface PsDashboardProps {
  initialUnits: PsUnit[]
  initialSessions: PsSession[]
  pricingRules: PsPricingRule[]
}

export function PsDashboard({ initialUnits, initialSessions, pricingRules }: PsDashboardProps) {
  const [units, setUnits] = useState(initialUnits)
  const [sessions, setSessions] = useState(initialSessions)
  const [loading, setLoading] = useState(false)

  const [startModalUnit, setStartModalUnit] = useState<PsUnit | null>(null)
  const [stopModalSession, setStopModalSession] = useState<PsSession | null>(null)

  const getSessionForUnit = (unitId: string) =>
    sessions.find(s => s.ps_unit_id === unitId && (s.status === 'active' || s.status === 'paused'))

  const getPricingRuleForSession = (session: PsSession | null | undefined) => {
    if (!session?.pricing_rule_id) return null
    return pricingRules.find(r => r.id === session.pricing_rule_id) || null
  }

  const handleStart = async (data: { ps_unit_id: string; customer_name: string; phone?: string; pricing_rule_id?: string }) => {
    setLoading(true)
    const res = await fetch('/api/ps/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const session: PsSession = await res.json()
      setSessions(prev => [session, ...prev])
      setUnits(prev => prev.map(u => u.id === data.ps_unit_id ? { ...u, status: 'occupied' as const } : u))
      setStartModalUnit(null)
    }
    setLoading(false)
  }

  const handlePause = async (sessionId: string) => {
    setLoading(true)
    const res = await fetch(`/api/ps/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    })
    if (res.ok) {
      const updated: PsSession = await res.json()
      setSessions(prev => prev.map(s => s.id === sessionId ? updated : s))
    }
    setLoading(false)
  }

  const handleResume = async (sessionId: string) => {
    setLoading(true)
    const res = await fetch(`/api/ps/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    })
    if (res.ok) {
      const updated: PsSession = await res.json()
      setSessions(prev => prev.map(s => s.id === sessionId ? updated : s))
    }
    setLoading(false)
  }

  const handleStopConfirm = async (data: { pricing_rule_id?: string; discount_amount?: number; payment_method?: string; notes?: string }) => {
    if (!stopModalSession) return
    setLoading(true)
    const res = await fetch(`/api/ps/sessions/${stopModalSession.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', ...data }),
    })
    if (res.ok) {
      const updated: PsSession = await res.json()
      setSessions(prev => prev.map(s => s.id === stopModalSession.id ? updated : s).filter(s => s.status !== 'completed'))
      setUnits(prev => prev.map(u => u.id === stopModalSession.ps_unit_id ? { ...u, status: 'available' as const } : u))
      setStopModalSession(null)
    }
    setLoading(false)
  }

  const activeUnits = units.filter(u => u.is_active)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {activeUnits.map(unit => {
          const session = getSessionForUnit(unit.id)
          return (
            <PsTimerCard
              key={unit.id}
              unit={unit}
              session={session}
              pricingRule={getPricingRuleForSession(session)}
              onStart={(unitId) => {
                const u = units.find(x => x.id === unitId)
                if (u) setStartModalUnit(u)
              }}
              onPause={handlePause}
              onResume={handleResume}
              onStop={(sessionId) => {
                const s = sessions.find(x => x.id === sessionId)
                if (s) setStopModalSession(s)
              }}
              loading={loading}
            />
          )
        })}
      </div>

      {activeUnits.length === 0 && (
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-8 text-center">
          <p className="text-[13px] text-slate-500">Belum ada unit PS aktif. Tambah di tab Units.</p>
        </div>
      )}

      {/* Start Modal */}
      {startModalUnit && (
        <PsStartModal
          unit={startModalUnit}
          pricingRules={pricingRules}
          onConfirm={handleStart}
          onClose={() => setStartModalUnit(null)}
          loading={loading}
        />
      )}

      {/* Stop Modal */}
      {stopModalSession && (
        <PsStopModal
          session={stopModalSession}
          unitType={units.find(u => u.id === stopModalSession.ps_unit_id)?.type || 'PS4'}
          pricingRules={pricingRules}
          onConfirm={handleStopConfirm}
          onClose={() => setStopModalSession(null)}
          loading={loading}
        />
      )}
    </>
  )
}

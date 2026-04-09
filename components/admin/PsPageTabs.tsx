'use client'

import { useState } from 'react'
import { PsDashboard } from './PsDashboard'
import { PsBookingTable } from './PsBookingTable'
import { PsUnitManager } from './PsUnitManager'
import { PsPricingManager } from './PsPricingManager'
import { PsSessionHistory } from './PsSessionHistory'
import type { PsUnit, PsPricingRule, PsSession, PsBooking } from '@/lib/types'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'bookings', label: 'Booking' },
  { key: 'units', label: 'Units' },
  { key: 'pricing', label: 'Harga' },
  { key: 'history', label: 'Riwayat' },
] as const

type TabKey = (typeof TABS)[number]['key']

interface PsPageTabsProps {
  units: PsUnit[]
  pricingRules: PsPricingRule[]
  activeSessions: PsSession[]
  bookings: PsBooking[]
}

export function PsPageTabs({ units, pricingRules, activeSessions, bookings }: PsPageTabsProps) {
  const [active, setActive] = useState<TabKey>('dashboard')

  return (
    <>
      <div className="flex bg-slate-800 rounded-2xl p-[3px] mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex-1 px-3 py-2 rounded-xl text-[12px] font-bold transition-colors whitespace-nowrap ${
              active === tab.key
                ? 'bg-green-500/15 text-green-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'dashboard' && (
        <PsDashboard initialUnits={units} initialSessions={activeSessions} pricingRules={pricingRules} />
      )}
      {active === 'bookings' && (
        <PsBookingTable initialBookings={bookings} units={units} />
      )}
      {active === 'units' && <PsUnitManager initialUnits={units} />}
      {active === 'pricing' && <PsPricingManager initialRules={pricingRules} />}
      {active === 'history' && <PsSessionHistory />}
    </>
  )
}

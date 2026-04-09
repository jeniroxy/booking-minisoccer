'use client'

import { useState } from 'react'
import { PsUnitCard } from './PsUnitCard'
import { PsBookingSheet } from './PsBookingSheet'
import type { PsUnit, PsPricingRule } from '@/lib/types'
import { formatRupiah } from '@/lib/ps-pricing'

interface PsAvailabilityGridProps {
  units: PsUnit[]
  occupiedUnitIds: string[]
  pricingRules: PsPricingRule[]
}

export function PsAvailabilityGrid({ units, occupiedUnitIds, pricingRules }: PsAvailabilityGridProps) {
  const [bookingUnit, setBookingUnit] = useState<PsUnit | null>(null)

  const availableCount = units.filter(u => !occupiedUnitIds.includes(u.id) && u.status !== 'maintenance').length

  // Get base hourly price for display
  const hourlyRules = pricingRules.filter(r => r.rule_type === 'hourly' && r.is_active)
  const packageRules = pricingRules.filter(r => r.rule_type === 'package' && r.is_active)

  return (
    <>
      {/* Status summary */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[14px] text-slate-400">
            <span className="font-bold text-green-400">{availableCount}</span> dari {units.length} unit tersedia
          </p>
        </div>
      </div>

      {/* Pricing info */}
      {(hourlyRules.length > 0 || packageRules.length > 0) && (
        <div className="bg-green-500/10 rounded-2xl p-4 mb-6 border border-green-500/20">
          <p className="text-[12px] font-bold text-green-400 mb-2">Harga</p>
          <div className="flex flex-wrap gap-3">
            {hourlyRules.map(r => (
              <div key={r.id} className="text-[12px] text-slate-300">
                {r.name}: <span className="font-bold text-green-400">{formatRupiah(r.price)}/jam</span>
              </div>
            ))}
            {packageRules.map(r => (
              <div key={r.id} className="text-[12px] text-slate-300">
                {r.name}: <span className="font-bold text-green-400">{formatRupiah(r.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unit grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {units.map(unit => (
          <PsUnitCard
            key={unit.id}
            unit={unit}
            isOccupied={occupiedUnitIds.includes(unit.id)}
            onBook={(unitId) => {
              const u = units.find(x => x.id === unitId)
              if (u) setBookingUnit(u)
            }}
          />
        ))}
      </div>

      {/* Booking sheet */}
      {bookingUnit && (
        <PsBookingSheet
          unit={bookingUnit}
          pricingRules={pricingRules}
          onClose={() => setBookingUnit(null)}
        />
      )}
    </>
  )
}

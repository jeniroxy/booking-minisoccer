'use client'

import { useState } from 'react'
import { SlotManager } from './SlotManager'
import { BlockDateManager } from './BlockDateManager'
import { PriceOverrideManager } from './PriceOverrideManager'
import { Clock, DollarSign, CalendarOff } from 'lucide-react'
import type { TimeSlot, BlockedDate, SlotPriceOverride } from '@/lib/types'

const TABS = [
  { key: 'slots', label: 'Jam', icon: Clock },
  { key: 'overrides', label: 'Harga Custom', icon: DollarSign },
  { key: 'blocked', label: 'Blokir', icon: CalendarOff },
] as const

type TabKey = (typeof TABS)[number]['key']

interface SlotPageTabsProps {
  slots: TimeSlot[]
  blocked: BlockedDate[]
  overrides: SlotPriceOverride[]
}

export function SlotPageTabs({ slots, blocked, overrides }: SlotPageTabsProps) {
  const [active, setActive] = useState<TabKey>('slots')

  return (
    <>
      <div className="flex bg-slate-800/80 backdrop-blur rounded-2xl p-1 mb-4 border border-slate-700/50">
        {TABS.map(tab => {
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                isActive
                  ? 'bg-green-500/15 text-green-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <tab.icon size={15} strokeWidth={isActive ? 2.5 : 2} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {active === 'slots' && <SlotManager initialSlots={slots} />}
      {active === 'overrides' && <PriceOverrideManager initialOverrides={overrides} slots={slots} />}
      {active === 'blocked' && <BlockDateManager initialBlocked={blocked} slots={slots} />}
    </>
  )
}

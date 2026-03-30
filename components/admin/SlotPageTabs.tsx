'use client'

import { useState } from 'react'
import { SlotManager } from './SlotManager'
import { BlockDateManager } from './BlockDateManager'
import { PriceOverrideManager } from './PriceOverrideManager'
import type { TimeSlot, BlockedDate, SlotPriceOverride } from '@/lib/types'

const TABS = [
  { key: 'slots', label: 'Jam Operasional' },
  { key: 'overrides', label: 'Harga Custom' },
  { key: 'blocked', label: 'Blokir Tanggal' },
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
      <div className="flex bg-slate-800 rounded-2xl p-[3px] mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex-1 px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${
              active === tab.key
                ? 'bg-green-500 text-green-950'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'slots' && <SlotManager initialSlots={slots} />}
      {active === 'overrides' && <PriceOverrideManager initialOverrides={overrides} slots={slots} />}
      {active === 'blocked' && <BlockDateManager initialBlocked={blocked} slots={slots} />}
    </>
  )
}

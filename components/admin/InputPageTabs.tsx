'use client'

import { useState } from 'react'
import { RevenueInputForm } from './RevenueInputForm'
import { ExpenseInputForm } from './ExpenseInputForm'
import { CapitalExpenseForm } from './CapitalExpenseForm'

const TABS = [
  { key: 'revenue', label: 'Pendapatan' },
  { key: 'expenses', label: 'Pengeluaran' },
  { key: 'capital', label: 'Belanja Besar' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function InputPageTabs({ onSaved }: { onSaved?: () => void } = {}) {
  const [active, setActive] = useState<TabKey>('revenue')

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

      {active === 'revenue' && <RevenueInputForm onSaved={onSaved} />}
      {active === 'expenses' && <ExpenseInputForm onSaved={onSaved} />}
      {active === 'capital' && <CapitalExpenseForm onSaved={onSaved} />}
    </>
  )
}

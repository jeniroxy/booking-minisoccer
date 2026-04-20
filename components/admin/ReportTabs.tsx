'use client'

import { useState } from 'react'
import { FinancialDashboard } from './FinancialDashboard'
import { DailyReport } from './DailyReport'
import { DailyExpenseReport } from './DailyExpenseReport'
import { MonthlyReport } from './MonthlyReport'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'daily', label: 'Pemasukan' },
  { key: 'expenses', label: 'Pengeluaran' },
  { key: 'monthly', label: 'Bulanan' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function ReportTabs() {
  const [active, setActive] = useState<TabKey>('dashboard')
  const [monthlySection, setMonthlySection] = useState<'minisoccer' | 'kantin'>('minisoccer')

  const handleNavigate = (tab: string, section?: 'minisoccer' | 'kantin') => {
    if (section) setMonthlySection(section)
    setActive(tab as TabKey)
  }

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

      {active === 'dashboard' && <FinancialDashboard onNavigate={handleNavigate} />}
      {active === 'daily' && <DailyReport />}
      {active === 'expenses' && <DailyExpenseReport />}
      {active === 'monthly' && <MonthlyReport initialSection={monthlySection} />}
    </>
  )
}

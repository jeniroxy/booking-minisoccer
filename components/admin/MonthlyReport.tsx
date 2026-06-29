'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatRupiah } from '@/lib/ps-pricing'
import { ChevronDown, Download } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  mini_soccer: 'Mini Soccer',
  ps: 'PS Rental',
  sewa_sepatu: 'Sewa Sepatu',
  photography: 'Photography',
  kantin: 'Kantin',
}
const CATEGORY_SHORT: Record<string, string> = {
  mini_soccer: '⚽',
  ps: '🎮',
  sewa_sepatu: '👟',
  photography: '📸',
  kantin: '🍔',
}
const MINISOCCER_CATS = ['mini_soccer', 'ps', 'sewa_sepatu', 'photography']

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const SECTION_TABS = [
  { key: 'minisoccer', label: '⚽ Mini Soccer' },
  { key: 'kantin', label: '🍔 Kantin' },
] as const

type SectionKey = (typeof SECTION_TABS)[number]['key']

interface MonthlyData {
  year: number
  month: number
  days: Record<string, Record<string, number>>
  days_auto: Record<string, Record<string, number>>
  days_manual: Record<string, Record<string, number>>
  expenses_by_day: Record<string, { mini_soccer: number; kantin: number }>
  expenses_by_category: Record<string, number>
  total_revenue: number
  total_expenses: number
  balance: number
}

function getLast12Months() {
  // All months from March 2025 up to current month, newest first
  const now = new Date()
  const result: { year: number; month: number }[] = []
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1)
  const endCursor = new Date(2025, 2, 1) // March 2025 (month is 0-indexed)
  while (cursor >= endCursor) {
    result.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 })
    cursor.setMonth(cursor.getMonth() - 1)
  }
  return result
}

interface MonthlyReportProps {
  initialSection?: SectionKey
}

export function MonthlyReport({ initialSection }: MonthlyReportProps = {}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [section, setSection] = useState<SectionKey>(initialSection ?? 'minisoccer')
  const [data, setData] = useState<MonthlyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/admin/reports/export?period=month&year=${year}&month=${month}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const mm = String(month).padStart(2, '0')
      a.download = `laporan-keuangan-${year}-${mm}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/reports/monthly?year=${year}&month=${month}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleDay = (dateStr: string, expense: number) => {
    if (expandedDay === dateStr) {
      setExpandedDay(null)
      return
    }
    setExpandedDay(dateStr)
    const manual = data?.days_manual?.[dateStr] ?? {}
    const vals: Record<string, string> = {}
    for (const cat of MINISOCCER_CATS) {
      // Edit only the manual portion; booking/session-derived revenue stays separate
      vals[cat] = manual[cat] ? String(manual[cat]) : ''
    }
    vals['expense'] = expense ? String(expense) : ''
    setEditValues(vals)
  }

  const saveDay = async (dateStr: string) => {
    setSaving(true)
    try {
      // Save revenue per category (uses existing upsert endpoint)
      const revenuePromises = MINISOCCER_CATS.map(cat => {
        const amount = parseInt(editValues[cat] || '0')
        if (isNaN(amount)) return Promise.resolve()
        return fetch('/api/admin/revenue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, category: cat, amount }),
        })
      })
      // Save expense for mini_soccer section
      const expenseAmount = parseInt(editValues['expense'] || '0')
      const expensePromise = fetch('/api/admin/expenses/daily', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, section: 'mini_soccer', amount: isNaN(expenseAmount) ? 0 : expenseAmount }),
      })
      await Promise.all([...revenuePromises, expensePromise])
      await fetchData()
      setExpandedDay(null)
    } finally {
      setSaving(false)
    }
  }

  const toggleKantinDay = (dateStr: string, kantinRev: number, kantinExp: number) => {
    if (expandedDay === dateStr) {
      setExpandedDay(null)
      return
    }
    setExpandedDay(dateStr)
    setEditValues({
      kantin: String(kantinRev),
      expense: String(kantinExp),
    })
  }

  const saveKantinDay = async (dateStr: string) => {
    setSaving(true)
    try {
      const revAmount = parseInt(editValues['kantin'] || '0')
      const expAmount = parseInt(editValues['expense'] || '0')
      await Promise.all([
        fetch('/api/admin/revenue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, category: 'kantin', amount: isNaN(revAmount) ? 0 : revAmount }),
        }),
        fetch('/api/admin/expenses/daily', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, section: 'kantin', amount: isNaN(expAmount) ? 0 : expAmount }),
        }),
      ])
      await fetchData()
      setExpandedDay(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-[13px] text-slate-500">Memuat...</div>
  }

  if (!data) return null

  const dayKeys = Object.keys(data.days).sort()

  // Compute totals
  const msRevenue = dayKeys.reduce((sum, k) => sum + MINISOCCER_CATS.reduce((s, c) => s + (data.days[k]?.[c] || 0), 0), 0)
  const msExpenses = dayKeys.reduce((sum, k) => sum + (data.expenses_by_day?.[k]?.mini_soccer || 0), 0)
  const kantinRevenue = dayKeys.reduce((sum, k) => sum + (data.days[k]?.kantin || 0), 0)
  const kantinExpenses = dayKeys.reduce((sum, k) => sum + (data.expenses_by_day?.[k]?.kantin || 0), 0)

  return (
    <div className="space-y-4">
      {/* Sticky header: section toggle + month nav */}
      <div className="sticky top-[52px] md:top-[49px] z-20 bg-slate-950/95 backdrop-blur-lg pb-4 -mx-4 px-4 pt-4 space-y-3 shadow-lg shadow-slate-950/50">
        {/* Section toggle + Export */}
        <div className="flex gap-2">
          <div className="flex flex-1 bg-slate-800 rounded-2xl p-[3px]">
            {SECTION_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setSection(tab.key)}
                className={`flex-1 px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${
                  section === tab.key
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 rounded-2xl text-[12px] font-bold text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <Download size={13} />
            {exporting ? '...' : 'Excel'}
          </button>
        </div>

        {/* Month strip — swipeable */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          ref={el => {
            if (!el) return
            const active = el.querySelector('[data-active="true"]') as HTMLElement
            if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
          }}
        >
          {getLast12Months().map(m => {
            const isActive = m.year === year && m.month === month
            return (
              <button
                key={`${m.year}-${m.month}`}
                data-active={isActive}
                onClick={() => { setYear(m.year); setMonth(m.month) }}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className={`text-[11px] font-bold ${isActive ? 'text-green-400' : 'text-slate-300'}`}>
                  {MONTH_NAMES[m.month].slice(0, 3)}
                </span>
                <span className={`text-[9px] ${isActive ? 'text-green-400/60' : 'text-slate-600'}`}>
                  {m.year}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {section === 'minisoccer' ? (
        <>
          {/* Category breakdown + net income */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="divide-y divide-slate-800/30">
              {MINISOCCER_CATS.map(cat => {
                const catTotal = dayKeys.reduce((sum, k) => sum + (data.days[k]?.[cat] || 0), 0)
                if (catTotal === 0) return null
                return (
                  <div key={cat} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[12px] text-slate-400">{CATEGORY_SHORT[cat]} {CATEGORY_LABELS[cat]}</span>
                    <span className="text-[12px] font-semibold text-green-400">{formatRupiah(catTotal)}</span>
                  </div>
                )
              })}
              {msExpenses > 0 && (
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[12px] text-slate-400">Total Pengeluaran</span>
                  <span className="text-[12px] font-semibold text-red-400">-{formatRupiah(msExpenses)}</span>
                </div>
              )}
            </div>
            <div className="px-4 py-3 bg-slate-800/40 border-t border-slate-800/50 flex items-center justify-between">
              <span className="text-[12px] font-bold text-slate-100">Pendapatan Bersih</span>
              <span className={`text-[16px] font-extrabold ${(msRevenue - msExpenses) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatRupiah(msRevenue - msExpenses)}
              </span>
            </div>
          </div>

          {/* Daily cards - Mini Soccer */}
          <div className="space-y-2">
            {dayKeys.map(dateStr => {
              const cats = data.days[dateStr]
              const dayTotal = MINISOCCER_CATS.reduce((s, c) => s + (cats[c] || 0), 0)
              const dayExpense = data.expenses_by_day?.[dateStr]?.mini_soccer || 0
              const dateObj = new Date(dateStr + 'T00:00:00')
              const dayName = DAY_SHORT[dateObj.getDay()]
              const dayNum = dateObj.getDate()
              const hasData = dayTotal > 0 || dayExpense > 0
              const isExpanded = expandedDay === dateStr

              return (
                <div
                  key={dateStr}
                  className={`bg-slate-800 rounded-2xl border overflow-hidden transition-colors ${
                    isExpanded ? 'border-green-500/30' : 'border-slate-700'
                  } ${!hasData && !isExpanded ? 'opacity-40' : ''}`}
                >
                  <button
                    onClick={() => toggleDay(dateStr, dayExpense)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center">
                        <span className="text-[13px] font-bold text-slate-300">{dayNum}</span>
                      </div>
                      <span className="text-[12px] font-medium text-slate-300">{dayName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className={`text-[14px] font-bold ${dayTotal > 0 ? 'text-green-400' : 'text-slate-600'}`}>
                          {dayTotal > 0 ? formatRupiah(dayTotal) : '-'}
                        </span>
                        {dayExpense > 0 && (
                          <p className="text-[10px] text-red-400/70">-{formatRupiah(dayExpense)}</p>
                        )}
                      </div>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {!isExpanded && hasData && (
                    <div className="px-3.5 pb-2.5 flex flex-wrap gap-x-3 gap-y-1">
                      {MINISOCCER_CATS.map(cat => {
                        const amount = cats[cat] || 0
                        if (amount === 0) return null
                        return (
                          <span key={cat} className="text-[10px] text-slate-500">
                            {CATEGORY_SHORT[cat]} {formatRupiah(amount)}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-slate-700/50 pt-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pemasukan</p>
                      {MINISOCCER_CATS.map(cat => {
                        const autoAmt = data.days_auto?.[dateStr]?.[cat] || 0
                        const manualAmt = parseInt(editValues[cat] || '0') || 0

                        // Categories without auto revenue: simple single input
                        if (autoAmt === 0) {
                          return (
                            <div key={cat} className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 w-24 shrink-0">{CATEGORY_SHORT[cat]} {CATEGORY_LABELS[cat]}</span>
                              <input
                                type="number"
                                value={editValues[cat] ?? ''}
                                onChange={e => setEditValues(prev => ({ ...prev, [cat]: e.target.value }))}
                                min={0}
                                placeholder="0"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
                              />
                            </div>
                          )
                        }

                        // Categories with booking/session revenue: show as an equation
                        return (
                          <div key={cat} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-2.5 space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-200">{CATEGORY_SHORT[cat]} {CATEGORY_LABELS[cat]}</span>
                            {/* Auto (locked) */}
                            <div className="flex items-center justify-between rounded-lg bg-slate-800/60 border border-slate-700/50 px-2.5 py-1.5">
                              <span className="text-[10px] text-slate-400">Dari booking <span className="text-slate-600">(otomatis)</span></span>
                              <span className="text-[11px] font-semibold text-blue-400">{formatRupiah(autoAmt)}</span>
                            </div>
                            {/* Manual (editable) */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 w-[88px] shrink-0">+ Tambahan manual</span>
                              <input
                                type="number"
                                value={editValues[cat] ?? ''}
                                onChange={e => setEditValues(prev => ({ ...prev, [cat]: e.target.value }))}
                                min={0}
                                placeholder="0"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
                              />
                            </div>
                            {/* Total (computed) */}
                            <div className="flex items-center justify-between rounded-lg bg-green-500/5 border border-green-500/20 px-2.5 py-1.5">
                              <span className="text-[10px] font-medium text-slate-300">= Total tercatat</span>
                              <span className="text-[12px] font-bold text-green-400">{formatRupiah(autoAmt + manualAmt)}</span>
                            </div>
                          </div>
                        )
                      })}
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-1">Pengeluaran</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 w-24 shrink-0">Pengeluaran</span>
                        <input
                          type="number"
                          value={editValues['expense'] || '0'}
                          onChange={e => setEditValues(prev => ({ ...prev, expense: e.target.value }))}
                          min={0}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setExpandedDay(null)}
                          className="flex-1 py-2 rounded-xl text-[12px] font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => saveDay(dateStr)}
                          disabled={saving}
                          className="flex-1 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
                        >
                          {saving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Mini Soccer summary */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-[13px] font-bold text-slate-100">Ringkasan Mini Soccer</h2>
            </div>
            <div className="divide-y divide-slate-700/50">
              {MINISOCCER_CATS.map(cat => {
                const catTotal = dayKeys.reduce((sum, k) => sum + (data.days[k]?.[cat] || 0), 0)
                if (catTotal === 0) return null
                return (
                  <div key={cat} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[12px] text-slate-300">{CATEGORY_SHORT[cat]} {CATEGORY_LABELS[cat]}</span>
                    <span className="text-[12px] font-bold text-green-400">{formatRupiah(catTotal)}</span>
                  </div>
                )
              })}
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-[12px] text-slate-300">Total Omset</span>
                <span className="text-[12px] font-bold text-green-400">{formatRupiah(msRevenue)}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-[12px] text-slate-300">Total Pengeluaran</span>
                <span className="text-[12px] font-bold text-red-400">{formatRupiah(msExpenses)}</span>
              </div>
              <div className="px-4 py-3 flex justify-between bg-slate-900/50">
                <span className="text-[12px] font-bold text-slate-100">Pendapatan Bersih</span>
                <span className={`text-[14px] font-bold ${(msRevenue - msExpenses) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatRupiah(msRevenue - msExpenses)}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Kantin breakdown + net income */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="divide-y divide-slate-800/30">
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-[12px] text-slate-400">🍔 Omset Kantin</span>
                <span className="text-[12px] font-semibold text-green-400">{formatRupiah(kantinRevenue)}</span>
              </div>
              {kantinExpenses > 0 && (
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[12px] text-slate-400">Total Pengeluaran</span>
                  <span className="text-[12px] font-semibold text-red-400">-{formatRupiah(kantinExpenses)}</span>
                </div>
              )}
            </div>
            <div className="px-4 py-3 bg-slate-800/40 border-t border-slate-800/50 flex items-center justify-between">
              <span className="text-[12px] font-bold text-slate-100">Pendapatan Bersih</span>
              <span className={`text-[16px] font-extrabold ${(kantinRevenue - kantinExpenses) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatRupiah(kantinRevenue - kantinExpenses)}
              </span>
            </div>
          </div>

          {/* Daily cards - Kantin */}
          <div className="space-y-2">
            {dayKeys.map(dateStr => {
              const kantinRev = data.days[dateStr]?.kantin || 0
              const kantinExp = data.expenses_by_day?.[dateStr]?.kantin || 0
              const dateObj = new Date(dateStr + 'T00:00:00')
              const dayName = DAY_SHORT[dateObj.getDay()]
              const dayNum = dateObj.getDate()
              const hasData = kantinRev > 0 || kantinExp > 0
              const isExpanded = expandedDay === dateStr

              return (
                <div
                  key={dateStr}
                  className={`bg-slate-800 rounded-2xl border overflow-hidden transition-colors ${
                    isExpanded ? 'border-green-500/30' : 'border-slate-700'
                  } ${!hasData && !isExpanded ? 'opacity-40' : ''}`}
                >
                  <button
                    onClick={() => toggleKantinDay(dateStr, kantinRev, kantinExp)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center">
                        <span className="text-[13px] font-bold text-slate-300">{dayNum}</span>
                      </div>
                      <span className="text-[12px] font-medium text-slate-300">{dayName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {kantinRev > 0 && (
                          <span className="text-[14px] font-bold text-green-400">{formatRupiah(kantinRev)}</span>
                        )}
                        {kantinExp > 0 && (
                          <p className="text-[10px] text-red-400/70">-{formatRupiah(kantinExp)}</p>
                        )}
                        {kantinRev === 0 && kantinExp === 0 && (
                          <span className="text-[14px] font-bold text-slate-600">-</span>
                        )}
                      </div>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-slate-700/50 pt-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pemasukan</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 w-24 shrink-0">🍔 Kantin</span>
                        <input
                          type="number"
                          value={editValues['kantin'] || '0'}
                          onChange={e => setEditValues(prev => ({ ...prev, kantin: e.target.value }))}
                          min={0}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-1">Pengeluaran</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 w-24 shrink-0">Pengeluaran</span>
                        <input
                          type="number"
                          value={editValues['expense'] || '0'}
                          onChange={e => setEditValues(prev => ({ ...prev, expense: e.target.value }))}
                          min={0}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setExpandedDay(null)}
                          className="flex-1 py-2 rounded-xl text-[12px] font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => saveKantinDay(dateStr)}
                          disabled={saving}
                          className="flex-1 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
                        >
                          {saving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Kantin summary */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-[13px] font-bold text-slate-100">Ringkasan Kantin</h2>
            </div>
            <div className="divide-y divide-slate-700/50">
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-[12px] text-slate-300">Total Omset</span>
                <span className="text-[12px] font-bold text-green-400">{formatRupiah(kantinRevenue)}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-[12px] text-slate-300">Total Pengeluaran</span>
                <span className="text-[12px] font-bold text-red-400">{formatRupiah(kantinExpenses)}</span>
              </div>
              <div className="px-4 py-3 flex justify-between bg-slate-900/50">
                <span className="text-[12px] font-bold text-slate-100">Laba Bersih</span>
                <span className={`text-[14px] font-bold ${(kantinRevenue - kantinExpenses) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatRupiah(kantinRevenue - kantinExpenses)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

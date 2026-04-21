'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatRupiah } from '@/lib/ps-pricing'

const MONTH_SHORT: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'Mei', 6: 'Jun',
  7: 'Jul', 8: 'Agu', 9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des',
}

const MINISOCCER_CATS = ['mini_soccer', 'ps', 'sewa_sepatu', 'photography']

interface PeriodData {
  revenue: number
  expenses: number
  capital: number
  net: number
}

interface MonthData {
  year: number
  month: number
  revenue: number
  expenses: number
  net: number
}

interface SectionData {
  revenue: number
  expenses: number
  net: number
  categories?: Record<string, number>
}

interface DashboardData {
  all_time: PeriodData
  this_year: PeriodData
  this_month: PeriodData
  this_week: PeriodData
  today: PeriodData
  minisoccer_month: SectionData
  kantin_month: SectionData
  minisoccer_all_time: PeriodData
  kantin_all_time: PeriodData
  all_time_cutoff?: string
  last_12_months: MonthData[]
}

interface FinancialDashboardProps {
  onNavigate: (tab: string, section?: 'minisoccer' | 'kantin') => void
}

export function FinancialDashboard({ onNavigate }: FinancialDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [monthlyCategories, setMonthlyCategories] = useState<Record<string, number> | null>(null)
  const [showSaldoMaret, setShowSaldoMaret] = useState(false)
  const [monthlySections, setMonthlySections] = useState<{ ms: { revenue: number; expenses: number; net: number }; kantin: { revenue: number; expenses: number; net: number } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentYear] = useState(() => new Date().getFullYear())

  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const load = async () => {
      try {
        const [dashRes, monthlyRes] = await Promise.all([
          fetch('/api/admin/reports/dashboard'),
          fetch(`/api/admin/reports/monthly?year=${year}&month=${month}`),
        ])
        if (dashRes.ok) setData(await dashRes.json())
        if (monthlyRes.ok) {
          const mData = await monthlyRes.json()
          const days = mData.days as Record<string, Record<string, number>>
          const expByDay = mData.expenses_by_day as Record<string, { mini_soccer: number; kantin: number }>
          const cats: Record<string, number> = {}
          let msRev = 0, msExp = 0, kantinRev = 0, kantinExp = 0
          for (const [dateStr, day] of Object.entries(days)) {
            for (const cat of MINISOCCER_CATS) {
              const v = day[cat] || 0
              cats[cat] = (cats[cat] || 0) + v
              msRev += v
            }
            kantinRev += day['kantin'] || 0
            msExp += expByDay[dateStr]?.mini_soccer || 0
            kantinExp += expByDay[dateStr]?.kantin || 0
          }
          setMonthlyCategories(cats)
          setMonthlySections({
            ms: { revenue: msRev, expenses: msExp, net: msRev - msExp },
            kantin: { revenue: kantinRev, expenses: kantinExp, net: kantinRev - kantinExp },
          })
        }
      } catch (err) {
        console.error('Dashboard fetch failed:', err)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-8 text-center text-[13px] text-slate-500">Memuat...</div>
  }

  if (!data) {
    return <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-8 text-center text-[13px] text-slate-500">Gagal memuat data dashboard</div>
  }

  // Derived values from monthly API (authoritative for current month)
  const thisMonthRev = monthlySections ? monthlySections.ms.revenue + monthlySections.kantin.revenue : data.this_month.revenue
  const thisMonthExp = monthlySections ? monthlySections.ms.expenses + monthlySections.kantin.expenses : (data.this_month.expenses + data.this_month.capital)
  const thisMonthNet = thisMonthRev - thisMonthExp
  const revDelta = monthlySections ? thisMonthRev - data.this_month.revenue : 0
  const expDelta = monthlySections ? thisMonthExp - (data.this_month.expenses + data.this_month.capital) : 0

  return (
    <div className="space-y-3">
      {/* Mini Soccer & Kantin side by side */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('monthly', 'minisoccer')}
          className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3.5 text-left hover:border-slate-700 transition-colors"
        >
          <p className="text-[10px] text-slate-500 font-medium">🏟️ Lapang</p>
          <p className={`text-[17px] font-extrabold mt-0.5 ${(monthlySections?.ms.net ?? data.minisoccer_month.net) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatRupiah(monthlySections?.ms.net ?? data.minisoccer_month.net)}
          </p>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-[9px] text-green-400/40">Omset {formatRupiah(monthlySections?.ms.revenue ?? data.minisoccer_month.revenue)}</span>
            <span className="text-[9px] text-red-400/40">Keluar {formatRupiah(monthlySections?.ms.expenses ?? data.minisoccer_month.expenses)}</span>
          </div>
        </button>
        <button
          onClick={() => onNavigate('monthly', 'kantin')}
          className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3.5 text-left hover:border-slate-700 transition-colors"
        >
          <p className="text-[10px] text-slate-500 font-medium">🍔 Kantin</p>
          <p className={`text-[17px] font-extrabold mt-0.5 ${(monthlySections?.kantin.net ?? data.kantin_month.net) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatRupiah(monthlySections?.kantin.net ?? data.kantin_month.net)}
          </p>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-[9px] text-green-400/40">Omset {formatRupiah(monthlySections?.kantin.revenue ?? data.kantin_month.revenue)}</span>
            <span className="text-[9px] text-red-400/40">Keluar {formatRupiah(monthlySections?.kantin.expenses ?? data.kantin_month.expenses)}</span>
          </div>
        </button>
      </div>

      {/* Category breakdown */}
      {monthlyCategories && (() => {
        const CAT_LABELS: Record<string, string> = {
          mini_soccer: '⚽ Mini Soccer',
          ps: '🎮 PS Rental',
          sewa_sepatu: '👟 Sewa Sepatu',
          photography: '📸 Photography',
        }
        const cats = monthlyCategories
        const entries = Object.entries(CAT_LABELS).filter(([key]) => (cats[key] || 0) > 0)
        if (entries.length === 0) return null
        return (
          <div
            className="flex md:grid gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}
          >
            {entries.map(([key, label]) => (
              <div key={key} className="flex-shrink-0 w-[160px] md:w-auto bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3.5">
                <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{label}</p>
                <p className="text-[17px] font-extrabold mt-0.5 text-green-400 whitespace-nowrap">
                  {formatRupiah(cats[key])}
                </p>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Keuntungan Bulan Ini & Tahun Ini side by side */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('monthly')}
          className="text-left bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3.5 hover:bg-slate-900/70 hover:border-slate-700 transition-all"
        >
          <p className="text-[10px] text-slate-500 font-medium">Keuntungan Bulan Ini</p>
          <p className={`text-[17px] font-extrabold mt-0.5 ${thisMonthNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatRupiah(thisMonthNet)}
          </p>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-[9px] text-green-400/40">Omset {formatRupiah(thisMonthRev)}</span>
            <span className="text-[9px] text-red-400/40">Keluar {formatRupiah(thisMonthExp)}</span>
          </div>
        </button>
        <button
          onClick={() => onNavigate('monthly')}
          className="text-left bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3.5 hover:bg-slate-900/70 hover:border-slate-700 transition-all"
        >
          <p className="text-[10px] text-slate-500 font-medium">Keuntungan Tahun Ini</p>
          <p className={`text-[17px] font-extrabold mt-0.5 ${(data.this_year.net + revDelta - expDelta) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatRupiah(data.this_year.net + revDelta - expDelta)}
          </p>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-[9px] text-green-400/40">Omset {formatRupiah(data.this_year.revenue + revDelta)}</span>
            <span className="text-[9px] text-red-400/40">Keluar {formatRupiah(data.this_year.expenses + data.this_year.capital + expDelta)}</span>
          </div>
        </button>
      </div>

      {/* Saldo Per Maret 2026 — collapsible */}
      <div>
        <button
          onClick={() => setShowSaldoMaret(v => !v)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/50 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors"
        >
          <span className="text-[12px] font-semibold text-slate-400">Saldo Per Maret 2026</span>
          <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${showSaldoMaret ? 'rotate-180' : ''}`} />
        </button>
        {showSaldoMaret && (
          <div className="mt-3 space-y-3">
            <div className="w-full text-left bg-slate-900/50 rounded-2xl border border-slate-800/80 p-4">
              <p className="text-[11px] text-slate-500 font-medium">🏟️ Sisa Saldo Bersih Mini Soccer <span className="text-slate-600">(s/d Mar 2026)</span></p>
              <p className={`text-[20px] font-extrabold mt-0.5 ${data.minisoccer_all_time.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatRupiah(data.minisoccer_all_time.net)}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-green-400/40">Omset {formatRupiah(data.minisoccer_all_time.revenue)}</span>
                <span className="text-[10px] text-red-400/40">Pengeluaran {formatRupiah(data.minisoccer_all_time.expenses + data.minisoccer_all_time.capital)}</span>
              </div>
            </div>
            <div className="w-full text-left bg-slate-900/50 rounded-2xl border border-slate-800/80 p-4">
              <p className="text-[11px] text-slate-500 font-medium">🍔 Sisa Saldo Bersih Kantin <span className="text-slate-600">(s/d Mar 2026)</span></p>
              <p className={`text-[20px] font-extrabold mt-0.5 ${data.kantin_all_time.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatRupiah(data.kantin_all_time.net)}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-green-400/40">Omset {formatRupiah(data.kantin_all_time.revenue)}</span>
                <span className="text-[10px] text-red-400/40">Pengeluaran {formatRupiah(data.kantin_all_time.expenses + data.kantin_all_time.capital)}</span>
              </div>
            </div>
            {(() => {
              const ms = data.minisoccer_all_time
              const k = data.kantin_all_time
              const totalRev = ms.revenue + k.revenue
              const totalExp = ms.expenses + ms.capital + k.expenses + k.capital
              const totalNet = totalRev - totalExp
              return (
                <div className="w-full text-left bg-gradient-to-br from-green-500/8 to-transparent rounded-2xl border border-green-500/10 p-4">
                  <p className="text-[11px] text-green-400/60 font-medium">💰 Saldo Total Bersih <span className="text-green-400/40">(s/d Mar 2026)</span></p>
                  <p className={`text-[22px] font-extrabold ${totalNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatRupiah(totalNet)}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-green-400/40">Omset {formatRupiah(totalRev)}</span>
                    <span className="text-[10px] text-red-400/40">Pengeluaran {formatRupiah(totalExp)}</span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* All-time balance */}
      <div className="w-full text-left bg-gradient-to-br from-green-500/8 to-transparent rounded-2xl border border-green-500/10 p-4">
        <p className="text-[11px] text-green-400/60 font-medium">Saldo Total</p>
        <p className={`text-[22px] font-extrabold ${(data.all_time.net + revDelta - expDelta) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatRupiah(data.all_time.net + revDelta - expDelta)}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-green-400/40">Masuk {formatRupiah(data.all_time.revenue + revDelta)}</span>
          <span className="text-[10px] text-red-400/40">Keluar {formatRupiah(data.all_time.expenses + data.all_time.capital + expDelta)}</span>
        </div>
      </div>

      {/* Last 12 months — horizontal scroll */}
      <div>
        <h2 className="text-[13px] font-bold text-slate-300 mb-3">Pendapatan Bersih Per Bulan</h2>
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {data.last_12_months.slice(1).map((m, i) => {
            const hasData = m.revenue > 0 || m.expenses > 0
            return (
              <button
                key={i}
                onClick={() => onNavigate('monthly')}
                className={`flex-shrink-0 w-[140px] bg-slate-900/50 rounded-xl border border-slate-800/80 p-3 text-left hover:bg-slate-900/70 hover:border-slate-700 transition-all ${!hasData ? 'opacity-30' : ''}`}
              >
                <p className="text-[11px] text-slate-500 font-medium mb-1.5">
                  {MONTH_SHORT[m.month]} {m.year !== currentYear ? m.year : ''}
                </p>
                <p className={`text-[16px] font-bold ${m.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {hasData ? formatRupiah(m.net) : '-'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-green-400/40">
                    +{m.revenue > 0 ? formatRupiah(m.revenue) : '0'}
                  </span>
                  <span className="text-[9px] text-red-400/40">
                    -{m.expenses > 0 ? formatRupiah(m.expenses) : '0'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

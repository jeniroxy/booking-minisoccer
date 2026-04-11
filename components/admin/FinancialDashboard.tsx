'use client'

import { useState, useEffect } from 'react'
import { formatRupiah } from '@/lib/ps-pricing'

const MONTH_SHORT: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'Mei', 6: 'Jun',
  7: 'Jul', 8: 'Agu', 9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des',
}

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
  onNavigate: (tab: string) => void
}

export function FinancialDashboard({ onNavigate }: FinancialDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/reports/dashboard')
        if (res.ok) setData(await res.json())
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

  return (
    <div className="space-y-3">
      {/* Mini Soccer & Kantin side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3.5">
          <p className="text-[10px] text-slate-500 font-medium">🏟️ Lapang</p>
          <p className={`text-[17px] font-extrabold mt-0.5 ${data.minisoccer_month.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatRupiah(data.minisoccer_month.net)}
          </p>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-[9px] text-green-400/40">Omset {formatRupiah(data.minisoccer_month.revenue)}</span>
            <span className="text-[9px] text-red-400/40">Keluar {formatRupiah(data.minisoccer_month.expenses)}</span>
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3.5">
          <p className="text-[10px] text-slate-500 font-medium">🍔 Kantin</p>
          <p className={`text-[17px] font-extrabold mt-0.5 ${data.kantin_month.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatRupiah(data.kantin_month.net)}
          </p>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-[9px] text-green-400/40">Omset {formatRupiah(data.kantin_month.revenue)}</span>
            <span className="text-[9px] text-red-400/40">Keluar {formatRupiah(data.kantin_month.expenses)}</span>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {data.minisoccer_month.categories && (() => {
        const CAT_LABELS: Record<string, string> = {
          mini_soccer: '⚽ Mini Soccer',
          ps: '🎮 PS Rental',
          sewa_sepatu: '👟 Sewa Sepatu',
          photography: '📸 Photography',
        }
        const cats = data.minisoccer_month.categories!
        const entries = Object.entries(CAT_LABELS).filter(([key]) => (cats[key] || 0) > 0)
        if (entries.length === 0) return null
        return (
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {entries.map(([key, label]) => (
              <div key={key} className="flex-shrink-0 w-[160px] bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3.5">
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
          <p className={`text-[17px] font-extrabold mt-0.5 ${data.this_month.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatRupiah(data.this_month.net)}
          </p>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-[9px] text-green-400/40">Omset {formatRupiah(data.this_month.revenue)}</span>
            <span className="text-[9px] text-red-400/40">Keluar {formatRupiah(data.this_month.expenses + data.this_month.capital)}</span>
          </div>
        </button>
        <button
          onClick={() => onNavigate('monthly')}
          className="text-left bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3.5 hover:bg-slate-900/70 hover:border-slate-700 transition-all"
        >
          <p className="text-[10px] text-slate-500 font-medium">Keuntungan Tahun Ini</p>
          <p className={`text-[17px] font-extrabold mt-0.5 ${data.this_year.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatRupiah(data.this_year.net)}
          </p>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-[9px] text-green-400/40">Omset {formatRupiah(data.this_year.revenue)}</span>
            <span className="text-[9px] text-red-400/40">Keluar {formatRupiah(data.this_year.expenses + data.this_year.capital)}</span>
          </div>
        </button>
      </div>

      {/* All-time Mini Soccer net balance (s/d Maret 2026) */}
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

      {/* All-time Kantin net balance (s/d Maret 2026) */}
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

      {/* Combined Mini Soccer + Kantin all-time balance (s/d Maret 2026) */}
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

      {/* All-time balance */}
      <div className="w-full text-left bg-gradient-to-br from-green-500/8 to-transparent rounded-2xl border border-green-500/10 p-4">
        <p className="text-[11px] text-green-400/60 font-medium">Saldo Total</p>
        <p className={`text-[22px] font-extrabold ${data.all_time.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatRupiah(data.all_time.net)}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-green-400/40">Masuk {formatRupiah(data.all_time.revenue)}</span>
          <span className="text-[10px] text-red-400/40">Keluar {formatRupiah(data.all_time.expenses + data.all_time.capital)}</span>
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
                  {MONTH_SHORT[m.month]} {m.year !== new Date().getFullYear() ? m.year : ''}
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

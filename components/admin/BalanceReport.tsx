'use client'

import { useState, useEffect } from 'react'
import { formatRupiah } from '@/lib/ps-pricing'

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

interface BalanceData {
  year: number
  months: { month: number; revenue: number; expenses: number; capital: number; balance: number; cumulative: number }[]
  total_revenue: number
  total_expenses: number
  total_capital: number
  final_balance: number
  all_time_balance: number
}

export function BalanceReport() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/reports/balance?year=${year}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  if (loading) {
    return <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-8 text-center text-[13px] text-slate-500">Memuat...</div>
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* All-time balance */}
      <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-2xl border border-green-500/20 p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-green-400/70 font-medium">Saldo Total (Semua Tahun)</p>
          <p className={`text-[22px] font-extrabold ${data.all_time_balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatRupiah(data.all_time_balance)}
          </p>
        </div>
        <div className="text-[10px] text-slate-500 text-right">
          Gabungan seluruh<br />pendapatan &amp; pengeluaran
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-4 text-center">
          <p className="text-[10px] text-slate-500 mb-1">Total Pendapatan</p>
          <p className="text-[18px] font-bold text-green-400">{formatRupiah(data.total_revenue)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-4 text-center">
          <p className="text-[10px] text-slate-500 mb-1">Total Pengeluaran</p>
          <p className="text-[18px] font-bold text-red-400">{formatRupiah(data.total_expenses)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-4 text-center">
          <p className="text-[10px] text-slate-500 mb-1">Pengeluaran Modal</p>
          <p className="text-[18px] font-bold text-amber-400">{formatRupiah(data.total_capital)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-4 text-center">
          <p className="text-[10px] text-slate-500 mb-1">Saldo Akhir {year}</p>
          <p className={`text-[18px] font-bold ${data.final_balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatRupiah(data.final_balance)}
          </p>
        </div>
      </div>

      {/* Monthly breakdown table */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="text-[13px] font-bold text-slate-100">Saldo Per Bulan</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setYear(y => y - 1)} className="px-2 py-1 rounded-lg text-[12px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">←</button>
            <span className="text-[12px] text-slate-300 font-medium">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="px-2 py-1 rounded-lg text-[12px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">→</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-800/80">
                <th className="px-3 py-2 text-left text-slate-500 font-medium">Bulan</th>
                <th className="px-3 py-2 text-right text-slate-500 font-medium">Pendapatan</th>
                <th className="px-3 py-2 text-right text-slate-500 font-medium">Pengeluaran</th>
                <th className="px-3 py-2 text-right text-slate-500 font-medium">Modal</th>
                <th className="px-3 py-2 text-right text-slate-500 font-medium">Saldo</th>
                <th className="px-3 py-2 text-right text-slate-400 font-bold">Kumulatif</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map(m => {
                const hasData = m.revenue > 0 || m.expenses > 0 || m.capital > 0
                return (
                  <tr key={m.month} className={`border-b border-slate-800/80 ${!hasData ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-2 text-slate-300 font-medium">{MONTH_NAMES[m.month]}</td>
                    <td className="px-3 py-2 text-right text-green-400">
                      {m.revenue > 0 ? formatRupiah(m.revenue) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-red-400">
                      {m.expenses > 0 ? formatRupiah(m.expenses) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-400">
                      {m.capital > 0 ? formatRupiah(m.capital) : '-'}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${m.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {hasData ? formatRupiah(m.balance) : '-'}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${m.cumulative >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {hasData ? formatRupiah(m.cumulative) : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

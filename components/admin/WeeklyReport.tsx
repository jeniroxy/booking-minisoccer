'use client'

import { useState, useEffect } from 'react'
import { formatRupiah } from '@/lib/ps-pricing'

const CATEGORIES = ['mini_soccer', 'kantin', 'ps', 'sewa_sepatu', 'photography'] as const
const CATEGORY_LABELS: Record<string, string> = {
  mini_soccer: 'Mini Soccer',
  kantin: 'Kantin',
  ps: 'PS Rental',
  sewa_sepatu: 'Sewa Sepatu',
  photography: 'Photography',
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - ((day + 6) % 7))
  return date
}

export function WeeklyReport() {
  const [weekStart, setWeekStart] = useState(() => {
    const monday = getMonday(new Date())
    return monday.toISOString().split('T')[0]
  })
  const [data, setData] = useState<{ days: Record<string, Record<string, number>> } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [weekStart])

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/reports/weekly?week_start=${weekStart}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  const navigate = (dir: number) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + dir * 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  if (loading) {
    return <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-8 text-center text-[13px] text-slate-500">Memuat...</div>
  }

  if (!data) return null

  const dates = Object.keys(data.days).sort()
  const categoryTotals: Record<string, number> = {}
  CATEGORIES.forEach(c => {
    categoryTotals[c] = dates.reduce((sum, d) => sum + (data.days[d]?.[c] || 0), 0)
  })
  const grandTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0)

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-slate-100">Laporan Mingguan</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="px-2 py-1 rounded-lg text-[12px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">←</button>
          <span className="text-[12px] text-slate-300 font-medium">
            {new Date(weekStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(dates[dates.length - 1] || weekStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button onClick={() => navigate(1)} className="px-2 py-1 rounded-lg text-[12px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">→</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-slate-800/80">
              <th className="px-3 py-2 text-left text-slate-500 font-medium">Kategori</th>
              {dates.map(d => {
                const date = new Date(d + 'T00:00:00')
                return (
                  <th key={d} className="px-2 py-2 text-center text-slate-500 font-medium min-w-[70px]">
                    <div>{DAY_NAMES[date.getDay()]}</div>
                    <div className="text-[10px]">{date.getDate()}/{date.getMonth() + 1}</div>
                  </th>
                )
              })}
              <th className="px-3 py-2 text-right text-slate-400 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => (
              <tr key={cat} className="border-b border-slate-800/80">
                <td className="px-3 py-2 text-slate-300 font-medium">{CATEGORY_LABELS[cat]}</td>
                {dates.map(d => (
                  <td key={d} className="px-2 py-2 text-center text-slate-400">
                    {data.days[d]?.[cat] ? formatRupiah(data.days[d][cat]) : '-'}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-bold text-green-400">
                  {categoryTotals[cat] > 0 ? formatRupiah(categoryTotals[cat]) : '-'}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-900/50">
              <td className="px-3 py-2 text-slate-100 font-bold">Total</td>
              {dates.map(d => {
                const dayTotal = CATEGORIES.reduce((sum, c) => sum + (data.days[d]?.[c] || 0), 0)
                return (
                  <td key={d} className="px-2 py-2 text-center font-bold text-slate-200">
                    {dayTotal > 0 ? formatRupiah(dayTotal) : '-'}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right font-bold text-green-400 text-[14px]">
                {formatRupiah(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

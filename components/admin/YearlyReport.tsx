'use client'

import { useState, useEffect } from 'react'
import { formatRupiah } from '@/lib/ps-pricing'

const CATEGORY_LABELS: Record<string, string> = {
  mini_soccer: 'Mini Soccer',
  kantin: 'Kantin',
  ps: 'PS Rental',
  sewa_sepatu: 'Sewa Sepatu',
  photography: 'Photography',
}
const CATEGORIES = Object.keys(CATEGORY_LABELS)
const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

interface YearlyData {
  year: number
  months: Record<number, Record<string, number>>
}

export function YearlyReport() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<YearlyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/reports/yearly?year=${year}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  if (loading) {
    return <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-8 text-center text-[13px] text-slate-500">Memuat...</div>
  }

  if (!data) return null

  const grandTotal = CATEGORIES.reduce((sum, cat) => {
    for (let m = 1; m <= 12; m++) sum += data.months[m]?.[cat] || 0
    return sum
  }, 0)

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-slate-100">Laporan Tahunan</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="px-2 py-1 rounded-lg text-[12px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">←</button>
          <span className="text-[12px] text-slate-300 font-medium">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="px-2 py-1 rounded-lg text-[12px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">→</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-800/80">
              <th className="px-3 py-2 text-left text-slate-500 font-medium">Kategori</th>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i + 1} className="px-1.5 py-2 text-center text-slate-500 font-medium min-w-[60px]">
                  {MONTH_SHORT[i + 1]}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-slate-400 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => {
              const catTotal = Array.from({ length: 12 }, (_, i) => data.months[i + 1]?.[cat] || 0).reduce((s, v) => s + v, 0)
              return (
                <tr key={cat} className="border-b border-slate-800/80">
                  <td className="px-3 py-2 text-slate-300 font-medium whitespace-nowrap">{CATEGORY_LABELS[cat]}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const val = data.months[i + 1]?.[cat] || 0
                    return (
                      <td key={i + 1} className="px-1.5 py-2 text-center text-slate-400">
                        {val > 0 ? `${Math.round(val / 1000)}K` : '-'}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right font-bold text-green-400">
                    {catTotal > 0 ? formatRupiah(catTotal) : '-'}
                  </td>
                </tr>
              )
            })}
            <tr className="bg-slate-900/50">
              <td className="px-3 py-2 text-slate-100 font-bold">Total</td>
              {Array.from({ length: 12 }, (_, i) => {
                const monthTotal = CATEGORIES.reduce((sum, c) => sum + (data.months[i + 1]?.[c] || 0), 0)
                return (
                  <td key={i + 1} className="px-1.5 py-2 text-center font-bold text-slate-200">
                    {monthTotal > 0 ? `${Math.round(monthTotal / 1000)}K` : '-'}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right font-bold text-green-400 text-[13px]">
                {formatRupiah(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

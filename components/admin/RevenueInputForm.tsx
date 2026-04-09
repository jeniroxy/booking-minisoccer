'use client'

import { useState, useEffect } from 'react'
import type { RevenueCategory, RevenueEntry } from '@/lib/types'
import { formatRupiah } from '@/lib/ps-pricing'

const CATEGORIES: { key: RevenueCategory; label: string }[] = [
  { key: 'mini_soccer', label: 'Mini Soccer' },
  { key: 'kantin', label: 'Kantin' },
  { key: 'ps', label: 'PS Rental' },
  { key: 'sewa_sepatu', label: 'Sewa Sepatu' },
  { key: 'photography', label: 'Photography' },
]

export function RevenueInputForm({ onSaved }: { onSaved?: () => void } = {}) {
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }))
  const [, setEntries] = useState<RevenueEntry[]>([])
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [autoRevenue, setAutoRevenue] = useState<{ mini_soccer: number; ps: number }>({ mini_soccer: 0, ps: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [revRes, autoRes] = await Promise.all([
        fetch(`/api/admin/revenue?date=${date}`),
        fetch(`/api/admin/auto-revenue?date=${date}`),
      ])
      if (revRes.ok) {
        const data: RevenueEntry[] = await revRes.json()
        setEntries(data)
        const map: Record<string, string> = {}
        CATEGORIES.forEach(c => {
          const existing = data.find(e => e.category === c.key)
          map[c.key] = existing ? String(existing.amount) : ''
        })
        setAmounts(map)
      }
      if (autoRes.ok) {
        setAutoRevenue(await autoRes.json())
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDate = async (newDate: string) => {
    setDate(newDate)
    const [revRes, autoRes] = await Promise.all([
      fetch(`/api/admin/revenue?date=${newDate}`),
      fetch(`/api/admin/auto-revenue?date=${newDate}`),
    ])
    if (revRes.ok) {
      const data: RevenueEntry[] = await revRes.json()
      setEntries(data)
      const map: Record<string, string> = {}
      CATEGORIES.forEach(c => {
        const existing = data.find(e => e.category === c.key)
        map[c.key] = existing ? String(existing.amount) : ''
      })
      setAmounts(map)
    }
    if (autoRes.ok) {
      setAutoRevenue(await autoRes.json())
    }
  }

  const saveAll = async () => {
    setSaving(true)
    const toSave = CATEGORIES.filter(c => amounts[c.key] && !isNaN(parseInt(amounts[c.key])) && parseInt(amounts[c.key]) >= 0)
    await Promise.all(
      toSave.map(async c => {
        const res = await fetch('/api/admin/revenue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, category: c.key, amount: parseInt(amounts[c.key]) }),
        })
        if (res.ok) {
          const entry: RevenueEntry = await res.json()
          setEntries(prev => {
            const filtered = prev.filter(e => !(e.date === date && e.category === c.key))
            return [...filtered, entry]
          })
        }
      })
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onSaved?.() }, 1000)
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-1/3" />
          <div className="h-3 bg-slate-700/50 rounded w-2/3" />
          <div className="h-10 bg-slate-700/30 rounded-xl mt-4" />
          <div className="h-10 bg-slate-700/30 rounded-xl" />
          <div className="h-10 bg-slate-700/30 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-[13px] font-bold text-slate-100">Input Pendapatan Harian</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Masukkan pendapatan per kategori untuk tanggal tertentu.</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Date picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500">Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={e => loadDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
          />
        </div>

        {/* Category inputs */}
        <div className="space-y-3">
          {CATEGORIES.map(c => {
            const hasAutoRevenue = (c.key === 'mini_soccer' || c.key === 'ps') && autoRevenue[c.key] > 0
            return (
              <div key={c.key}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-[11px] font-medium text-slate-400">{c.label}</label>
                  {hasAutoRevenue && (
                    <span className="text-[9px] text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded-md">
                      Auto: {formatRupiah(autoRevenue[c.key as 'mini_soccer' | 'ps'])}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  value={amounts[c.key]}
                  onChange={e => setAmounts(prev => ({ ...prev, [c.key]: e.target.value }))}
                  placeholder={hasAutoRevenue ? 'Adjustment manual (opsional)' : '0'}
                  min={0}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
                />
              </div>
            )
          })}
        </div>

        <button
          onClick={saveAll}
          disabled={saving || !CATEGORIES.some(c => amounts[c.key])}
          className={`w-full py-2.5 rounded-xl text-[12px] font-bold transition-colors ${
            saved
              ? 'bg-green-500/30 border border-green-500/50 text-green-400'
              : 'bg-green-500 text-green-950 hover:bg-green-400 active:bg-green-600 disabled:opacity-40 shadow-lg shadow-green-500/20'
          }`}
        >
          {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan' : 'Simpan Semua'}
        </button>
      </div>
    </div>
  )
}

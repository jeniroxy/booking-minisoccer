'use client'

import { useState, useEffect, useRef } from 'react'
import { formatRupiah } from '@/lib/ps-pricing'
import { Pencil, Check, X } from 'lucide-react'
import { MonthPicker } from './MonthPicker'

const CATEGORY_CONFIG: { key: string; label: string; icon: string; editable: boolean }[] = [
  { key: 'mini_soccer', label: 'Mini Soccer', icon: '⚽', editable: true },
  { key: 'ps', label: 'PS Rental', icon: '🎮', editable: true },
  { key: 'sewa_sepatu', label: 'Sewa Sepatu', icon: '👟', editable: true },
  { key: 'kantin', label: 'Kantin', icon: '🍔', editable: true },
  { key: 'photography', label: 'Photography', icon: '📸', editable: true },
]

const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function generateDays(centerDate: Date): Date[] {
  const days: Date[] = []
  const start = new Date(centerDate)
  start.setDate(start.getDate() - 15)
  for (let i = 0; i < 31; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

interface DailyData {
  date: string
  categories: Record<string, number>
  total_revenue: number
  total_expenses: number
  kantin_expenses: number
  kantin_monthly: {
    revenue: number
    expenses: number
    net: number
  }
  net: number
}

export function DailyReport() {
  const [todayStr] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }))
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [days, setDays] = useState(() => generateDays(new Date()))
  const [data, setData] = useState<DailyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/reports/daily?date=${selectedDate}`)
      if (res.ok) setData(await res.json())
      setLoading(false)
    }
    load()
  }, [selectedDate])

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const el = strip.querySelector('[data-selected="true"]') as HTMLElement
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedDate])

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr)
    // Extend days if near edges
    const idx = days.findIndex(d => toDateStr(d) === dateStr)
    if (idx <= 5 || idx >= days.length - 5) {
      setDays(generateDays(new Date(dateStr)))
    }
  }

  useEffect(() => {
    if (editingCat && editInputRef.current) editInputRef.current.focus()
  }, [editingCat])

  const startEdit = (catKey: string, currentAmount: number) => {
    setEditingCat(catKey)
    setEditValue(currentAmount > 0 ? String(currentAmount) : '')
  }

  const cancelEdit = () => {
    setEditingCat(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!editingCat || !data) return
    setSaving(true)
    const amount = parseInt(editValue) || 0
    const res = await fetch('/api/admin/revenue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate, category: editingCat, amount }),
    })
    if (res.ok) {
      // Refetch daily data
      const dailyRes = await fetch(`/api/admin/reports/daily?date=${selectedDate}`)
      if (dailyRes.ok) setData(await dailyRes.json())
    }
    setSaving(false)
    setEditingCat(null)
    setEditValue('')
  }

  const navigate = (dir: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + dir)
    const newStr = toDateStr(d)
    setSelectedDate(newStr)
    setDays(generateDays(d))
  }

  const handleMonthSelect = (year: number, month: number) => {
    const newStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
    setSelectedDate(newStr)
    setDays(generateDays(new Date(newStr + 'T00:00:00')))
  }

  const selectedDateObj = new Date(selectedDate + 'T00:00:00')

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <MonthPicker
            selectedYear={selectedDateObj.getFullYear()}
            selectedMonth={selectedDateObj.getMonth()}
            onSelect={handleMonthSelect}
            accent="green"
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(-1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors text-sm"
            >
              ‹
            </button>
            <button
              onClick={() => { setSelectedDate(todayStr); setDays(generateDays(new Date())) }}
              className="px-2.5 h-7 rounded-lg text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
            >
              HARI INI
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors text-sm"
            >
              ›
            </button>
          </div>
        </div>

        {/* Date strip */}
        <div
          ref={stripRef}
          className="flex gap-1 overflow-x-auto px-3 py-2.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {days.map(day => {
            const dateStr = toDateStr(day)
            const isToday = dateStr === todayStr
            const isActive = dateStr === selectedDate
            return (
              <button
                key={dateStr}
                data-selected={isActive}
                onClick={() => handleDateSelect(dateStr)}
                className="flex-shrink-0 w-11 flex flex-col items-center gap-1 py-0.5"
              >
                <span className={`text-[8px] font-medium uppercase tracking-wider ${isActive ? 'text-green-400' : 'text-slate-500'}`}>
                  {DAY_SHORT[day.getDay()]}
                </span>
                <span className={`w-9 h-9 flex items-center justify-center rounded-xl text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-green-500/15 text-green-400 font-bold'
                    : isToday
                      ? 'bg-slate-700 text-slate-300 border border-slate-600'
                      : 'text-slate-500 hover:text-slate-300'
                }`}>
                  {day.getDate()}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-[13px] text-slate-500">Memuat...</div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Total Pemasukan</p>
                <p className="text-[20px] font-extrabold text-green-400 mt-0.5">{formatRupiah(data.total_revenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400 font-medium">Pengeluaran</p>
                <p className="text-[20px] font-extrabold text-red-400 mt-0.5">{formatRupiah(data.total_expenses)}</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Pendapatan Bersih</span>
                <span className={`text-[16px] font-extrabold ${data.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatRupiah(data.net)}
                </span>
              </div>
            </div>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_CONFIG.map(cat => {
              const amount = data.categories[cat.key] || 0
              const isEditing = editingCat === cat.key

              if (isEditing) {
                return (
                  <div key={cat.key} className="bg-slate-800 rounded-2xl border border-green-500/30 p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[16px]">{cat.icon}</span>
                      <span className="text-[11px] font-medium text-slate-400">{cat.label}</span>
                    </div>
                    <input
                      ref={editInputRef}
                      type="number"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                      placeholder="0"
                      min={0}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[14px] text-slate-100 outline-none focus:border-green-500 mb-2"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold bg-green-500 text-green-950 hover:bg-green-400 disabled:opacity-40 transition-colors"
                      >
                        <Check size={12} /> {saving ? '...' : 'Simpan'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={cat.key}
                  onClick={cat.editable ? () => startEdit(cat.key, amount) : undefined}
                  className={`bg-slate-800 rounded-2xl border border-slate-700 p-3.5 ${cat.editable ? 'cursor-pointer hover:border-slate-600 transition-colors' : ''} ${amount === 0 ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px]">{cat.icon}</span>
                      <span className="text-[11px] font-medium text-slate-400">{cat.label}</span>
                    </div>
                    {cat.editable && (
                      <Pencil size={12} className="text-slate-600" />
                    )}
                  </div>
                  <p className={`text-[18px] font-bold ${amount > 0 ? 'text-green-400' : 'text-slate-600'}`}>
                    {amount > 0 ? formatRupiah(amount) : 'Rp 0'}
                  </p>
                </div>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}

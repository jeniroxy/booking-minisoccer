'use client'

import { useState, useEffect, useRef } from 'react'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

interface MonthPickerProps {
  selectedYear: number
  selectedMonth: number // 0-11
  onSelect: (year: number, month: number) => void
  accent?: 'green' | 'red'
}

export function MonthPicker({ selectedYear, selectedMonth, onSelect, accent = 'green' }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(selectedYear)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = () => {
    if (!open) setPickerYear(selectedYear)
    setOpen(o => !o)
  }

  const handleSelect = (year: number, month: number) => {
    onSelect(year, month)
    setOpen(false)
  }

  const activeClass = accent === 'green'
    ? 'bg-green-500 border-green-500 text-green-950 font-bold'
    : 'bg-red-500 border-red-500 text-red-950 font-bold'

  const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-[13px] font-bold text-slate-100 hover:text-white transition-colors"
      >
        {monthLabel}
        <span className={`text-slate-500 text-[9px] transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[260px] bg-slate-800 border border-slate-700 rounded-xl p-3 z-40 shadow-2xl">
          <div className="flex items-center justify-between mb-2.5">
            <button
              onClick={() => setPickerYear(y => y - 1)}
              className="w-7 h-7 flex items-center justify-center bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 text-sm"
            >
              ‹
            </button>
            <span className="text-[12px] font-bold text-slate-100">{pickerYear}</span>
            <button
              onClick={() => setPickerYear(y => y + 1)}
              className="w-7 h-7 flex items-center justify-center bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 text-sm"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, i) => {
              const isActive = selectedYear === pickerYear && selectedMonth === i
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(pickerYear, i)}
                  className={`py-2 rounded-lg border text-[11px] font-medium transition-colors ${
                    isActive
                      ? activeClass
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {name.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useRef, useEffect, useState } from 'react'
import { toDateString, formatDayShort } from '@/lib/schedule'
import { cn } from '@/lib/utils'
import type { Booking } from '@/lib/types'

interface DateNavProps {
  days: Date[]
  todayStr: string
  selectedDate: string
  bookings: Booking[]
  onSelectDate: (dateStr: string) => void
  onShift: (dir: 1 | -1) => void
  isShiftDisabled: boolean
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function getMonthLabel(days: Date[]): string {
  const first = days[0]
  const last = days[days.length - 1]
  if (first.getMonth() === last.getMonth()) {
    return `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`
  }
  return `${SHORT_MONTHS[first.getMonth()]} – ${SHORT_MONTHS[last.getMonth()]} ${last.getFullYear()}`
}

function getAvailableMonths(days: Date[]): number[] {
  return [...new Set(days.map(d => d.getMonth()))]
}

export function DateNav({
  days,
  todayStr,
  selectedDate,
  onSelectDate,
  bookings,
  onShift,
  isShiftDisabled,
}: DateNavProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const availableMonths = getAvailableMonths(days)

  const hasActiveBooking = (dateStr: string) =>
    bookings.some(b => b.booking_date === dateStr && b.status !== 'cancelled')

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const selectedEl = strip.querySelector('[data-selected="true"]') as HTMLElement
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedDate])

  const handleMonthSelect = (monthIndex: number) => {
    const target = days.find(d => d.getMonth() === monthIndex)
    if (target) {
      onSelectDate(toDateString(target))
    }
    setMonthPickerOpen(false)
  }

  const handleTodayClick = () => {
    onShift(-1)
  }

  return (
    <div className="bg-slate-950 border-b border-slate-800 px-3.5 pt-2.5 pb-2.5 relative">
      {/* Header row: month button + arrows */}
      <div className="flex items-center justify-between mb-2.5">
        <button
          onClick={() => setMonthPickerOpen(o => !o)}
          className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-100"
        >
          {getMonthLabel(days)}
          <span className={cn('text-slate-500 text-[9px] transition-transform', monthPickerOpen && 'rotate-180')}>▼</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onShift(-1)}
            disabled={isShiftDisabled}
            className="w-7 h-7 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ‹
          </button>
          <button
            onClick={handleTodayClick}
            disabled={isShiftDisabled}
            className={cn(
              'px-2.5 h-7 bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-bold text-green-500',
              isShiftDisabled && 'opacity-30 cursor-not-allowed'
            )}
          >
            HARI INI
          </button>
          <button
            onClick={() => onShift(1)}
            className="w-7 h-7 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm"
          >
            ›
          </button>
        </div>
      </div>

      {/* Month picker dropdown */}
      {monthPickerOpen && (
        <div className="absolute top-[52px] left-3.5 right-3.5 bg-slate-800 border border-slate-700 rounded-2xl p-3 z-50 shadow-2xl">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center mb-2.5">Pilih Bulan</p>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, i) => {
              const isAvailable = availableMonths.includes(i)
              const isSelected = days.some(d => d.getMonth() === i && toDateString(d) === selectedDate)
              return (
                <button
                  key={i}
                  disabled={!isAvailable}
                  onClick={() => handleMonthSelect(i)}
                  className={cn(
                    'py-2 rounded-lg border text-[11px] font-medium transition-colors',
                    !isAvailable && 'opacity-25 cursor-not-allowed bg-slate-900 border-slate-700 text-slate-500',
                    isAvailable && !isSelected && 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700',
                    isSelected && 'bg-green-500 border-green-500 text-green-950 font-bold',
                  )}
                >
                  {name.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Date strip — scrollable */}
      <div
        ref={stripRef}
        className="flex gap-1 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map(day => {
          const dateStr = toDateString(day)
          const isToday = dateStr === todayStr
          const isActive = dateStr === selectedDate
          const hasDot = hasActiveBooking(dateStr)
          return (
            <button
              key={dateStr}
              data-selected={isActive}
              onClick={() => onSelectDate(dateStr)}
              className="flex-shrink-0 w-11 flex flex-col items-center gap-1 py-0.5"
            >
              <span className={cn(
                'text-[8px] font-medium uppercase tracking-wider',
                isActive ? 'text-green-400' : 'text-slate-500'
              )}>
                {formatDayShort(day)}
              </span>
              <span className={cn(
                'w-9 h-9 flex items-center justify-center rounded-xl text-[13px] font-medium transition-colors',
                isActive && 'bg-green-500 text-green-950 font-bold',
                !isActive && isToday && 'bg-slate-800 text-slate-300 border border-slate-700',
                !isActive && !isToday && 'text-slate-500 hover:text-slate-300'
              )}>
                {day.getDate()}
              </span>
              <span className={cn(
                'w-1 h-1 rounded-full',
                hasDot ? (isActive ? 'bg-green-950' : 'bg-red-500') : 'bg-transparent'
              )} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

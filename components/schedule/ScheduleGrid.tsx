'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  getSlotStatus,
  get30Days,
  toDateString,
  formatHour,
  formatPrice,
  formatDayHeader,
  STUDENT_DISCOUNT,
} from '@/lib/schedule'
import type { TimeSlot, ScheduleData, SlotStatus } from '@/lib/types'
import { BookingModal } from './BookingModal'

interface Selection {
  date: string
  slots: TimeSlot[]
}

interface ScheduleGridProps {
  initialData: ScheduleData
  initialStartDate: string
}

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

function formatDateRange(start: Date, end: Date): string {
  const s = `${start.getDate()} ${SHORT_MONTHS[start.getMonth()]}`
  const e = `${end.getDate()} ${SHORT_MONTHS[end.getMonth()]} ${end.getFullYear()}`
  return `${s} – ${e}`
}

export function ScheduleGrid({ initialData, initialStartDate }: ScheduleGridProps) {
  const [startDate, setStartDate] = useState(initialStartDate)
  const [data, setData] = useState<ScheduleData>(initialData)
  const [loading, setLoading] = useState(false)
  const [isStudent, setIsStudent] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)

  const today = new Date()
  const todayStr = toDateString(today)

  const days = get30Days(new Date(startDate + 'T00:00:00'))

  const handleShift = useCallback(
    async (direction: 1 | -1) => {
      const current = new Date(startDate + 'T00:00:00')
      current.setDate(current.getDate() + direction * 30)
      const newStart = toDateString(current)
      if (newStart < todayStr) return

      setLoading(true)
      try {
        const res = await fetch(`/api/schedule?startDate=${newStart}`)
        const newData: ScheduleData = await res.json()
        setData(newData)
        setStartDate(newStart)
        setSelection(null)
      } finally {
        setLoading(false)
      }
    },
    [startDate, todayStr]
  )

  const handleSlotClick = useCallback((slot: TimeSlot, day: Date) => {
    const dateStr = toDateString(day)

    setSelection(prev => {
      if (!prev || prev.date !== dateStr) {
        return { date: dateStr, slots: [slot] }
      }

      const sorted = [...prev.slots].sort((a, b) => a.start_hour - b.start_hour)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]

      // Deselect edge slot
      if (slot.id === first.id || slot.id === last.id) {
        const filtered = prev.slots.filter(s => s.id !== slot.id)
        return filtered.length > 0 ? { date: dateStr, slots: filtered } : null
      }

      // Extend selection if adjacent
      if (slot.start_hour === last.end_hour) {
        return { date: dateStr, slots: [...prev.slots, slot] }
      }
      if (slot.end_hour === first.start_hour) {
        return { date: dateStr, slots: [slot, ...prev.slots] }
      }

      // Not adjacent — start fresh
      return { date: dateStr, slots: [slot] }
    })
  }, [])

  const handleBookingSuccess = useCallback(
    (bookingIds: string[]) => {
      if (!selection) return
      const sorted = [...selection.slots].sort((a, b) => a.start_hour - b.start_hour)
      const dateStr = selection.date
      setData(prev => ({
        ...prev,
        bookings: [
          ...prev.bookings,
          ...sorted.map((slot, i) => ({
            id: bookingIds[i],
            team_name: '',
            booking_date: dateStr,
            time_slot_id: slot.id,
            status: 'pending' as const,
            created_at: new Date().toISOString(),
          })),
        ],
      }))
      setSelection(null)
      setBookingOpen(false)
    },
    [selection]
  )

  const slotPrice = (slot: TimeSlot) =>
    Math.max(0, slot.price - (isStudent ? STUDENT_DISCOUNT : 0))

  const totalSelectionPrice = selection
    ? selection.slots.reduce((sum, s) => sum + slotPrice(s), 0)
    : 0

  const isPrevDisabled = startDate <= todayStr

  return (
    <div className="flex flex-col gap-4">
      {/* Header: toggle left, date nav right */}
      <div className="flex items-center justify-between px-1">
        {/* Umum / Pelajar toggle */}
        <div className="flex items-center bg-gray-100 rounded-full p-0.5 text-sm font-medium">
          <button
            onClick={() => setIsStudent(false)}
            className={cn(
              'px-4 py-1.5 rounded-full transition-colors',
              !isStudent ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-slate-700'
            )}
          >
            Umum
          </button>
          <button
            onClick={() => setIsStudent(true)}
            className={cn(
              'px-4 py-1.5 rounded-full transition-colors',
              isStudent ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-slate-700'
            )}
          >
            Pelajar
          </button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleShift(-1)}
            disabled={isPrevDisabled}
            aria-label="30 hari sebelumnya"
            className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-slate-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-slate-700 px-1">
            {formatDateRange(days[0], days[days.length - 1])}
          </span>
          <button
            onClick={() => handleShift(1)}
            aria-label="30 hari berikutnya"
            className="w-8 h-8 flex items-center justify-center rounded-full text-xl text-slate-600 hover:bg-gray-100 transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {isStudent && (
        <p className="text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2">
          Harga Pelajar aktif — diskon Rp50.000 per jam
        </p>
      )}

      {/* Timetable */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Memuat jadwal...
          </div>
        ) : (
          <table className="border-collapse min-w-max w-full">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-white min-w-[88px] px-3 py-2.5 border-b border-r border-gray-200 text-xs text-gray-400 font-normal text-center">
                  Jam
                </th>
                {days.map(day => {
                  const dateStr = toDateString(day)
                  const isToday = dateStr === todayStr
                  return (
                    <th
                      key={dateStr}
                      className={cn(
                        'min-w-[104px] px-2 py-2.5 border-b border-r border-gray-200 text-xs font-semibold text-center',
                        isToday ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'
                      )}
                    >
                      {formatDayHeader(day)}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {data.slots.map(slot => (
                <tr key={slot.id}>
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 border-b border-r border-gray-200 text-xs text-gray-500 text-center whitespace-nowrap">
                    {formatHour(slot.start_hour)}–{formatHour(slot.end_hour)}
                  </td>
                  {days.map(day => {
                    const dateStr = toDateString(day)
                    const { status } = getSlotStatus(
                      slot,
                      dateStr,
                      data.bookings,
                      data.blockedDates,
                      todayStr
                    )
                    const isSelected =
                      selection?.date === dateStr &&
                      selection.slots.some(s => s.id === slot.id)
                    return (
                      <SlotCell
                        key={dateStr}
                        status={status}
                        price={slotPrice(slot)}
                        isSelected={isSelected}
                        onClick={
                          status === 'available'
                            ? () => handleSlotClick(slot, day)
                            : undefined
                        }
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-white border border-blue-300 inline-block" />
          Tersedia
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-400 inline-block" />
          Dipilih
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300 inline-block" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300 inline-block" />
          Tutup
        </span>
      </div>

      {/* Sticky booking bar */}
      {selection && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="bg-slate-800 text-white rounded-full px-5 py-3 shadow-xl flex items-center gap-3 text-sm">
            <span className="font-medium">
              {selection.slots.length} jam
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-blue-300">{formatPrice(totalSelectionPrice)}</span>
            <button
              onClick={() => setBookingOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-1 text-sm font-semibold transition-colors"
            >
              Pesan
            </button>
            <button
              onClick={() => setSelection(null)}
              className="text-slate-400 hover:text-white transition-colors text-xs"
              aria-label="Batal pilih"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {selection && bookingOpen && (
        <BookingModal
          slots={selection.slots}
          date={new Date(selection.date + 'T00:00:00')}
          isStudent={isStudent}
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  )
}

function SlotCell({
  status,
  price,
  isSelected,
  onClick,
}: {
  status: SlotStatus
  price: number
  isSelected: boolean
  onClick?: () => void
}) {
  const base =
    'px-2 py-2 border-b border-r border-gray-200 text-center text-xs font-medium h-[52px] min-w-[104px] align-middle'

  if (isSelected) {
    return (
      <td
        className={cn(base, 'bg-blue-100 text-blue-700 ring-2 ring-inset ring-blue-400 cursor-pointer')}
        onClick={onClick}
      >
        {formatPrice(price)}
      </td>
    )
  }

  const variants: Record<SlotStatus, string> = {
    available: 'bg-white text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors',
    pending: 'bg-yellow-50 text-yellow-700 cursor-not-allowed',
    confirmed: 'bg-blue-500 text-white cursor-not-allowed',
    blocked: 'bg-gray-100 text-gray-400 cursor-not-allowed',
    past: 'bg-gray-50 text-gray-300 cursor-not-allowed',
  }

  const labels: Partial<Record<SlotStatus, string>> = {
    pending: 'PENDING',
    confirmed: 'BOOKED',
    blocked: 'TUTUP',
    past: '—',
  }

  return (
    <td className={cn(base, variants[status])} onClick={onClick}>
      {status === 'available' ? formatPrice(price) : labels[status]}
    </td>
  )
}

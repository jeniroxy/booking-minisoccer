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
} from '@/lib/schedule'
import type { TimeSlot, ScheduleData, SlotStatus } from '@/lib/types'
import { BookingModal } from './BookingModal'

interface SelectedSlot {
  slot: TimeSlot
  date: Date
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
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)

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
      } finally {
        setLoading(false)
      }
    },
    [startDate, todayStr]
  )

  const handleBookingSuccess = useCallback(
    (bookingId: string) => {
      if (!selectedSlot) return
      setData(prev => ({
        ...prev,
        bookings: [
          ...prev.bookings,
          {
            id: bookingId,
            team_name: '',
            booking_date: toDateString(selectedSlot.date),
            time_slot_id: selectedSlot.slot.id,
            status: 'pending' as const,
            created_at: new Date().toISOString(),
          },
        ],
      }))
      setSelectedSlot(null)
    },
    [selectedSlot]
  )

  const isPrevDisabled = startDate <= todayStr

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => handleShift(-1)}
          disabled={isPrevDisabled}
          aria-label="30 hari sebelumnya"
          className="w-9 h-9 flex items-center justify-center rounded-full text-xl text-slate-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold text-slate-700">
          {formatDateRange(days[0], days[days.length - 1])}
        </h2>
        <button
          onClick={() => handleShift(1)}
          aria-label="30 hari berikutnya"
          className="w-9 h-9 flex items-center justify-center rounded-full text-xl text-slate-600 hover:bg-gray-100 transition-colors"
        >
          ›
        </button>
      </div>

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
                    return (
                      <SlotCell
                        key={dateStr}
                        status={status}
                        price={slot.price}
                        onClick={
                          status === 'available'
                            ? () => setSelectedSlot({ slot, date: day })
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

      {selectedSlot && (
        <BookingModal
          slot={selectedSlot.slot}
          date={selectedSlot.date}
          isOpen
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  )
}

function SlotCell({
  status,
  price,
  onClick,
}: {
  status: SlotStatus
  price: number
  onClick?: () => void
}) {
  const base =
    'px-2 py-2 border-b border-r border-gray-200 text-center text-xs font-medium h-[52px] min-w-[104px] align-middle'

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

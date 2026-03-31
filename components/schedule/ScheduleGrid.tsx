'use client'

import { useState, useCallback } from 'react'
import { get30Days, toDateString } from '@/lib/schedule'
import type { TimeSlot, ScheduleData } from '@/lib/types'
import { DateNav } from './DateNav'
import { SlotGrid } from './SlotGrid'
import { FloatingBar } from './FloatingBar'
import { BookingSheet } from './BookingSheet'

interface Selection {
  date: string
  slots: TimeSlot[]
}

interface ScheduleGridProps {
  initialData: ScheduleData
  initialStartDate: string
}

export function ScheduleGrid({ initialData, initialStartDate }: ScheduleGridProps) {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const [startDate, setStartDate] = useState(initialStartDate)
  const [data, setData] = useState<ScheduleData>(initialData)
  const [loading, setLoading] = useState(false)
  const [isStudent, setIsStudent] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)

  const days = get30Days(new Date(startDate + 'T00:00:00'))
  const isPrevDisabled = selectedDate <= todayStr

  const handleToday = useCallback(async () => {
    if (startDate !== initialStartDate) {
      setLoading(true)
      try {
        const res = await fetch(`/api/schedule?startDate=${initialStartDate}`)
        const newData: ScheduleData = await res.json()
        setData(newData)
        setStartDate(initialStartDate)
      } finally {
        setLoading(false)
      }
    }
    setSelectedDate(todayStr)
    setSelection(null)
  }, [startDate, todayStr, initialStartDate])

  const handleJumpToMonth = useCallback(
    async (year: number, month: number) => {
      const today = new Date(todayStr + 'T00:00:00')
      const target = new Date(year, month, 1)
      // If it's the current month, jump to today
      const newStart = target <= today ? todayStr : toDateString(target)

      // Already in this window
      const windowStart = new Date(startDate + 'T00:00:00')
      const windowEnd = new Date(startDate + 'T00:00:00')
      windowEnd.setDate(windowEnd.getDate() + 29)
      const targetDate = new Date(newStart + 'T00:00:00')
      if (targetDate >= windowStart && targetDate <= windowEnd) {
        setSelectedDate(newStart)
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`/api/schedule?startDate=${newStart}`)
        const newData: ScheduleData = await res.json()
        setData(newData)
        setStartDate(newStart)
        setSelectedDate(newStart)
        setSelection(null)
      } finally {
        setLoading(false)
      }
    },
    [startDate, todayStr]
  )

  const handleShift = useCallback(
    async (direction: 1 | -1) => {
      const current = new Date(selectedDate + 'T00:00:00')
      current.setDate(current.getDate() + direction * 7)
      const newSelected = toDateString(current)
      if (newSelected < todayStr) return

      // Cek apakah newSelected masih dalam window data saat ini
      const windowEnd = new Date(startDate + 'T00:00:00')
      windowEnd.setDate(windowEnd.getDate() + 29)
      const windowEndStr = toDateString(windowEnd)

      if (newSelected >= startDate && newSelected <= windowEndStr) {
        setSelectedDate(newSelected)
        setSelection(null)
        return
      }

      // Di luar window — fetch data baru
      setLoading(true)
      try {
        const res = await fetch(`/api/schedule?startDate=${newSelected}`)
        const newData: ScheduleData = await res.json()
        setData(newData)
        setStartDate(newSelected)
        setSelectedDate(newSelected)
        setSelection(null)
      } finally {
        setLoading(false)
      }
    },
    [startDate, selectedDate, todayStr]
  )

  const handleSlotClick = useCallback((slot: TimeSlot) => {
    setSelection(prev => {
      if (!prev || prev.date !== selectedDate) {
        return { date: selectedDate, slots: [slot] }
      }

      const sorted = [...prev.slots].sort((a, b) => a.start_hour - b.start_hour)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]

      if (slot.id === first.id || slot.id === last.id) {
        const filtered = prev.slots.filter(s => s.id !== slot.id)
        return filtered.length > 0 ? { date: selectedDate, slots: filtered } : null
      }
      if (slot.start_hour === last.end_hour) return { date: selectedDate, slots: [...prev.slots, slot] }
      if (slot.end_hour === first.start_hour) return { date: selectedDate, slots: [slot, ...prev.slots] }
      return { date: selectedDate, slots: [slot] }
    })
  }, [selectedDate])

  const handleBookingSuccess = useCallback(
    (bookingIds: string[]) => {
      if (!selection) return
      const sorted = [...selection.slots].sort((a, b) => a.start_hour - b.start_hour)
      setData(prev => ({
        ...prev,
        bookings: [
          ...prev.bookings,
          ...sorted.map((slot, i) => ({
            id: bookingIds[i],
            team_name: '',
            booking_date: selection.date,
            time_slot_id: slot.id,
            status: 'pending' as const,
            total_price: null,
            phone: null,
            voucher_id: null,
            followup_voucher_id: null,
            created_at: new Date().toISOString(),
          })),
        ],
      }))
      setSelection(null)
      setBookingOpen(false)
    },
    [selection]
  )

  return (
    <div className="min-h-screen bg-slate-950 max-w-[960px] mx-auto">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img src="/logo-icon.svg" alt="Logo" className="w-8 h-8 rounded-[10px]" />
          <div>
            <p className="text-[14px] font-bold text-slate-100 leading-tight">Zains Mini Soccer</p>
            <p className="text-[11px] text-slate-400">Jadwal &amp; Booking</p>
          </div>
        </div>

        {/* Toggle Umum / Pelajar */}
        <div className="flex bg-slate-800 rounded-3xl p-[3px]">
          <button
            onClick={() => setIsStudent(false)}
            className={`px-4 py-[7px] rounded-3xl text-[12px] font-bold transition-colors ${
              !isStudent ? 'bg-green-500 text-green-950' : 'text-slate-500'
            }`}
          >
            Umum
          </button>
          <button
            onClick={() => setIsStudent(true)}
            className={`px-4 py-[7px] rounded-3xl text-[12px] font-bold transition-colors ${
              isStudent ? 'bg-green-500 text-green-950' : 'text-slate-500'
            }`}
          >
            Pelajar
          </button>
        </div>
      </header>

      {/* Date navigation */}
      <DateNav
        days={days}
        todayStr={todayStr}
        selectedDate={selectedDate}
        bookings={data.bookings}
        onSelectDate={d => {
          setSelectedDate(d)
          if (selection?.date !== d) setSelection(null)
        }}
        onShift={handleShift}
        onToday={handleToday}
        onJumpToMonth={handleJumpToMonth}
        isShiftDisabled={isPrevDisabled}
      />

      {/* Slot grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          Memuat jadwal...
        </div>
      ) : (
        <SlotGrid
          slots={data.slots}
          date={selectedDate}
          bookings={data.bookings}
          blockedDates={data.blockedDates}
          priceOverrides={data.priceOverrides ?? []}
          todayStr={todayStr}
          isStudent={isStudent}
          selection={selection}
          onSlotClick={handleSlotClick}
        />
      )}

      {/* Floating bar */}
      {selection && (
        <FloatingBar
          slots={selection.slots}
          date={selection.date}
          priceOverrides={data.priceOverrides ?? []}
          isStudent={isStudent}
          onPesan={() => setBookingOpen(true)}
          onCancel={() => setSelection(null)}
        />
      )}

      {/* Bottom sheet */}
      {selection && (
        <BookingSheet
          slots={selection.slots}
          date={new Date(selection.date + 'T00:00:00')}
          priceOverrides={data.priceOverrides ?? []}
          isStudent={isStudent}
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  )
}

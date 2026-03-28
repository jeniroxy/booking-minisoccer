import type { TimeSlot, Booking, BlockedDate, SlotStatus } from './types'

export function getSlotStatus(
  slot: TimeSlot,
  date: string,
  bookings: Booking[],
  blockedDates: BlockedDate[],
  todayStr: string
): { status: SlotStatus; bookingId?: string } {
  // 1. Past check
  if (date < todayStr) return { status: 'past' }
  if (date === todayStr) {
    const nowHour = new Date().getHours()
    if (slot.end_hour <= nowHour) return { status: 'past' }
  }

  // 2. Blocked check (full-day or slot-specific)
  const isBlocked = blockedDates.some(
    bd => bd.date === date && (bd.time_slot_id === null || bd.time_slot_id === slot.id)
  )
  if (isBlocked) return { status: 'blocked' }

  // 3. Booking check (ignore cancelled)
  const booking = bookings.find(
    b => b.booking_date === date && b.time_slot_id === slot.id && b.status !== 'cancelled'
  )
  if (booking) {
    return { status: booking.status as 'pending' | 'confirmed', bookingId: booking.id }
  }

  return { status: 'available' }
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month - 1, 1)
  while (date.getMonth() === month - 1) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export function get30Days(from: Date): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(from)
    d.setDate(from.getDate() + i)
    days.push(d)
  }
  return days
}

export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function formatDayHeader(date: Date): string {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  return `${days[date.getDay()]} ${date.getDate()}`
}

export function formatPrice(price: number): string {
  return `${Math.round(price / 1000)}K`
}

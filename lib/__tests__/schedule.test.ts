import { describe, it, expect } from 'vitest'
import {
  getSlotStatus,
  getDaysInMonth,
  get30Days,
  formatHour,
  formatPrice,
  formatDayHeader,
  formatDayShort,
  formatFullDate,
  toDateString,
} from '../schedule'
import type { TimeSlot, Booking, BlockedDate } from '../types'

const slot: TimeSlot = {
  id: 'slot-1',
  start_hour: 9,
  end_hour: 10,
  price: 80000,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

describe('getSlotStatus', () => {
  it('returns past for date before today', () => {
    const { status } = getSlotStatus(slot, '2024-01-01', [], [], '2026-03-27')
    expect(status).toBe('past')
  })

  it('returns available for future unblocked unbooked slot', () => {
    const { status } = getSlotStatus(slot, '2026-03-28', [], [], '2026-03-27')
    expect(status).toBe('available')
  })

  it('returns blocked for full-day block (time_slot_id null)', () => {
    const blocked: BlockedDate[] = [
      { id: 'b1', date: '2026-03-28', time_slot_id: null, reason: null, created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', [], blocked, '2026-03-27')
    expect(status).toBe('blocked')
  })

  it('returns blocked for slot-specific block', () => {
    const blocked: BlockedDate[] = [
      { id: 'b1', date: '2026-03-28', time_slot_id: 'slot-1', reason: null, created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', [], blocked, '2026-03-27')
    expect(status).toBe('blocked')
  })

  it('returns available when a different slot is blocked on same date', () => {
    const blocked: BlockedDate[] = [
      { id: 'b1', date: '2026-03-28', time_slot_id: 'slot-99', reason: null, created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', [], blocked, '2026-03-27')
    expect(status).toBe('available')
  })

  it('returns pending for a pending booking', () => {
    const bookings: Booking[] = [
      { id: 'bk1', team_name: 'A', booking_date: '2026-03-28', time_slot_id: 'slot-1', status: 'pending', created_at: '' },
    ]
    const { status, bookingId } = getSlotStatus(slot, '2026-03-28', bookings, [], '2026-03-27')
    expect(status).toBe('pending')
    expect(bookingId).toBe('bk1')
  })

  it('returns confirmed for a confirmed booking', () => {
    const bookings: Booking[] = [
      { id: 'bk1', team_name: 'A', booking_date: '2026-03-28', time_slot_id: 'slot-1', status: 'confirmed', created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', bookings, [], '2026-03-27')
    expect(status).toBe('confirmed')
  })

  it('returns available when booking is cancelled (slot freed)', () => {
    const bookings: Booking[] = [
      { id: 'bk1', team_name: 'A', booking_date: '2026-03-28', time_slot_id: 'slot-1', status: 'cancelled', created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', bookings, [], '2026-03-27')
    expect(status).toBe('available')
  })

  it('blocked takes precedence over booking check', () => {
    const blocked: BlockedDate[] = [
      { id: 'b1', date: '2026-03-28', time_slot_id: null, reason: null, created_at: '' },
    ]
    const bookings: Booking[] = [
      { id: 'bk1', team_name: 'A', booking_date: '2026-03-28', time_slot_id: 'slot-1', status: 'pending', created_at: '' },
    ]
    const { status } = getSlotStatus(slot, '2026-03-28', bookings, blocked, '2026-03-27')
    expect(status).toBe('blocked')
  })
})

describe('getDaysInMonth', () => {
  it('returns 31 days for March 2026', () => {
    expect(getDaysInMonth(2026, 3)).toHaveLength(31)
  })

  it('returns 28 days for February 2026 (non-leap)', () => {
    expect(getDaysInMonth(2026, 2)).toHaveLength(28)
  })

  it('returns 29 days for February 2024 (leap year)', () => {
    expect(getDaysInMonth(2024, 2)).toHaveLength(29)
  })

  it('first element of March 2026 is March 1', () => {
    const days = getDaysInMonth(2026, 3)
    expect(days[0].getDate()).toBe(1)
    expect(days[0].getMonth()).toBe(2)
  })
})

describe('formatHour', () => {
  it('pads single-digit hour with zero', () => {
    expect(formatHour(8)).toBe('08:00')
  })

  it('does not pad two-digit hour', () => {
    expect(formatHour(14)).toBe('14:00')
  })
})

describe('formatPrice', () => {
  it('formats 80000 as 80K', () => {
    expect(formatPrice(80000)).toBe('80K')
  })

  it('formats 120000 as 120K', () => {
    expect(formatPrice(120000)).toBe('120K')
  })
})

describe('get30Days', () => {
  it('returns exactly 30 days', () => {
    expect(get30Days(new Date(2026, 2, 28))).toHaveLength(30)
  })

  it('first element is the start date', () => {
    const start = new Date(2026, 2, 28)
    const days = get30Days(start)
    expect(days[0].getDate()).toBe(28)
    expect(days[0].getMonth()).toBe(2)
  })

  it('spans across month boundary correctly', () => {
    const days = get30Days(new Date(2026, 2, 28)) // Mar 28
    expect(days[29].getMonth()).toBe(3) // ends in April
  })
})

describe('toDateString', () => {
  it('returns YYYY-MM-DD from a Date object', () => {
    const d = new Date(2026, 2, 27)
    expect(toDateString(d)).toBe('2026-03-27')
  })
})

describe('formatDayHeader', () => {
  it('returns abbreviated Indonesian day name with date number for Sunday', () => {
    const sunday = new Date(2026, 2, 1) // March 1, 2026 is Sunday
    expect(formatDayHeader(sunday)).toBe('Min 1')
  })

  it('returns Sen for Monday', () => {
    const monday = new Date(2026, 2, 2) // March 2, 2026 is Monday
    expect(formatDayHeader(monday)).toBe('Sen 2')
  })
})

describe('formatDayShort', () => {
  it('returns 3-letter day name in Indonesian', () => {
    expect(formatDayShort(new Date('2026-03-30T00:00:00'))).toBe('Sen')
    expect(formatDayShort(new Date('2026-03-31T00:00:00'))).toBe('Sel')
    expect(formatDayShort(new Date('2026-04-01T00:00:00'))).toBe('Rab')
  })
})

describe('formatFullDate', () => {
  it('returns full Indonesian date label', () => {
    expect(formatFullDate(new Date('2026-03-30T00:00:00'))).toBe('Senin, 30 Mar 2026')
    expect(formatFullDate(new Date('2026-03-29T00:00:00'))).toBe('Minggu, 29 Mar 2026')
  })
})

describe('getSlotStatus with teamName', () => {
  it('returns teamName for confirmed booking', () => {
    const booking: Booking = {
      id: 'b1',
      team_name: 'FC Garuda',
      booking_date: '2026-03-30',
      time_slot_id: 'slot-1',
      status: 'confirmed',
      created_at: '2026-01-01T00:00:00Z',
    }
    const result = getSlotStatus(slot, '2026-03-30', [booking], [], '2026-03-29')
    expect(result.status).toBe('confirmed')
    expect(result.teamName).toBe('FC Garuda')
  })

  it('returns teamName for pending booking', () => {
    const booking: Booking = {
      id: 'b2',
      team_name: 'Bintang FC',
      booking_date: '2026-03-30',
      time_slot_id: 'slot-1',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
    }
    const result = getSlotStatus(slot, '2026-03-30', [booking], [], '2026-03-29')
    expect(result.teamName).toBe('Bintang FC')
  })
})

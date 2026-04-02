import { describe, it, expect } from 'vitest'
import { buildWAUrl, formatDateLabel, buildConfirmUrl } from '../booking'

describe('buildWAUrl', () => {
  it('returns a whatsapp:// URL with the correct phone number', () => {
    const url = buildWAUrl({
      teamName: 'Tim Garuda',
      dateLabel: 'Rabu, 27 Mar 2026',
      startHour: 9,
      endHour: 10,
      totalPrice: 80000,
      isStudent: false,
      waNumber: '6281400842380',
    })
    expect(url).toMatch(/^whatsapp:\/\/send\?phone=6281400842380/)
  })

  it('encodes the message as a query param containing team name', () => {
    const url = buildWAUrl({
      teamName: 'Tim Garuda',
      dateLabel: 'Rabu, 27 Mar 2026',
      startHour: 9,
      endHour: 10,
      totalPrice: 80000,
      isStudent: false,
      waNumber: '6281400842380',
    })
    expect(url).toContain('&text=')
    expect(url).toContain('Tim%20Garuda')
  })

  it('pads single-digit hours in the time range', () => {
    const url = buildWAUrl({
      teamName: 'T',
      dateLabel: 'Sen, 30 Mar 2026',
      startHour: 8,
      endHour: 9,
      totalPrice: 80000,
      isStudent: false,
      waNumber: '6281400842380',
    })
    expect(url).toContain('08%3A00-09%3A00')
  })

  it('includes Rp and price amount in the message', () => {
    const url = buildWAUrl({
      teamName: 'T',
      dateLabel: 'Sab, 28 Mar 2026',
      startHour: 20,
      endHour: 21,
      totalPrice: 120000,
      isStudent: false,
      waNumber: '6281400842380',
    })
    expect(url).toContain('Rp')
    expect(url).toContain('120')
  })

  it('includes Pelajar category in message when isStudent is true', () => {
    const url = buildWAUrl({
      teamName: 'T',
      dateLabel: 'Sen, 30 Mar 2026',
      startHour: 8,
      endHour: 10,
      totalPrice: 60000,
      isStudent: true,
      waNumber: '6281400842380',
    })
    expect(url).toContain('Pelajar')
  })
})

describe('formatDateLabel', () => {
  it('returns a human-readable Indonesian date string containing the year', () => {
    const d = new Date(2026, 2, 27)
    const label = formatDateLabel(d)
    expect(label).toContain('2026')
    expect(label.length).toBeGreaterThan(5)
  })
})

const baseBooking = {
  phone: '08123456789',
  team_name: 'Tim Garuda',
  booking_date: '2026-04-05',
  time_slots: { start_hour: 8, end_hour: 9, id: '1', price: 150000, is_active: true, created_at: '' },
  total_price: 150000,
}

describe('buildConfirmUrl', () => {
  it('returns null when phone is null', () => {
    expect(buildConfirmUrl({ ...baseBooking, phone: null })).toBeNull()
  })

  it('returns null when phone is empty string', () => {
    expect(buildConfirmUrl({ ...baseBooking, phone: '' })).toBeNull()
  })

  it('returns a whatsapp:// URL with digits-only phone', () => {
    const url = buildConfirmUrl(baseBooking)
    expect(url).toMatch(/^whatsapp:\/\/send\?phone=08123456789/)
  })

  it('strips non-digit characters from phone', () => {
    const url = buildConfirmUrl({ ...baseBooking, phone: '+62 812-3456-789' })
    expect(url).toMatch(/^whatsapp:\/\/send\?phone=62812345678/)
  })

  it('includes team name in message', () => {
    const url = buildConfirmUrl(baseBooking)!
    expect(decodeURIComponent(url)).toContain('Tim Garuda')
  })

  it('includes zero-padded time range in message', () => {
    const url = buildConfirmUrl(baseBooking)!
    expect(decodeURIComponent(url)).toContain('08:00–09:00')
  })

  it('includes price in message', () => {
    const url = buildConfirmUrl(baseBooking)!
    expect(decodeURIComponent(url)).toContain('150')
  })

  it('uses total_price when available, falls back to time_slots.price', () => {
    const url = buildConfirmUrl({ ...baseBooking, total_price: null })!
    expect(decodeURIComponent(url)).toContain('150')
  })

  it('includes the Sundanese closing phrase', () => {
    const url = buildConfirmUrl(baseBooking)!
    expect(decodeURIComponent(url)).toContain('Di antos kasumpingana')
  })

  it('includes the 15-minute tolerance note', () => {
    const url = buildConfirmUrl(baseBooking)!
    expect(decodeURIComponent(url)).toContain('Toleransi waktu 15 menit')
  })
})

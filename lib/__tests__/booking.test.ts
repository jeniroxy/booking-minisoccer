import { describe, it, expect } from 'vitest'
import { buildWAUrl, formatDateLabel } from '../booking'

describe('buildWAUrl', () => {
  it('returns a wa.me URL with the correct phone number', () => {
    const url = buildWAUrl({
      teamName: 'Tim Garuda',
      dateLabel: 'Rabu, 27 Mar 2026',
      startHour: 9,
      endHour: 10,
      totalPrice: 80000,
      isStudent: false,
      waNumber: '6281400842380',
    })
    expect(url).toMatch(/^https:\/\/wa\.me\/6281400842380/)
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
    expect(url).toContain('?text=')
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

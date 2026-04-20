import { getDatesForDayOfWeek } from '../recurring'

describe('getDatesForDayOfWeek', () => {
  it('returns all matching weekdays in range', () => {
    // 2026-04-20 is a Monday (day 1)
    // Rabu (3) dalam range Mon Apr 20 – Sun May 17
    const dates = getDatesForDayOfWeek(3, '2026-04-20', '2026-05-17')
    expect(dates).toEqual(['2026-04-22', '2026-04-29', '2026-05-06', '2026-05-13'])
  })

  it('returns empty array if no matching day in range', () => {
    // Single day range, no matching day
    const dates = getDatesForDayOfWeek(5, '2026-04-20', '2026-04-20')
    expect(dates).toEqual([])
  })

  it('includes fromDate itself if it matches the day', () => {
    // 2026-04-22 is a Wednesday (day 3)
    const dates = getDatesForDayOfWeek(3, '2026-04-22', '2026-04-22')
    expect(dates).toEqual(['2026-04-22'])
  })
})

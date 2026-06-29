import { describe, it, expect } from 'vitest'
import { effectiveSlotPrice, allocateSlotPrices } from '@/lib/manual-booking'
import type { TimeSlot, SlotPriceOverride } from '@/lib/types'

const slot = (id: string, price: number): TimeSlot => ({
  id, start_hour: 19, end_hour: 20, price, is_active: true, created_at: '',
})

describe('effectiveSlotPrice', () => {
  it('returns base price for umum without override', () => {
    expect(effectiveSlotPrice(slot('s1', 100000), '2026-07-01', [], 'umum')).toBe(100000)
  })

  it('applies price override when present', () => {
    const ov: SlotPriceOverride[] = [{ id: 'o1', date: '2026-07-01', time_slot_id: 's1', price: 80000, created_at: '' }]
    expect(effectiveSlotPrice(slot('s1', 100000), '2026-07-01', ov, 'umum')).toBe(80000)
  })

  it('applies student discount on top of effective price', () => {
    // 150000 > MAX_STUDENT_PRICE(125000) -> 150000-50000=100000, floored at 125000 => 125000
    expect(effectiveSlotPrice(slot('s1', 150000), '2026-07-01', [], 'pelajar')).toBe(125000)
  })
})

describe('allocateSlotPrices', () => {
  const slots = [slot('s1', 100000), slot('s2', 120000)]

  it('sums effective prices per slot when no total override', () => {
    expect(allocateSlotPrices(slots, '2026-07-01', [], 'umum')).toEqual([100000, 120000])
  })

  it('allocates positive difference to first slot', () => {
    // base sum = 220000, total override 200000 -> diff -20000 to first slot
    expect(allocateSlotPrices(slots, '2026-07-01', [], 'umum', 200000)).toEqual([80000, 120000])
  })

  it('ignores total override equal to sum', () => {
    expect(allocateSlotPrices(slots, '2026-07-01', [], 'umum', 220000)).toEqual([100000, 120000])
  })
})

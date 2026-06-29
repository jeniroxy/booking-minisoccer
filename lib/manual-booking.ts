import { getEffectivePrice, getStudentPrice } from '@/lib/schedule'
import type { TimeSlot, SlotPriceOverride } from '@/lib/types'

export function effectiveSlotPrice(
  slot: TimeSlot,
  date: string,
  overrides: SlotPriceOverride[],
  customerType: 'umum' | 'pelajar'
): number {
  const base = getEffectivePrice(slot, date, overrides)
  return customerType === 'pelajar' ? getStudentPrice(base) : base
}

export function allocateSlotPrices(
  slots: TimeSlot[],
  date: string,
  overrides: SlotPriceOverride[],
  customerType: 'umum' | 'pelajar',
  totalOverride?: number | null
): number[] {
  const prices = slots.map(s => effectiveSlotPrice(s, date, overrides, customerType))
  if (totalOverride == null || prices.length === 0) return prices
  const sum = prices.reduce((a, b) => a + b, 0)
  const diff = totalOverride - sum
  if (diff !== 0) prices[0] = prices[0] + diff
  return prices
}

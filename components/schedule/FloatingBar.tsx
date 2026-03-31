'use client'

import { formatPrice, formatHour, getEffectivePrice, getStudentPrice } from '@/lib/schedule'
import type { TimeSlot, SlotPriceOverride } from '@/lib/types'

interface FloatingBarProps {
  slots: TimeSlot[]
  date: string
  priceOverrides: SlotPriceOverride[]
  isStudent: boolean
  onPesan: () => void
  onCancel: () => void
}

export function FloatingBar({ slots, date, priceOverrides, isStudent, onPesan, onCancel }: FloatingBarProps) {
  const sorted = [...slots].sort((a, b) => a.start_hour - b.start_hour)
  const slotPrice = (s: TimeSlot) => {
    const p = getEffectivePrice(s, date, priceOverrides)
    return isStudent ? getStudentPrice(p) : p
  }
  const total = sorted.reduce((sum, s) => sum + slotPrice(s), 0)
  const dur = sorted.length

  const [, month, day] = date.split('-')
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const dateLabel = `${parseInt(day)} ${months[parseInt(month)]}`

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg">
      <div className="bg-green-500 rounded-2xl px-4 py-3 flex items-center justify-between shadow-[0_4px_24px_rgba(34,197,94,0.4)]">
        <div>
          <p className="text-[13px] font-bold text-green-950">
            {dur} jam · {formatPrice(total)}
          </p>
          <p className="text-[10px] font-medium text-green-800 mt-0.5">
            {dateLabel} · {formatHour(sorted[0].start_hour)} – {formatHour(sorted[sorted.length - 1].end_hour)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPesan}
            className="bg-green-950 text-green-400 rounded-xl px-[18px] py-2.5 text-[13px] font-bold whitespace-nowrap"
          >
            Booking Sekarang
          </button>
          <button
            onClick={onCancel}
            aria-label="Batal pilih"
            className="text-green-800 hover:text-green-950 text-base font-bold"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

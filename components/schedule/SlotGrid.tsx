'use client'

import { cn } from '@/lib/utils'
import { getSlotStatus, formatHour, formatPrice, formatFullDate, getEffectivePrice, STUDENT_DISCOUNT } from '@/lib/schedule'
import type { TimeSlot, Booking, BlockedDate, SlotStatus, SlotPriceOverride } from '@/lib/types'

interface Selection {
  date: string
  slots: TimeSlot[]
}

interface SlotGridProps {
  slots: TimeSlot[]
  date: string
  bookings: Booking[]
  blockedDates: BlockedDate[]
  priceOverrides: SlotPriceOverride[]
  todayStr: string
  isStudent: boolean
  selection: Selection | null
  onSlotClick: (slot: TimeSlot) => void
}

interface SlotCardProps {
  slot: TimeSlot
  status: SlotStatus
  teamName?: string
  price: number
  isSelected: boolean
  onClick?: () => void
}

function SlotCard({ slot, status, teamName, price, isSelected, onClick }: SlotCardProps) {
  if (status === 'past') return null

  const timeLabel = `${formatHour(slot.start_hour)} – ${formatHour(slot.end_hour)}`

  if (status === 'available') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full bg-slate-800 border-[1.5px] rounded-xl p-2.5 text-left transition-all relative',
          isSelected
            ? 'bg-green-900 border-green-500 ring-1 ring-green-500/30'
            : 'border-slate-700 hover:border-green-500 hover:bg-slate-700/50'
        )}
      >
        <p className={cn('text-[13px] mb-1', isSelected ? 'text-green-300' : 'text-slate-500')}>
          {timeLabel}
        </p>
        <p className={cn('text-[22px] font-extrabold leading-none tracking-tight', isSelected ? 'text-green-400' : 'text-green-500')}>
          {formatPrice(price)}
        </p>
        {isSelected && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[8px] font-bold text-green-950">✓</span>
        )}
      </button>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="bg-[#120a0a] border border-red-500/20 rounded-xl p-2.5 cursor-not-allowed">
        <p className="text-[13px] text-slate-600 mb-1.5">{timeLabel}</p>
        <span className="inline-flex items-center gap-1 bg-red-500/30 border border-red-500/40 rounded-md px-1.5 py-0.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
          <span className="text-[8px] font-bold text-red-300 uppercase tracking-wider">Booked</span>
        </span>
        {teamName && (
          <p className="text-[11px] font-semibold text-slate-400 truncate">{teamName}</p>
        )}
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="bg-[#1c1a07] border border-yellow-700/50 rounded-xl p-2.5 cursor-not-allowed opacity-70">
        <p className="text-[13px] text-slate-600 mb-1.5">{timeLabel}</p>
        <span className="inline-flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/35 rounded-md px-1.5 py-0.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
          <span className="text-[8px] font-bold text-yellow-400 uppercase tracking-wider">Pending</span>
        </span>
        {teamName && (
          <p className="text-[11px] font-semibold text-slate-500 truncate">{teamName}</p>
        )}
      </div>
    )
  }

  // blocked
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 cursor-not-allowed opacity-35">
      <p className="text-[13px] text-slate-600 mb-1">{timeLabel}</p>
      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Tutup</p>
    </div>
  )
}

export function SlotGrid({
  slots,
  date,
  bookings,
  blockedDates,
  priceOverrides,
  todayStr,
  isStudent,
  selection,
  onSlotClick,
}: SlotGridProps) {
  const slotPrice = (s: TimeSlot) => Math.max(0, getEffectivePrice(s, date, priceOverrides) - (isStudent ? STUDENT_DISCOUNT : 0))
  const activeDate = new Date(date + 'T00:00:00')

  const availableCount = slots.filter(s => {
    const { status } = getSlotStatus(s, date, bookings, blockedDates, todayStr)
    return status === 'available'
  }).length

  return (
    <div className="px-3.5 pb-32">
      {/* Day label + count */}
      <div className="flex items-center justify-between py-2.5">
        <p className="text-[12px] font-semibold text-slate-100">
          {formatFullDate(activeDate)}
          {todayStr === date && <span className="text-slate-500 font-normal"> · Hari ini</span>}
        </p>
        <span className="text-[9px] text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
          {availableCount} tersedia
        </span>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-2">
        {slots.map(slot => {
          const { status, teamName } = getSlotStatus(slot, date, bookings, blockedDates, todayStr)
          if (status === 'past') return null
          const isSelected = selection?.date === date && selection.slots.some(s => s.id === slot.id)
          return (
            <SlotCard
              key={slot.id}
              slot={slot}
              status={status}
              teamName={teamName}
              price={slotPrice(slot)}
              isSelected={isSelected}
              onClick={status === 'available' ? () => onSlotClick(slot) : undefined}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-800">
        {[
          { color: 'bg-green-500', label: 'Tersedia' },
          { color: 'bg-green-900 border border-green-500', label: 'Dipilih' },
          { color: 'bg-red-500/30 border border-red-500/40', label: 'Booked' },
          { color: 'bg-yellow-500/20 border border-yellow-500/35', label: 'Pending' },
          { color: 'bg-slate-800 border border-slate-700 opacity-35', label: 'Tutup' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-sm inline-block', color)} />
            <span className="text-[9px] text-slate-500">{label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

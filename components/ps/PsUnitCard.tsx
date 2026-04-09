'use client'

import type { PsUnit } from '@/lib/types'

interface PsUnitCardProps {
  unit: PsUnit
  isOccupied: boolean
  onBook: (unitId: string) => void
}

export function PsUnitCard({ unit, isOccupied, onBook }: PsUnitCardProps) {
  const isMaintenance = unit.status === 'maintenance'
  const available = !isOccupied && !isMaintenance

  return (
    <div className={`bg-slate-800 rounded-2xl border-[1.5px] p-4 flex flex-col transition-all ${
      isMaintenance
        ? 'border-amber-500/30 bg-amber-950/20'
        : isOccupied
        ? 'border-red-500/30 bg-red-950/20'
        : 'border-green-500/30 bg-slate-800 hover:border-green-500 hover:bg-slate-700/50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-bold text-slate-100">{unit.name}</h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${
          unit.type === 'PS5'
            ? 'text-blue-400 bg-blue-500/15 border border-blue-500/30'
            : 'text-slate-400 bg-slate-700 border border-slate-600'
        }`}>
          {unit.type}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center py-4">
        <div className={`text-[12px] font-bold px-3 py-1.5 rounded-xl ${
          isMaintenance
            ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
            : isOccupied
            ? 'text-red-400 bg-red-500/15 border border-red-500/30'
            : 'text-green-400 bg-green-500/15 border border-green-500/30'
        }`}>
          {isMaintenance ? 'Maintenance' : isOccupied ? 'Sedang Dipakai' : 'Tersedia'}
        </div>
      </div>

      <button
        onClick={() => onBook(unit.id)}
        disabled={!available}
        className={`w-full mt-3 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
          available
            ? 'bg-green-500 text-green-950 hover:bg-green-400 shadow-[0_4px_16px_rgba(34,197,94,0.25)]'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        {available ? 'Booking' : isMaintenance ? 'Tidak Tersedia' : 'Terisi'}
      </button>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { formatHour, formatPrice } from '@/lib/schedule'
import { DollarSign, Trash2 } from 'lucide-react'
import type { TimeSlot, SlotPriceOverride } from '@/lib/types'

interface PriceOverrideManagerProps {
  initialOverrides: SlotPriceOverride[]
  slots: TimeSlot[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function PriceOverrideManager({ initialOverrides, slots }: PriceOverrideManagerProps) {
  const [overrides, setOverrides] = useState(initialOverrides)
  const [date, setDate] = useState('')
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const allSlotIds = slots.map(s => s.id)
  const allSelected = allSlotIds.length > 0 && allSlotIds.every(id => selectedSlotIds.includes(id))

  const toggleSlot = (slotId: string) => {
    setSelectedSlotIds(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    )
  }

  const toggleAll = () => {
    setSelectedSlotIds(allSelected ? [] : allSlotIds)
  }

  const addOverride = async () => {
    const parsedPrice = parseInt(price, 10)
    if (!date || selectedSlotIds.length === 0 || !parsedPrice || parsedPrice <= 0) {
      setError('Tanggal, jam, dan harga wajib diisi')
      return
    }
    setError('')
    setSaving(true)

    const results = await Promise.all(
      selectedSlotIds.map(slotId =>
        fetch('/api/admin/price-overrides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, time_slot_id: slotId, price: parsedPrice }),
        })
      )
    )

    const newOverrides: SlotPriceOverride[] = []
    let hasError = false
    for (const res of results) {
      if (res.ok) {
        newOverrides.push(await res.json())
      } else {
        hasError = true
      }
    }

    if (newOverrides.length > 0) {
      setOverrides(prev => {
        const filtered = prev.filter(
          o => !newOverrides.some(n => n.date === o.date && n.time_slot_id === o.time_slot_id)
        )
        return [...filtered, ...newOverrides].sort((a, b) => a.date.localeCompare(b.date))
      })
      setSelectedSlotIds([])
      setPrice('')
      if (!hasError) setDate('')
    }

    if (hasError) {
      setError('Beberapa jam gagal disimpan. Coba lagi.')
    }
    setSaving(false)
  }

  const removeOverride = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/admin/price-overrides/${id}`, { method: 'DELETE' })
    setOverrides(prev => prev.filter(o => o.id !== id))
    setDeletingId(null)
  }

  const slotLabel = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId)
    return slot ? `${formatHour(slot.start_hour)}–${formatHour(slot.end_hour)}` : '–'
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800/80 overflow-hidden">
      <div className="px-4 py-3.5 border-b border-slate-800/80">
        <h2 className="text-[15px] font-bold text-slate-100">Harga Custom per Tanggal</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Override harga untuk jam tertentu pada tanggal tertentu.
        </p>
      </div>

      {/* Form */}
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all [color-scheme:dark]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Harga Baru (Rp)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="misal: 120000"
              min={1000}
              step={1000}
              className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
          </div>
        </div>

        {/* Slot selector grid */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">
            Pilih Jam <span className="text-slate-600">({selectedSlotIds.length} dipilih)</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={toggleAll}
              className={`col-span-2 flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm border transition-all text-left font-bold ${
                allSelected
                  ? 'bg-green-500/15 border-green-500/30 text-green-300'
                  : 'bg-slate-900/80 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className={`w-5 h-5 rounded-md flex-shrink-0 border-2 flex items-center justify-center text-[10px] transition-all ${
                allSelected
                  ? 'bg-green-500 border-green-500 text-green-950'
                  : 'border-slate-600'
              }`}>
                {allSelected && '✓'}
              </span>
              <span>Seharian</span>
            </button>
            {slots.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSlot(s.id)}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm border transition-all text-left ${
                  selectedSlotIds.includes(s.id)
                    ? 'bg-green-500/15 border-green-500/30 text-green-300'
                    : 'bg-slate-900/80 border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className={`w-5 h-5 rounded-md flex-shrink-0 border-2 flex items-center justify-center text-[10px] transition-all ${
                  selectedSlotIds.includes(s.id)
                    ? 'bg-green-500 border-green-500 text-green-950'
                    : 'border-slate-600'
                }`}>
                  {selectedSlotIds.includes(s.id) && '✓'}
                </span>
                <span className="font-medium">{formatHour(s.start_hour)}–{formatHour(s.end_hour)}</span>
                <span className="text-slate-600 ml-auto text-xs">{formatPrice(s.price)}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={addOverride}
          disabled={saving || !date || selectedSlotIds.length === 0 || !price}
          className="w-full py-3 rounded-xl text-sm font-bold bg-green-500 text-green-950 hover:bg-green-400 active:bg-green-600 disabled:opacity-40 transition-colors shadow-lg shadow-green-500/20"
        >
          {saving ? 'Menyimpan...' : `Simpan ${selectedSlotIds.length > 0 ? `(${selectedSlotIds.length} jam)` : ''}`}
        </button>
      </div>

      {/* List */}
      {overrides.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <DollarSign size={32} className="mx-auto text-slate-700 mb-2" />
          <p className="text-sm text-slate-500">Belum ada harga custom</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/30">
          {overrides.map(o => (
            <div key={o.id} className="flex items-center justify-between px-4 py-3.5 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200">{formatDate(o.date)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">{slotLabel(o.time_slot_id)}</span>
                  <span className="text-xs font-bold text-green-400">{formatPrice(o.price)}</span>
                </div>
              </div>
              <button
                onClick={() => removeOverride(o.id)}
                disabled={deletingId === o.id}
                className="flex-shrink-0 p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                title="Hapus"
              >
                {deletingId === o.id ? '...' : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { formatHour, formatPrice } from '@/lib/schedule'
import type { TimeSlot, SlotPriceOverride } from '@/lib/types'

interface PriceOverrideManagerProps {
  initialOverrides: SlotPriceOverride[]
  slots: TimeSlot[]
}

export function PriceOverrideManager({ initialOverrides, slots }: PriceOverrideManagerProps) {
  const [overrides, setOverrides] = useState(initialOverrides)
  const [date, setDate] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const addOverride = async () => {
    const parsedPrice = parseInt(price, 10)
    if (!date || !selectedSlotId || !parsedPrice || parsedPrice <= 0) {
      setError('Tanggal, jam, dan harga wajib diisi')
      return
    }
    setError('')
    setSaving(true)

    const res = await fetch('/api/admin/price-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, time_slot_id: selectedSlotId, price: parsedPrice }),
    })

    if (res.ok) {
      const newOverride: SlotPriceOverride = await res.json()
      setOverrides(prev => {
        const filtered = prev.filter(
          o => !(o.date === newOverride.date && o.time_slot_id === newOverride.time_slot_id)
        )
        return [...filtered, newOverride].sort((a, b) => a.date.localeCompare(b.date))
      })
      setDate('')
      setSelectedSlotId('')
      setPrice('')
    } else {
      setError('Gagal menyimpan. Coba lagi.')
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
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-[13px] font-bold text-slate-100">Harga Custom per Tanggal</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Override harga untuk jam tertentu pada tanggal tertentu. Tanggal lain tetap harga normal.
        </p>
      </div>

      {/* Form */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Jam</label>
            <select
              value={selectedSlotId}
              onChange={e => setSelectedSlotId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl text-[13px] px-3 py-2 text-slate-100 outline-none focus:border-green-500 transition-colors"
            >
              <option value="">Pilih jam...</option>
              {slots.map(s => (
                <option key={s.id} value={s.id}>
                  {formatHour(s.start_hour)} – {formatHour(s.end_hour)} ({formatPrice(s.price)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[11px] font-medium text-slate-500">Harga Baru (Rp)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="misal: 120000"
              min={1000}
              step={1000}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <button
            onClick={addOverride}
            disabled={saving || !date || !selectedSlotId || !price}
            className="px-4 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {saving ? 'Menyimpan...' : '+ Simpan'}
          </button>
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>

      {/* List */}
      {overrides.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-slate-500">Belum ada harga custom</p>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {overrides.map(o => (
            <div key={o.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-[13px] font-medium text-slate-200">{o.date}</span>
                <span className="text-[11px] text-slate-500 ml-2">{slotLabel(o.time_slot_id)}</span>
                <span className="text-[12px] font-bold text-green-400 ml-2">{formatPrice(o.price)}</span>
              </div>
              <button
                onClick={() => removeOverride(o.id)}
                disabled={deletingId === o.id}
                className="text-[11px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
              >
                {deletingId === o.id ? '...' : 'Hapus'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

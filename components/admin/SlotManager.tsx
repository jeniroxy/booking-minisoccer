'use client'

import { useState } from 'react'
import { formatHour } from '@/lib/schedule'
import type { TimeSlot } from '@/lib/types'

export function SlotManager({ initialSlots }: { initialSlots: TimeSlot[] }) {
  const [slots, setSlots] = useState(initialSlots)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const startEdit = (slot: TimeSlot) => {
    setEditingId(slot.id)
    setEditPrice(String(slot.price))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPrice('')
  }

  const savePrice = async (slotId: string) => {
    const price = parseInt(editPrice)
    if (isNaN(price) || price <= 0) return
    setSavingId(slotId)
    const res = await fetch(`/api/admin/slots/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSlots(prev => prev.map(s => (s.id === slotId ? updated : s)))
      setEditingId(null)
    }
    setSavingId(null)
  }

  const toggleActive = async (slot: TimeSlot) => {
    setSavingId(slot.id)
    const res = await fetch(`/api/admin/slots/${slot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !slot.is_active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSlots(prev => prev.map(s => (s.id === slot.id ? updated : s)))
    }
    setSavingId(null)
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-[13px] font-bold text-slate-100">Jam Operasional</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Atur harga dan aktifkan/nonaktifkan slot.</p>
      </div>
      <div className="divide-y divide-slate-700/50">
        {slots.map(slot => (
          <div
            key={slot.id}
            className={`flex items-center justify-between px-4 py-3 gap-3 ${!slot.is_active ? 'opacity-40' : ''}`}
          >
            <div className="text-[13px] font-medium text-slate-200 min-w-[110px]">
              {formatHour(slot.start_hour)} – {formatHour(slot.end_hour)}
            </div>

            {editingId === slot.id ? (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[12px] text-slate-500">Rp</span>
                <input
                  type="number"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-[12px] text-slate-100 outline-none focus:border-green-500"
                  autoFocus
                />
                <button
                  onClick={() => savePrice(slot.id)}
                  disabled={savingId === slot.id}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
                >
                  Simpan
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[13px] font-semibold text-green-400">
                  Rp {slot.price.toLocaleString('id-ID')}
                </span>
                <button
                  onClick={() => startEdit(slot)}
                  className="text-[11px] text-slate-500 hover:text-green-400 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}

            <button
              onClick={() => toggleActive(slot)}
              disabled={savingId === slot.id}
              className={`flex-shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-40 ${
                slot.is_active
                  ? 'bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400'
                  : 'bg-slate-700 border border-slate-600 text-slate-400 hover:bg-green-500/20 hover:border-green-500/40 hover:text-green-400'
              }`}
            >
              {slot.is_active ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

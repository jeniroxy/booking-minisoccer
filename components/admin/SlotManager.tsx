'use client'

import { useState } from 'react'
import { formatHour } from '@/lib/schedule'
import { Pencil, Save, X } from 'lucide-react'
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
    <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800/80 overflow-hidden">
      <div className="px-4 py-3.5 border-b border-slate-800/80">
        <h2 className="text-[15px] font-bold text-slate-100">Jam Operasional</h2>
        <p className="text-xs text-slate-500 mt-0.5">Atur harga dan aktifkan/nonaktifkan slot.</p>
      </div>
      <div className="divide-y divide-slate-800/30">
        {slots.map(slot => (
          <div
            key={slot.id}
            className={`flex items-center justify-between px-4 py-3.5 gap-3 transition-opacity ${!slot.is_active ? 'opacity-40' : ''}`}
          >
            {/* Time label */}
            <div className="text-sm font-semibold text-slate-200 min-w-[110px]">
              {formatHour(slot.start_hour)} – {formatHour(slot.end_hour)}
            </div>

            {/* Price: edit mode or display */}
            {editingId === slot.id ? (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-slate-500">Rp</span>
                <input
                  type="number"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-28 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-green-500 transition-colors"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') savePrice(slot.id)
                    if (e.key === 'Escape') cancelEdit()
                  }}
                />
                <button
                  onClick={() => savePrice(slot.id)}
                  disabled={savingId === slot.id}
                  className="p-2 rounded-xl bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-40 transition-colors"
                  title="Simpan"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
                  title="Batal"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-bold text-green-400">
                  Rp {slot.price.toLocaleString('id-ID')}
                </span>
                <button
                  onClick={() => startEdit(slot)}
                  className="p-2 rounded-xl text-slate-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                  title="Edit harga"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}

            {/* Toggle active */}
            <button
              onClick={() => toggleActive(slot)}
              disabled={savingId === slot.id}
              className="flex-shrink-0 relative w-12 h-7 rounded-full transition-colors disabled:opacity-40"
              style={{
                backgroundColor: slot.is_active ? 'rgb(34 197 94 / 0.3)' : 'rgb(51 65 85 / 0.8)',
              }}
              role="switch"
              aria-checked={slot.is_active}
              title={slot.is_active ? 'Nonaktifkan' : 'Aktifkan'}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full transition-all shadow-sm ${
                  slot.is_active
                    ? 'left-6 bg-green-400'
                    : 'left-1 bg-slate-500'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

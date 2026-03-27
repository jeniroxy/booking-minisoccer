'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-semibold text-slate-800">Jam Operasional</h2>
        <p className="text-xs text-gray-400 mt-0.5">Atur harga dan aktifkan/nonaktifkan slot.</p>
      </div>
      <div className="divide-y divide-gray-50">
        {slots.map(slot => (
          <div
            key={slot.id}
            className={`flex items-center justify-between px-4 py-3 ${!slot.is_active ? 'opacity-50' : ''}`}
          >
            <div className="text-sm font-medium text-slate-700 min-w-[120px]">
              {formatHour(slot.start_hour)} – {formatHour(slot.end_hour)}
            </div>

            {editingId === slot.id ? (
              <div className="flex items-center gap-2 flex-1 justify-center">
                <span className="text-sm text-gray-500">Rp</span>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-28 h-8 rounded-lg text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => savePrice(slot.id)}
                  disabled={savingId === slot.id}
                  className="h-8 px-3 text-xs rounded-full bg-blue-500 hover:bg-blue-600"
                >
                  Simpan
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 px-3 text-xs rounded-full">
                  Batal
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1 justify-center">
                <span className="text-sm font-semibold text-blue-600">
                  Rp {slot.price.toLocaleString('id-ID')}
                </span>
                <button onClick={() => startEdit(slot)} className="text-xs text-gray-400 hover:text-blue-500 transition-colors">
                  Edit
                </button>
              </div>
            )}

            <button
              onClick={() => toggleActive(slot)}
              disabled={savingId === slot.id}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                slot.is_active
                  ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-600'
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

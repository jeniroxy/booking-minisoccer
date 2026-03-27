'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatHour } from '@/lib/schedule'
import type { BlockedDate, TimeSlot } from '@/lib/types'

interface BlockDateManagerProps {
  initialBlocked: BlockedDate[]
  slots: TimeSlot[]
}

export function BlockDateManager({ initialBlocked, slots }: BlockDateManagerProps) {
  const [blocked, setBlocked] = useState(initialBlocked)
  const [date, setDate] = useState('')
  const [blockType, setBlockType] = useState<'full' | 'specific'>('full')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const addBlock = async () => {
    if (!date) return
    setSaving(true)

    const body: Record<string, unknown> = { date }
    if (blockType === 'specific' && selectedSlotId) {
      body.time_slot_id = selectedSlotId
    }

    const res = await fetch('/api/admin/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const newBlock: BlockedDate = await res.json()
      setBlocked(prev => [...prev, newBlock])
      setDate('')
      setSelectedSlotId('')
      setBlockType('full')
    }
    setSaving(false)
  }

  const removeBlock = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/admin/blocked-dates/${id}`, { method: 'DELETE' })
    setBlocked(prev => prev.filter(b => b.id !== id))
    setDeletingId(null)
  }

  const slotLabel = (bd: BlockedDate) => {
    if (!bd.time_slot_id) return 'Seluruh hari'
    const slot = slots.find(s => s.id === bd.time_slot_id)
    return slot ? `${formatHour(slot.start_hour)}–${formatHour(slot.end_hour)}` : '–'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-semibold text-slate-800">Blokir Tanggal</h2>
        <p className="text-xs text-gray-400 mt-0.5">Blokir hari atau jam tertentu agar tidak bisa dipesan.</p>
      </div>

      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex gap-3 items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label className="text-xs text-gray-500">Tanggal</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="rounded-xl border-gray-200 text-sm h-9"
            />
          </div>
          <Button
            onClick={addBlock}
            disabled={saving || !date}
            className="rounded-full h-9 px-5 text-sm bg-blue-500 hover:bg-blue-600"
          >
            {saving ? 'Menyimpan...' : '+ Blokir'}
          </Button>
        </div>

        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="radio"
              name="blockType"
              value="full"
              checked={blockType === 'full'}
              onChange={() => setBlockType('full')}
              className="accent-blue-500"
            />
            Seluruh hari
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="radio"
              name="blockType"
              value="specific"
              checked={blockType === 'specific'}
              onChange={() => setBlockType('specific')}
              className="accent-blue-500"
            />
            Jam tertentu
          </label>
        </div>

        {blockType === 'specific' && (
          <select
            value={selectedSlotId}
            onChange={e => setSelectedSlotId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl text-sm px-3 py-2 bg-white text-slate-700"
          >
            <option value="">Pilih jam...</option>
            {slots.map(s => (
              <option key={s.id} value={s.id}>
                {formatHour(s.start_hour)} – {formatHour(s.end_hour)}
              </option>
            ))}
          </select>
        )}
      </div>

      {blocked.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">Belum ada tanggal yang diblokir</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {blocked.map(bd => (
            <div key={bd.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-medium text-slate-800">{bd.date}</span>
                <span className="text-xs text-gray-400 ml-2">{slotLabel(bd)}</span>
              </div>
              <button
                onClick={() => removeBlock(bd.id)}
                disabled={deletingId === bd.id}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                {deletingId === bd.id ? '...' : 'Hapus'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
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
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-[13px] font-bold text-slate-100">Blokir Tanggal</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Blokir hari atau jam tertentu agar tidak bisa dipesan.</p>
      </div>

      {/* Form */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[11px] font-medium text-slate-500">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
            />
          </div>
          <button
            onClick={addBlock}
            disabled={saving || !date}
            className="px-4 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {saving ? 'Menyimpan...' : '+ Blokir'}
          </button>
        </div>

        <div className="flex gap-4">
          {(['full', 'specific'] as const).map(type => (
            <label key={type} className="flex items-center gap-2 text-[12px] text-slate-400 cursor-pointer">
              <input
                type="radio"
                name="blockType"
                value={type}
                checked={blockType === type}
                onChange={() => setBlockType(type)}
                className="accent-green-500"
              />
              {type === 'full' ? 'Seluruh hari' : 'Jam tertentu'}
            </label>
          ))}
        </div>

        {blockType === 'specific' && (
          <select
            value={selectedSlotId}
            onChange={e => setSelectedSlotId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl text-[13px] px-3 py-2 text-slate-100 outline-none focus:border-green-500 transition-colors"
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

      {/* List */}
      {blocked.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-slate-500">Belum ada tanggal yang diblokir</p>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {blocked.map(bd => (
            <div key={bd.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-[13px] font-medium text-slate-200">{bd.date}</span>
                <span className="text-[11px] text-slate-500 ml-2">{slotLabel(bd)}</span>
              </div>
              <button
                onClick={() => removeBlock(bd.id)}
                disabled={deletingId === bd.id}
                className="text-[11px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
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

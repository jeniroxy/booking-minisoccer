'use client'

import { useState } from 'react'
import { formatHour } from '@/lib/schedule'
import { CalendarOff, Trash2, Plus } from 'lucide-react'
import type { BlockedDate, TimeSlot } from '@/lib/types'
import { CustomSelect } from '@/components/ui/custom-select'

interface BlockDateManagerProps {
  initialBlocked: BlockedDate[]
  slots: TimeSlot[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
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
    <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="px-4 py-3.5 border-b border-slate-700/50">
        <h2 className="text-[15px] font-bold text-slate-100">Blokir Tanggal</h2>
        <p className="text-xs text-slate-500 mt-0.5">Blokir hari atau jam tertentu agar tidak bisa dipesan.</p>
      </div>

      {/* Form */}
      <div className="p-4 border-b border-slate-700/50 space-y-3">
        {/* Date + button */}
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-medium text-slate-400">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all [color-scheme:dark]"
            />
          </div>
          <button
            onClick={addBlock}
            disabled={saving || !date}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-green-500 text-green-950 hover:bg-green-400 active:bg-green-600 disabled:opacity-40 transition-colors shadow-lg shadow-green-500/20 whitespace-nowrap"
          >
            <Plus size={16} />
            {saving ? 'Menyimpan...' : 'Blokir'}
          </button>
        </div>

        {/* Block type selector */}
        <div className="flex gap-2">
          {(['full', 'specific'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setBlockType(type)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                blockType === type
                  ? 'bg-green-500/15 ring-1 ring-green-500/30 text-green-400'
                  : 'bg-slate-900/80 ring-1 ring-slate-700 text-slate-400 hover:text-slate-300'
              }`}
            >
              {type === 'full' ? 'Seluruh hari' : 'Jam tertentu'}
            </button>
          ))}
        </div>

        {/* Slot selector */}
        {blockType === 'specific' && (
          <CustomSelect
            value={selectedSlotId}
            onChange={setSelectedSlotId}
            placeholder="Pilih jam..."
            options={slots.map(s => ({
              value: s.id,
              label: `${formatHour(s.start_hour)} – ${formatHour(s.end_hour)}`,
            }))}
          />
        )}
      </div>

      {/* List */}
      {blocked.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <CalendarOff size={32} className="mx-auto text-slate-700 mb-2" />
          <p className="text-sm text-slate-500">Belum ada tanggal yang diblokir</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700/30">
          {blocked.map(bd => (
            <div key={bd.id} className="flex items-center justify-between px-4 py-3.5 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200">{formatDate(bd.date)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{slotLabel(bd)}</p>
              </div>
              <button
                onClick={() => removeBlock(bd.id)}
                disabled={deletingId === bd.id}
                className="flex-shrink-0 p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                title="Hapus"
              >
                {deletingId === bd.id ? '...' : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

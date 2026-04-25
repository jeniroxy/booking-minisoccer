'use client'

import { useState, useEffect } from 'react'
import { formatHour, getStudentPrice, formatPrice } from '@/lib/schedule'
import { CustomSelect } from '@/components/ui/custom-select'
import type { RecurringSchedule, TimeSlot } from '@/lib/types'
import { Plus, Trash2, Pencil, X, RefreshCw } from 'lucide-react'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function RecurringScheduleTab() {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDay, setEditDay] = useState('')
  const [editSlotId, setEditSlotId] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({})
  const [syncing, setSyncing] = useState(false)

  // Form state
  const [teamName, setTeamName] = useState('')
  const [phone, setPhone] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('1') // Senin default
  const [slotId, setSlotId] = useState('')
  const [customerType, setCustomerType] = useState<'umum' | 'pelajar'>('umum')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/recurring').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/slots').then(r => r.ok ? r.json() : []),
    ]).then(([recs, sl]) => {
      setSchedules(recs)
      const activeSlots = (sl as TimeSlot[]).filter(s => s.is_active)
      setSlots(activeSlots)
      if (activeSlots.length > 0) setSlotId(activeSlots[0].id)
      setLoading(false)
    })
  }, [])

  const handleSubmit = async () => {
    if (!teamName.trim() || !slotId) return
    setSaving(true)
    const res = await fetch('/api/admin/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_name: teamName.trim(),
        phone: phone.trim() || undefined,
        customer_type: customerType,
        time_slot_id: slotId,
        day_of_week: Number(dayOfWeek),
      }),
    })
    if (res.ok) {
      const { schedule } = await res.json()
      setSchedules(prev => [schedule, ...prev])
      setShowForm(false)
      setTeamName('')
      setPhone('')
    }
    setSaving(false)
  }

  const toggleActive = async (schedule: RecurringSchedule) => {
    setTogglingId(schedule.id)
    const res = await fetch(`/api/admin/recurring/${schedule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !schedule.is_active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s))
    }
    setTogglingId(null)
  }

  const syncCalendar = async () => {
    setSyncing(true)
    await fetch('/api/admin/recurring/sync-calendar', { method: 'POST' })
    setSyncing(false)
  }

  const deleteSchedule = async (schedule: RecurringSchedule) => {
    if (!confirm(`Hapus jadwal tetap "${schedule.team_name}"? Booking yang sudah dibuat tidak akan dihapus.`)) return
    setDeletingId(schedule.id)
    const res = await fetch(`/api/admin/recurring/${schedule.id}`, { method: 'DELETE' })
    if (res.ok) setSchedules(prev => prev.filter(s => s.id !== schedule.id))
    setDeletingId(null)
  }

  const getEffectivePrice = (s: RecurringSchedule) => {
    if (!s.time_slots) return 0
    return s.customer_type === 'pelajar'
      ? getStudentPrice(s.time_slots.price)
      : s.time_slots.price
  }

  const openEdit = (s: RecurringSchedule) => {
    setEditingId(s.id)
    setEditDay(String(s.day_of_week))
    setEditSlotId(s.time_slot_id)
    setEditPrice(String(customPrices[s.id] ?? getEffectivePrice(s)))
  }

  const saveEdit = async (s: RecurringSchedule) => {
    setEditSaving(true)
    const body: Record<string, unknown> = {}
    if (editDay !== String(s.day_of_week)) body.day_of_week = Number(editDay)
    if (editSlotId !== s.time_slot_id) body.time_slot_id = editSlotId
    const priceNum = parseInt(editPrice)
    if (!isNaN(priceNum) && priceNum > 0) body.custom_price = priceNum

    if (Object.keys(body).length > 0) {
      const res = await fetch(`/api/admin/recurring/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setSchedules(prev => prev.map(x => x.id === updated.id ? updated : x))
        if (body.custom_price !== undefined) {
          setCustomPrices(prev => ({ ...prev, [s.id]: body.custom_price as number }))
        }
      }
    }
    setEditingId(null)
    setEditSaving(false)
  }

  if (loading) {
    return <div className="py-12 text-center text-slate-500 text-sm">Memuat...</div>
  }

  return (
    <div className="space-y-3 pb-24">
      {schedules.length === 0 && !showForm && (
        <div className="py-12 text-center text-slate-500 text-sm">
          Belum ada jadwal tetap. Tekan + untuk menambah.
        </div>
      )}

      {schedules.map(s => (
        <div
          key={s.id}
          className={`rounded-2xl border transition-opacity ${
            s.is_active
              ? 'bg-purple-500/8 border-purple-500/20'
              : 'bg-slate-900/50 border-slate-800/50 opacity-60'
          }`}
        >
          {/* Main row */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] font-bold text-slate-100">{s.team_name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  s.customer_type === 'pelajar'
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'bg-slate-700/50 text-slate-400'
                }`}>
                  {s.customer_type === 'pelajar' ? 'Pelajar' : 'Umum'}
                </span>
                {!s.is_active && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700/50 text-slate-500">
                    Paused
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>📅 {HARI[s.day_of_week]} · {s.time_slots
                  ? `${formatHour(s.time_slots.start_hour)}–${formatHour(s.time_slots.end_hour)}`
                  : '–'}</span>
                {s.time_slots && (
                  <span className="text-green-400 font-semibold">
                    {formatPrice(customPrices[s.id] ?? getEffectivePrice(s))}
                  </span>
                )}
              </div>
              {s.phone && (
                <div className="text-[11px] text-slate-500 mt-0.5">{s.phone}</div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => toggleActive(s)}
                disabled={togglingId === s.id}
                className="relative w-10 h-[22px] rounded-full transition-colors disabled:opacity-40"
                style={{ backgroundColor: s.is_active ? 'rgb(168 85 247 / 0.35)' : 'rgb(51 65 85 / 0.8)' }}
                role="switch"
                aria-checked={s.is_active}
              >
                <span
                  className="absolute top-[3px] w-4 h-4 rounded-full transition-all"
                  style={{
                    left: s.is_active ? 'calc(100% - 19px)' : '3px',
                    backgroundColor: s.is_active ? '#c084fc' : '#475569',
                  }}
                />
              </button>
              <button
                onClick={() => editingId === s.id ? setEditingId(null) : openEdit(s)}
                className={`p-2 rounded-lg transition-colors ${editingId === s.id ? 'text-purple-400 bg-purple-500/15' : 'text-slate-500 hover:text-purple-400 hover:bg-purple-500/10'}`}
                title="Edit jadwal"
              >
                {editingId === s.id ? <X size={15} /> : <Pencil size={15} />}
              </button>
              <button
                onClick={() => deleteSchedule(s)}
                disabled={deletingId === s.id}
                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                title="Hapus jadwal tetap"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Inline edit form */}
          {editingId === s.id && (
            <div className="px-4 pb-4 pt-0 border-t border-purple-500/15 space-y-3 mt-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide pt-3">Edit Jadwal & Harga</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Hari</label>
                  <CustomSelect
                    value={editDay}
                    onChange={setEditDay}
                    options={HARI.map((h, i) => ({ value: String(i), label: h }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Slot Jam</label>
                  <CustomSelect
                    value={editSlotId}
                    onChange={setEditSlotId}
                    options={slots.map(sl => ({
                      value: sl.id,
                      label: `${formatHour(sl.start_hour)}–${formatHour(sl.end_hour)}`,
                    }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Harga (update booking mendatang)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  placeholder="Masukkan harga..."
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(s)}
                  disabled={editSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
                >
                  {editSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800/60 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showForm && (
        <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Jadwal Tetap Baru</h3>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nama Tim</label>
            <input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="Nama tim..."
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">No. WhatsApp (opsional)</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0812..."
              type="tel"
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Hari</label>
              <CustomSelect
                value={dayOfWeek}
                onChange={setDayOfWeek}
                options={HARI.map((h, i) => ({ value: String(i), label: h }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Slot Jam</label>
              <CustomSelect
                value={slotId}
                onChange={setSlotId}
                options={slots.map(sl => ({
                  value: sl.id,
                  label: `${formatHour(sl.start_hour)}–${formatHour(sl.end_hour)}`,
                }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Kategori</label>
            <div className="flex gap-2">
              {(['umum', 'pelajar'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setCustomerType(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    customerType === t
                      ? t === 'pelajar'
                        ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                        : 'bg-slate-700/60 text-slate-200 ring-1 ring-slate-600/50'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t === 'umum' ? 'Umum' : 'Pelajar'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={saving || !teamName.trim() || !slotId}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Menyimpan...' : 'Simpan & Generate 4 Minggu'}
            </button>
            <button
              onClick={() => { setShowForm(false); setTeamName(''); setPhone('') }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800/60 text-slate-400 hover:text-slate-200 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <div className="fixed bottom-6 right-6 flex flex-col items-center gap-2 z-50 md:bottom-8 md:right-8">
          <button
            onClick={syncCalendar}
            disabled={syncing}
            title="Sync ke Google Kalender"
            className="w-11 h-11 rounded-full bg-slate-700 text-white shadow-lg hover:bg-slate-600 transition-colors flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="w-14 h-14 rounded-full bg-purple-500 text-white shadow-lg hover:bg-purple-400 transition-colors flex items-center justify-center"
          >
            <Plus size={24} />
          </button>
        </div>
      )}
    </div>
  )
}

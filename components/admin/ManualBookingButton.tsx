// components/admin/ManualBookingButton.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { getStudentPrice, formatHour } from '@/lib/schedule'

type AvailableSlot = { id: string; start_hour: number; end_hour: number; price: number }

function todayJakarta(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

function ManualBookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [teamName, setTeamName] = useState('')
  const [date, setDate] = useState(todayJakarta())
  const [customerType, setCustomerType] = useState<'umum' | 'pelajar'>('umum')
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [phone, setPhone] = useState('')
  const [totalEdited, setTotalEdited] = useState(false)
  const [totalPrice, setTotalPrice] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const priceFor = useCallback(
    (s: AvailableSlot) => (customerType === 'pelajar' ? getStudentPrice(s.price) : s.price),
    [customerType]
  )

  // Fetch slot kosong saat tanggal berubah
  useEffect(() => {
    let active = true
    setLoadingSlots(true)
    setSelected([])
    fetch(`/api/admin/bookings/available?date=${date}`)
      .then(r => r.json())
      .then(d => { if (active) setSlots(d.slots ?? []) })
      .catch(() => { if (active) setSlots([]) })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
  }, [date])

  // Auto-hitung total dari slot terpilih (kecuali user sudah edit manual)
  useEffect(() => {
    if (totalEdited) return
    const sum = slots.filter(s => selected.includes(s.id)).reduce((acc, s) => acc + priceFor(s), 0)
    setTotalPrice(selected.length ? String(sum) : '')
  }, [selected, slots, priceFor, totalEdited])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const toggleSlot = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const handleSave = async () => {
    if (!teamName.trim()) { setError('Nama tim wajib diisi'); return }
    if (selected.length === 0) { setError('Pilih minimal satu jam'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_name: teamName.trim(),
        booking_date: date,
        time_slot_ids: selected,
        customer_type: customerType,
        phone: phone.trim() || undefined,
        total_price: totalEdited && totalPrice ? parseInt(totalPrice) : undefined,
      }),
    })
    if (res.ok) {
      onCreated()
    } else {
      const b = await res.json().catch(() => ({}))
      setError(b.error ?? 'Gagal menyimpan booking')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-slate-900/50 border border-slate-800/80 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">Tambah Booking Manual</h2>
            <p className="text-xs text-slate-500 mt-0.5">Buat booking baru (langsung confirmed)</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Nama Tim</label>
            <input
              type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Garuda FC" autoFocus
              className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Tanggal</label>
              <input
                type="date" value={date} min={todayJakarta()} onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Kategori</label>
              <div className="flex gap-2">
                {(['umum', 'pelajar'] as const).map(t => (
                  <button
                    key={t} type="button" onClick={() => setCustomerType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      customerType === t ? 'bg-green-500/15 ring-1 ring-green-500/30 text-green-400' : 'bg-slate-900/80 ring-1 ring-slate-700 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {t === 'umum' ? 'Umum' : 'Pelajar'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Pilih Jam</label>
            {loadingSlots ? (
              <p className="text-xs text-slate-500 py-2">Memuat slot…</p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Tidak ada slot kosong di tanggal ini</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map(s => {
                  const on = selected.includes(s.id)
                  return (
                    <button
                      key={s.id} type="button" onClick={() => toggleSlot(s.id)}
                      className={`flex flex-col items-start px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        on ? 'bg-green-500/15 ring-1 ring-green-500/30 text-green-400' : 'bg-slate-900/80 ring-1 ring-slate-700 text-slate-300 hover:text-slate-100'
                      }`}
                    >
                      <span>{formatHour(s.start_hour)}–{formatHour(s.end_hour)}</span>
                      <span className="text-[11px] font-medium opacity-80">Rp {priceFor(s).toLocaleString('id-ID')}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Total Harga</label>
            <input
              type="number" value={totalPrice}
              onChange={e => { setTotalEdited(true); setTotalPrice(e.target.value) }}
              placeholder="0"
              className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">No. HP (opsional)</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx"
              className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-400 bg-slate-800/50 hover:bg-slate-800 active:bg-slate-700 transition-colors">Batal</button>
            <button
              onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-green-500 text-green-950 hover:bg-green-400 active:bg-green-600 disabled:opacity-40 transition-colors shadow-lg shadow-green-500/20"
            >
              {saving ? 'Menyimpan…' : 'Tambah'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ManualBookingButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleCreated = () => {
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      {open && <ManualBookingModal onClose={() => setOpen(false)} onCreated={handleCreated} />}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-green-500 text-green-950 shadow-lg shadow-green-500/30 flex items-center justify-center hover:bg-green-400 active:scale-95 transition-all"
          aria-label="Tambah booking manual"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}
    </>
  )
}

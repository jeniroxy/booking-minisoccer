'use client'

import { useState } from 'react'
import type { PsBooking, PsUnit } from '@/lib/types'
import { CustomSelect } from '@/components/ui/custom-select'

interface PsBookingTableProps {
  initialBookings: PsBooking[]
  units: PsUnit[]
}

export function PsBookingTable({ initialBookings, units }: PsBookingTableProps) {
  const [bookings, setBookings] = useState(initialBookings)
  const [loading, setLoading] = useState<string | null>(null)

  // Walk-in form state
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [walkInName, setWalkInName] = useState('')
  const [walkInUnit, setWalkInUnit] = useState('')

  const availableUnits = units.filter(u => u.is_active && u.status === 'available')

  const getUnitName = (unitId: string) => units.find(u => u.id === unitId)?.name || 'Unknown'

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-400 bg-amber-500/15 border-amber-500/30'
      case 'confirmed': return 'text-blue-400 bg-blue-500/15 border-blue-500/30'
      case 'cancelled': return 'text-red-400 bg-red-500/15 border-red-500/30'
      case 'completed': return 'text-green-400 bg-green-500/15 border-green-500/30'
      default: return 'text-slate-400 bg-slate-700 border-slate-600'
    }
  }

  const updateStatus = async (id: string, status: string) => {
    setLoading(id)
    const res = await fetch(`/api/ps/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: PsBooking = await res.json()
      setBookings(prev => prev.map(b => b.id === id ? updated : b))
    }
    setLoading(null)
  }

  const deleteBooking = async (id: string) => {
    setLoading(id)
    await fetch(`/api/ps/bookings/${id}`, { method: 'DELETE' })
    setBookings(prev => prev.filter(b => b.id !== id))
    setLoading(null)
  }

  const startWalkInSession = async () => {
    if (!walkInName.trim() || !walkInUnit) return
    setLoading('walkin')
    const res = await fetch('/api/ps/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ps_unit_id: walkInUnit,
        customer_name: walkInName.trim(),
      }),
    })
    if (res.ok) {
      setShowWalkIn(false)
      setWalkInName('')
      setWalkInUnit('')
      // Reload page to refresh dashboard
      window.location.reload()
    }
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Walk-in button */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
        {!showWalkIn ? (
          <button
            onClick={() => setShowWalkIn(true)}
            className="w-full px-4 py-2.5 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 transition-colors"
          >
            + Walk-in (Tanpa Booking)
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-slate-100">Walk-in Customer</span>
              <button onClick={() => setShowWalkIn(false)} className="text-[11px] text-slate-400 hover:text-slate-200">Batal</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={walkInName}
                onChange={e => setWalkInName(e.target.value)}
                placeholder="Nama pelanggan"
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
              />
              <CustomSelect
                value={walkInUnit}
                onChange={setWalkInUnit}
                placeholder="Pilih unit PS"
                options={availableUnits.map(u => ({
                  value: u.id,
                  label: `${u.name} (${u.type})`,
                }))}
              />
            </div>

            {availableUnits.length === 0 && (
              <p className="text-[11px] text-amber-400">Semua unit sedang terpakai</p>
            )}

            <button
              onClick={startWalkInSession}
              disabled={loading === 'walkin' || !walkInName.trim() || !walkInUnit}
              className="w-full px-4 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
            >
              {loading === 'walkin' ? 'Memulai...' : 'Mulai Session'}
            </button>
          </div>
        )}
      </div>

      {/* Bookings list */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="text-[13px] font-bold text-slate-100">Booking PS</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Reservasi dari pelanggan online.</p>
        </div>

        {bookings.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-slate-500">Belum ada booking PS</p>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {bookings.map(b => (
              <div key={b.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-100">{b.customer_name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${statusBadge(b.status)}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {getUnitName(b.ps_unit_id)} · {b.booking_date} · {String(b.start_hour).padStart(2, '0')}:00 ({b.duration_hours} jam)
                  </p>
                  {b.phone && <p className="text-[10px] text-slate-500">{b.phone}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {b.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(b.id, 'confirmed')}
                        disabled={loading === b.id}
                        className="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
                      >
                        Konfirmasi
                      </button>
                      <button
                        onClick={() => updateStatus(b.id, 'cancelled')}
                        disabled={loading === b.id}
                        className="text-[11px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                      >
                        Batal
                      </button>
                    </>
                  )}
                  {b.status === 'cancelled' && (
                    <button
                      onClick={() => deleteBooking(b.id)}
                      disabled={loading === b.id}
                      className="text-[11px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

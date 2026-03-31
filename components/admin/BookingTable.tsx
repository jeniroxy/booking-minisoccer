'use client'

import { useState } from 'react'
import { formatHour, formatPrice } from '@/lib/schedule'
import type { BookingWithSlot } from '@/lib/types'

type Filter = 'all' | 'pending' | 'confirmed' | 'cancelled'

const filterLabels: Record<Filter, string> = {
  all: 'Semua',
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending')
    return (
      <span className="inline-flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 rounded-md px-2 py-0.5 text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
        Pending
      </span>
    )
  if (status === 'confirmed')
    return (
      <span className="inline-flex items-center gap-1 bg-green-500/20 border border-green-500/30 rounded-md px-2 py-0.5 text-[10px] font-bold text-green-400 uppercase tracking-wider">
        Confirmed
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 bg-slate-700 border border-slate-600 rounded-md px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      Cancelled
    </span>
  )
}

export function BookingTable({ initialBookings }: { initialBookings: BookingWithSlot[] }) {
  const [bookings, setBookings] = useState(initialBookings)
  const [filter, setFilter] = useState<Filter>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sorted = [...bookings].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const filtered = sorted.filter(b => {
    if (filter === 'all' && b.status === 'cancelled') return false
    if (filter !== 'all' && b.status !== filter) return false
    if (dateFilter && b.booking_date !== dateFilter) return false
    return true
  })

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setLoadingId(id)
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    }
    setLoadingId(null)
  }

  const deleteBooking = async (id: string) => {
    if (!confirm('Hapus booking ini? Data akan dihapus permanen.')) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBookings(prev => prev.filter(b => b.id !== id))
    }
    setDeletingId(null)
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Filter pills + date filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-b border-slate-700">
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'pending', 'confirmed', 'cancelled'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                filter === f
                  ? 'bg-green-500 text-green-950'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <input
            type="text"
            placeholder="Filter by Date"
            value={dateFilter}
            onFocus={e => { e.target.type = 'date' }}
            onBlur={e => { if (!e.target.value) e.target.type = 'text' }}
            onChange={e => setDateFilter(e.target.value)}
            className="w-[140px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-[12px] text-slate-300 placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table — mobile: card list, desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              {['Tanggal', 'Jam', 'Nama Tim', 'Harga', 'Status', 'Aksi'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-slate-500">
                  Tidak ada booking
                </td>
              </tr>
            )}
            {filtered.map(booking => (
              <tr key={booking.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-[13px] text-slate-300">{booking.booking_date}</td>
                <td className="px-4 py-3 text-[13px] text-slate-300 whitespace-nowrap">
                  {booking.time_slots
                    ? `${formatHour(booking.time_slots.start_hour)}–${formatHour(booking.time_slots.end_hour)}`
                    : '–'}
                </td>
                <td className="px-4 py-3 text-[13px] font-medium text-slate-100">{booking.team_name}</td>
                <td className="px-4 py-3 text-[13px] font-semibold text-green-400">
                  {booking.total_price != null
                    ? formatPrice(booking.total_price)
                    : booking.time_slots ? formatPrice(booking.time_slots.price) : '–'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(booking.id, 'confirmed')}
                        disabled={loadingId === booking.id}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
                      >
                        Confirm
                      </button>
                    )}
                    {booking.status !== 'cancelled' && (
                      <button
                        onClick={() => updateStatus(booking.id, 'cancelled')}
                        disabled={loadingId === booking.id}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-40 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    {booking.status === 'cancelled' && (
                      <button
                        onClick={() => deleteBooking(booking.id)}
                        disabled={deletingId === booking.id}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 disabled:opacity-40 transition-colors"
                        title="Hapus permanen"
                      >
                        {deletingId === booking.id ? '...' : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-slate-700/50">
        {filtered.length === 0 && (
          <p className="px-4 py-12 text-center text-[13px] text-slate-500">Tidak ada booking</p>
        )}
        {filtered.map(booking => (
          <div key={booking.id} className="px-4 py-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-slate-100">{booking.team_name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {booking.booking_date}
                  {booking.time_slots && (
                    <> · {formatHour(booking.time_slots.start_hour)}–{formatHour(booking.time_slots.end_hour)}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={booking.status} />
                  <span className="text-[12px] font-bold text-green-400">
                    {booking.total_price != null
                      ? formatPrice(booking.total_price)
                      : booking.time_slots ? formatPrice(booking.time_slots.price) : ''}
                  </span>
                </div>
                {booking.status === 'cancelled' && (
                  <button
                    onClick={() => deleteBooking(booking.id)}
                    disabled={deletingId === booking.id}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 disabled:opacity-40 transition-colors"
                    title="Hapus permanen"
                  >
                    {deletingId === booking.id ? '...' : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    )}
                  </button>
                )}
              </div>
            </div>
            {booking.status !== 'cancelled' && (
              <div className="flex gap-2">
                {booking.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(booking.id, 'confirmed')}
                    disabled={loadingId === booking.id}
                    className="flex-1 py-1.5 rounded-lg text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
                  >
                    Confirm
                  </button>
                )}
                <button
                  onClick={() => updateStatus(booking.id, 'cancelled')}
                  disabled={loadingId === booking.id}
                  className="flex-1 py-1.5 rounded-lg text-[12px] font-bold bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

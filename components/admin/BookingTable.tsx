'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatHour, formatPrice } from '@/lib/schedule'
import type { BookingWithSlot } from '@/lib/types'

type Filter = 'all' | 'pending' | 'confirmed' | 'cancelled'

export function BookingTable({ initialBookings }: { initialBookings: BookingWithSlot[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  const filtered = initialBookings.filter(b => filter === 'all' || b.status === filter)

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setLoadingId(id)
    await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoadingId(null)
    router.refresh()
  }

  const filterLabels: Record<Filter, string> = {
    all: 'Semua',
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
  }

  const statusBadge = (status: string) => {
    if (status === 'pending')
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">Pending</Badge>
    if (status === 'confirmed')
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Confirmed</Badge>
    return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-0">Cancelled</Badge>
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="flex gap-2 p-4 border-b border-gray-100">
        {(['all', 'pending', 'confirmed', 'cancelled'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Tanggal', 'Jam', 'Nama Tim', 'Harga', 'Status', 'Aksi'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                  Tidak ada booking
                </td>
              </tr>
            )}
            {filtered.map(booking => (
              <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-700">{booking.booking_date}</td>
                <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                  {booking.time_slots
                    ? `${formatHour(booking.time_slots.start_hour)}–${formatHour(booking.time_slots.end_hour)}`
                    : '–'}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{booking.team_name}</td>
                <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                  {booking.time_slots ? formatPrice(booking.time_slots.price) : '–'}
                </td>
                <td className="px-4 py-3">{statusBadge(booking.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {booking.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(booking.id, 'confirmed')}
                        disabled={loadingId === booking.id}
                        className="rounded-full h-7 px-3 text-xs bg-green-500 hover:bg-green-600"
                      >
                        Confirm
                      </Button>
                    )}
                    {booking.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(booking.id, 'cancelled')}
                        disabled={loadingId === booking.id}
                        className="rounded-full h-7 px-3 text-xs text-red-500 border-red-200 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

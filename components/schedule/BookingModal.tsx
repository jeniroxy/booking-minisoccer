'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildWAUrl, formatDateLabel } from '@/lib/booking'
import { formatHour, formatPrice } from '@/lib/schedule'
import type { TimeSlot } from '@/lib/types'

interface BookingModalProps {
  slot: TimeSlot
  date: Date
  isOpen: boolean
  onClose: () => void
  onSuccess: (bookingId: string) => void
}

export function BookingModal({ slot, date, isOpen, onClose, onSuccess }: BookingModalProps) {
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    setTeamName('')
    setError('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) {
      setError('Nama tim wajib diisi')
      return
    }

    setLoading(true)
    setError('')

    try {
      const bookingDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: teamName.trim(), booking_date: bookingDate, time_slot_id: slot.id }),
      })

      if (res.status === 409) {
        setError('Slot ini sudah dipesan. Silakan pilih slot lain.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError('Gagal membuat booking. Silakan coba lagi.')
        setLoading(false)
        return
      }

      const booking = await res.json()
      onSuccess(booking.id)

      const waUrl = buildWAUrl({
        teamName: teamName.trim(),
        dateLabel: formatDateLabel(date),
        startHour: slot.start_hour,
        endHour: slot.end_hour,
        price: slot.price,
        waNumber: process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER!,
      })
      window.open(waUrl, '_blank')
      setTeamName('')
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Booking Lapangan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-name" className="text-sm font-medium text-slate-600">
              Nama Tim
            </Label>
            <Input
              id="team-name"
              placeholder="Masukkan nama tim..."
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="rounded-xl border-gray-200"
              autoFocus
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tanggal</span>
              <span className="font-medium text-slate-800">{formatDateLabel(date)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Jam</span>
              <span className="font-medium text-slate-800">
                {formatHour(slot.start_hour)} – {formatHour(slot.end_hour)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Harga</span>
              <span className="font-bold text-blue-600">{formatPrice(slot.price)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 -mt-1">{error}</p>}

          <div className="flex gap-2 mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-full border-gray-200"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {loading ? 'Memproses...' : 'Booking via WhatsApp'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

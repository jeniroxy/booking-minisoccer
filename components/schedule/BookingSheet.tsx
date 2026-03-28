'use client'

import { useState, useEffect, useRef } from 'react'
import { buildWAUrl, formatDateLabel } from '@/lib/booking'
import { formatHour, formatPrice, STUDENT_DISCOUNT } from '@/lib/schedule'
import type { TimeSlot } from '@/lib/types'

interface BookingSheetProps {
  slots: TimeSlot[]
  date: Date
  isStudent: boolean
  isOpen: boolean
  onClose: () => void
  onSuccess: (bookingIds: string[]) => void
}

export function BookingSheet({ slots, date, isStudent, isOpen, onClose, onSuccess }: BookingSheetProps) {
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const sorted = [...slots].sort((a, b) => a.start_hour - b.start_hour)
  const slotPrice = (s: TimeSlot) => Math.max(0, s.price - (isStudent ? STUDENT_DISCOUNT : 0))
  const totalPrice = sorted.reduce((sum, s) => sum + slotPrice(s), 0)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      setTeamName('')
      setError('')
      if (sheetRef.current) sheetRef.current.style.bottom = '0px'
    }
  }, [isOpen])

  // Geser sheet ke atas mengikuti keyboard — bekerja di iOS & Android
  useEffect(() => {
    if (!isOpen) return
    const viewport = window.visualViewport
    if (!viewport) return

    const handleResize = () => {
      const sheet = sheetRef.current
      if (!sheet) return
      const keyboardHeight = window.innerHeight - viewport.height - viewport.offsetTop
      sheet.style.bottom = `${Math.max(0, keyboardHeight)}px`
    }

    viewport.addEventListener('resize', handleResize)
    viewport.addEventListener('scroll', handleResize)
    return () => {
      viewport.removeEventListener('resize', handleResize)
      viewport.removeEventListener('scroll', handleResize)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) {
      setError('Nama tim wajib diisi')
      return
    }

    // Buka window di sini (synchronous, masih dalam user gesture)
    // Safari iOS memblokir window.open() yang dipanggil setelah await
    const waWindow = window.open('', '_blank')

    setLoading(true)
    setError('')

    try {
      const bookingDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      const results = await Promise.all(
        sorted.map(slot =>
          fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_name: teamName.trim(), booking_date: bookingDate, time_slot_id: slot.id }),
          })
        )
      )

      const failed = results.find(r => !r.ok)
      if (failed) {
        waWindow?.close()
        setError(failed.status === 409
          ? 'Salah satu slot sudah dipesan. Silakan pilih ulang.'
          : 'Gagal membuat booking. Silakan coba lagi.')
        setLoading(false)
        return
      }

      const bookings = await Promise.all(results.map(r => r.json()))
      onSuccess(bookings.map((b: { id: string }) => b.id))

      const waUrl = buildWAUrl({
        teamName: teamName.trim(),
        dateLabel: formatDateLabel(date),
        startHour: sorted[0].start_hour,
        endHour: sorted[sorted.length - 1].end_hour,
        totalPrice,
        isStudent,
        waNumber: process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER!,
      })
      if (waWindow) {
        waWindow.location.href = waUrl
      } else {
        window.location.href = waUrl
      }
      setTeamName('')
    } catch {
      waWindow?.close()
      setError('Terjadi kesalahan. Silakan coba lagi.')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet — flex column, posisi bottom disesuaikan visualViewport (keyboard-aware) */}
      <div ref={sheetRef} className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 rounded-t-[20px] border-t border-slate-700 flex flex-col max-h-[90svh] mx-auto max-w-lg">
        {/* Handle + judul */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="w-9 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
          <h2 className="text-[13px] font-bold text-slate-100">Konfirmasi Booking</h2>
        </div>

        {/* Summary — scrollable jika ruang terbatas */}
        <div className="overflow-y-auto flex-1 px-4 pb-2">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Tanggal</span>
              <span className="text-slate-200 font-medium">{formatDateLabel(date)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Jam</span>
              <span className="text-slate-200 font-medium">
                {formatHour(sorted[0].start_hour)} – {formatHour(sorted[sorted.length - 1].end_hour)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Durasi</span>
              <span className="text-slate-200 font-medium">{sorted.length} jam</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Kategori</span>
              <span className={`font-medium ${isStudent ? 'text-green-400' : 'text-slate-200'}`}>
                {isStudent ? 'Pelajar (diskon Rp50.000/jam)' : 'Umum'}
              </span>
            </div>
            <div className="border-t border-slate-700 pt-1.5 flex justify-between text-[13px]">
              <span className="font-semibold text-slate-200">Total</span>
              <span className="font-bold text-green-400">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Input + button — selalu terlihat di atas keyboard */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 px-4 pb-6 pt-2 space-y-2 border-t border-slate-700">
          <input
            ref={inputRef}
            type="text"
            placeholder="Nama tim kamu..."
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-[12px] text-slate-100 placeholder-slate-500 outline-none focus:border-green-500"
          />

          {error && <p className="text-[11px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 rounded-xl py-2.5 text-[12px] font-bold text-green-950 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : '📲 Booking via WhatsApp'}
          </button>
        </form>
      </div>
    </>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { buildWAUrl, formatDateLabel } from '@/lib/booking'
import { formatHour, formatPrice, getEffectivePrice, getStudentPrice } from '@/lib/schedule'
import type { TimeSlot, SlotPriceOverride } from '@/lib/types'

interface BookingSheetProps {
  slots: TimeSlot[]
  date: Date
  priceOverrides: SlotPriceOverride[]
  isStudent: boolean
  isOpen: boolean
  onClose: () => void
  onSuccess: (bookingIds: string[]) => void
}

export function BookingSheet({ slots, date, priceOverrides, isStudent, isOpen, onClose, onSuccess }: BookingSheetProps) {
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherId, setVoucherId] = useState<string | null>(null)
  const [voucherDiscount, setVoucherDiscount] = useState<{ type: 'percent' | 'nominal'; value: number } | null>(null)
  const [voucherError, setVoucherError] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const teamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voucherTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sorted = [...slots].sort((a, b) => a.start_hour - b.start_hour)
  const bookingDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const slotPrice = (s: TimeSlot) => {
    const p = getEffectivePrice(s, bookingDateStr, priceOverrides)
    return isStudent ? getStudentPrice(p) : p
  }
  const baseTotal = sorted.reduce((sum, s) => sum + slotPrice(s), 0)

  let voucherAmount = 0
  if (voucherDiscount) {
    if (voucherDiscount.type === 'nominal') {
      voucherAmount = voucherDiscount.value
    } else {
      voucherAmount = Math.round(baseTotal * voucherDiscount.value / 100)
    }
  }

  const totalPrice = Math.max(0, baseTotal - voucherAmount)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      setTeamName('')
      setPhone('')
      setError('')
      setVoucherCode('')
      setVoucherId(null)
      setVoucherDiscount(null)
      setVoucherError('')
      if (sheetRef.current) sheetRef.current.style.bottom = '0px'
    }
  }, [isOpen])

  // Cek tim returning: auto-fill phone & voucher follow-up (debounce 600ms)
  useEffect(() => {
    if (!teamName.trim()) return
    if (teamTimerRef.current) clearTimeout(teamTimerRef.current)
    teamTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/bookings/loyalty?team_name=${encodeURIComponent(teamName.trim())}`)
        const { lastPhone, voucherCode: availableVoucher } = await res.json()
        if (lastPhone && !phone) setPhone(lastPhone)
        if (availableVoucher && !voucherCode && baseTotal >= 200000) setVoucherCode(availableVoucher)
      } catch {
        // ignore
      }
    }, 600)
    return () => {
      if (teamTimerRef.current) clearTimeout(teamTimerRef.current)
    }
  }, [teamName])

  // Validasi voucher (debounce 600ms)
  useEffect(() => {
    if (!voucherCode.trim()) {
      setVoucherId(null)
      setVoucherDiscount(null)
      setVoucherError('')
      return
    }
    if (voucherTimerRef.current) clearTimeout(voucherTimerRef.current)
    voucherTimerRef.current = setTimeout(async () => {
      setVoucherLoading(true)
      try {
        const params = new URLSearchParams({ code: voucherCode.trim(), base_total: String(baseTotal) })
        if (teamName.trim()) params.set('team_name', teamName.trim())
        if (phone.trim()) params.set('phone', phone.trim())
        const res = await fetch(`/api/vouchers/validate?${params}`)
        const data = await res.json()
        if (data.valid) {
          setVoucherId(data.voucher.id)
          setVoucherDiscount({ type: data.voucher.discount_type, value: data.voucher.discount_value })
          setVoucherError('')
        } else {
          setVoucherId(null)
          setVoucherDiscount(null)
          setVoucherError(data.error ?? 'Voucher tidak valid')
        }
      } catch {
        setVoucherId(null)
        setVoucherDiscount(null)
        setVoucherError('Gagal memvalidasi voucher')
      }
      setVoucherLoading(false)
    }, 600)
    return () => {
      if (voucherTimerRef.current) clearTimeout(voucherTimerRef.current)
    }
  }, [voucherCode, teamName, phone])

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
    if (!phone.trim()) {
      setError('No WhatsApp wajib diisi')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Distribute total price proportionally across slots
      const slotPrices = sorted.map(s => slotPrice(s))
      const slotTotals = slotPrices.map(p => Math.round(p / baseTotal * totalPrice))

      const results = await Promise.all(
        sorted.map((slot, i) =>
          fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_name: teamName.trim(), booking_date: bookingDateStr, time_slot_id: slot.id, total_price: slotTotals[i], phone: phone.trim(), ...(voucherId ? { voucher_id: voucherId } : {}) }),
          })
        )
      )

      const failed = results.find(r => !r.ok)
      if (failed) {
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
        voucherCode: voucherDiscount ? voucherCode.trim().toUpperCase() : undefined,
        waNumber: process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER!,
      })
      window.location.href = waUrl
      setTeamName('')
    } catch {
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
                {isStudent ? 'Pelajar (diskon 50K)' : 'Umum'}
              </span>
            </div>
            {voucherAmount > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-purple-400 font-medium">🎟️ Voucher ({voucherCode.toUpperCase()})</span>
                <span className="text-purple-400 font-semibold">-{formatPrice(voucherAmount)}</span>
              </div>
            )}
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
          <input
            type="tel"
            placeholder="No WhatsApp"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-[12px] text-slate-100 placeholder-slate-500 outline-none focus:border-green-500"
          />
          <div className="relative">
            <input
              type="text"
              placeholder="Kode voucher (opsional)"
              value={voucherCode}
              onChange={e => setVoucherCode(e.target.value.toUpperCase())}
              className={`w-full bg-slate-900 border rounded-xl px-3 py-2.5 text-[12px] text-slate-100 placeholder-slate-500 outline-none uppercase ${
                voucherDiscount ? 'border-green-500' : voucherError ? 'border-red-500/50' : 'border-slate-700 focus:border-green-500'
              }`}
            />
            {voucherLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">...</span>
            )}
            {voucherDiscount && !voucherLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-green-400">✓</span>
            )}
          </div>
          {voucherError && <p className="text-[10px] text-red-400">{voucherError}</p>}

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

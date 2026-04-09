'use client'

import { useState } from 'react'
import type { PsUnit, PsPricingRule } from '@/lib/types'
import { formatRupiah } from '@/lib/ps-pricing'
import { buildPsWAUrl } from '@/lib/ps-session'
import { CustomSelect } from '@/components/ui/custom-select'

interface PsBookingSheetProps {
  unit: PsUnit
  pricingRules: PsPricingRule[]
  onClose: () => void
}

export function PsBookingSheet({ unit, pricingRules, onClose }: PsBookingSheetProps) {
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [startHour, setStartHour] = useState(10)
  const [durationHours, setDurationHours] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const applicableRules = pricingRules.filter(
    r => r.is_active && (r.unit_type === 'all' || r.unit_type === unit.type) && r.rule_type === 'hourly'
  )
  const hourlyPrice = applicableRules[0]?.price || 0
  const estimatedAmount = hourlyPrice * durationHours

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      setError('Nama wajib diisi')
      return
    }

    setSubmitting(true)
    setError('')

    const res = await fetch('/api/ps/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ps_unit_id: unit.id,
        customer_name: customerName.trim(),
        phone: phone.trim() || null,
        booking_date: date,
        start_hour: startHour,
        duration_hours: durationHours,
      }),
    })

    if (res.ok) {
      // Redirect to WhatsApp
      const waUrl = buildPsWAUrl({
        customerName: customerName.trim(),
        unitName: unit.name,
        bookingDate: date,
        startHour,
        durationHours,
        estimatedAmount,
      })

      const isMobile = /android|iphone|ipad/i.test(navigator.userAgent)
      if (isMobile) {
        window.location.href = waUrl.replace('https://wa.me/', 'https://api.whatsapp.com/send?phone=').replace('?text=', '&text=')
      } else {
        window.open(waUrl, '_blank')
      }

      onClose()
    } else {
      const body = await res.json()
      setError(body.error ?? 'Gagal membuat booking')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-t-[20px] sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto border-t border-slate-700 sm:border"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-slate-700">
          <div className="w-9 h-1 bg-slate-600 rounded-full mx-auto mb-4 sm:hidden" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-bold text-slate-100">Booking {unit.name}</h3>
              <p className="text-[12px] text-slate-500">{unit.type}</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl transition-colors">×</button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">Nama *</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Nama kamu"
              autoFocus
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-[14px] text-slate-100 placeholder-slate-500 outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">No. HP (opsional)</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-[14px] text-slate-100 placeholder-slate-500 outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={today}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-[14px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">Jam Mulai</label>
              <CustomSelect
                value={String(startHour)}
                onChange={v => setStartHour(Number(v))}
                options={Array.from({ length: 16 }, (_, i) => i + 8).map(h => ({
                  value: String(h),
                  label: `${String(h).padStart(2, '0')}:00`,
                }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">Durasi (jam)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(h => (
                <button
                  key={h}
                  onClick={() => setDurationHours(h)}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-colors ${
                    durationHours === h
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-green-500 hover:text-slate-200'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {estimatedAmount > 0 && (
            <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-slate-400">Estimasi</span>
                <span className="text-[16px] font-bold text-green-400">{formatRupiah(estimatedAmount)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-[12px] text-red-400">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || !customerName.trim()}
            className="w-full py-3 rounded-xl text-[14px] font-bold bg-gradient-to-r from-green-500 to-green-600 text-green-950 hover:from-green-400 hover:to-green-500 disabled:opacity-40 transition-all shadow-[0_4px_16px_rgba(34,197,94,0.25)]"
          >
            {submitting ? 'Memproses...' : '📲 Booking via WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import type { PsSession, PsPricingRule } from '@/lib/types'
import { computeElapsedSeconds, formatDuration, formatRupiah, calculateBillOptions } from '@/lib/ps-pricing'

interface PsStopModalProps {
  session: PsSession
  unitType: 'PS4' | 'PS5'
  pricingRules: PsPricingRule[]
  onConfirm: (data: { pricing_rule_id?: string; discount_amount?: number; payment_method?: string; notes?: string }) => void
  onClose: () => void
  loading?: boolean
}

export function PsStopModal({ session, unitType, pricingRules, onConfirm, onClose, loading }: PsStopModalProps) {
  const [selectedRuleId, setSelectedRuleId] = useState(session.pricing_rule_id || '')
  const [discount, setDiscount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [notes, setNotes] = useState('')

  const elapsed = computeElapsedSeconds(session.started_at, session.paused_at, session.total_paused_seconds)
  const durationMinutes = Math.ceil(elapsed / 60)

  const billOptions = calculateBillOptions(durationMinutes, unitType, new Date(session.started_at), pricingRules)

  // Auto-select cheapest or matching rule
  useEffect(() => {
    if (!selectedRuleId && billOptions.length > 0) {
      setSelectedRuleId(billOptions[0].rule.id)
    }
  }, [billOptions, selectedRuleId])

  const selectedOption = billOptions.find(o => o.rule.id === selectedRuleId)
  const baseAmount = selectedOption?.amount || 0
  const discountAmount = parseInt(discount) || 0
  const finalAmount = Math.max(0, baseAmount - discountAmount)

  const handleConfirm = () => {
    onConfirm({
      pricing_rule_id: selectedRuleId || undefined,
      discount_amount: discountAmount,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-800/80">
          <h3 className="text-[13px] font-bold text-slate-100">Stop Session - {session.customer_name}</h3>
          <p className="text-[11px] text-slate-500">Durasi: {formatDuration(elapsed)} ({durationMinutes} menit)</p>
        </div>

        <div className="p-4 space-y-3">
          {/* Billing options */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Pilih Tarif</label>
            <div className="space-y-1.5">
              {billOptions.map(opt => (
                <label
                  key={opt.rule.id}
                  className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                    selectedRuleId === opt.rule.id
                      ? 'border-green-500/40 bg-green-500/10'
                      : 'border-slate-800/80 bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="pricing"
                    value={opt.rule.id}
                    checked={selectedRuleId === opt.rule.id}
                    onChange={() => setSelectedRuleId(opt.rule.id)}
                    className="accent-green-500"
                  />
                  <div className="flex-1">
                    <p className="text-[12px] text-slate-200">{opt.label}</p>
                  </div>
                  <span className="text-[13px] font-bold text-green-400">{formatRupiah(opt.amount)}</span>
                </label>
              ))}
              {billOptions.length === 0 && (
                <p className="text-[11px] text-slate-500">Tidak ada tarif yang berlaku</p>
              )}
            </div>
          </div>

          {/* Discount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Diskon (Rp)</label>
            <input
              type="number"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              placeholder="0"
              min={0}
              className="w-full bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Payment method */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Metode Pembayaran</label>
            <div className="flex gap-2">
              {[
                { value: 'cash', label: 'Cash' },
                { value: 'transfer', label: 'Transfer' },
                { value: 'qris', label: 'QRIS' },
              ].map(pm => (
                <button
                  key={pm.value}
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`flex-1 px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${
                    paymentMethod === pm.value
                      ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                      : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Catatan (opsional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Catatan tambahan"
              className="w-full bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Total */}
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800/80">
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-slate-200">{formatRupiah(baseAmount)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[12px] mt-1">
                <span className="text-slate-400">Diskon</span>
                <span className="text-red-400">-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] font-bold mt-2 pt-2 border-t border-slate-800/80">
              <span className="text-slate-100">Total</span>
              <span className="text-green-400">{formatRupiah(finalAmount)}</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-800/80 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl text-[12px] font-bold bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl text-[12px] font-bold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Menyimpan...' : 'Selesai & Bayar'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { PsUnit, PsPricingRule } from '@/lib/types'
import { formatRupiah } from '@/lib/ps-pricing'
import { CustomSelect } from '@/components/ui/custom-select'

interface PsStartModalProps {
  unit: PsUnit
  pricingRules: PsPricingRule[]
  onConfirm: (data: { ps_unit_id: string; customer_name: string; phone?: string; pricing_rule_id?: string }) => void
  onClose: () => void
  loading?: boolean
}

export function PsStartModal({ unit, pricingRules, onConfirm, onClose, loading }: PsStartModalProps) {
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedRule, setSelectedRule] = useState(pricingRules[0]?.id || '')

  const applicableRules = pricingRules.filter(
    r => r.is_active && (r.unit_type === 'all' || r.unit_type === unit.type)
  )

  const handleSubmit = () => {
    if (!customerName.trim()) return
    onConfirm({
      ps_unit_id: unit.id,
      customer_name: customerName.trim(),
      phone: phone.trim() || undefined,
      pricing_rule_id: selectedRule || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="text-[13px] font-bold text-slate-100">Start Session - {unit.name}</h3>
          <p className="text-[11px] text-slate-500">{unit.type}</p>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Nama Pelanggan *</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Nama pelanggan"
              autoFocus
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">No. HP (opsional)</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Tarif</label>
            <CustomSelect
              value={selectedRule}
              onChange={setSelectedRule}
              placeholder="Pilih tarif"
              options={applicableRules.map(r => ({
                value: r.id,
                label: `${r.name} - ${formatRupiah(r.price)}${r.duration_minutes ? ` / ${r.duration_minutes} menit` : ' / jam'}`,
              }))}
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl text-[12px] font-bold bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !customerName.trim()}
            className="flex-1 px-4 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Memulai...' : 'Mulai Session'}
          </button>
        </div>
      </div>
    </div>
  )
}

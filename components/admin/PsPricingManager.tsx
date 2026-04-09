'use client'

import { useState } from 'react'
import type { PsPricingRule } from '@/lib/types'
import { formatRupiah } from '@/lib/ps-pricing'
import { CustomSelect } from '@/components/ui/custom-select'

export function PsPricingManager({ initialRules }: { initialRules: PsPricingRule[] }) {
  const [rules, setRules] = useState(initialRules)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [unitType, setUnitType] = useState<'PS4' | 'PS5' | 'all'>('all')
  const [ruleType, setRuleType] = useState<'hourly' | 'package' | 'promo'>('hourly')
  const [price, setPrice] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [dayTypes, setDayTypes] = useState<string[]>(['weekday', 'weekend'])
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [priority, setPriority] = useState('0')

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setUnitType('all')
    setRuleType('hourly')
    setPrice('')
    setDurationMinutes('')
    setDayTypes(['weekday', 'weekend'])
    setValidFrom('')
    setValidUntil('')
    setPriority('0')
    setError('')
  }

  const startEdit = (r: PsPricingRule) => {
    setEditingId(r.id)
    setName(r.name)
    setUnitType(r.unit_type)
    setRuleType(r.rule_type)
    setPrice(String(r.price))
    setDurationMinutes(r.duration_minutes ? String(r.duration_minutes) : '')
    setDayTypes(r.day_types)
    setValidFrom(r.valid_from || '')
    setValidUntil(r.valid_until || '')
    setPriority(String(r.priority))
    setError('')
  }

  const toggleDayType = (dt: string) => {
    setDayTypes(prev =>
      prev.includes(dt) ? prev.filter(d => d !== dt) : [...prev, dt]
    )
  }

  const saveRule = async () => {
    if (!name.trim() || !price) {
      setError('Nama dan harga wajib diisi')
      return
    }
    const priceNum = parseInt(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Harga tidak valid')
      return
    }
    if (ruleType === 'package' && !durationMinutes) {
      setError('Durasi wajib diisi untuk tipe paket')
      return
    }
    if (dayTypes.length === 0) {
      setError('Pilih minimal satu jenis hari')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      name: name.trim(),
      unit_type: unitType,
      rule_type: ruleType,
      price: priceNum,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      day_types: dayTypes,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      priority: parseInt(priority) || 0,
    }

    if (editingId) {
      const res = await fetch(`/api/ps/pricing/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const updated: PsPricingRule = await res.json()
        setRules(prev => prev.map(r => (r.id === updated.id ? updated : r)))
        resetForm()
      } else {
        const body = await res.json()
        setError(body.error ?? 'Gagal mengupdate pricing')
      }
    } else {
      const res = await fetch('/api/ps/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const newRule: PsPricingRule = await res.json()
        setRules(prev => [newRule, ...prev])
        resetForm()
      } else {
        const body = await res.json()
        setError(body.error ?? 'Gagal menambah pricing')
      }
    }
    setSaving(false)
  }

  const deleteRule = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/ps/pricing/${id}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== id))
    if (editingId === id) resetForm()
    setDeletingId(null)
  }

  const toggleActive = async (rule: PsPricingRule) => {
    const res = await fetch(`/api/ps/pricing/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !rule.is_active }),
    })
    if (res.ok) {
      const updated: PsPricingRule = await res.json()
      setRules(prev => prev.map(r => (r.id === rule.id ? updated : r)))
    }
  }

  const ruleTypeLabel = (rt: string) => {
    switch (rt) {
      case 'hourly': return 'Per Jam'
      case 'package': return 'Paket'
      case 'promo': return 'Promo'
      default: return rt
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-[13px] font-bold text-slate-100">Daftar Harga PS</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Atur harga per jam, paket, dan promo.</p>
      </div>

      {/* Form */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        {editingId && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400">Edit Pricing</span>
            <button onClick={resetForm} className="text-[11px] text-slate-400 hover:text-slate-200">Batal</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Nama</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Per Jam Weekday"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Harga (Rp)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="15000"
              min={1}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Tipe Unit</label>
            <CustomSelect
              value={unitType}
              onChange={v => setUnitType(v as 'PS4' | 'PS5' | 'all')}
              options={[
                { value: 'all', label: 'Semua' },
                { value: 'PS4', label: 'PS4' },
                { value: 'PS5', label: 'PS5' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Tipe Harga</label>
            <CustomSelect
              value={ruleType}
              onChange={v => setRuleType(v as 'hourly' | 'package' | 'promo')}
              options={[
                { value: 'hourly', label: 'Per Jam' },
                { value: 'package', label: 'Paket' },
                { value: 'promo', label: 'Promo' },
              ]}
            />
          </div>
          {(ruleType === 'package') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-500">Durasi (menit)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                placeholder="180"
                min={1}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Hari Berlaku</label>
            <div className="flex gap-3">
              {['weekday', 'weekend'].map(dt => (
                <label key={dt} className="flex items-center gap-1.5 text-[12px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dayTypes.includes(dt)}
                    onChange={() => toggleDayType(dt)}
                    className="accent-green-500"
                  />
                  {dt === 'weekday' ? 'Weekday' : 'Weekend'}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Prioritas</label>
            <input
              type="number"
              value={priority}
              onChange={e => setPriority(e.target.value)}
              placeholder="0"
              min={0}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>
        </div>

        {ruleType === 'promo' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-500">Berlaku Mulai</label>
              <input
                type="date"
                value={validFrom}
                onChange={e => setValidFrom(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-500">Berlaku Sampai</label>
              <input
                type="date"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                min={validFrom}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>
        )}

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <button
          onClick={saveRule}
          disabled={saving}
          className="w-full px-4 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : '+ Tambah Harga'}
        </button>
      </div>

      {/* List */}
      {rules.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-slate-500">Belum ada daftar harga</p>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {rules.map(r => {
            const isExpired = r.valid_until && r.valid_until < new Date().toISOString().split('T')[0]
            return (
              <div key={r.id} className={`px-4 py-3 flex items-start justify-between gap-3 ${!r.is_active ? 'opacity-50' : ''}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-100">{r.name}</span>
                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded-md uppercase">
                      {ruleTypeLabel(r.rule_type)}
                    </span>
                    {r.unit_type !== 'all' && (
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-700 border border-slate-600 px-1.5 py-0.5 rounded-md">
                        {r.unit_type}
                      </span>
                    )}
                    {isExpired && (
                      <span className="text-[9px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded-md uppercase">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-green-400 font-semibold mt-0.5">{formatRupiah(r.price)}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {r.duration_minutes && (
                      <p className="text-[10px] text-slate-500">{r.duration_minutes} menit</p>
                    )}
                    <p className="text-[10px] text-slate-500">{r.day_types.join(', ')}</p>
                    {r.valid_from && (
                      <p className="text-[10px] text-slate-600">{r.valid_from} – {r.valid_until}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(r)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      r.is_active
                        ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                        : 'bg-slate-700 border border-slate-600 text-slate-400'
                    }`}
                  >
                    {r.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                  <button onClick={() => startEdit(r)} className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors">Edit</button>
                  <button
                    onClick={() => deleteRule(r.id)}
                    disabled={deletingId === r.id}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                  >
                    {deletingId === r.id ? '...' : 'Hapus'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

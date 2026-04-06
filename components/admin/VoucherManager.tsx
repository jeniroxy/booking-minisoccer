'use client'

import { useState } from 'react'
import type { Voucher } from '@/lib/types'

export function VoucherManager({ initialVouchers }: { initialVouchers: Voucher[] }) {
  const [vouchers, setVouchers] = useState(initialVouchers)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [discountType, setDiscountType] = useState<'nominal' | 'percent'>('nominal')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUsage, setMaxUsage] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const resetForm = () => {
    setEditingId(null)
    setCode('')
    setName('')
    setDiscountType('nominal')
    setDiscountValue('')
    setMaxUsage('')
    setValidFrom('')
    setValidUntil('')
    setError('')
  }

  const startEdit = (v: Voucher) => {
    setEditingId(v.id)
    setCode(v.code)
    setName(v.name)
    setDiscountType(v.discount_type)
    setDiscountValue(String(v.discount_value))
    setMaxUsage(v.max_usage !== null ? String(v.max_usage) : '')
    setValidFrom(v.valid_from)
    setValidUntil(v.valid_until)
    setError('')
  }

  const saveVoucher = async () => {
    if (!code || !name || !discountValue || !validFrom || !validUntil) {
      setError('Semua field wajib diisi')
      return
    }
    const value = parseInt(discountValue)
    if (isNaN(value) || value <= 0) {
      setError('Nilai diskon tidak valid')
      return
    }
    if (discountType === 'percent' && value > 100) {
      setError('Diskon % tidak boleh lebih dari 100')
      return
    }
    if (validUntil < validFrom) {
      setError('Tanggal akhir harus setelah tanggal mulai')
      return
    }
    const parsedMaxUsage = maxUsage.trim() ? parseInt(maxUsage) : null
    if (parsedMaxUsage !== null && (isNaN(parsedMaxUsage) || parsedMaxUsage <= 0)) {
      setError('Batas pemakaian harus angka positif')
      return
    }

    setSaving(true)
    setError('')

    if (editingId) {
      // Update existing
      const res = await fetch(`/api/admin/vouchers/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          name: name.trim(),
          discount_type: discountType,
          discount_value: value,
          max_usage: parsedMaxUsage,
          valid_from: validFrom,
          valid_until: validUntil,
        }),
      })
      if (res.ok) {
        const updated: Voucher = await res.json()
        setVouchers(prev => prev.map(v => (v.id === updated.id ? updated : v)))
        resetForm()
      } else {
        const body = await res.json()
        setError(body.error ?? 'Gagal mengupdate voucher')
      }
    } else {
      // Create new
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          name: name.trim(),
          discount_type: discountType,
          discount_value: value,
          max_usage: parsedMaxUsage,
          valid_from: validFrom,
          valid_until: validUntil,
        }),
      })
      if (res.ok) {
        const newVoucher: Voucher = await res.json()
        setVouchers(prev => [newVoucher, ...prev])
        resetForm()
      } else {
        const body = await res.json()
        setError(body.error ?? 'Gagal menyimpan voucher')
      }
    }
    setSaving(false)
  }

  const deleteVoucher = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/admin/vouchers/${id}`, { method: 'DELETE' })
    setVouchers(prev => prev.filter(v => v.id !== id))
    if (editingId === id) resetForm()
    setDeletingId(null)
  }

  const toggleActive = async (voucher: Voucher) => {
    setTogglingId(voucher.id)
    const res = await fetch(`/api/admin/vouchers/${voucher.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !voucher.is_active }),
    })
    if (res.ok) {
      const updated: Voucher = await res.json()
      setVouchers(prev => prev.map(v => (v.id === voucher.id ? updated : v)))
    }
    setTogglingId(null)
  }

  const formatDiscount = (v: Voucher) =>
    v.discount_type === 'percent'
      ? `${v.discount_value}%`
      : `Rp ${v.discount_value.toLocaleString('id-ID')}`

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-[13px] font-bold text-slate-100">Voucher</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Kelola kode diskon untuk pelanggan.</p>
      </div>

      {/* Form */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        {editingId && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400">Edit Voucher</span>
            <button onClick={resetForm} className="text-[11px] text-slate-400 hover:text-slate-200">Batal</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Kode Voucher</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="DISKON10"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors uppercase"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Nama Voucher</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Diskon Akhir Tahun"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Tipe Diskon</label>
            <div className="flex gap-3">
              {(['nominal', 'percent'] as const).map(type => (
                <label key={type} className="flex items-center gap-1.5 text-[12px] text-slate-400 cursor-pointer">
                  <input
                    type="radio"
                    name="discountType"
                    value={type}
                    checked={discountType === type}
                    onChange={() => setDiscountType(type)}
                    className="accent-green-500"
                  />
                  {type === 'nominal' ? 'Nominal (Rp)' : 'Persen (%)'}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">
              Nilai Diskon {discountType === 'percent' ? '(%)' : '(Rp)'}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percent' ? '10' : '50000'}
              min={1}
              max={discountType === 'percent' ? 100 : undefined}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Batas Pemakaian</label>
            <input
              type="number"
              value={maxUsage}
              onChange={e => setMaxUsage(e.target.value)}
              placeholder="Unlimited"
              min={1}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Berlaku Mulai</label>
            <input
              type="date"
              value={validFrom}
              onChange={e => setValidFrom(e.target.value)}
              min={today}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Berlaku Sampai</label>
            <input
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
              min={validFrom || today}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <button
          onClick={saveVoucher}
          disabled={saving}
          className="w-full px-4 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : '+ Tambah Voucher'}
        </button>
      </div>

      {/* List */}
      {vouchers.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-slate-500">Belum ada voucher</p>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {vouchers.map(v => {
            const isExpired = v.valid_until < new Date().toISOString().split('T')[0]
            return (
              <div key={v.id} className={`px-4 py-3 flex items-start justify-between gap-3 ${!v.is_active ? 'opacity-50' : ''}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-100 font-mono tracking-wider">{v.code}</span>
                    {isExpired && (
                      <span className="text-[9px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded-md uppercase">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{v.name}</p>
                  <p className="text-[11px] text-green-400 font-semibold">{formatDiscount(v)}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-[10px] text-slate-600">{v.valid_from} – {v.valid_until}</p>
                    <p className="text-[10px] text-slate-500">
                      Pemakaian: {v.max_usage !== null ? `maks ${v.max_usage}x` : 'Unlimited'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(v)}
                    disabled={togglingId === v.id}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors disabled:opacity-40 ${
                      v.is_active
                        ? 'bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400'
                        : 'bg-slate-700 border border-slate-600 text-slate-400 hover:bg-green-500/20 hover:border-green-500/40 hover:text-green-400'
                    }`}
                  >
                    {v.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                  <button
                    onClick={() => startEdit(v)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteVoucher(v.id)}
                    disabled={deletingId === v.id}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                  >
                    {deletingId === v.id ? '...' : 'Hapus'}
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

'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import type { Voucher } from '@/lib/types'

function VoucherFormModal({
  editingVoucher,
  onSave,
  onClose,
}: {
  editingVoucher: Voucher | null
  onSave: (voucher: Voucher) => void
  onClose: () => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [discountType, setDiscountType] = useState<'nominal' | 'percent'>('nominal')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUsage, setMaxUsage] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const isEdit = !!editingVoucher

  useEffect(() => {
    if (editingVoucher) {
      setCode(editingVoucher.code)
      setName(editingVoucher.name)
      setDiscountType(editingVoucher.discount_type)
      setDiscountValue(String(editingVoucher.discount_value))
      setMaxUsage(editingVoucher.max_usage !== null ? String(editingVoucher.max_usage) : '')
      setValidFrom(editingVoucher.valid_from)
      setValidUntil(editingVoucher.valid_until)
    }
  }, [editingVoucher])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSave = async () => {
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

    const payload = {
      code: code.toUpperCase().trim(),
      name: name.trim(),
      discount_type: discountType,
      discount_value: value,
      max_usage: parsedMaxUsage,
      valid_from: validFrom,
      valid_until: validUntil,
    }

    const url = isEdit ? `/api/admin/vouchers/${editingVoucher.id}` : '/api/admin/vouchers'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const result: Voucher = await res.json()
      onSave(result)
    } else {
      const body = await res.json()
      setError(body.error ?? (isEdit ? 'Gagal mengupdate voucher' : 'Gagal menyimpan voucher'))
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-slate-900/50 border border-slate-800/80 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {isEdit ? 'Edit Voucher' : 'Tambah Voucher'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? 'Ubah data voucher yang sudah ada' : 'Buat kode diskon baru'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-5 space-y-3.5">
          {/* Code + Name */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Kode Voucher</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="DISKON10"
                autoFocus
                className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all uppercase"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Nama Voucher</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Diskon Akhir Tahun"
                className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
              />
            </div>
          </div>

          {/* Discount type + value */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Tipe Diskon</label>
              <div className="flex gap-2">
                {(['nominal', 'percent'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDiscountType(type)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      discountType === type
                        ? 'bg-green-500/15 ring-1 ring-green-500/30 text-green-400'
                        : 'bg-slate-900/80 ring-1 ring-slate-700 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {type === 'nominal' ? 'Nominal (Rp)' : 'Persen (%)'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">
                Nilai Diskon {discountType === 'percent' ? '(%)' : '(Rp)'}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percent' ? '10' : '50000'}
                min={1}
                max={discountType === 'percent' ? 100 : undefined}
                className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
              />
            </div>
          </div>

          {/* Max usage */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Batas Pemakaian</label>
            <input
              type="number"
              value={maxUsage}
              onChange={e => setMaxUsage(e.target.value)}
              placeholder="Kosongkan untuk unlimited"
              min={1}
              className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
          </div>

          {/* Dates side by side */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Berlaku Mulai</label>
              <input
                type="date"
                value={validFrom}
                onChange={e => setValidFrom(e.target.value)}
                min={today}
                className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Berlaku Sampai</label>
              <input
                type="date"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                min={validFrom || today}
                className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-400 bg-slate-800/50 hover:bg-slate-800 active:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-green-500 text-green-950 hover:bg-green-400 active:bg-green-600 disabled:opacity-40 transition-colors shadow-lg shadow-green-500/20"
            >
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type VoucherTab = 'manual' | 'mainlagi'

export function VoucherManager({ initialVouchers }: { initialVouchers: Voucher[] }) {
  const [vouchers, setVouchers] = useState(initialVouchers)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [tab, setTab] = useState<VoucherTab>('manual')

  const manualVouchers = vouchers.filter(v => !v.code.startsWith('MAINLAGI-'))
  const mainlagiVouchers = vouchers.filter(v => v.code.startsWith('MAINLAGI-'))
  const filteredVouchers = tab === 'manual' ? manualVouchers : mainlagiVouchers

  const openCreate = () => {
    setEditingVoucher(null)
    setModalOpen(true)
  }

  const openEdit = (v: Voucher) => {
    setEditingVoucher(v)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingVoucher(null)
  }

  const handleSave = (saved: Voucher) => {
    if (editingVoucher) {
      setVouchers(prev => prev.map(v => (v.id === saved.id ? saved : v)))
    } else {
      setVouchers(prev => [saved, ...prev])
    }
    closeModal()
  }

  const deleteVoucher = async (id: string) => {
    if (!confirm('Hapus voucher ini?')) return
    setDeletingId(id)
    await fetch(`/api/admin/vouchers/${id}`, { method: 'DELETE' })
    setVouchers(prev => prev.filter(v => v.id !== id))
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
    <>
      {/* Modal */}
      {modalOpen && (
        <VoucherFormModal
          editingVoucher={editingVoucher}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {/* Tabs */}
      <div className="flex bg-slate-800 rounded-2xl p-[3px] mb-4 overflow-x-auto">
        {([
          { key: 'manual' as VoucherTab, label: 'Manual', count: manualVouchers.length },
          { key: 'mainlagi' as VoucherTab, label: 'Main Lagi', count: mainlagiVouchers.length },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 rounded-xl text-[12px] font-bold transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'bg-green-500/15 text-green-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Voucher list */}
      {filteredVouchers.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800/80 px-4 py-12 text-center">
          <p className="text-sm text-slate-500">Belum ada voucher</p>
          <p className="text-xs text-slate-600 mt-1">{tab === 'manual' ? 'Klik tombol + untuk buat voucher baru' : 'Voucher Main Lagi dibuat otomatis saat booking dikonfirmasi'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVouchers.map(v => {
            const isExpired = v.valid_until < new Date().toISOString().split('T')[0]
            return (
              <div key={v.id} className={`bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800/80 px-4 py-4 transition-opacity ${!v.is_active ? 'opacity-40' : ''}`}>
                {/* Top row: code + discount */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-slate-100 font-mono tracking-wider">{v.code}</span>
                      {isExpired && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 ring-1 ring-red-500/25 px-2 py-0.5 rounded-lg uppercase">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{v.name}</p>
                  </div>

                  <span className="flex-shrink-0 text-sm font-bold text-green-400 bg-green-500/10 ring-1 ring-green-500/20 px-3 py-1.5 rounded-xl">
                    {formatDiscount(v)}
                  </span>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>{v.valid_from} – {v.valid_until}</span>
                  <span className="text-slate-700">|</span>
                  <span>Maks: {v.max_usage !== null ? `${v.max_usage}x` : (tab === 'mainlagi' ? '1x' : 'Unlimited')}</span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => toggleActive(v)}
                    disabled={togglingId === v.id}
                    className="relative w-11 h-6 rounded-full transition-colors disabled:opacity-40 flex-shrink-0"
                    style={{
                      backgroundColor: v.is_active ? 'rgb(34 197 94 / 0.3)' : 'rgb(51 65 85 / 0.8)',
                    }}
                    role="switch"
                    aria-checked={v.is_active}
                    title={v.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full transition-all shadow-sm ${
                        v.is_active ? 'left-5 bg-green-400' : 'left-0.5 bg-slate-500'
                      }`}
                    />
                  </button>
                  <span className="text-[11px] text-slate-500 font-medium mr-auto">
                    {v.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>

                  <button
                    onClick={() => openEdit(v)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => deleteVoucher(v.id)}
                    disabled={deletingId === v.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                  >
                    <Trash2 size={13} /> {deletingId === v.id ? '...' : 'Hapus'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB - only show on manual tab */}
      {!modalOpen && tab === 'manual' && (
        <button
          onClick={openCreate}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-green-500 text-green-950 shadow-lg shadow-green-500/30 flex items-center justify-center hover:bg-green-400 active:scale-95 transition-all"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}
    </>
  )
}

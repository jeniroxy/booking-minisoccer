'use client'

import { useState, useEffect } from 'react'
import type { CapitalExpense } from '@/lib/types'
import { formatRupiah } from '@/lib/ps-pricing'

export function CapitalExpenseForm({ onSaved }: { onSaved?: () => void } = {}) {
  const [expenses, setExpenses] = useState<CapitalExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/capital-expenses')
      .then(res => res.ok ? res.json() : [])
      .then(data => { setExpenses(data); setLoading(false) })
  }, [])
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setNotes('')
    setError('')
  }

  const saveExpense = async () => {
    if (!description.trim() || !amount) {
      setError('Deskripsi dan jumlah wajib diisi')
      return
    }
    const amountNum = parseInt(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Jumlah tidak valid')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/capital-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        description: description.trim(),
        amount: amountNum,
        notes: notes.trim() || null,
      }),
    })

    if (res.ok) {
      const newExpense: CapitalExpense = await res.json()
      setExpenses(prev => [newExpense, ...prev])
      resetForm()
      onSaved?.()
    } else {
      const body = await res.json()
      setError(body.error ?? 'Gagal menyimpan')
    }
    setSaving(false)
  }

  const deleteExpense = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/admin/capital-expenses/${id}`, { method: 'DELETE' })
    setExpenses(prev => prev.filter(e => e.id !== id))
    setDeletingId(null)
  }

  const totalCapital = expenses.reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-1/3" />
          <div className="h-3 bg-slate-700/50 rounded w-2/3" />
          <div className="h-10 bg-slate-700/30 rounded-xl mt-4" />
          <div className="h-10 bg-slate-700/30 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-[13px] font-bold text-slate-100">Belanja Besar</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Pengeluaran besar (pembangunan, pembelian tanah) yang dipotong dari saldo kumulatif.</p>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Jumlah (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="50000000"
              min={1}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500">Deskripsi *</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Pembangunan fasilitas, pembelian tanah, dll"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500">Catatan (opsional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Detail tambahan"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <button
          onClick={saveExpense}
          disabled={saving}
          className="w-full px-4 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Menyimpan...' : '+ Tambah Belanja Besar'}
        </button>
      </div>

      {/* List */}
      {expenses.length > 0 && (
        <>
          <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400">Total Belanja Besar</span>
              <span className="text-[12px] font-bold text-red-400">{formatRupiah(totalCapital)}</span>
            </div>
          </div>
          <div className="divide-y divide-slate-700/50">
            {expenses.map(e => (
              <div key={e.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-slate-200">{e.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500">{e.date}</span>
                    {e.notes && <span className="text-[10px] text-slate-600">{e.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[13px] font-bold text-red-400">{formatRupiah(e.amount)}</span>
                  <button
                    onClick={() => deleteExpense(e.id)}
                    disabled={deletingId === e.id}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                  >
                    {deletingId === e.id ? '...' : 'Hapus'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

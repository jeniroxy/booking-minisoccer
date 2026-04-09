'use client'

import { useState, useEffect } from 'react'
import type { ExpenseCategory, ExpenseEntry } from '@/lib/types'
import { formatRupiah } from '@/lib/ps-pricing'

const EXPENSE_CATEGORIES = [
  { name: 'Kantin', icon: '🍔' },
  { name: 'Mini Soccer', icon: '⚽' },
]

export function ExpenseInputForm({ onSaved }: { onSaved?: () => void } = {}) {
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }))
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<(ExpenseEntry & { expense_categories?: { name: string } })[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [catRes, expRes] = await Promise.all([
        fetch('/api/admin/expense-categories'),
        fetch(`/api/admin/expenses?date=${date}`),
      ])
      if (catRes.ok) {
        const allCats: ExpenseCategory[] = await catRes.json()
        // Only keep Kantin and Mini Soccer categories
        const filtered = allCats.filter(c =>
          EXPENSE_CATEGORIES.some(ec => c.name.toLowerCase() === ec.name.toLowerCase())
        )
        setCategories(filtered)
        if (filtered.length > 0 && !categoryId) setCategoryId(filtered[0].id)
      }
      if (expRes.ok) setExpenses(await expRes.json())
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDate = async (newDate: string) => {
    setDate(newDate)
    const res = await fetch(`/api/admin/expenses?date=${newDate}`)
    if (res.ok) {
      setExpenses(await res.json())
    }
  }

  const saveExpense = async () => {
    if (!categoryId || !amount) {
      setError('Kategori dan jumlah wajib diisi')
      return
    }
    const amountNum = parseInt(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Jumlah tidak valid')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        expense_category_id: categoryId,
        amount: amountNum,
        description: description.trim() || null,
      }),
    })

    if (res.ok) {
      const newExpense = await res.json()
      setExpenses(prev => [newExpense, ...prev])
      setAmount('')
      setDescription('')
      onSaved?.()
    } else {
      const body = await res.json()
      setError(body.error ?? 'Gagal menyimpan')
    }
    setSaving(false)
  }

  const deleteExpense = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' })
    setExpenses(prev => prev.filter(e => e.id !== id))
    setDeletingId(null)
  }

  const todayExpenses = expenses.filter(e => e.date === date)
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0)

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
        <h2 className="text-[13px] font-bold text-slate-100">Input Pengeluaran Harian</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Catat pengeluaran operasional harian.</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500">Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={e => loadDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
          />
        </div>

        {/* Category toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500">Kategori</label>
          <div className="flex gap-2">
            {categories.map(c => {
              const config = EXPENSE_CATEGORIES.find(ec => ec.name.toLowerCase() === c.name.toLowerCase())
              const isActive = categoryId === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${
                    isActive
                      ? 'bg-green-500/15 border border-green-500/40 text-green-400'
                      : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span>{config?.icon}</span> {c.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500">Jumlah (Rp)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="50000"
            min={1}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500">Deskripsi (opsional)</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Belanja kebutuhan kantin"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <button
          onClick={saveExpense}
          disabled={saving}
          className="w-full px-4 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Menyimpan...' : '+ Tambah Pengeluaran'}
        </button>
      </div>

      {/* Today's expenses list */}
      {todayExpenses.length > 0 && (
        <>
          <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400">Pengeluaran {date}</span>
              <span className="text-[12px] font-bold text-red-400">{formatRupiah(todayTotal)}</span>
            </div>
          </div>
          <div className="divide-y divide-slate-700/50">
            {todayExpenses.map(e => (
              <div key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-slate-300">
                      {(e as { expense_categories?: { name: string } }).expense_categories?.name || 'Unknown'}
                    </span>
                    <span className="text-[12px] font-bold text-red-400">{formatRupiah(e.amount)}</span>
                  </div>
                  {e.description && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{e.description}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteExpense(e.id)}
                  disabled={deletingId === e.id}
                  className="text-[11px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {deletingId === e.id ? '...' : 'Hapus'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

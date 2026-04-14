'use client'

import { useState, useEffect, useRef } from 'react'
import { formatRupiah } from '@/lib/ps-pricing'
import { Trash2, Pencil, Check, X, Plus } from 'lucide-react'
import { MonthPicker } from './MonthPicker'

const EXPENSE_CATS = [
  { name: 'Mini Soccer', icon: '⚽' },
  { name: 'Kantin', icon: '🍔' },
]

const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function generateDays(centerDate: Date): Date[] {
  const days: Date[] = []
  const start = new Date(centerDate)
  start.setDate(start.getDate() - 15)
  for (let i = 0; i < 31; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

interface ExpenseEntry {
  id: string
  date: string
  amount: number
  description: string | null
  expense_category_id: string
  expense_categories?: { name: string }
}

export function DailyExpenseReport() {
  const [todayStr] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }))
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [days, setDays] = useState(() => generateDays(new Date()))
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Add expense state (keyed by category id)
  const [addingCatId, setAddingCatId] = useState<string | null>(null)
  const [newAmount, setNewAmount] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  // Edit existing entry state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const stripRef = useRef<HTMLDivElement>(null)

  // Load categories once
  useEffect(() => {
    fetch('/api/admin/expense-categories')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (Array.isArray(data)) setCategories(data) })
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/expenses?date=${selectedDate}`)
      if (res.ok) setExpenses(await res.json())
      setLoading(false)
    }
    load()
  }, [selectedDate])

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const el = strip.querySelector('[data-selected="true"]') as HTMLElement
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedDate])

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr)
    const idx = days.findIndex(d => toDateStr(d) === dateStr)
    if (idx <= 5 || idx >= days.length - 5) {
      setDays(generateDays(new Date(dateStr)))
    }
  }

  const navigate = (dir: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + dir)
    const newStr = toDateStr(d)
    setSelectedDate(newStr)
    setDays(generateDays(d))
  }

  const handleMonthSelect = (year: number, month: number) => {
    const newStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
    setSelectedDate(newStr)
    setDays(generateDays(new Date(newStr + 'T00:00:00')))
  }

  const getCatTotal = (catName: string) => {
    return expenses
      .filter(e => e.expense_categories?.name?.toLowerCase() === catName.toLowerCase())
      .reduce((sum, e) => sum + e.amount, 0)
  }

  const deleteExpense = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' })
    setExpenses(prev => prev.filter(e => e.id !== id))
    setDeletingId(null)
  }

  const getCategoryIdByName = (name: string) =>
    categories.find(c => c.name.toLowerCase() === name.toLowerCase())?.id || ''

  const openAdd = (catName: string) => {
    const id = getCategoryIdByName(catName)
    if (!id) return
    setEditingId(null)
    setAddingCatId(id)
    setNewAmount('')
    setNewDesc('')
  }

  const cancelAdd = () => {
    setAddingCatId(null)
    setNewAmount('')
    setNewDesc('')
  }

  const saveNew = async () => {
    if (!addingCatId) return
    const amt = parseInt(newAmount)
    if (isNaN(amt) || amt <= 0) return
    setSavingNew(true)
    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedDate,
        expense_category_id: addingCatId,
        amount: amt,
        description: newDesc.trim() || null,
      }),
    })
    if (res.ok) {
      const entry = await res.json()
      setExpenses(prev => [entry, ...prev])
      cancelAdd()
    }
    setSavingNew(false)
  }

  const openEdit = (e: ExpenseEntry) => {
    setAddingCatId(null)
    setEditingId(e.id)
    setEditAmount(String(e.amount))
    setEditDesc(e.description || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditAmount('')
    setEditDesc('')
  }

  const saveEdit = async () => {
    if (!editingId) return
    const amt = parseInt(editAmount)
    if (isNaN(amt) || amt <= 0) return
    setSavingEdit(true)
    const res = await fetch(`/api/admin/expenses/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amt,
        description: editDesc.trim() || null,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setExpenses(prev => prev.map(e => (e.id === editingId ? { ...e, ...updated } : e)))
      cancelEdit()
    }
    setSavingEdit(false)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  const selectedDateObj = new Date(selectedDate + 'T00:00:00')

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <MonthPicker
            selectedYear={selectedDateObj.getFullYear()}
            selectedMonth={selectedDateObj.getMonth()}
            onSelect={handleMonthSelect}
            accent="red"
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(-1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors text-sm"
            >
              ‹
            </button>
            <button
              onClick={() => { setSelectedDate(todayStr); setDays(generateDays(new Date())) }}
              className="px-2.5 h-7 rounded-lg text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              HARI INI
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors text-sm"
            >
              ›
            </button>
          </div>
        </div>

        <div
          ref={stripRef}
          className="flex gap-1 overflow-x-auto px-3 py-2.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {days.map(day => {
            const dateStr = toDateStr(day)
            const isToday = dateStr === todayStr
            const isActive = dateStr === selectedDate
            return (
              <button
                key={dateStr}
                data-selected={isActive}
                onClick={() => handleDateSelect(dateStr)}
                className="flex-shrink-0 w-11 flex flex-col items-center gap-1 py-0.5"
              >
                <span className={`text-[8px] font-medium uppercase tracking-wider ${isActive ? 'text-red-400' : 'text-slate-500'}`}>
                  {DAY_SHORT[day.getDay()]}
                </span>
                <span className={`w-9 h-9 flex items-center justify-center rounded-xl text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-red-500/15 text-red-400 font-bold'
                    : isToday
                      ? 'bg-slate-700 text-slate-300 border border-slate-600'
                      : 'text-slate-500 hover:text-slate-300'
                }`}>
                  {day.getDate()}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-[13px] text-slate-500">Memuat...</div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
            <p className="text-[11px] text-slate-400 font-medium">Total Pengeluaran</p>
            <p className="text-[20px] font-extrabold text-red-400 mt-0.5">{formatRupiah(totalExpenses)}</p>
          </div>

          {/* Category cards — click to add new expense */}
          <div className="grid grid-cols-2 gap-2">
            {EXPENSE_CATS.map(cat => {
              const total = getCatTotal(cat.name)
              const count = expenses.filter(e => e.expense_categories?.name?.toLowerCase() === cat.name.toLowerCase()).length
              const catId = getCategoryIdByName(cat.name)
              const isAdding = addingCatId === catId
              return (
                <button
                  key={cat.name}
                  onClick={() => openAdd(cat.name)}
                  disabled={!catId}
                  className={`bg-slate-800 rounded-2xl border p-3.5 text-left transition-colors ${
                    isAdding
                      ? 'border-red-500/50 ring-1 ring-red-500/30'
                      : 'border-slate-700 hover:border-slate-600'
                  } ${total === 0 ? 'opacity-60' : ''} disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px]">{cat.icon}</span>
                      <span className="text-[11px] font-medium text-slate-400">{cat.name}</span>
                    </div>
                    <Plus size={12} className="text-slate-600" />
                  </div>
                  <p className={`text-[18px] font-bold ${total > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                    {total > 0 ? formatRupiah(total) : 'Rp 0'}
                  </p>
                  {count > 0 && (
                    <p className="text-[9px] text-slate-500 mt-1">{count} transaksi</p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Inline add-expense form */}
          {addingCatId && (
            <div className="bg-slate-800 rounded-2xl border border-red-500/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-bold text-slate-100">
                  Tambah Pengeluaran — {categories.find(c => c.id === addingCatId)?.name}
                </h3>
                <button
                  onClick={cancelAdd}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-500">Jumlah (Rp)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveNew(); if (e.key === 'Escape') cancelAdd() }}
                    placeholder="50000"
                    min={1}
                    autoFocus
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500">Deskripsi (opsional)</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveNew(); if (e.key === 'Escape') cancelAdd() }}
                    placeholder="Listrik, gaji, dll"
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              <button
                onClick={saveNew}
                disabled={savingNew || !newAmount}
                className="w-full py-2 rounded-lg text-[12px] font-bold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 disabled:opacity-40 transition-colors"
              >
                {savingNew ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          )}

          {/* Expense entries list */}
          {expenses.length > 0 && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <h3 className="text-[13px] font-bold text-slate-100">Rincian Pengeluaran</h3>
              </div>
              <div className="divide-y divide-slate-700/50">
                {expenses.map(e => {
                  const catConfig = EXPENSE_CATS.find(c => c.name.toLowerCase() === e.expense_categories?.name?.toLowerCase())
                  const isEditing = editingId === e.id

                  if (isEditing) {
                    return (
                      <div key={e.id} className="px-4 py-3 space-y-2 bg-slate-900/40">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px]">{catConfig?.icon || '📋'}</span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {e.expense_categories?.name}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={ev => setEditAmount(ev.target.value)}
                          onKeyDown={ev => { if (ev.key === 'Enter') saveEdit(); if (ev.key === 'Escape') cancelEdit() }}
                          placeholder="Jumlah"
                          min={1}
                          autoFocus
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-100 outline-none focus:border-red-500"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={ev => setEditDesc(ev.target.value)}
                          onKeyDown={ev => { if (ev.key === 'Enter') saveEdit(); if (ev.key === 'Escape') cancelEdit() }}
                          placeholder="Deskripsi"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-100 outline-none focus:border-red-500"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={saveEdit}
                            disabled={savingEdit || !editAmount}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 disabled:opacity-40"
                          >
                            <Check size={12} /> {savingEdit ? '...' : 'Simpan'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px]">{catConfig?.icon || '📋'}</span>
                          <span className="text-[12px] font-medium text-slate-300">
                            {e.expense_categories?.name || 'Unknown'}
                          </span>
                          <span className="text-[12px] font-bold text-red-400">{formatRupiah(e.amount)}</span>
                        </div>
                        {e.description && (
                          <p className="text-[10px] text-slate-500 mt-0.5 ml-6">{e.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteExpense(e.id)}
                          disabled={deletingId === e.id}
                          className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  )
}

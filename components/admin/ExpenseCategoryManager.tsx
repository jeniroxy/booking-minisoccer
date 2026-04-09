'use client'

import { useState, useEffect } from 'react'
import type { ExpenseCategory } from '@/lib/types'

export function ExpenseCategoryManager() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/expense-categories')
      .then(res => res.ok ? res.json() : [])
      .then(data => { setCategories(data); setLoading(false) })
  }, [])
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setError('')
  }

  const saveCategory = async () => {
    if (!name.trim()) {
      setError('Nama kategori wajib diisi')
      return
    }

    setSaving(true)
    setError('')

    if (editingId) {
      const res = await fetch(`/api/admin/expense-categories/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const updated: ExpenseCategory = await res.json()
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c))
        resetForm()
      } else {
        const body = await res.json()
        setError(body.error ?? 'Gagal mengupdate')
      }
    } else {
      const res = await fetch('/api/admin/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const newCat: ExpenseCategory = await res.json()
        setCategories(prev => [...prev, newCat])
        resetForm()
      } else {
        const body = await res.json()
        setError(body.error ?? 'Gagal menambah kategori')
      }
    }
    setSaving(false)
  }

  const deleteCategory = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/admin/expense-categories/${id}`, { method: 'DELETE' })
    setCategories(prev => prev.filter(c => c.id !== id))
    if (editingId === id) resetForm()
    setDeletingId(null)
  }

  const toggleActive = async (cat: ExpenseCategory) => {
    const res = await fetch(`/api/admin/expense-categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !cat.is_active }),
    })
    if (res.ok) {
      const updated: ExpenseCategory = await res.json()
      setCategories(prev => prev.map(c => c.id === cat.id ? updated : c))
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-1/3" />
          <div className="h-3 bg-slate-700/50 rounded w-2/3" />
          <div className="h-10 bg-slate-700/30 rounded-xl mt-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-[13px] font-bold text-slate-100">Kategori Pengeluaran</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Kelola kategori pengeluaran (listrik, gaji, maintenance, dll).</p>
      </div>

      <div className="p-4 space-y-3">
        {editingId && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400">Edit Kategori</span>
            <button onClick={resetForm} className="text-[11px] text-slate-400 hover:text-slate-200">Batal</button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nama kategori baru"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
          />
          <button
            onClick={saveCategory}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
          >
            {saving ? '...' : editingId ? 'Simpan' : '+ Tambah'}
          </button>
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>

      {categories.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-slate-500">Belum ada kategori</p>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {categories.map(c => (
            <div key={c.id} className={`px-4 py-2.5 flex items-center justify-between gap-3 ${!c.is_active ? 'opacity-50' : ''}`}>
              <span className="text-[13px] text-slate-200">{c.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(c)}
                  className={`text-[11px] px-2 py-0.5 rounded-lg font-bold transition-colors ${
                    c.is_active
                      ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                      : 'bg-slate-700 border border-slate-600 text-slate-400'
                  }`}
                >
                  {c.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
                <button
                  onClick={() => { setEditingId(c.id); setName(c.name); setError('') }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteCategory(c.id)}
                  disabled={deletingId === c.id}
                  className="text-[11px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                >
                  {deletingId === c.id ? '...' : 'Hapus'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

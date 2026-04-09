'use client'

import { useState } from 'react'
import type { PsUnit } from '@/lib/types'

export function PsUnitManager({ initialUnits }: { initialUnits: PsUnit[] }) {
  const [units, setUnits] = useState(initialUnits)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [type, setType] = useState<'PS4' | 'PS5'>('PS4')
  const [editingId, setEditingId] = useState<string | null>(null)

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setType('PS4')
    setError('')
  }

  const startEdit = (u: PsUnit) => {
    setEditingId(u.id)
    setName(u.name)
    setType(u.type)
    setError('')
  }

  const saveUnit = async () => {
    if (!name.trim()) {
      setError('Nama unit wajib diisi')
      return
    }

    setSaving(true)
    setError('')

    if (editingId) {
      const res = await fetch(`/api/ps/units/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type }),
      })
      if (res.ok) {
        const updated: PsUnit = await res.json()
        setUnits(prev => prev.map(u => (u.id === updated.id ? updated : u)))
        resetForm()
      } else {
        const body = await res.json()
        setError(body.error ?? 'Gagal mengupdate unit')
      }
    } else {
      const res = await fetch('/api/ps/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type }),
      })
      if (res.ok) {
        const newUnit: PsUnit = await res.json()
        setUnits(prev => [...prev, newUnit])
        resetForm()
      } else {
        const body = await res.json()
        setError(body.error ?? 'Gagal menambah unit')
      }
    }
    setSaving(false)
  }

  const deleteUnit = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/ps/units/${id}`, { method: 'DELETE' })
    setUnits(prev => prev.filter(u => u.id !== id))
    if (editingId === id) resetForm()
    setDeletingId(null)
  }

  const toggleActive = async (unit: PsUnit) => {
    const res = await fetch(`/api/ps/units/${unit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !unit.is_active }),
    })
    if (res.ok) {
      const updated: PsUnit = await res.json()
      setUnits(prev => prev.map(u => (u.id === unit.id ? updated : u)))
    }
  }

  const toggleMaintenance = async (unit: PsUnit) => {
    const newStatus = unit.status === 'maintenance' ? 'available' : 'maintenance'
    const res = await fetch(`/api/ps/units/${unit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated: PsUnit = await res.json()
      setUnits(prev => prev.map(u => (u.id === unit.id ? updated : u)))
    }
  }

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800/80">
        <h2 className="text-[13px] font-bold text-slate-100">Unit PlayStation</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Kelola unit PS yang tersedia. Saat ini {units.filter(u => u.is_active).length} unit aktif.</p>
      </div>

      {/* Form */}
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        {editingId && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400">Edit Unit</span>
            <button onClick={resetForm} className="text-[11px] text-slate-400 hover:text-slate-200">Batal</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Nama Unit</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="PS 8"
              className="w-full bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Tipe</label>
            <div className="flex gap-3 pt-1">
              {(['PS4', 'PS5'] as const).map(t => (
                <label key={t} className="flex items-center gap-1.5 text-[12px] text-slate-400 cursor-pointer">
                  <input
                    type="radio"
                    name="unitType"
                    value={t}
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="accent-green-500"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <button
          onClick={saveUnit}
          disabled={saving}
          className="w-full px-4 py-2 rounded-xl text-[12px] font-bold bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : '+ Tambah Unit'}
        </button>
      </div>

      {/* List */}
      {units.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-slate-500">Belum ada unit PS</p>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {units.map(u => (
            <div key={u.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${!u.is_active ? 'opacity-50' : ''}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-100">{u.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                    u.type === 'PS5'
                      ? 'text-blue-400 bg-blue-500/15 border border-blue-500/30'
                      : 'text-slate-400 bg-slate-700 border border-slate-600'
                  }`}>
                    {u.type}
                  </span>
                  {u.status === 'maintenance' && (
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md uppercase">
                      Maintenance
                    </span>
                  )}
                  {u.status === 'occupied' && (
                    <span className="text-[9px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded-md uppercase">
                      Terpakai
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleMaintenance(u)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {u.status === 'maintenance' ? 'Aktifkan' : 'Maintenance'}
                </button>
                <button
                  onClick={() => toggleActive(u)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    u.is_active
                      ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                      : 'bg-slate-700 border border-slate-600 text-slate-400'
                  }`}
                >
                  {u.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
                <button
                  onClick={() => startEdit(u)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteUnit(u.id)}
                  disabled={deletingId === u.id || u.status === 'occupied'}
                  className="text-[11px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                >
                  {deletingId === u.id ? '...' : 'Hapus'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import type { PsSession } from '@/lib/types'
import { formatDuration, formatRupiah } from '@/lib/ps-pricing'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { CustomSelect } from '@/components/ui/custom-select'

export function PsSessionHistory() {
  const [sessions, setSessions] = useState<(PsSession & { ps_units?: { name: string; type: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ customer_name: '', payment_method: '', final_amount: '', notes: '' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [dateFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = async () => {
    setLoading(true)
    const res = await fetch(`/api/ps/history?date=${dateFilter}`)
    if (res.ok) {
      const data = await res.json()
      setSessions(data)
    }
    setLoading(false)
  }

  const startEdit = (s: PsSession) => {
    setEditingId(s.id)
    setEditForm({
      customer_name: s.customer_name,
      payment_method: s.payment_method || '',
      final_amount: String(s.final_amount || 0),
      notes: s.notes || '',
    })
    setDeletingId(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    const res = await fetch(`/api/ps/sessions/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit',
        customer_name: editForm.customer_name,
        payment_method: editForm.payment_method || null,
        final_amount: parseInt(editForm.final_amount) || 0,
        notes: editForm.notes || null,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSessions(prev => prev.map(s => s.id === editingId ? updated : s))
      setEditingId(null)
    }
    setSaving(false)
  }

  const deleteSession = async (id: string) => {
    setSaving(true)
    const res = await fetch(`/api/ps/sessions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSessions(prev => prev.filter(s => s.id !== id))
      setDeletingId(null)
    }
    setSaving(false)
  }

  const totalRevenue = sessions.reduce((sum, s) => sum + (s.final_amount || 0), 0)
  const totalSessions = sessions.length

  return (
    <div className="space-y-4">
      {/* Filter & Summary */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium text-slate-500">Tanggal:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Total Session</p>
              <p className="text-[14px] font-bold text-slate-100">{totalSessions}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Total Revenue</p>
              <p className="text-[14px] font-bold text-green-400">{formatRupiah(totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions list */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="text-[13px] font-bold text-slate-100">Riwayat Session</h2>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-center text-[13px] text-slate-500">Memuat...</p>
        ) : sessions.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-slate-500">Tidak ada riwayat di tanggal ini</p>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {sessions.map(s => {
              const isEditing = editingId === s.id
              const isDeleting = deletingId === s.id

              if (isEditing) {
                return (
                  <div key={s.id} className="px-4 py-3 space-y-3 bg-slate-800/50">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-medium">Nama</label>
                        <input
                          value={editForm.customer_name}
                          onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 outline-none focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-medium">Jumlah (Rp)</label>
                        <input
                          type="number"
                          value={editForm.final_amount}
                          onChange={e => setEditForm(f => ({ ...f, final_amount: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 outline-none focus:border-green-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-medium">Pembayaran</label>
                        <CustomSelect
                          value={editForm.payment_method}
                          onChange={v => setEditForm(f => ({ ...f, payment_method: v }))}
                          placeholder="-"
                          options={[
                            { value: 'cash', label: 'Cash' },
                            { value: 'transfer', label: 'Transfer' },
                            { value: 'qris', label: 'QRIS' },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-medium">Catatan</label>
                        <input
                          value={editForm.notes}
                          onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Opsional"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                      >
                        <X size={13} /> Batal
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={saving || !editForm.customer_name}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-green-500 text-green-950 hover:bg-green-400 disabled:opacity-40 transition-colors"
                      >
                        <Check size={13} /> Simpan
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={s.id} className="px-4 py-3">
                  {isDeleting && (
                    <div className="mb-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
                      <p className="text-[11px] text-red-400">Hapus session ini?</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => deleteSession(s.id)}
                          disabled={saving}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500 text-white hover:bg-red-400 disabled:opacity-40 transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-100">{s.customer_name}</span>
                        {s.ps_units && (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-700 border border-slate-600 px-1.5 py-0.5 rounded-md">
                            {s.ps_units.name}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Durasi: {s.duration_minutes ? formatDuration(s.duration_minutes * 60) : '-'}
                        {s.payment_method && ` · ${s.payment_method.toUpperCase()}`}
                      </p>
                      {s.notes && <p className="text-[10px] text-slate-500 mt-0.5">{s.notes}</p>}
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {new Date(s.started_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        {s.ended_at && ` – ${new Date(s.ended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 flex-shrink-0">
                      <div className="text-right">
                        {s.discount_amount > 0 && (
                          <p className="text-[10px] text-red-400 line-through">{formatRupiah(s.base_amount || 0)}</p>
                        )}
                        <p className="text-[14px] font-bold text-green-400">{formatRupiah(s.final_amount || 0)}</p>
                      </div>
                      {s.status === 'completed' && (
                        <div className="flex flex-col gap-1 mt-0.5">
                          <button
                            onClick={() => startEdit(s)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => { setDeletingId(s.id); setEditingId(null) }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

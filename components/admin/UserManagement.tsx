'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Shield } from 'lucide-react'
import { CustomSelect } from '@/components/ui/custom-select'

interface AdminUser {
  id: string
  user_id: string
  name: string
  email: string
  role: 'admin' | 'finance' | 'karyawan'
  created_at: string
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'finance', label: 'Finance' },
  { value: 'karyawan', label: 'Karyawan' },
]


export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'karyawan' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      setUsers(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Gagal membuat user')
      setSaving(false)
      return
    }

    setForm({ name: '', email: '', password: '', role: 'karyawan' })
    setShowForm(false)
    setSaving(false)
    fetchUsers()
  }

  const handleRoleChange = async (id: string, role: string) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    fetchUsers()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    fetchUsers()
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-slate-400" />
          <h2 className="text-[15px] font-bold text-slate-100">Kelola User</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
        >
          <UserPlus size={14} />
          Tambah User
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 mb-3">
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500">Nama</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
                  placeholder="Nama lengkap"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
                  placeholder="email@example.com"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
                  placeholder="Min. 6 karakter"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500">Role</label>
                <CustomSelect
                  value={form.role}
                  onChange={(val) => setForm({ ...form, role: val })}
                  options={ROLE_OPTIONS}
                />
              </div>
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl text-[13px] font-bold bg-green-500 text-green-950 hover:bg-green-400 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError('') }}
                className="px-4 py-2 rounded-xl text-[13px] font-bold bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div className="text-center py-8 text-slate-500 text-[13px]">Memuat...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-[13px]">Belum ada user</div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map(user => (
            <div
              key={user.id}
              className="bg-slate-900/50 border border-slate-800/80 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-100 truncate">{user.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <CustomSelect
                  value={user.role}
                  onChange={(val) => handleRoleChange(user.id, val)}
                  options={ROLE_OPTIONS}
                  className="w-[120px]"
                />

                {deleteConfirm === user.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Hapus
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(user.id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { KeyRound, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ChangePassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)

    if (updateError) {
      setError(updateError.message || 'Gagal mengganti password')
      return
    }

    setSuccess(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <KeyRound size={18} className="text-slate-400" />
        <h2 className="text-[15px] font-bold text-slate-100">Ganti Password</h2>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-500">Password Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
                placeholder="Min. 6 karakter"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-500">Konfirmasi Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
                placeholder="Ulangi password baru"
              />
            </div>
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}
          {success && (
            <p className="text-[12px] text-green-400 flex items-center gap-1.5">
              <Check size={14} />
              Password berhasil diganti
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-[13px] font-bold bg-green-500 text-green-950 hover:bg-green-400 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

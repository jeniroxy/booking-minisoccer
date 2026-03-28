'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Email atau password salah')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo-icon.svg" alt="Logo" className="w-14 h-14 rounded-2xl mx-auto mb-3" />
          <h1 className="text-[20px] font-bold text-slate-100">Zains Mini Soccer</h1>
          <p className="text-[12px] text-slate-500 mt-1">Admin Dashboard</p>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[12px] font-medium text-slate-400">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[12px] font-medium text-slate-400">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-green-500 transition-colors"
              />
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 rounded-xl py-2.5 text-[13px] font-bold text-green-950 disabled:opacity-50 mt-1"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

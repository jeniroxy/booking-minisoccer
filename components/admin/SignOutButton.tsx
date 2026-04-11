'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-4 md:p-5 mt-4">
      <h2 className="text-[13px] font-bold text-slate-100 mb-1">Keluar Akun</h2>
      <p className="text-[11px] text-slate-500 mb-3">Sign out dari admin panel.</p>
      <button
        onClick={handleSignOut}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-[13px] font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
      >
        <LogOut size={15} />
        {loading ? 'Keluar...' : 'Keluar'}
      </button>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'Booking' },
  { href: '/admin/slots', label: 'Kelola Slot' },
  { href: '/admin/vouchers', label: 'Voucher' },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <nav className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 sticky top-0 z-30">
      <div className="max-w-[960px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo-icon.svg" alt="Logo" className="w-7 h-7 rounded-lg" />
          <div className="hidden sm:block">
            <p className="text-[12px] font-bold text-slate-100 leading-tight">Zains Mini Soccer</p>
            <p className="text-[9px] text-slate-500">Admin</p>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="flex gap-1">
          {NAV_ITEMS.map(item => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-[12px] font-bold transition-colors ${
                  isActive
                    ? 'bg-green-500 text-green-950'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Keluar */}
        <button
          onClick={handleSignOut}
          className="text-[11px] sm:text-[12px] text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
        >
          Keluar
        </button>
      </div>
    </nav>
  )
}

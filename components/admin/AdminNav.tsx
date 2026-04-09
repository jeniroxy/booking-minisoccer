'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarCheck,
  Clock,
  Tag,
  Gamepad2,
  Wallet,
  Settings,
  LogOut,
} from 'lucide-react'
import { ROLE_PERMISSIONS, type AdminRole } from '@/lib/rbac'

const NAV_ITEMS = [
  { href: '/admin', label: 'Booking', icon: CalendarCheck },
  { href: '/admin/slots', label: 'Slot', icon: Clock },
  { href: '/admin/vouchers', label: 'Voucher', icon: Tag },
  { href: '/admin/ps', label: 'PS', icon: Gamepad2 },
  { href: '/admin/keuangan', label: 'Keuangan', icon: Wallet },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const allowedPaths = ROLE_PERMISSIONS[role]
  const visibleItems = NAV_ITEMS.filter(item => allowedPaths.includes(item.href))

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <>
      {/* ── Desktop top nav ── */}
      <nav className="hidden md:block bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 px-4 py-2 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.svg" alt="Logo" className="w-8 h-8 rounded-xl" />
            <div>
              <p className="text-sm font-bold text-slate-100 leading-tight">Zains Mini Soccer</p>
              <p className="text-[10px] text-slate-500 font-medium">Admin Panel</p>
            </div>
          </div>

          <div className="flex gap-1">
            {visibleItems.map(item => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                    active
                      ? 'bg-green-500/15 text-green-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  }`}
                >
                  <item.icon size={15} strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              )
            })}
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] text-slate-500 hover:text-red-400 hover:bg-slate-800/50 transition-colors"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>
      </nav>

      {/* ── Mobile top bar (minimal) ── */}
      <div className="md:hidden bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.svg" alt="Logo" className="w-8 h-8 rounded-xl" />
            <div>
              <p className="text-[15px] font-bold text-slate-100">Zains Mini Soccer</p>
              <p className="text-[10px] text-slate-500 font-medium">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2.5 -mr-1 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-800/50 transition-colors"
            aria-label="Keluar"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center px-1 pt-1.5 pb-1">
          {visibleItems.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl min-w-[60px] transition-all ${
                  active
                    ? 'text-green-400'
                    : 'text-slate-500 active:text-slate-300'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${active ? 'bg-green-500/15' : ''}`}>
                  <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                </div>
                <span className={`text-[10px] leading-tight ${active ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

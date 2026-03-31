'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'Booking' },
  { href: '/admin/slots', label: 'Kelola Slot' },
  { href: '/admin/vouchers', label: 'Voucher' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 sticky top-0 z-30">
      <div className="max-w-[960px] mx-auto flex items-center justify-center gap-1">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-colors ${
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
    </nav>
  )
}

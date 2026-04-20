import Link from 'next/link'
import { Goal, Gamepad2, Palette } from 'lucide-react'

const ITEMS = [
  {
    key: 'soccer',
    title: 'Mini Soccer',
    subtitle: 'Booking lapangan & cek jadwal',
    href: '/jadwal',
    external: false,
    Icon: Goal,
    accent: 'text-green-400',
    iconBg: 'bg-green-500/15 border-green-500/25',
  },
  {
    key: 'ps',
    title: 'PlayStation',
    subtitle: 'Sewa PS, cek unit tersedia',
    href: '/ps',
    external: false,
    Icon: Gamepad2,
    accent: 'text-blue-400',
    iconBg: 'bg-blue-500/15 border-blue-500/25',
  },
  {
    key: 'design',
    title: 'Design Studio',
    subtitle: 'Jasa desain grafis & branding',
    href: process.env.NEXT_PUBLIC_DESIGN_STUDIO_URL ?? `https://wa.me/6281400842380`,
    external: true,
    Icon: Palette,
    accent: 'text-violet-400',
    iconBg: 'bg-violet-500/15 border-violet-500/25',
  },
]

export function BusinessMenu() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mx-auto px-4">
      {ITEMS.map(({ key, title, subtitle, href, external, Icon, accent, iconBg }) => {
        const inner = (
          <>
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon size={18} className={accent} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-white text-[14px] leading-tight">{title}</span>
                {external && <span className="text-white/40 text-[10px] leading-none">↗</span>}
              </div>
              <p className="text-[12px] text-white/50 leading-tight mt-0.5">{subtitle}</p>
            </div>
          </>
        )

        const cls =
          'flex items-center gap-3 p-4 rounded-2xl border border-white/10 backdrop-blur-md bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200'

        return external ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
            {inner}
          </a>
        ) : (
          <Link key={key} href={href} className={cls}>
            {inner}
          </Link>
        )
      })}
    </div>
  )
}

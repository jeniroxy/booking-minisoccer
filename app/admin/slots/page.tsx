import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SlotPageTabs } from '@/components/admin/SlotPageTabs'

export default async function AdminSlotsPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/admin/login')

  const [slotsRes, blockedRes, overridesRes] = await Promise.all([
    supabase.from('time_slots').select('*').order('start_hour'),
    supabase.from('blocked_dates').select('*').order('date'),
    supabase.from('slot_price_overrides').select('*').order('date'),
  ])

  return (
    <main className="min-h-screen bg-slate-950">
      <nav className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 sticky top-0 z-30">
        <div className="max-w-[960px] mx-auto flex items-center gap-3">
          <Link
            href="/admin"
            className="text-[12px] text-slate-500 hover:text-green-400 transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-slate-700">|</span>
          <span className="text-[14px] font-bold text-slate-100">Kelola Slot</span>
        </div>
      </nav>

      <div className="max-w-[960px] mx-auto py-6 px-4">
        <SlotPageTabs
          slots={slotsRes.data ?? []}
          blocked={blockedRes.data ?? []}
          overrides={overridesRes.data ?? []}
        />
      </div>
    </main>
  )
}

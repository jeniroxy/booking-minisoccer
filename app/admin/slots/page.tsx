import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
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
      <AdminNav />

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

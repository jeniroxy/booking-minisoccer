import { redirect } from 'next/navigation'
import { createClient, getAdminProps } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { SlotPageTabs } from '@/components/admin/SlotPageTabs'
import { canAccessPage } from '@/lib/rbac'

export default async function AdminSlotsPage() {
  const adminProps = await getAdminProps()
  if (!adminProps) redirect('/admin/login')
  if (!canAccessPage(adminProps.role, '/admin/slots')) redirect('/admin')

  const supabase = createClient()

  const [slotsRes, blockedRes, overridesRes] = await Promise.all([
    supabase.from('time_slots').select('*').order('start_hour'),
    supabase.from('blocked_dates').select('*').order('date'),
    supabase.from('slot_price_overrides').select('*').order('date'),
  ])

  return (
    <main className="min-h-screen bg-slate-950 pb-24 md:pb-0">
      <AdminNav role={adminProps.role} />

      <div className="max-w-[1200px] mx-auto py-4 md:py-6 px-4">
        <SlotPageTabs
          slots={slotsRes.data ?? []}
          blocked={blockedRes.data ?? []}
          overrides={overridesRes.data ?? []}
        />
      </div>
    </main>
  )
}

import { redirect } from 'next/navigation'
import { createClient, getAdminProps } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { PsPageTabs } from '@/components/admin/PsPageTabs'

export const dynamic = 'force-dynamic'

export default async function PsAdminPage() {
  const adminProps = await getAdminProps()
  if (!adminProps) redirect('/admin/login')

  const supabase = createClient()

  const [
    { data: units },
    { data: pricingRules },
    { data: activeSessions },
    { data: bookings },
  ] = await Promise.all([
    supabase.from('ps_units').select('*').order('display_order'),
    supabase.from('ps_pricing_rules').select('*').order('priority', { ascending: false }),
    supabase.from('ps_sessions').select('*, ps_units(name, type)').in('status', ['active', 'paused']).order('started_at', { ascending: false }),
    supabase.from('ps_bookings').select('*').in('status', ['pending', 'confirmed']).order('booking_date'),
  ])

  return (
    <main className="min-h-screen bg-slate-950 pb-24 md:pb-0">
      <AdminNav role={adminProps.role} />

      <div className="max-w-[1200px] mx-auto py-4 md:py-6 px-4">
        <PsPageTabs
          units={units ?? []}
          pricingRules={pricingRules ?? []}
          activeSessions={activeSessions ?? []}
          bookings={bookings ?? []}
        />
      </div>
    </main>
  )
}

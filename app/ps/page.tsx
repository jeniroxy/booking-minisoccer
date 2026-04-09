import { createClient } from '@/lib/supabase/server'
import { PsAvailabilityGrid } from '@/components/ps/PsAvailabilityGrid'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PsPage() {
  const supabase = createClient()

  const [
    { data: units },
    { data: activeSessions },
    { data: pricingRules },
  ] = await Promise.all([
    supabase.from('ps_units').select('*').eq('is_active', true).order('display_order'),
    supabase.from('ps_sessions').select('ps_unit_id').in('status', ['active', 'paused']),
    supabase.from('ps_pricing_rules').select('*').eq('is_active', true).order('priority', { ascending: false }),
  ])

  const occupiedUnitIds = (activeSessions ?? []).map(s => s.ps_unit_id)

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.svg" alt="Logo" className="w-8 h-8 rounded-[10px]" />
            <div>
              <p className="text-[14px] font-bold text-slate-100 leading-tight">Zains Mini Soccer</p>
              <p className="text-[11px] text-slate-400">PS Rental</p>
            </div>
          </div>
          <Link
            href="/jadwal"
            className="text-[12px] font-bold text-green-400 hover:text-green-300 transition-colors"
          >
            Booking Lapangan →
          </Link>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100">PlayStation Rental</h1>
          <p className="text-[13px] text-slate-500 mt-1">Lihat ketersediaan unit PS dan booking online.</p>
        </div>

        <PsAvailabilityGrid
          units={units ?? []}
          occupiedUnitIds={occupiedUnitIds}
          pricingRules={pricingRules ?? []}
        />
      </div>
    </main>
  )
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SlotManager } from '@/components/admin/SlotManager'
import { BlockDateManager } from '@/components/admin/BlockDateManager'

export default async function AdminSlotsPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/admin/login')

  const [slotsRes, blockedRes] = await Promise.all([
    supabase.from('time_slots').select('*').order('start_hour'),
    supabase.from('blocked_dates').select('*').order('date'),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-screen-lg mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-blue-500 transition-colors">
            ← Dashboard
          </Link>
          <span className="font-bold text-lg text-blue-500">Kelola Slot</span>
        </div>
      </nav>

      <div className="max-w-screen-lg mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SlotManager initialSlots={slotsRes.data ?? []} />
        <BlockDateManager
          initialBlocked={blockedRes.data ?? []}
          slots={slotsRes.data ?? []}
        />
      </div>
    </main>
  )
}

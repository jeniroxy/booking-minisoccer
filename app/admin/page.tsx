import { redirect } from 'next/navigation'
import { createClient, getAdminProps } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/admin/AdminNav'
import { BookingTable } from '@/components/admin/BookingTable'
import type { BookingWithSlot } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const adminProps = await getAdminProps()
  if (!adminProps) redirect('/admin/login')

  const supabase = createClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, time_slots(*), vouchers:followup_voucher_id(code, valid_until)')
    .order('booking_date', { ascending: false })

  // Fetch admin_users map to attach confirmer name to each booking
  const adminClient = createAdminClient()
  const { data: adminUsers } = await adminClient
    .from('admin_users')
    .select('user_id, name')
  const adminNameMap = new Map<string, string>(
    (adminUsers ?? []).map(u => [u.user_id, u.name])
  )

  const bookingsWithConfirmer = (bookings ?? []).map(b => ({
    ...b,
    confirmed_by_user: b.confirmed_by
      ? { name: adminNameMap.get(b.confirmed_by) ?? 'Unknown' }
      : null,
  }))

  return (
    <main className="min-h-screen bg-slate-950 pb-24 md:pb-0">
      <AdminNav role={adminProps.role} />

      <div className="max-w-[1200px] mx-auto py-4 md:py-6 px-4">
        <BookingTable initialBookings={bookingsWithConfirmer as BookingWithSlot[]} />
      </div>
    </main>
  )
}

import { redirect } from 'next/navigation'
import { createClient, getAdminProps } from '@/lib/supabase/server'
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

  return (
    <main className="min-h-screen bg-slate-950 pb-24 md:pb-0">
      <AdminNav role={adminProps.role} />

      <div className="max-w-[1200px] mx-auto py-4 md:py-6 px-4">
        <BookingTable initialBookings={(bookings ?? []) as BookingWithSlot[]} />
      </div>
    </main>
  )
}

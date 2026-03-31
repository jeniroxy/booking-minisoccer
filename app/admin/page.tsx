import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { BookingTable } from '@/components/admin/BookingTable'
import type { BookingWithSlot } from '@/lib/types'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/admin/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, time_slots(*)')
    .order('booking_date', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-950">
      <AdminNav />

      <div className="max-w-[960px] mx-auto py-6 px-4">
        <BookingTable initialBookings={(bookings ?? []) as BookingWithSlot[]} />
      </div>
    </main>
  )
}

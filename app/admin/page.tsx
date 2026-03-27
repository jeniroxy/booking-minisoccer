import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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

  const handleSignOut = async () => {
    'use server'
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const s = createServerClient()
    await s.auth.signOut()
    redirect('/admin/login')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-screen-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg text-blue-500">⚽ Admin</span>
            <Link href="/admin/slots" className="text-sm text-gray-500 hover:text-blue-500 transition-colors">
              Kelola Slot
            </Link>
          </div>
          <form action={handleSignOut}>
            <button type="submit" className="text-sm text-gray-500 hover:text-red-500 transition-colors">
              Keluar
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-screen-lg mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Booking</h1>
        <BookingTable initialBookings={(bookings ?? []) as BookingWithSlot[]} />
      </div>
    </main>
  )
}

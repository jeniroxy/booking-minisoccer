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
    <main className="min-h-screen bg-slate-950">
      <nav className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 sticky top-0 z-30">
        <div className="max-w-[960px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.svg" alt="Logo" className="w-7 h-7 rounded-lg" />
            <span className="text-[14px] font-bold text-slate-100">Admin</span>
            <Link
              href="/admin/slots"
              className="text-[12px] text-slate-500 hover:text-green-400 transition-colors"
            >
              Kelola Slot
            </Link>
          </div>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="text-[12px] text-slate-500 hover:text-red-400 transition-colors"
            >
              Keluar
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-[960px] mx-auto py-6 px-4">
        <h1 className="text-[16px] font-bold text-slate-100 mb-4">Dashboard Booking</h1>
        <BookingTable initialBookings={(bookings ?? []) as BookingWithSlot[]} />
      </div>
    </main>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { VoucherManager } from '@/components/admin/VoucherManager'

export default async function AdminVouchersPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/admin/login')

  const { data: vouchers } = await supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-950">
      <AdminNav />

      <div className="max-w-[960px] mx-auto py-6 px-4">
        <VoucherManager initialVouchers={vouchers ?? []} />
      </div>
    </main>
  )
}

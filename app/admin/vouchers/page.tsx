import { redirect } from 'next/navigation'
import { createClient, getAdminProps } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { VoucherManager } from '@/components/admin/VoucherManager'
import { canAccessPage } from '@/lib/rbac'

export default async function AdminVouchersPage() {
  const adminProps = await getAdminProps()
  if (!adminProps) redirect('/admin/login')
  if (!canAccessPage(adminProps.role, '/admin/vouchers')) redirect('/admin')

  const supabase = createClient()

  const { data: vouchers } = await supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-950 pb-24 md:pb-0">
      <AdminNav role={adminProps.role} />

      <div className="max-w-[1200px] mx-auto py-4 md:py-6 px-4">
        <VoucherManager initialVouchers={vouchers ?? []} />
      </div>
    </main>
  )
}

import { redirect } from 'next/navigation'
import { getAdminProps } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { KeuanganManager } from '@/components/admin/KeuanganManager'
import { canAccessPage } from '@/lib/rbac'

export default async function KeuanganPage() {
  const adminProps = await getAdminProps()
  if (!adminProps) redirect('/admin/login')
  if (!canAccessPage(adminProps.role, '/admin/keuangan')) redirect('/admin')

  return (
    <main className="min-h-screen bg-slate-950 pb-24 md:pb-0">
      <AdminNav role={adminProps.role} />

      <div className="max-w-[1200px] mx-auto py-4 md:py-6 px-4">
        <KeuanganManager />
      </div>
    </main>
  )
}

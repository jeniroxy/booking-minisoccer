import { redirect } from 'next/navigation'
import { getAdminProps } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { SettingsTabs } from '@/components/admin/SettingsTabs'
import { SignOutButton } from '@/components/admin/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const adminProps = await getAdminProps()
  if (!adminProps) redirect('/admin/login')

  return (
    <main className="min-h-screen bg-slate-950 pb-24 md:pb-0">
      <AdminNav role={adminProps.role} />

      <div className="max-w-[1200px] mx-auto py-4 md:py-6 px-4">
        <h1 className="text-xl font-bold text-slate-100 mb-4">Pengaturan</h1>
        <SettingsTabs role={adminProps.role} />
        <SignOutButton />
      </div>
    </main>
  )
}

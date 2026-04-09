import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('admin_users')
    .select('id, name, role, created_at')
    .eq('user_id', auth.userId)
    .single()

  return NextResponse.json(data)
}

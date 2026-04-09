import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Verify user is in admin_users
  const adminClient = createAdminClient()
  const { data: adminUser } = await adminClient
    .from('admin_users')
    .select('role, name')
    .eq('user_id', data.user.id)
    .single()

  if (!adminUser) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Not an admin' }, { status: 403 })
  }

  return NextResponse.json({
    ok: true,
    role: adminUser.role,
    name: adminUser.name,
    access_token: data.session?.access_token,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireRole(['admin'])
  if (auth.error) return auth.error

  const supabase = createAdminClient()

  const { data: adminUsers } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at')

  // Fetch emails from auth.users
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

  const emailMap = new Map(authUsers.map(u => [u.id, u.email]))

  const result = (adminUsers ?? []).map(u => ({
    ...u,
    email: emailMap.get(u.user_id) ?? '',
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (auth.error) return auth.error

  const { name, email, password, role } = await request.json()

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'name, email, password, and role required' }, { status: 400 })
  }

  if (!['admin', 'finance', 'karyawan'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    // If user already exists in auth, check if they're an orphan (no admin_users entry)
    if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existingUser = users.find(u => u.email === email)
      if (existingUser) {
        // Check if already in admin_users
        const { data: existing } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', existingUser.id)
          .single()
        if (existing) {
          return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
        }
        // Orphaned auth user — update password and reuse
        await supabase.auth.admin.updateUserById(existingUser.id, { password })
        const { data, error } = await supabase
          .from('admin_users')
          .insert({ user_id: existingUser.id, name, role })
          .select()
          .single()
        if (error) {
          return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 })
        }
        return NextResponse.json({ ...data, email }, { status: 201 })
      }
    }
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insert into admin_users
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      user_id: authData.user.id,
      name,
      role,
    })
    .select()
    .single()

  if (error) {
    // Rollback: delete the auth user if admin_users insert fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 })
  }

  return NextResponse.json({ ...data, email }, { status: 201 })
}

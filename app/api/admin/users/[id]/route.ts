import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(['admin'])
  if (auth.error) return auth.error

  const { role } = await request.json()

  if (!['admin', 'finance', 'karyawan'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('admin_users')
    .update({ role })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }

  // Include email from auth.users
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(data.user_id)
  return NextResponse.json({ ...data, email: authUser?.email ?? '' })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(['admin'])
  if (auth.error) return auth.error

  const supabase = createAdminClient()

  // Get the user_id before deleting
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!adminUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Prevent deleting yourself
  if (adminUser.user_id === auth.userId) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  // Delete from admin_users
  await supabase.from('admin_users').delete().eq('id', params.id)

  // Delete from auth
  await supabase.auth.admin.deleteUser(adminUser.user_id)

  return NextResponse.json({ ok: true })
}

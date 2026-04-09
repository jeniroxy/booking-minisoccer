import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const body = await request.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('expense_categories')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}

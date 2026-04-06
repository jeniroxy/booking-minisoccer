import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdminSession()
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates = body as {
    code?: string
    name?: string
    discount_type?: 'percent' | 'nominal'
    discount_value?: number
    max_usage?: number | null
    valid_from?: string
    valid_until?: string
    is_active?: boolean
  }
  const allowed: Record<string, unknown> = {}

  if (updates.code !== undefined) allowed.code = String(updates.code).toUpperCase().trim()
  if (updates.name !== undefined) allowed.name = String(updates.name).trim()
  if (updates.discount_type !== undefined) {
    if (!['percent', 'nominal'].includes(updates.discount_type)) {
      return NextResponse.json({ error: 'Invalid discount_type' }, { status: 400 })
    }
    allowed.discount_type = updates.discount_type
  }
  if (updates.discount_value !== undefined) {
    if (typeof updates.discount_value !== 'number' || updates.discount_value <= 0) {
      return NextResponse.json({ error: 'discount_value must be a positive number' }, { status: 400 })
    }
    allowed.discount_value = updates.discount_value
  }
  if (updates.max_usage !== undefined) allowed.max_usage = updates.max_usage
  if (updates.valid_from !== undefined) allowed.valid_from = updates.valid_from
  if (updates.valid_until !== undefined) allowed.valid_until = updates.valid_until
  if (updates.is_active !== undefined) allowed.is_active = Boolean(updates.is_active)

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vouchers')
    .update(allowed)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update voucher' }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdminSession()
  if (authError) return authError

  const supabase = createAdminClient()
  const { error } = await supabase.from('vouchers').delete().eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Failed to delete voucher' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

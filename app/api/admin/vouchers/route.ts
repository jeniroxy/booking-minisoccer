import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const authError = await requireAdminSession()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession()
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { code, name, discount_type, discount_value, valid_from, valid_until } = body as {
    code: string
    name: string
    discount_type: 'percent' | 'nominal'
    discount_value: number
    valid_from: string
    valid_until: string
  }

  if (!code || !name || !discount_type || !discount_value || !valid_from || !valid_until) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }
  if (!['percent', 'nominal'].includes(discount_type)) {
    return NextResponse.json({ error: 'discount_type must be percent or nominal' }, { status: 400 })
  }
  if (discount_type === 'percent' && (discount_value <= 0 || discount_value > 100)) {
    return NextResponse.json({ error: 'Percent discount must be 1-100' }, { status: 400 })
  }
  if (valid_until < valid_from) {
    return NextResponse.json({ error: 'valid_until must be >= valid_from' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vouchers')
    .insert({
      code: code.toUpperCase().trim(),
      name: name.trim(),
      discount_type,
      discount_value,
      valid_from,
      valid_until,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Kode voucher sudah digunakan' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create voucher' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

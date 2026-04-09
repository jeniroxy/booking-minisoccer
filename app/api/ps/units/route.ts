import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ps_units')
    .select('*')
    .order('display_order')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const body = await request.json()
  const { name, type, display_order } = body as { name: string; type: string; display_order?: number }

  if (!name || !type) {
    return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Auto display_order if not provided
  let order = display_order
  if (order === undefined) {
    const { data: last } = await supabase
      .from('ps_units')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single()
    order = (last?.display_order ?? 0) + 1
  }

  const { data, error } = await supabase
    .from('ps_units')
    .insert({ name, type, display_order: order })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 })
  }
  return NextResponse.json(data)
}

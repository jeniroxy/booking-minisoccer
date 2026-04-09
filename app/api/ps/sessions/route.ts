import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const supabase = createAdminClient()
  let query = supabase
    .from('ps_sessions')
    .select('*, ps_units(name, type)')
    .order('started_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  } else {
    query = query.in('status', ['active', 'paused'])
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const body = await request.json()
  const { ps_unit_id, customer_name, phone, pricing_rule_id } = body

  if (!ps_unit_id || !customer_name) {
    return NextResponse.json({ error: 'ps_unit_id and customer_name are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Check unit is available
  const { data: unit } = await supabase
    .from('ps_units')
    .select('status')
    .eq('id', ps_unit_id)
    .single()

  if (!unit || unit.status !== 'available') {
    return NextResponse.json({ error: 'Unit tidak tersedia' }, { status: 400 })
  }

  // Create session
  const { data: session, error } = await supabase
    .from('ps_sessions')
    .insert({
      ps_unit_id,
      customer_name: customer_name.trim(),
      phone: phone || null,
      pricing_rule_id: pricing_rule_id || null,
    })
    .select('*, ps_units(name, type)')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }

  // Mark unit as occupied
  await supabase
    .from('ps_units')
    .update({ status: 'occupied' })
    .eq('id', ps_unit_id)

  return NextResponse.json(session)
}

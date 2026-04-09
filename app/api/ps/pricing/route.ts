import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ps_pricing_rules')
    .select('*')
    .order('priority', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch pricing rules' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const body = await request.json()
  const { name, unit_type, rule_type, price, duration_minutes, day_types, valid_from, valid_until, priority } = body

  if (!name || !unit_type || !rule_type || !price) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ps_pricing_rules')
    .insert({
      name,
      unit_type,
      rule_type,
      price,
      duration_minutes: duration_minutes || null,
      day_types: day_types || ['weekday', 'weekend'],
      valid_from: valid_from || null,
      valid_until: valid_until || null,
      priority: priority ?? 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create pricing rule' }, { status: 500 })
  }
  return NextResponse.json(data)
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const teamName = request.nextUrl.searchParams.get('team_name')
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  const supabase = createClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .lte('valid_from', today)
    .gte('valid_until', today)
    .single()

  if (error || !data) {
    return NextResponse.json({ valid: false, error: 'Voucher tidak valid atau sudah kadaluarsa' })
  }

  // Check if this team already used this voucher
  if (teamName?.trim()) {
    const { data: used } = await supabase
      .from('bookings')
      .select('id')
      .eq('voucher_id', data.id)
      .ilike('team_name', teamName.trim())
      .neq('status', 'cancelled')
      .limit(1)

    if (used && used.length > 0) {
      return NextResponse.json({ valid: false, error: 'Voucher sudah pernah digunakan oleh tim ini' })
    }
  }

  return NextResponse.json({
    valid: true,
    voucher: {
      id: data.id,
      code: data.code,
      name: data.name,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
    },
  })
}

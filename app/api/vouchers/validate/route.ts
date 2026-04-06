import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const teamName = request.nextUrl.searchParams.get('team_name')
  const phone = request.nextUrl.searchParams.get('phone')
  const baseTotal = Number(request.nextUrl.searchParams.get('base_total') || '0')
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

  // Auto-generated follow-up vouchers (MAINLAGI-*) are single-use globally
  const isFollowUpVoucher = data.code.startsWith('MAINLAGI-')
  if (isFollowUpVoucher) {
    if (baseTotal < 200000) {
      return NextResponse.json({ valid: false, error: 'Voucher ini hanya berlaku untuk booking minimal Rp 200.000' })
    }

    const { data: used } = await supabase
      .from('bookings')
      .select('id')
      .eq('voucher_id', data.id)
      .neq('status', 'cancelled')
      .limit(1)

    if (used && used.length > 0) {
      return NextResponse.json({ valid: false, error: 'Voucher ini sudah pernah digunakan' })
    }
  } else {
    // Check global max_usage limit
    if (data.max_usage !== null) {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('voucher_id', data.id)
        .neq('status', 'cancelled')

      if ((count ?? 0) >= data.max_usage) {
        return NextResponse.json({ valid: false, error: 'Voucher sudah mencapai batas pemakaian' })
      }
    }

    // Regular vouchers: single-use per team OR per phone
    if (teamName?.trim()) {
      const { data: usedByTeam } = await supabase
        .from('bookings')
        .select('id')
        .eq('voucher_id', data.id)
        .ilike('team_name', teamName.trim())
        .neq('status', 'cancelled')
        .limit(1)

      if (usedByTeam && usedByTeam.length > 0) {
        return NextResponse.json({ valid: false, error: 'Voucher sudah pernah digunakan oleh tim ini' })
      }
    }
    if (phone?.trim()) {
      const { data: usedByPhone } = await supabase
        .from('bookings')
        .select('id')
        .eq('voucher_id', data.id)
        .eq('phone', phone.trim())
        .neq('status', 'cancelled')
        .limit(1)

      if (usedByPhone && usedByPhone.length > 0) {
        return NextResponse.json({ valid: false, error: 'Voucher sudah pernah digunakan oleh nomor ini' })
      }
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

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const teamName = req.nextUrl.searchParams.get('team_name')?.trim()
  if (!teamName) return NextResponse.json({ lastPhone: null, voucherCode: null })

  const supabase = createClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  // Get last known phone for this team (exact match, case-insensitive)
  const { data: lastBooking } = await supabase
    .from('bookings')
    .select('phone, team_name')
    .ilike('team_name', teamName)
    .not('phone', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  // Only auto-fill if team name matches exactly (ignore case)
  const exactMatch = lastBooking?.[0]?.team_name?.toLowerCase() === teamName.toLowerCase()

  // Find available follow-up voucher (MAINLAGI-*) linked to this team's confirmed bookings
  const { data: bookingsWithVoucher } = exactMatch
    ? await supabase
        .from('bookings')
        .select('followup_voucher_id')
        .ilike('team_name', teamName)
        .eq('status', 'confirmed')
        .not('followup_voucher_id', 'is', null)
        .order('created_at', { ascending: false })
    : { data: null }

  let voucherCode: string | null = null

  if (bookingsWithVoucher && bookingsWithVoucher.length > 0) {
    const voucherIds = bookingsWithVoucher.map(b => b.followup_voucher_id).filter(Boolean)

    // Find an active, unused, valid voucher
    for (const vid of voucherIds) {
      const { data: voucher } = await supabase
        .from('vouchers')
        .select('id, code')
        .eq('id', vid)
        .eq('is_active', true)
        .lte('valid_from', today)
        .gte('valid_until', today)
        .single()

      if (!voucher) continue

      // Check if already used
      const { data: used } = await supabase
        .from('bookings')
        .select('id')
        .eq('voucher_id', voucher.id)
        .neq('status', 'cancelled')
        .limit(1)

      if (!used || used.length === 0) {
        voucherCode = voucher.code
        break
      }
    }
  }

  return NextResponse.json({
    lastPhone: exactMatch ? (lastBooking?.[0]?.phone ?? null) : null,
    voucherCode,
  })
}

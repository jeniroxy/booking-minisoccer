import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  let deletedExpired = 0
  let deletedUsed = 0

  // 1. Delete expired vouchers
  const { data: expired } = await supabase
    .from('vouchers')
    .select('id')
    .lt('valid_until', today)

  if (expired && expired.length > 0) {
    const expiredIds = expired.map(v => v.id)

    await supabase
      .from('bookings')
      .update({ followup_voucher_id: null })
      .in('followup_voucher_id', expiredIds)

    await supabase
      .from('bookings')
      .update({ voucher_id: null })
      .in('voucher_id', expiredIds)

    await supabase
      .from('vouchers')
      .delete()
      .in('id', expiredIds)

    deletedExpired = expiredIds.length
  }

  // 2. Delete used MAINLAGI vouchers (used in a booking that has finished playing)
  const { data: usedMainlagi } = await supabase
    .from('bookings')
    .select('voucher_id, booking_date, time_slots(end_hour)')
    .not('voucher_id', 'is', null)
    .eq('status', 'confirmed')

  if (usedMainlagi && usedMainlagi.length > 0) {
    const jakartaHour = parseInt(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false })
    )

    // Filter bookings where play time is finished
    const finishedVoucherIds = usedMainlagi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((b: any) => {
        if (b.booking_date < today) return true
        if (b.booking_date === today && b.time_slots?.end_hour <= jakartaHour) return true
        return false
      })
      .map(b => b.voucher_id as string)
      .filter(Boolean)

    if (finishedVoucherIds.length > 0) {
      // Only delete MAINLAGI vouchers (auto-generated follow-up)
      const { data: mainlagiVouchers } = await supabase
        .from('vouchers')
        .select('id')
        .in('id', finishedVoucherIds)
        .like('code', 'MAINLAGI-%')

      if (mainlagiVouchers && mainlagiVouchers.length > 0) {
        const mainlagiIds = mainlagiVouchers.map(v => v.id)

        await supabase
          .from('bookings')
          .update({ followup_voucher_id: null })
          .in('followup_voucher_id', mainlagiIds)

        await supabase
          .from('bookings')
          .update({ voucher_id: null })
          .in('voucher_id', mainlagiIds)

        await supabase
          .from('vouchers')
          .delete()
          .in('id', mainlagiIds)

        deletedUsed = mainlagiIds.length
      }
    }
  }

  return NextResponse.json({
    message: 'OK',
    deleted_expired: deletedExpired,
    deleted_used_mainlagi: deletedUsed,
  })
}

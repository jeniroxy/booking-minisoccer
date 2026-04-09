import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const supabase = createAdminClient()

  const [settingsRes, subsRes] = await Promise.all([
    supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', auth.userId)
      .maybeSingle(),
    supabase
      .from('push_subscriptions')
      .select('id, device_label, created_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    settings: settingsRes.data ?? {
      enabled: true,
      notify_new_booking: true,
      notify_play_finished: true,
    },
    subscriptions: subsRes.data ?? [],
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const body = await request.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('notification_settings')
    .upsert(
      {
        user_id: auth.userId,
        ...body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json(data)
}

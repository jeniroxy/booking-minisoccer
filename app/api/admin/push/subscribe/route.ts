import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const body = await request.json()
  const { endpoint, deviceLabel } = body
  // Support both flat (p256dh, auth) and nested (keys.p256dh, keys.auth) formats
  const p256dh = body.p256dh || body.keys?.p256dh
  const authKey = body.auth || body.keys?.auth

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: auth.userId,
        endpoint,
        p256dh,
        auth: authKey,
        device_label: deviceLabel || null,
      },
      { onConflict: 'endpoint' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }

  // Ensure notification_settings row exists with defaults
  await supabase
    .from('notification_settings')
    .upsert(
      { user_id: auth.userId, enabled: true },
      { onConflict: 'user_id' }
    )

  return NextResponse.json(data, { status: 201 })
}

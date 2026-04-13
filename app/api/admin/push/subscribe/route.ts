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

  // Check if this endpoint already exists
  const { data: existing } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', endpoint)
    .maybeSingle()

  let data
  let error

  if (existing) {
    // Update existing subscription
    const result = await supabase
      .from('push_subscriptions')
      .update({
        user_id: auth.userId,
        p256dh,
        auth: authKey,
        device_label: deviceLabel || null,
      })
      .eq('id', existing.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    // Insert new subscription
    const result = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: auth.userId,
        endpoint,
        p256dh,
        auth: authKey,
        device_label: deviceLabel || null,
      })
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ error: `Failed to save subscription: ${error.message}` }, { status: 500 })
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

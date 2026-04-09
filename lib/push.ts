import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface NotificationPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToAdmins(
  payload: NotificationPayload,
  type: 'notify_new_booking' | 'notify_play_finished'
) {
  const supabase = createAdminClient()

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('user_id')
    .eq('enabled', true)
    .eq(type, true)

  if (!settings || settings.length === 0) return

  const userIds = settings.map(s => s.user_id)

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subscriptions || subscriptions.length === 0) return

  const jsonPayload = JSON.stringify(payload)

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          jsonPayload
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
        console.error('Push failed for subscription', sub.id, statusCode)
      }
    })
  )
}

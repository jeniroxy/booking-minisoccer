-- Push notification subscriptions for admin devices
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

-- Admin notification settings (one row per admin)
CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY,
  enabled BOOL NOT NULL DEFAULT true,
  notify_new_booking BOOL NOT NULL DEFAULT true,
  notify_play_finished BOOL NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: access only through service role key (createAdminClient)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

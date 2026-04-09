-- Admin roles enum and admin_users table
CREATE TYPE admin_role AS ENUM ('admin', 'finance', 'karyawan');

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'karyawan',
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own row (needed for middleware)
CREATE POLICY "Users can read own admin role" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all" ON admin_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- Bazidpur — Push Notifications schema
-- Run this once in the Supabase SQL editor.
-- =============================================================================
--
-- Three new tables:
--   1. push_tokens                — one row per device, per user (Expo tokens)
--   2. notification_preferences   — per-user master + category toggles
--   3. notifications              — in-app inbox log (history of what was sent)
--
-- RLS is enabled on all three. Members can only see / change their own rows.
-- Admins (role 'admin' or 'superadmin') can read all rows for support.
-- The /api/notifications/send Vercel endpoint uses the service-role key, so it
-- bypasses RLS entirely.
-- =============================================================================


-- ============================ push_tokens ====================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL,
  platform      TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON push_tokens (user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members manage own tokens"     ON push_tokens;
DROP POLICY IF EXISTS "admins read all tokens"        ON push_tokens;

CREATE POLICY "members manage own tokens"
  ON push_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins read all tokens"
  ON push_tokens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
  ));


-- ====================== notification_preferences =============================
-- One row per user. Defaults: everything ON. The master `enabled` flag is the
-- "global off" switch — when false, no notifications are sent regardless of
-- the category toggles.
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  forum_reply          BOOLEAN NOT NULL DEFAULT TRUE,
  photo_comment        BOOLEAN NOT NULL DEFAULT TRUE,
  membership_approved  BOOLEAN NOT NULL DEFAULT TRUE,
  report_resolution    BOOLEAN NOT NULL DEFAULT TRUE,
  moderation_action    BOOLEAN NOT NULL DEFAULT TRUE,
  announcement         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members manage own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "admins read all preferences"    ON notification_preferences;

CREATE POLICY "members manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins read all preferences"
  ON notification_preferences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
  ));


-- =========================== notifications ===================================
-- The in-app inbox log. Every push that goes out is also stored here so the
-- member can review a history of what they were notified about, regardless of
-- whether they tapped the system push.
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'forum_reply',
                'photo_comment',
                'membership_approved',
                'report_resolution',
                'moderation_action',
                'announcement'
              )),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read own notifications"   ON notifications;
DROP POLICY IF EXISTS "members update own read state"    ON notifications;
DROP POLICY IF EXISTS "members delete own notifications" ON notifications;
DROP POLICY IF EXISTS "admins read all notifications"    ON notifications;

CREATE POLICY "members read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "members update own read state"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "admins read all notifications"
  ON notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
  ));

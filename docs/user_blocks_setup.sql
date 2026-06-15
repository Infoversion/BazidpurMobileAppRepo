-- Run this in the Supabase SQL editor.
-- Creates the user_blocks table used by the mobile and web apps to let members
-- block other members. Apple App Store Guideline 1.2 requires this for UGC apps.

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON user_blocks (blocked_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- A signed-in user can insert their own blocks.
CREATE POLICY "blockers can insert"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- A signed-in user can see their own blocks (used to filter content).
CREATE POLICY "blockers can read"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

-- A signed-in user can remove their own blocks (unblock).
CREATE POLICY "blockers can delete"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- Admins can view all blocks (for support / moderation review).
CREATE POLICY "admins can read all blocks"
  ON user_blocks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
  ));

-- Also add the community_guidelines_accepted_at column to users if it does
-- not already exist. Existing members can be backfilled at next sign-in.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS community_guidelines_accepted_at TIMESTAMPTZ;

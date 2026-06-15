-- Run this in the Supabase SQL editor.
-- Extends the `reports` table so admins can record the action they took
-- on each report (review-only, warning, or suspension). Closes the loop
-- expected by Apple App Store Guideline 1.2 for UGC moderation.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed_ok', 'warning_sent', 'suspended')),
  ADD COLUMN IF NOT EXISTS action_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status);

-- Allow admins to update report rows. The existing INSERT policy is for
-- members filing reports; SELECT is for admins reading them. We add
-- UPDATE so admins can change status / notes / resolved_* fields.
DROP POLICY IF EXISTS "admins can update reports" ON reports;
CREATE POLICY "admins can update reports"
  ON reports FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
  ));

-- Add a 'suspended' role to the users table so admins can soft-lock
-- offenders. We treat this as another value in the existing role column
-- — no schema change needed beyond allowing the string. Update your
-- middleware / RLS to deny access for role = 'suspended'.
--
-- (If you use a CHECK constraint that enumerates valid roles, drop and
-- recreate it to include 'suspended'. Otherwise no DDL is needed.)

-- Add a suspension_reason column so a suspended user knows why on next sign-in.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

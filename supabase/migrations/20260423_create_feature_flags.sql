-- App-wide feature flags / kill switches. Global (not per-user).
-- Read by anon + authenticated (public read); writes restricted to service_role.
-- Flipped via `npm run flag:enable|disable <key>` (see scripts/flag.js).
CREATE TABLE feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read the flag state. The app fetches flags before auth, so
-- anon role must be allowed; authenticated inherits via permissive policy.
CREATE POLICY "Public read feature flags" ON feature_flags
  FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policy = locked to service_role (bypasses RLS).
-- The CLI script uses the service role key; the app never writes.

-- Seed. All flags start enabled = true so the migration is a no-op
-- behaviorally until someone runs `npm run flag:disable <key>`.
INSERT INTO feature_flags (key) VALUES
  ('carve_outs'),
  ('pomodoro_mode'),
  ('deep_dive'),
  ('supabase_sync'),
  ('clerk_auth');

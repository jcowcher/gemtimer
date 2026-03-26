-- Active timer state for cross-device sync (one row per user)
CREATE TABLE active_timer (
  user_id text PRIMARY KEY,
  started_at timestamptz,
  accumulated integer NOT NULL DEFAULT 0,
  is_running boolean NOT NULL DEFAULT false,
  activity_name text NOT NULL DEFAULT '',
  work_type text NOT NULL DEFAULT 'deep',
  pomodoro_mode boolean NOT NULL DEFAULT false,
  pomodoro_phase text NOT NULL DEFAULT 'work',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE active_timer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own timer" ON active_timer
  FOR ALL USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

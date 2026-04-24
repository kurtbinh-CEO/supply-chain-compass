-- M24.2 — Realtime channel authorization
-- Restrict realtime.messages to authenticated users only.
-- Supabase Realtime requires RLS on realtime.messages for private channels.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write realtime messages" ON realtime.messages;

CREATE POLICY "Authenticated can read realtime messages"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can write realtime messages"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

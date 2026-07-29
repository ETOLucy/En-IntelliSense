ALTER TABLE support_tickets ADD COLUMN user_archived_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_visible
  ON support_tickets(user_id, user_archived_at, updated_at DESC);

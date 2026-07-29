CREATE TABLE IF NOT EXISTS store_purchase_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  store_product_id TEXT NOT NULL,
  store_transaction_id TEXT NOT NULL UNIQUE,
  purchase_kind TEXT NOT NULL CHECK (purchase_kind IN ('subscription', 'consumable')),
  verification_status TEXT NOT NULL CHECK (verification_status IN ('pending', 'verified', 'rejected', 'refunded', 'revoked')),
  evidence_hash TEXT NOT NULL DEFAULT '',
  verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_store_purchase_events_user_created
  ON store_purchase_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS usage_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_event_id TEXT NOT NULL UNIQUE,
  units INTEGER NOT NULL CHECK (units > 0),
  remaining_units INTEGER NOT NULL CHECK (remaining_units >= 0),
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_event_id) REFERENCES store_purchase_events(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_usage_grants_user_expiry
  ON usage_grants(user_id, expires_at, created_at);

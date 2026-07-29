CREATE TABLE IF NOT EXISTS store_entitlements (
  store_user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('standard', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('active', 'grace', 'expired', 'refunded', 'revoked')),
  expires_at INTEGER NOT NULL,
  last_verified_at INTEGER NOT NULL,
  verification_id TEXT NOT NULL UNIQUE,
  raw_receipt_hash TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (store_user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_entitlements_status
  ON store_entitlements(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_store_entitlements_subscription
  ON store_entitlements(subscription_id);

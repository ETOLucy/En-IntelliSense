CREATE TABLE IF NOT EXISTS subscriptions (
  subscriber TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL CHECK (plan IN ('standard', 'pro')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  expires_at INTEGER NOT NULL,
  monthly_units INTEGER,
  requests_per_minute INTEGER,
  device_limit INTEGER,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(active, expires_at);

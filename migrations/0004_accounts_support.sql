CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deletion_pending', 'deleted')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'support', 'admin')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_status_created
  ON users(status, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login')),
  source_ip_hash TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_email_created
  ON auth_challenges(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_ip_created
  ON auth_challenges(source_ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  device_hash TEXT NOT NULL DEFAULT '',
  source_ip_hash TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user
  ON user_sessions(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry
  ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS account_entitlements (
  user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'beta' CHECK (plan IN ('beta', 'plus', 'pro')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'grace', 'expired', 'refunded', 'revoked')),
  monthly_units INTEGER NOT NULL DEFAULT 300 CHECK (monthly_units BETWEEN 0 AND 100000),
  requests_per_minute INTEGER NOT NULL DEFAULT 15 CHECK (requests_per_minute BETWEEN 1 AND 180),
  device_limit INTEGER NOT NULL DEFAULT 2 CHECK (device_limit BETWEEN 1 AND 10),
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'beta' CHECK (source IN ('beta', 'microsoft_store', 'third_party', 'support')),
  external_reference TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_entitlements_status
  ON account_entitlements(status, period_end);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('account', 'billing', 'technical', 'model', 'privacy', 'feedback', 'other')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'waiting_for_user', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_admin TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_message_at INTEGER NOT NULL,
  closed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_updated
  ON support_tickets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_queue
  ON support_tickets(status, priority, updated_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  author_user_id TEXT,
  author_role TEXT NOT NULL CHECK (author_role IN ('user', 'support', 'admin', 'system')),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created
  ON support_messages(ticket_id, created_at);

CREATE TABLE IF NOT EXISTS cloud_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_revision TEXT NOT NULL DEFAULT '',
  document_type TEXT NOT NULL DEFAULT 'draft' CHECK (document_type IN ('draft', 'completed')),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, client_revision)
);

CREATE INDEX IF NOT EXISTS idx_cloud_documents_user_updated
  ON cloud_documents(user_id, deleted_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  document_id TEXT,
  source_text TEXT NOT NULL,
  replacement_text TEXT NOT NULL,
  category TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  accepted INTEGER NOT NULL CHECK (accepted IN (0, 1)),
  occurred_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES cloud_documents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_occurred
  ON learning_events(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS saved_expressions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expression TEXT NOT NULL,
  meaning TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_expressions_user_updated
  ON saved_expressions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  amount_minor INTEGER,
  currency TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  payload_hash TEXT NOT NULL DEFAULT '',
  occurred_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_user_created
  ON payment_events(user_id, created_at DESC);


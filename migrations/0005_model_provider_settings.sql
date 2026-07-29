CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO platform_settings (key, value, updated_by, updated_at)
VALUES ('active_model_provider', 'primary', 'migration', 0);

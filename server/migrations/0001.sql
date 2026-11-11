CREATE TABLE IF NOT EXISTS registrations (
  email_hash TEXT PRIMARY KEY,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used BETWEEN 0 AND 2),
  active_request TEXT,
  active_since INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL REFERENCES registrations(email_hash),
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS generations (
  email_hash TEXT NOT NULL,
  request_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed')),
  result_key TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (email_hash, request_id)
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

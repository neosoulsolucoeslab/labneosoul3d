-- Lab Neo Soul 3D: execute este arquivo no D1 DB existente.
-- Apenas CREATE IF NOT EXISTS; mantém cadastros e contagens existentes.

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

-- Apply after 0001.sql. Additive and repeatable: old quota records are preserved.
-- The previous unverified sessions table is never used by the new Worker.
CREATE TABLE IF NOT EXISTS email_challenges (
  email_hash TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  code_mac TEXT NOT NULL,
  session_token_hash TEXT,
  status TEXT NOT NULL CHECK (status IN ('sending', 'pending', 'consumed', 'failed', 'locked')),
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS verified_accounts (
  email_hash TEXT PRIMARY KEY,
  verified_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS verified_sessions (
  token_hash TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL REFERENCES verified_accounts(email_hash),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS verified_sessions_expiry ON verified_sessions(expires_at);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_rate_limits_expiry ON auth_rate_limits(expires_at);
CREATE TABLE IF NOT EXISTS study_artifacts (
  email_hash TEXT NOT NULL,
  request_id TEXT NOT NULL,
  kv_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (email_hash, request_id),
  FOREIGN KEY (email_hash, request_id) REFERENCES generations(email_hash, request_id)
);
CREATE INDEX IF NOT EXISTS study_artifacts_expiry ON study_artifacts(expires_at);
CREATE INDEX IF NOT EXISTS generations_pending ON generations(status, created_at);
CREATE INDEX IF NOT EXISTS generations_email_status ON generations(email_hash, status, created_at);

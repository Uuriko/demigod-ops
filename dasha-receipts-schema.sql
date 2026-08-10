PRAGMA foreign_keys = ON;

CREATE TABLE receipts (
  id TEXT PRIMARY KEY CHECK (length(id) = 22),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  asset_kind TEXT NOT NULL CHECK (asset_kind = 'solana_mint'),
  asset_id TEXT NOT NULL CHECK (length(asset_id) BETWEEN 32 AND 44),
  thesis TEXT NOT NULL CHECK (length(thesis) BETWEEN 1 AND 280),
  invalidation TEXT NOT NULL CHECK (length(invalidation) BETWEEN 1 AND 180),
  confidence INTEGER NOT NULL CHECK (confidence IN (55, 65, 75, 85, 95)),
  resolution_date TEXT NOT NULL,
  received_at TEXT NOT NULL,
  payload_hash TEXT NOT NULL CHECK (length(payload_hash) = 64),
  manage_token_hash TEXT NOT NULL CHECK (length(manage_token_hash) = 64)
);

CREATE TABLE outcomes (
  receipt_id TEXT PRIMARY KEY REFERENCES receipts(id),
  status TEXT NOT NULL CHECK (status IN ('invalidated', 'held', 'expired', 'disputed')),
  postmortem TEXT NOT NULL CHECK (length(postmortem) BETWEEN 1 AND 280),
  source_url TEXT,
  recorded_at TEXT NOT NULL,
  outcome_hash TEXT NOT NULL CHECK (length(outcome_hash) = 64)
);

CREATE TABLE tombstones (
  receipt_id TEXT PRIMARY KEY REFERENCES receipts(id),
  reason TEXT NOT NULL CHECK (reason IN ('community_rules', 'privacy_safety', 'legal')),
  tombstoned_at TEXT NOT NULL
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY CHECK (length(id) = 22),
  receipt_id TEXT NOT NULL REFERENCES receipts(id),
  reason TEXT NOT NULL CHECK (reason IN ('spam_scam', 'harassment', 'impersonation', 'personal_information', 'illegal_safety', 'deceptive_token_claim', 'other')),
  detail TEXT CHECK (detail IS NULL OR length(detail) BETWEEN 1 AND 280),
  received_at TEXT NOT NULL
);

CREATE TABLE report_decisions (
  report_id TEXT PRIMARY KEY REFERENCES reports(id),
  decision TEXT NOT NULL CHECK (decision IN ('dismissed', 'actioned')),
  decided_at TEXT NOT NULL
);

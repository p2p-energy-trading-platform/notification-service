-- Email addresses that must not be emailed again. Stored hashed, never in plain text.

-- +goose Up
CREATE TABLE email_suppressions (
    email_hash TEXT PRIMARY KEY,
    reason     TEXT        NOT NULL CHECK (reason IN ('hard_bounce', 'complaint', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS email_suppressions;

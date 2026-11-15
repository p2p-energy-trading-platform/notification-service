-- Expo push tokens, one row per app installation.
-- installation_id is unique: when another user signs in on the same phone, the row is re-assigned.

-- +goose Up
CREATE TABLE push_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    installation_id TEXT        NOT NULL,
    expo_token      TEXT        NOT NULL,
    platform        TEXT        NOT NULL CHECK (platform IN ('ios', 'android')),
    app_version     TEXT,
    device_name     TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at  TIMESTAMPTZ,
    CONSTRAINT uq_push_installation UNIQUE (installation_id),
    CONSTRAINT uq_push_token UNIQUE (expo_token)
);

CREATE INDEX idx_push_tokens_user ON push_tokens (user_id) WHERE is_active;

-- +goose Down
DROP TABLE IF EXISTS push_tokens;

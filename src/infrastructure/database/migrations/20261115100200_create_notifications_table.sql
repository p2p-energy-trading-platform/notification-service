-- The inbox: one row per notification shown to a user.
-- title and body are stored rendered, so the inbox shows exactly what the user was told.

-- +goose Up
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    type            TEXT        NOT NULL,
    category        TEXT        NOT NULL,
    title           TEXT        NOT NULL,
    body            TEXT        NOT NULL,
    data            JSONB       NOT NULL DEFAULT '{}',
    action_url      TEXT,
    group_key       TEXT,
    source_event_id TEXT        NOT NULL,
    dedupe_key      TEXT        NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at         TIMESTAMPTZ,
    archived_at     TIMESTAMPTZ,
    CONSTRAINT uq_notifications_dedupe UNIQUE (dedupe_key)
);

-- Inbox page: newest first, excluding archived.
CREATE INDEX idx_notifications_inbox
    ON notifications (user_id, occurred_at DESC, id DESC)
    WHERE archived_at IS NULL;

-- Unread count.
CREATE INDEX idx_notifications_unread
    ON notifications (user_id)
    WHERE read_at IS NULL AND archived_at IS NULL;

-- Retention job (delete older than 90 days).
CREATE INDEX idx_notifications_created_at ON notifications (created_at);

-- +goose Down
DROP TABLE IF EXISTS notifications;

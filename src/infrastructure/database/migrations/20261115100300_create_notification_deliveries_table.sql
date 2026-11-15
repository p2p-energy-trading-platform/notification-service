-- One row per notification per channel. Also the delivery job queue (FOR UPDATE SKIP LOCKED).

-- +goose Up
CREATE TABLE notification_deliveries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id     UUID             NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id             UUID             NOT NULL,
    channel             delivery_channel NOT NULL,
    status              delivery_status  NOT NULL DEFAULT 'pending',
    priority            SMALLINT         NOT NULL DEFAULT 0,
    attempts            INT              NOT NULL DEFAULT 0,
    next_attempt_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
    locked_until        TIMESTAMPTZ,
    provider_message_id TEXT,
    last_error_code     TEXT,
    last_error          TEXT,
    skip_reason         TEXT,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT now(),
    CONSTRAINT uq_delivery_per_channel UNIQUE (notification_id, channel)
);

-- Workers claim the next due jobs per channel.
CREATE INDEX idx_deliveries_queue
    ON notification_deliveries (channel, priority DESC, next_attempt_at)
    WHERE status IN ('pending', 'retrying');

CREATE TRIGGER set_notification_deliveries_updated_at
BEFORE UPDATE ON notification_deliveries
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- +goose Down
DROP TABLE IF EXISTS notification_deliveries;

-- Expo push tickets waiting for a receipt check.

-- +goose Up
CREATE TABLE push_receipts_pending (
    ticket_id     TEXT PRIMARY KEY,
    delivery_id   UUID        NOT NULL REFERENCES notification_deliveries(id) ON DELETE CASCADE,
    push_token_id UUID        NOT NULL REFERENCES push_tokens(id) ON DELETE CASCADE,
    check_after   TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS push_receipts_pending;

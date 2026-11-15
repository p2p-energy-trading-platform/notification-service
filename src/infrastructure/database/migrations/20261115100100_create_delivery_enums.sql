-- Shared by notification_deliveries and notification_preferences.

-- +goose Up
CREATE TYPE delivery_channel AS ENUM ('in_app', 'email', 'push');

CREATE TYPE delivery_status AS ENUM (
    'pending',
    'processing',
    'retrying',
    'sent',
    'delivered',
    'failed',
    'skipped'
);

-- +goose Down
DROP TYPE IF EXISTS delivery_status;
DROP TYPE IF EXISTS delivery_channel;

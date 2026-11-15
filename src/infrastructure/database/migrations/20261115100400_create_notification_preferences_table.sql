-- Per user, per category, per channel opt-in/opt-out.
-- Only rows that differ from the defaults in code are stored.

-- +goose Up
CREATE TABLE notification_preferences (
    user_id    UUID             NOT NULL,
    category   TEXT             NOT NULL,
    channel    delivery_channel NOT NULL,
    enabled    BOOLEAN          NOT NULL,
    updated_at TIMESTAMPTZ      NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, category, channel)
);

CREATE TRIGGER set_notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- +goose Down
DROP TABLE IF EXISTS notification_preferences;

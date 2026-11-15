-- Per user locale, time zone and quiet hours. Missing row = defaults.

-- +goose Up
CREATE TABLE notification_settings (
    user_id          UUID PRIMARY KEY,
    locale           TEXT        NOT NULL DEFAULT 'en',
    time_zone        TEXT        NOT NULL DEFAULT 'Asia/Colombo',
    quiet_hours_from TIME,
    quiet_hours_to   TIME,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_notification_settings_updated_at
BEFORE UPDATE ON notification_settings
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- +goose Down
DROP TABLE IF EXISTS notification_settings;

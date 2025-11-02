-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_id_read_idx ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS notification_events_user_id_event_key_created_at_idx ON notification_events(user_id, event_key, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_events_idempotency_key_idx ON notification_events(idempotency_key);
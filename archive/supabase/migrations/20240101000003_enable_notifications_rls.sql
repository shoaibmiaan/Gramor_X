-- Enable RLS if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_opt_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_consent_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DO $$ 
BEGIN
    -- Notifications policies
    DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
    
    -- Preferences policies  
    DROP POLICY IF EXISTS "Users can manage own preferences" ON notifications_opt_in;
    
    -- Events policies
    DROP POLICY IF EXISTS "Service role only" ON notification_events;
    DROP POLICY IF EXISTS "Service role only" ON notification_consent_events;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for preferences
CREATE POLICY "Users can manage own preferences" ON notifications_opt_in
  FOR ALL USING (auth.uid() = user_id);

-- Policies for events (service role only)
CREATE POLICY "Service role only" ON notification_events
  FOR ALL USING (false);

CREATE POLICY "Service role only" ON notification_consent_events
  FOR ALL USING (false);
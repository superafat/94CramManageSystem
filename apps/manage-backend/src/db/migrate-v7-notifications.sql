-- Migration: Add Notification System
-- Phase 1: DB Schema for notifications and notification_preferences

-- Create enums
CREATE TYPE notification_type AS ENUM (
  'schedule_change',
  'billing_reminder',
  'attendance_alert',
  'grade_notification'
);

CREATE TYPE notification_channel AS ENUM (
  'telegram',
  'line',
  'email'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped'
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  channel notification_channel NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_tenant_created ON notifications(tenant_id, created_at DESC);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_student ON notifications(student_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- Create notification_preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_type_channel UNIQUE (user_id, type, channel)
);

-- Create indexes for notification_preferences
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default preferences for existing users (all enabled)
INSERT INTO notification_preferences (user_id, type, channel, enabled)
SELECT 
  u.id,
  t.type::notification_type,
  'telegram'::notification_channel,
  true
FROM users u
CROSS JOIN (VALUES 
  ('schedule_change'),
  ('billing_reminder'),
  ('attendance_alert'),
  ('grade_notification')
) AS t(type)
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences np 
  WHERE np.user_id = u.id 
  AND np.type = t.type::notification_type 
  AND np.channel = 'telegram'
);

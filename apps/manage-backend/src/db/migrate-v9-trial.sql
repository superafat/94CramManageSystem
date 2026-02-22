-- Migration v9: Add trial system fields to tenants
-- Run this SQL manually on Cloud SQL or via admin panel

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS trial_status VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS trial_start_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_end_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_approved_by UUID,
ADD COLUMN IF NOT EXISTS trial_approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_notes TEXT;

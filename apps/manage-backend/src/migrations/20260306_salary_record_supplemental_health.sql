ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS supplemental_health_premium_amount DECIMAL(10,2) DEFAULT 0;

ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS supplemental_health_withheld BOOLEAN DEFAULT FALSE;

ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS supplemental_health_reason TEXT;

ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS supplemental_health_review_note TEXT;
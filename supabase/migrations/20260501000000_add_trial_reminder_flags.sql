-- Add trial reminder flags to service_companies
ALTER TABLE service_companies
  ADD COLUMN IF NOT EXISTS trial_reminder_25_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_reminder_28_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_reminder_30_sent BOOLEAN NOT NULL DEFAULT false;

UPDATE service_companies
  SET trial_reminder_25_sent = false
  WHERE trial_reminder_25_sent IS NULL;

UPDATE service_companies
  SET trial_reminder_28_sent = false
  WHERE trial_reminder_28_sent IS NULL;

UPDATE service_companies
  SET trial_reminder_30_sent = false
  WHERE trial_reminder_30_sent IS NULL;

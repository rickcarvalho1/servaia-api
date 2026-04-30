-- Add trial and subscription columns to service_companies
ALTER TABLE service_companies
  ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'trial';

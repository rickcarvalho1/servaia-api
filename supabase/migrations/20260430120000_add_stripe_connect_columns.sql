-- Add Stripe Connect fields to service_companies
ALTER TABLE service_companies
  ADD COLUMN stripe_account_id TEXT,
  ADD COLUMN stripe_connect_status TEXT NOT NULL DEFAULT 'pending';

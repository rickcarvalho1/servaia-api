-- Add stripe_customer_id to service_companies
ALTER TABLE service_companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add card surcharge configuration to service_companies and payments
ALTER TABLE service_companies
  ADD COLUMN surcharge_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN surcharge_percentage numeric NOT NULL DEFAULT 3.5;

ALTER TABLE payments
  ADD COLUMN surcharge_amount numeric NOT NULL DEFAULT 0;
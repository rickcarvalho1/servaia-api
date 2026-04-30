-- Migration to add branding columns to service_companies table
-- Run this in Supabase SQL editor or via CLI

ALTER TABLE service_companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE service_companies ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Optionally, copy existing name to company_name if needed
-- UPDATE service_companies SET company_name = name WHERE company_name IS NULL;
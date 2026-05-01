-- Create prospects table for CRM
create table if not exists prospects (
  id uuid default gen_random_uuid() primary key,
  business_name text not null,
  owner_name text,
  phone text,
  email text,
  industry text,
  notes text,
  source text,
  status text default 'New' check (status in ('New', 'Contacted', 'Replied', 'Demo Booked', 'Signed Up', 'Dead')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create sequence_log table for tracking sent messages
create table if not exists sequence_log (
  id uuid default gen_random_uuid() primary key,
  prospect_id uuid references prospects(id) on delete cascade,
  type text not null check (type in ('sms', 'email')),
  message text not null,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Create replies table for inbound SMS
create table if not exists prospect_replies (
  id uuid default gen_random_uuid() primary key,
  prospect_id uuid references prospects(id) on delete cascade,
  message text not null,
  received_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Indexes
create index prospects_status_idx on prospects(status);
create index prospects_created_at_idx on prospects(created_at);
create index sequence_log_prospect_id_idx on sequence_log(prospect_id);
create index prospect_replies_prospect_id_idx on prospect_replies(prospect_id);
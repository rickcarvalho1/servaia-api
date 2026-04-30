create table if not exists invite_tokens (
  id uuid default gen_random_uuid() primary key,
  business_id uuid not null references service_companies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager', 'tech')),
  token uuid not null unique,
  used boolean default false,
  used_at timestamp null,
  expires_at timestamp not null,
  created_at timestamp default now()
);

create index invite_tokens_business_id_idx on invite_tokens(business_id);
create index invite_tokens_email_idx on invite_tokens(email);
create index invite_tokens_token_idx on invite_tokens(token);

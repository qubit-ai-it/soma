create table followups (
  id text primary key,
  plan_id text not null unique,
  subject_id text not null,
  status text not null check (status in ('active','closed')),
  contract jsonb not null,
  reports jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index followups_status on followups (status);
create index followups_subject on followups (subject_id, created_at desc);

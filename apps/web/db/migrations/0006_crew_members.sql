create table crew_members (
  id text primary key,
  clerk_user_id text not null unique,
  first_name text not null,
  last_name text not null,
  app_role text not null check (app_role in ('astronaut','cmo','commander')),
  title text not null,
  profile jsonb not null,
  vitals jsonb not null,
  history jsonb not null default '[]'::jsonb,
  cumulative_dose_msv double precision not null,
  last_check_in timestamptz not null,
  created_at timestamptz not null default now()
);

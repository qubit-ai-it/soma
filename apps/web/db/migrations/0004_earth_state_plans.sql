create table earth_state (
  id smallint primary key check (id = 1),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table plans (
  id text primary key,
  subject_id text not null,
  evaluation_id text not null unique,
  level text not null check (level in ('F2','F3')),
  status text not null check (status in ('draft','in_review','approved','changes_requested')),
  revision integer not null default 1,
  steps jsonb not null,
  uncertainty text not null,
  source jsonb not null,
  concerns jsonb not null default '[]'::jsonb,
  reviews jsonb not null default '[]'::jsonb,
  decided jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index plans_subject_updated on plans (subject_id, updated_at desc);

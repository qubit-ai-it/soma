create table alerts (
  id text primary key,
  member_id text not null,
  member_label text not null,
  level text not null check (level in ('F2','F3','NOT_EVALUABLE')),
  title text not null,
  action text not null,
  recipients text[] not null,
  clinical_detail text,
  status text not null check (status in ('open','acknowledged','closed')),
  created_at timestamptz not null,
  source text not null,
  acknowledged jsonb,
  closed jsonb
);
create index alerts_created on alerts (created_at desc);

create table audit_entries (
  id text primary key,
  seq integer not null unique,
  at timestamptz not null,
  action text not null,
  actor jsonb not null,
  subject_id text,
  alert_id text,
  detail text,
  ai_proposal jsonb,
  human_decision jsonb,
  idempotency_key text unique,
  prev_hash text not null,
  hash text not null
);

create table evaluations (
  id text primary key,
  subject_id text not null,
  evaluated_at timestamptz not null,
  status text not null check (status in ('F0','F1','F2','F3','NOT_EVALUABLE')),
  rule_set_version text not null,
  engine_version text not null,
  triggered_rules jsonb not null,
  evidence jsonb not null,
  limitations jsonb not null,
  created_at timestamptz not null default now()
);
create index evaluations_subject_time on evaluations (subject_id, evaluated_at desc);

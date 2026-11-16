create table observations (
  id text primary key,
  subject_id text not null,
  signal text not null,
  value_num double precision,
  value_text text,
  unit text not null,
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  mission_time text,
  provenance_type text not null check (provenance_type in ('real','historical','synthetic')),
  provenance_source text not null,
  provenance_device text,
  provenance_dataset text,
  quality_state text not null check (quality_state in ('valid','suspect','invalid','missing')),
  quality_reason text,
  processing_version text
);
create index observations_subject_signal_time on observations (subject_id, signal, observed_at);

create table notifications (
  id text primary key,
  dedupe_key text not null unique,
  kind text not null,
  priority text not null check (priority in ('low','normal','high','critical')),
  title text not null,
  body text,
  member_id text,
  audience text[] not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index notifications_created on notifications (created_at desc);
create index notifications_audience on notifications using gin (audience);

create table notification_reads (
  notification_id text not null references notifications (id) on delete cascade,
  recipient text not null,
  read_at timestamptz not null default now(),
  primary key (notification_id, recipient)
);

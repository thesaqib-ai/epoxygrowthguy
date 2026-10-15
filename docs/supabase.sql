-- Run this once in the Supabase SQL editor.

create table interview_requests (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  full_name       text not null,
  business_name   text not null,
  instagram       text not null,
  website         text,
  email           text not null,
  phone           text,
  location        text not null,
  years_in_business text not null,
  services        text[] not null,
  team_size       text not null,
  talk_about      text not null,
  biggest_challenge text,
  heard_from      text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  referrer        text,
  status          text not null default 'requested',
    -- requested | approved | scheduled | recorded | posted | declined
  notes           text,
  recorded_at     timestamptz,
  posted_at       timestamptz,
  followup_due_at timestamptz
);

alter table interview_requests enable row level security;
-- No public policies. Only the service role, used by the Pages Function,
-- can write. The anon key cannot read or write this table.

-- Handy for working through the list newest first.
create index interview_requests_status_created_idx
  on interview_requests (status, created_at desc);

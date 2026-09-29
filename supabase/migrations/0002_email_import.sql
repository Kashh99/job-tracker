-- Email import: applications can be created from "thanks for applying" emails,
-- either pasted into the app or forwarded to a per-user inbound address.

alter table public.applications
  add column location text,
  add column work_mode text check (work_mode in ('remote', 'hybrid', 'onsite')),
  add column salary text,
  add column job_ref text,
  -- Set on imported applications until the user reviews and saves them.
  add column needs_review boolean not null default false;

-- Secret used in the forwarding address. Anyone holding it can add
-- applications to this account, so it can be rotated from Settings.
alter table public.users
  add column inbox_token uuid not null default gen_random_uuid() unique;

-- Log of every email received, imported or not. Lets the user see what the
-- importer did, and read Gmail's forwarding confirmation code.
create table public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  message_id text,
  from_address text,
  subject text,
  body_excerpt text,
  status text not null check (status in ('imported', 'duplicate', 'skipped', 'failed')),
  detail text,
  application_id uuid references public.applications (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

create index inbound_emails_user_idx on public.inbound_emails (user_id, created_at desc);

alter table public.inbound_emails enable row level security;

create policy "own inbound emails" on public.inbound_emails
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

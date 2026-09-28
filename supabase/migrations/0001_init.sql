-- Job tracker schema. Multi-tenant from day one: every row is owned by a user
-- and row level security restricts access to the owner.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  follow_up_days int not null default 12 check (follow_up_days between 1 and 90),
  created_at timestamptz not null default now()
);

-- Mirror new auth users into public.users.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  company text not null,
  role text not null,
  job_url text,
  source text check (source in ('referral', 'cold', 'linkedin', 'job_board', 'other')),
  status text not null default 'applied'
    check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'ghosted')),
  applied_date date,
  last_activity_date date not null default current_date,
  resume_version text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_status_idx on public.applications (user_id, status);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  name text not null,
  role text,
  company text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create index contacts_user_idx on public.contacts (user_id);
create index contacts_application_idx on public.contacts (application_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  type text not null check (type in ('status_change', 'follow_up', 'interview', 'note')),
  detail text,
  event_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index events_application_idx on public.events (application_id, event_date);

-- Status changes are logged by the database, not the client, so the timeline
-- that analytics depend on can never drift from the applications table.
create function public.log_application_activity() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'applied' and new.applied_date is null then
      new.applied_date := current_date;
    end if;
    return new;
  end if;

  new.updated_at := now();
  if new.status is distinct from old.status then
    new.last_activity_date := current_date;
    if new.status = 'applied' and new.applied_date is null then
      new.applied_date := current_date;
    end if;
  end if;
  return new;
end;
$$;

create trigger applications_before_write
  before insert or update on public.applications
  for each row execute function public.log_application_activity();

create function public.log_status_event() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into public.events (application_id, type, detail, event_date)
    values (new.id, 'status_change', new.status, coalesce(new.applied_date, current_date));
  elsif new.status is distinct from old.status then
    insert into public.events (application_id, type, detail)
    values (new.id, 'status_change', new.status);
  end if;
  return null;
end;
$$;

create trigger applications_after_write
  after insert or update of status on public.applications
  for each row execute function public.log_status_event();

-- Row level security
alter table public.users enable row level security;
alter table public.applications enable row level security;
alter table public.contacts enable row level security;
alter table public.events enable row level security;

create policy "own profile" on public.users
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own applications" on public.applications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own contacts" on public.contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "events of own applications" on public.events
  for all
  using (exists (
    select 1 from public.applications a
    where a.id = events.application_id and a.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.applications a
    where a.id = events.application_id and a.user_id = auth.uid()
  ));

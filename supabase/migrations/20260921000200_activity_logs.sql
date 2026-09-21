-- Manual walking/running activity for each family profile.
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references family_profiles(id) on delete cascade,
  activity_date date not null,
  activity_type text not null default 'walking'
    check (activity_type in ('walking', 'running', 'other')),
  steps integer not null default 0 check (steps >= 0),
  distance_km numeric check (distance_km is null or distance_km >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  note text,
  created_at timestamptz not null default now()
);

alter table activity_logs enable row level security;

drop policy if exists activity_logs_family on activity_logs;
create policy activity_logs_family on activity_logs for all to authenticated
  using (can_read_profile(profile_id))
  with check (can_read_profile(profile_id));

revoke all on activity_logs from anon;
grant select, insert, update, delete on activity_logs to authenticated;

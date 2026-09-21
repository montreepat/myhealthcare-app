create table if not exists blood_pressure_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references family_profiles(id) on delete cascade,
  logged_at timestamptz not null,
  period text not null check (period in ('morning', 'evening')),
  systolic integer not null check (systolic > 0),
  diastolic integer not null check (diastolic > 0),
  pulse integer check (pulse is null or pulse > 0),
  note text,
  created_at timestamptz not null default now()
);

alter table blood_pressure_logs enable row level security;
drop policy if exists blood_pressure_logs_family on blood_pressure_logs;
create policy blood_pressure_logs_family on blood_pressure_logs for all to authenticated
  using (can_read_profile(profile_id)) with check (can_read_profile(profile_id));
revoke all on blood_pressure_logs from anon;
grant select, insert, update, delete on blood_pressure_logs to authenticated;

-- MyHealthCare v2: authenticated family data, lab documents, medications and LINE links.
-- Run only after taking a database backup. Supabase Auth must be enabled.

create extension if not exists pgcrypto;

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists family_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  weight numeric,
  height numeric,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create or replace function can_read_profile(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from family_profiles target
    join households h on h.id = target.household_id
    where target.id = target_profile_id
      and (target.user_id = auth.uid() or h.owner_user_id = auth.uid())
  );
$$;

create or replace function can_manage_household(target_household_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from households h
    where h.id = target_household_id and h.owner_user_id = auth.uid()
  );
$$;

create table if not exists health_appointments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references family_profiles(id) on delete cascade,
  topic text not null, doctor_clinic text not null, hospital text not null,
  appointment_datetime timestamptz not null, special_instructions text,
  line_reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists lab_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references family_profiles(id) on delete cascade,
  exam_date date not null, storage_path text, original_file_name text,
  mime_type text, extraction_status text not null default 'pending',
  analysis_summary text, confirmed_by_user boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists lab_metrics (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references lab_reports(id) on delete cascade,
  metric_name text not null, value numeric, value_text text, unit text,
  reference_low numeric, reference_high numeric, reference_text text,
  flag text check (flag in ('low','normal','high','critical','unknown')),
  created_at timestamptz not null default now()
);

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references family_profiles(id) on delete cascade,
  name text not null, strength text, dose text not null, schedule text not null,
  meal_timing text not null default 'any' check (meal_timing in ('before','after','with','any')),
  start_date date not null, end_date date, prescriber text, hospital text,
  purpose text, note text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications(id) on delete cascade,
  scheduled_at timestamptz not null, status text not null check (status in ('taken','skipped','missed')),
  note text, created_at timestamptz not null default now()
);

create table if not exists line_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references family_profiles(id) on delete cascade,
  line_user_id_encrypted text, connected_at timestamptz, enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table households enable row level security;
alter table family_profiles enable row level security;
alter table health_appointments enable row level security;
alter table lab_reports enable row level security;
alter table lab_metrics enable row level security;
alter table medications enable row level security;
alter table medication_logs enable row level security;
alter table line_connections enable row level security;

create policy households_owner on households for all to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy profiles_family_read on family_profiles for select to authenticated using (can_read_profile(id));
create policy profiles_family_insert on family_profiles for insert to authenticated
  with check (can_manage_household(household_id));
create policy profiles_family_update on family_profiles for update to authenticated
  using (can_read_profile(id)) with check (can_read_profile(id));
create policy profiles_family_delete on family_profiles for delete to authenticated
  using (can_manage_household(household_id));
create policy appointments_family on health_appointments for all to authenticated
  using (can_read_profile(profile_id)) with check (can_read_profile(profile_id));
create policy reports_family on lab_reports for all to authenticated
  using (can_read_profile(profile_id)) with check (can_read_profile(profile_id));
create policy metrics_family on lab_metrics for all to authenticated
  using (exists (select 1 from lab_reports r where r.id = report_id and can_read_profile(r.profile_id)))
  with check (exists (select 1 from lab_reports r where r.id = report_id and can_read_profile(r.profile_id)));
create policy medications_family on medications for all to authenticated
  using (can_read_profile(profile_id)) with check (can_read_profile(profile_id));
create policy medication_logs_family on medication_logs for all to authenticated
  using (exists (select 1 from medications m where m.id = medication_id and can_read_profile(m.profile_id)))
  with check (exists (select 1 from medications m where m.id = medication_id and can_read_profile(m.profile_id)));
create policy line_family on line_connections for all to authenticated
  using (can_read_profile(profile_id)) with check (can_read_profile(profile_id));

insert into storage.buckets (id, name, public)
values ('health-documents', 'health-documents', false)
on conflict (id) do nothing;

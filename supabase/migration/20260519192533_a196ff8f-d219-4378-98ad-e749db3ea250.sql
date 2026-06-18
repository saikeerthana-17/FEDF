
-- Departments per branch
create table if not exists public.hospital_departments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.hospital_branches(id) on delete cascade,
  name text not null,
  head_doctor_name text,
  phone text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hospital_departments_branch_idx on public.hospital_departments(branch_id);

alter table public.hospital_departments enable row level security;

drop policy if exists "departments read" on public.hospital_departments;
create policy "departments read" on public.hospital_departments for select to authenticated using (
  exists (
    select 1 from public.hospital_branches b
    join public.hospitals h on h.id = b.hospital_id
    where b.id = hospital_departments.branch_id
      and (h.is_verified or public.is_hospital_member(h.id, auth.uid()) or public.has_role(auth.uid(),'admin'))
  )
);

drop policy if exists "departments write" on public.hospital_departments;
create policy "departments write" on public.hospital_departments for all to authenticated
using (
  exists (
    select 1 from public.hospital_branches b
    where b.id = hospital_departments.branch_id
      and (public.is_hospital_member(b.hospital_id, auth.uid()) or public.has_role(auth.uid(),'admin'))
  )
)
with check (
  exists (
    select 1 from public.hospital_branches b
    where b.id = hospital_departments.branch_id
      and (public.is_hospital_member(b.hospital_id, auth.uid()) or public.has_role(auth.uid(),'admin'))
  )
);

-- Make bed upsert reliable
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'hospital_beds_branch_ward_unique'
  ) then
    alter table public.hospital_beds add constraint hospital_beds_branch_ward_unique unique (branch_id, ward_type);
  end if;
end $$;

-- Realtime for live availability views
do $$ begin
  begin alter publication supabase_realtime add table public.hospital_beds; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.hospital_departments; exception when duplicate_object then null; end;
end $$;

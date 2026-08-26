-- ID Card Management System — schema + RLS
-- Safe to run on a project that already has a `profiles` table (e.g. Palak Enterprises).
-- Everything below is namespaced with the idcard_ prefix so it won't collide with
-- anything you've already built.

-- ============================================================
-- 1. ROLES
-- ============================================================
-- If you already have a role mechanism (e.g. profiles.role) you can skip this
-- table and swap the helper functions below to read from your existing column.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('ADMIN', 'MANAGER', 'STAFF')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.is_idcard_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('ADMIN', 'MANAGER', 'STAFF')
  );
$$;

create or replace function public.is_idcard_manager_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('ADMIN', 'MANAGER')
  );
$$;

-- ============================================================
-- 2. PROJECTS
-- ============================================================

create table if not exists public.idcard_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  academic_year text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED')),
  template_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_idcard_projects_status on public.idcard_projects(status);
create index if not exists idx_idcard_projects_created_by on public.idcard_projects(created_by);

-- ============================================================
-- 3. TEMPLATES
-- ============================================================

create table if not exists public.idcard_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.idcard_projects(id) on delete cascade,
  name text not null,
  -- layout is a JSON description of field positions/styling, kept flexible
  -- on purpose so the editor stays simple (see spec section 13).
  layout jsonb not null default '{}'::jsonb,
  card_width_mm numeric not null default 85.6,
  card_height_mm numeric not null default 54,
  background_url text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.idcard_projects
  add constraint fk_idcard_projects_template
  foreign key (template_id) references public.idcard_templates(id) on delete set null;

create index if not exists idx_idcard_templates_project on public.idcard_templates(project_id);

-- ============================================================
-- 4. PERSONS / STUDENTS
-- ============================================================

create table if not exists public.idcard_persons (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.idcard_projects(id) on delete cascade,
  student_id text not null,
  name text not null,
  class text,
  section text,
  roll_number text,
  date_of_birth date,
  blood_group text,
  father_name text,
  mother_name text,
  phone text,
  address text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, student_id)
);

create index if not exists idx_idcard_persons_project on public.idcard_persons(project_id);
create index if not exists idx_idcard_persons_name on public.idcard_persons(project_id, name);

-- ============================================================
-- 5. GENERATIONS
-- ============================================================
-- One row per attempted card so batch generation can report success/failure
-- per student without silently dropping anyone (spec section 15).

create table if not exists public.idcard_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.idcard_projects(id) on delete cascade,
  person_id uuid not null references public.idcard_persons(id) on delete cascade,
  template_id uuid not null references public.idcard_templates(id) on delete restrict,
  status text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILED')),
  file_url text,
  error_message text,
  generated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_idcard_generations_project on public.idcard_generations(project_id);
create index if not exists idx_idcard_generations_person on public.idcard_generations(person_id);

-- ============================================================
-- 6. updated_at triggers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_idcard_projects_updated_at on public.idcard_projects;
create trigger trg_idcard_projects_updated_at
  before update on public.idcard_projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_idcard_persons_updated_at on public.idcard_persons;
create trigger trg_idcard_persons_updated_at
  before update on public.idcard_persons
  for each row execute function public.set_updated_at();

drop trigger if exists trg_idcard_templates_updated_at on public.idcard_templates;
create trigger trg_idcard_templates_updated_at
  before update on public.idcard_templates
  for each row execute function public.set_updated_at();

-- ============================================================
-- 7. RLS
-- ============================================================

alter table public.user_roles enable row level security;
alter table public.idcard_projects enable row level security;
alter table public.idcard_templates enable row level security;
alter table public.idcard_persons enable row level security;
alter table public.idcard_generations enable row level security;

-- user_roles: a user can read their own row, only ADMIN manages roles
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles
  for select using (user_id = auth.uid() or public.current_user_role() = 'ADMIN');

drop policy if exists user_roles_admin_write on public.user_roles;
create policy user_roles_admin_write on public.user_roles
  for all using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

-- idcard_projects
-- ADMIN: full access. MANAGER: full access on projects. STAFF: read + limited write.
drop policy if exists idcard_projects_select on public.idcard_projects;
create policy idcard_projects_select on public.idcard_projects
  for select using (public.is_idcard_staff());

drop policy if exists idcard_projects_insert on public.idcard_projects;
create policy idcard_projects_insert on public.idcard_projects
  for insert with check (public.is_idcard_manager_or_above() and created_by = auth.uid());

drop policy if exists idcard_projects_update on public.idcard_projects;
create policy idcard_projects_update on public.idcard_projects
  for update using (public.is_idcard_manager_or_above())
  with check (public.is_idcard_manager_or_above());

drop policy if exists idcard_projects_delete on public.idcard_projects;
create policy idcard_projects_delete on public.idcard_projects
  for delete using (public.current_user_role() = 'ADMIN');

-- idcard_templates
drop policy if exists idcard_templates_select on public.idcard_templates;
create policy idcard_templates_select on public.idcard_templates
  for select using (public.is_idcard_staff());

drop policy if exists idcard_templates_write on public.idcard_templates;
create policy idcard_templates_write on public.idcard_templates
  for all using (public.is_idcard_manager_or_above())
  with check (public.is_idcard_manager_or_above());

-- idcard_persons
-- STAFF can read/write persons (data entry is a staff job), MANAGER+ can delete.
drop policy if exists idcard_persons_select on public.idcard_persons;
create policy idcard_persons_select on public.idcard_persons
  for select using (public.is_idcard_staff());

drop policy if exists idcard_persons_insert on public.idcard_persons;
create policy idcard_persons_insert on public.idcard_persons
  for insert with check (public.is_idcard_staff());

drop policy if exists idcard_persons_update on public.idcard_persons;
create policy idcard_persons_update on public.idcard_persons
  for update using (public.is_idcard_staff())
  with check (public.is_idcard_staff());

drop policy if exists idcard_persons_delete on public.idcard_persons;
create policy idcard_persons_delete on public.idcard_persons
  for delete using (public.is_idcard_manager_or_above());

-- idcard_generations
drop policy if exists idcard_generations_select on public.idcard_generations;
create policy idcard_generations_select on public.idcard_generations
  for select using (public.is_idcard_staff());

drop policy if exists idcard_generations_insert on public.idcard_generations;
create policy idcard_generations_insert on public.idcard_generations
  for insert with check (public.is_idcard_staff() and generated_by = auth.uid());

drop policy if exists idcard_generations_update on public.idcard_generations;
create policy idcard_generations_update on public.idcard_generations
  for update using (public.is_idcard_staff())
  with check (public.is_idcard_staff());

-- ============================================================
-- 8. STORAGE — student photos
-- ============================================================
-- Run once. Bucket is private; access goes through signed URLs generated
-- server-side (see src/lib/idcard/database.ts -> getPhotoUrl).

insert into storage.buckets (id, name, public)
values ('idcard-photos', 'idcard-photos', false)
on conflict (id) do nothing;

drop policy if exists idcard_photos_staff_read on storage.objects;
create policy idcard_photos_staff_read on storage.objects
  for select using (bucket_id = 'idcard-photos' and public.is_idcard_staff());

drop policy if exists idcard_photos_staff_write on storage.objects;
create policy idcard_photos_staff_write on storage.objects
  for insert with check (bucket_id = 'idcard-photos' and public.is_idcard_staff());

drop policy if exists idcard_photos_staff_update on storage.objects;
create policy idcard_photos_staff_update on storage.objects
  for update using (bucket_id = 'idcard-photos' and public.is_idcard_staff());

drop policy if exists idcard_photos_manager_delete on storage.objects;
create policy idcard_photos_manager_delete on storage.objects
  for delete using (bucket_id = 'idcard-photos' and public.is_idcard_manager_or_above());

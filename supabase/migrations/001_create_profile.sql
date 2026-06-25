-- ============================================================
-- 1. ROLE
-- ============================================================
create table public.role (
  id   uuid primary key default uuid_generate_v4(),
  name text not null unique
);

insert into public.role (name) values ('admin'), ('client');

-- ============================================================
-- 2. PROFILE (FK a role, se auto-crea con trigger)
-- ============================================================
create table public.profile (
  id         uuid primary key references auth.users(id) on delete cascade,
  role_id    uuid not null references public.role(id),
  full_name  text not null,
  dni        text not null,
  phone      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 3. SPECIALTY
-- ============================================================
create table public.specialty (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  description text,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- 4. SHIFT
-- ============================================================
create table public.shift (
  id             uuid primary key default uuid_generate_v4(),
  client_id      uuid not null references auth.users(id),
  specialty_id   uuid not null references public.specialty(id),
  admin_id       uuid references auth.users(id),
  status         text not null check (status in ('pending', 'approved', 'cancelled')) default 'pending',
  assigned_date  date,
  assigned_time  time,
  client_notes   text,
  admin_notes    text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ============================================================
-- TRIGGER: auto-crear profile con role 'client'
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role_id uuid;
begin
  select id into v_role_id from public.role where name = 'client';
  insert into public.profile (id, role_id, full_name, dni)
  values (new.id, v_role_id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'dni');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================
alter table public.role enable row level security;
alter table public.profile enable row level security;
alter table public.specialty enable row level security;
alter table public.shift enable row level security;

create policy "Anyone authenticated can read roles"
  on public.role for select
  using (auth.role() = 'authenticated');

create policy "Users can view own profile"
  on public.profile for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profile for update
  using (auth.uid() = id);

create policy "Anyone authenticated can read specialties"
  on public.specialty for select
  using (auth.role() = 'authenticated');

create policy "Clients can view own shifts"
  on public.shift for select
  using (
    auth.uid() = client_id
    or exists (
      select 1 from public.profile
      where id = auth.uid()
        and role_id = (select id from public.role where name = 'admin')
    )
  );

create policy "Clients can insert own shifts"
  on public.shift for insert
  with check (auth.uid() = client_id);

create policy "Admin can update any shift"
  on public.shift for update
  using (
    exists (
      select 1 from public.profile
      where id = auth.uid()
        and role_id = (select id from public.role where name = 'admin')
    )
  );

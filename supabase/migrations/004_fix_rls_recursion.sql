-- ============================================================
-- Fix RLS infinite recursion
-- ============================================================

-- 1. Función security definer para checkear admin sin RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profile
    where id = auth.uid()
      and role_id = (select id from public.role where name = 'admin')
  );
$$;

-- 2. Reemplazar policy de profile que causa recursion
drop policy if exists "Admins can view all profiles" on public.profile;

create policy "Admins can view all profiles"
  on public.profile for select
  using (public.is_admin());

-- 3. Actualizar policies de shift para usar is_admin()
drop policy if exists "Clients can view own shifts" on public.shift;

create policy "Clients can view own shifts"
  on public.shift for select
  using (
    auth.uid() = client_id
    or public.is_admin()
  );

drop policy if exists "Admin can update any shift" on public.shift;

create policy "Admin can update any shift"
  on public.shift for update
  using (public.is_admin());

-- ============================================================
-- Policy: admins pueden leer todos los perfiles
-- ============================================================
create policy "Admins can view all profiles"
  on public.profile for select
  using (
    exists (
      select 1 from public.profile
      where id = auth.uid()
        and role_id = (select id from public.role where name = 'admin')
    )
  );

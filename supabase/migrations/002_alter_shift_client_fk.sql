-- ============================================================
-- Cambiar FK de shift.client_id de auth.users a profile
-- ============================================================
alter table public.shift
  drop constraint shift_client_id_fkey,
  add constraint shift_client_id_fkey
    foreign key (client_id) references public.profile(id);

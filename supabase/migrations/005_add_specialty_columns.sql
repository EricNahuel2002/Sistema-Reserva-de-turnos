alter table public.specialty
  add column if not exists available_from  smallint default null,
  add column if not exists available_until smallint default null,
  add column if not exists available_day   varchar  default null,
  add column if not exists image           text     default null,
  add column if not exists value           varchar  default null;

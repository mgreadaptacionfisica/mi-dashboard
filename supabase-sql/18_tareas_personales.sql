-- Tabla de tareas personales de Raúl ("Mis tareas"): texto libre, fecha
-- opcional y checkbox de hecha/pendiente. Es 100% personal (admin-only),
-- no la ve ni la usa el resto del equipo.

create table if not exists public.tareas_personales (
  id text primary key,
  texto text not null,
  fecha date,
  hecha boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tareas_personales enable row level security;

drop policy if exists "tareas_personales_admin_only" on public.tareas_personales;
create policy "tareas_personales_admin_only" on public.tareas_personales
  for all
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

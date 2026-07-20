-- "Enlaces de interés": zona privada solo para Raúl (admin) con enlaces
-- que usa a menudo (ej. el dashboard para un cliente, un formulario...)
-- para copiarlos rápido y pasarlos por WhatsApp o donde haga falta.
-- A diferencia de "Manuales" (visible para todo el equipo), esta sección
-- ni siquiera aparece en el menú del resto de roles — ni verla ni leerla
-- por API, solo el admin.
create table if not exists public.enlaces_interes (
  id text primary key,
  titulo text not null,
  enlace text not null,
  created_at timestamptz not null default now()
);

alter table public.enlaces_interes enable row level security;

drop policy if exists "enlaces_interes_admin_select" on public.enlaces_interes;
create policy "enlaces_interes_admin_select" on public.enlaces_interes
  for select using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

drop policy if exists "enlaces_interes_admin_insert" on public.enlaces_interes;
create policy "enlaces_interes_admin_insert" on public.enlaces_interes
  for insert with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

drop policy if exists "enlaces_interes_admin_update" on public.enlaces_interes;
create policy "enlaces_interes_admin_update" on public.enlaces_interes
  for update using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

drop policy if exists "enlaces_interes_admin_delete" on public.enlaces_interes;
create policy "enlaces_interes_admin_delete" on public.enlaces_interes
  for delete using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

notify pgrst, 'reload schema';

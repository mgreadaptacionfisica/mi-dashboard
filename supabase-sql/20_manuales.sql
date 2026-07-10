-- Archivo de manuales/documentos de la agencia: visible para todo el equipo
-- (cualquier rol logueado), pero solo el admin puede añadir/editar/borrar.
create table if not exists public.manuales (
  id text primary key,
  titulo text not null,
  descripcion text default '',
  enlace text not null,
  created_at timestamptz not null default now()
);

alter table public.manuales enable row level security;

drop policy if exists "manuales_select_logueados" on public.manuales;
create policy "manuales_select_logueados" on public.manuales
  for select using (auth.uid() is not null);

drop policy if exists "manuales_admin_write" on public.manuales;
create policy "manuales_admin_write" on public.manuales
  for insert with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

drop policy if exists "manuales_admin_update" on public.manuales;
create policy "manuales_admin_update" on public.manuales
  for update using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

drop policy if exists "manuales_admin_delete" on public.manuales;
create policy "manuales_admin_delete" on public.manuales
  for delete using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- Los 4 manuales de uso del panel, ya publicados en /public.
insert into public.manuales (id, titulo, descripcion, enlace) values
('manual-admin', 'Manual completo del panel (Admin)', 'Todas las secciones, para Raúl.', '/manual-panel-admin.pdf'),
('manual-closer', 'Manual del panel — Closer', 'Ventas y Comunicación.', '/manual-panel-closer-uso.pdf'),
('manual-tecnico', 'Manual del panel — Técnico', 'Clientes y Comunicación.', '/manual-panel-tecnico.pdf'),
('manual-contenido', 'Manual del panel — Contenido', 'Operaciones y Comunicación.', '/manual-panel-contenido.pdf')
on conflict (id) do nothing;

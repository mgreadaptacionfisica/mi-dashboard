-- Equipo (técnico, ventas, contenido) — tabla base para relaciones futuras.
create table if not exists public.miembros_equipo (
  id text primary key,
  nombre text not null,
  rol text default '',
  email text default '',
  telefono text default '',
  area text not null check (area in ('tecnico', 'ventas', 'contenido')),
  comision numeric,
  fijo numeric,
  created_at timestamptz not null default now()
);

alter table public.miembros_equipo enable row level security;

create policy "miembros_equipo_select_all" on public.miembros_equipo for select using (true);
create policy "miembros_equipo_insert_all" on public.miembros_equipo for insert with check (true);
create policy "miembros_equipo_update_all" on public.miembros_equipo for update using (true);
create policy "miembros_equipo_delete_all" on public.miembros_equipo for delete using (true);

-- Datos reales del equipo (confirmados por Raúl el 10 julio 2026).
-- Raúl Morales (CEO) aparece en las 3 áreas porque hace de entrenador, closer y
-- creador de contenido — igual que en el panel, donde cada persona es una ficha
-- por área. Email/teléfono/comisión/fijo se dejan vacíos donde no se conocen
-- todavía; se pueden rellenar después desde el botón "Editar" en el panel.
insert into public.miembros_equipo (id, nombre, rol, email, telefono, area, comision, fijo) values
('team-tecnico-raul', 'Raúl Morales', 'CEO / Entrenador', '', '', 'tecnico', null, null),
('team-ventas-raul', 'Raúl Morales', 'CEO / Closer', '', '', 'ventas', null, null),
('team-contenido-raul', 'Raúl Morales', 'CEO / Creador de contenido', '', '', 'contenido', null, null),
('team-tecnico-javier', 'Javier González', 'Fisioterapeuta', '', '', 'tecnico', null, null),
('team-tecnico-pedro', 'Pedro Álamo', 'Entrenador', '', '', 'tecnico', null, null),
('team-ventas-juan', 'Juan García', 'Closer', '', '', 'ventas', null, null),
('team-contenido-rocio', 'Rocío Agüero', 'Editora', '', '', 'contenido', null, null)
on conflict (id) do nothing;

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

-- Datos actuales (src/data/team.js)
insert into public.miembros_equipo (id, nombre, rol, email, telefono, area, comision, fijo) values
('team-tec-1', 'Lucía Martínez', 'Entrenador', 'lucia.martinez@mg-group.com', '+34 600 123 456', 'tecnico', null, null),
('team-tec-2', 'Carlos Herrera', 'Nutricionista', 'carlos.herrera@mg-group.com', '+34 600 234 567', 'tecnico', null, null),
('team-tec-3', 'Marta López', 'Psicólogo', 'marta.lopez@mg-group.com', '+34 600 345 678', 'tecnico', null, null),
('team-tec-4', 'Raúl García', 'Fisioterapeuta', 'raul.garcia@mg-group.com', '+34 600 456 789', 'tecnico', null, null),
('team-ven-1', 'Daniel Soto', 'Closer', 'daniel.soto@mg-group.com', '+34 600 567 890', 'ventas', 20, 0),
('team-ven-2', 'Sara Vidal', 'Setter', 'sara.vidal@mg-group.com', '+34 600 678 901', 'ventas', null, null)
on conflict (id) do nothing;

-- Tabla del muro de Comunicación
create table if not exists public.mensajes_equipo (
  id text primary key,
  autor text not null,
  texto text not null,
  menciones text[] not null default '{}',
  fecha timestamptz not null default now()
);

alter table public.mensajes_equipo enable row level security;

-- Temporal (misma nota que en sops): abierto hasta que tengamos login por persona.
create policy "mensajes_equipo_select_all" on public.mensajes_equipo
  for select using (true);
create policy "mensajes_equipo_insert_all" on public.mensajes_equipo
  for insert with check (true);
create policy "mensajes_equipo_update_all" on public.mensajes_equipo
  for update using (true);
create policy "mensajes_equipo_delete_all" on public.mensajes_equipo
  for delete using (true);

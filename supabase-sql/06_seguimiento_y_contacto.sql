-- Seguimiento semanal de entrenamiento por cliente (tareas por día).
create table if not exists public.seguimientos (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  semana date not null,               -- lunes de esa semana
  dias jsonb not null default '{}',   -- { lunes: {tareas:[...]}, martes: {...}, ... }
  comentarios text default '',
  revisiones jsonb not null default '[]', -- [{ persona, dia, hora, fecha }]
  unique (cliente_nombre, semana)
);

alter table public.seguimientos enable row level security;
create policy "seguimientos_select_all" on public.seguimientos for select using (true);
create policy "seguimientos_insert_all" on public.seguimientos for insert with check (true);
create policy "seguimientos_update_all" on public.seguimientos for update using (true);
create policy "seguimientos_delete_all" on public.seguimientos for delete using (true);

-- Contacto semanal (3 checks: inicio / mitad / fin de semana) por cliente.
create table if not exists public.contactos_semanales (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  semana date not null,
  inicio jsonb not null default '{"hecho": false, "fecha": null, "comentario": ""}',
  mitad jsonb not null default '{"hecho": false, "fecha": null, "comentario": ""}',
  fin jsonb not null default '{"hecho": false, "fecha": null, "comentario": ""}',
  unique (cliente_nombre, semana)
);

alter table public.contactos_semanales enable row level security;
create policy "contactos_semanales_select_all" on public.contactos_semanales for select using (true);
create policy "contactos_semanales_insert_all" on public.contactos_semanales for insert with check (true);
create policy "contactos_semanales_update_all" on public.contactos_semanales for update using (true);
create policy "contactos_semanales_delete_all" on public.contactos_semanales for delete using (true);
-- Ambas tablas sin datos: están vacías en el panel ahora mismo.

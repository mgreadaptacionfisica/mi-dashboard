-- Corrige el diseño de 44_cierres_seguimiento_semanal.sql: Raúl aclaró que
-- el "check final" NO es un cierre global por técnico/admin, sino un check
-- manual POR CLIENTE — se marca cuando, para ese cliente concreto, ya está
-- todo revisado, hechos los cambios oportunos, y preparada la semana
-- siguiente (ver el checkbox en el modal de Seguimiento de cada cliente).
-- Se borra la tabla anterior (nunca llegó a usarse con datos reales) y se
-- crea esta, identificada por (cliente_nombre, semana) en vez de (persona,
-- semana).
drop table if exists public.cierres_seguimiento_semanal;

create table if not exists public.revisiones_semanales_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  semana date not null,               -- lunes de esa semana
  revisado boolean not null default true,
  revisado_en timestamptz not null default now(),
  revisado_por text,
  unique (cliente_nombre, semana)
);

create index if not exists revisiones_semanales_cliente_idx
  on public.revisiones_semanales_cliente (cliente_nombre, semana);

alter table public.revisiones_semanales_cliente enable row level security;

drop policy if exists "revisiones_semanales_cliente_select_all" on public.revisiones_semanales_cliente;
create policy "revisiones_semanales_cliente_select_all" on public.revisiones_semanales_cliente for select using (auth.uid() is not null);
drop policy if exists "revisiones_semanales_cliente_insert_all" on public.revisiones_semanales_cliente;
create policy "revisiones_semanales_cliente_insert_all" on public.revisiones_semanales_cliente for insert with check (auth.uid() is not null);
drop policy if exists "revisiones_semanales_cliente_update_all" on public.revisiones_semanales_cliente;
create policy "revisiones_semanales_cliente_update_all" on public.revisiones_semanales_cliente for update using (auth.uid() is not null);
drop policy if exists "revisiones_semanales_cliente_delete_all" on public.revisiones_semanales_cliente;
create policy "revisiones_semanales_cliente_delete_all" on public.revisiones_semanales_cliente for delete using (auth.uid() is not null);

notify pgrst, 'reload schema';

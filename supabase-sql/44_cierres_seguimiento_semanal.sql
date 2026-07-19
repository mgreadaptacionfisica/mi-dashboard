-- "Check final" del seguimiento semanal (a petición de Raúl): permite
-- marcar, de forma manual y persistente, que ya se han revisado TODAS las
-- tareas del seguimiento semanal de todos los clientes de una persona (un
-- técnico cierra su propia semana; el admin cierra la semana global de
-- todo el equipo con persona = 'ADMIN'). No se borra si luego se desmarca
-- alguna tarea — el cierre queda como constancia de que en su momento se
-- revisó todo, y se puede reabrir a mano si hace falta corregir algo.
create table if not exists public.cierres_seguimiento_semanal (
  id uuid primary key default gen_random_uuid(),
  persona text not null,
  semana date not null,
  cerrado boolean not null default true,
  cerrado_en timestamptz not null default now(),
  cerrado_por text,
  unique (persona, semana)
);

create index if not exists cierres_seguimiento_semanal_persona_idx
  on public.cierres_seguimiento_semanal (persona, semana);

alter table public.cierres_seguimiento_semanal enable row level security;

drop policy if exists "cierres_seguimiento_semanal_select_all" on public.cierres_seguimiento_semanal;
create policy "cierres_seguimiento_semanal_select_all" on public.cierres_seguimiento_semanal for select using (auth.uid() is not null);
drop policy if exists "cierres_seguimiento_semanal_insert_all" on public.cierres_seguimiento_semanal;
create policy "cierres_seguimiento_semanal_insert_all" on public.cierres_seguimiento_semanal for insert with check (auth.uid() is not null);
drop policy if exists "cierres_seguimiento_semanal_update_all" on public.cierres_seguimiento_semanal;
create policy "cierres_seguimiento_semanal_update_all" on public.cierres_seguimiento_semanal for update using (auth.uid() is not null);
drop policy if exists "cierres_seguimiento_semanal_delete_all" on public.cierres_seguimiento_semanal;
create policy "cierres_seguimiento_semanal_delete_all" on public.cierres_seguimiento_semanal for delete using (auth.uid() is not null);

notify pgrst, 'reload schema';

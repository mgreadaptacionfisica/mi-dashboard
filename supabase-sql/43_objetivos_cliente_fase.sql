-- "Fases y objetivos" sale de Valoración y se convierte en su propia
-- sección (a petición de Raúl): en vez de un catálogo compartido o un
-- único texto libre por valoración, cada cliente tiene su propia lista de
-- objetivos, agrupados por fase (1-4), que el técnico/admin va escribiendo
-- y marcando como cumplidos con el tiempo. Se ven las 4 fases a la vez
-- (puede haber objetivos de Fase 2 ya en marcha aunque Fase 1 no esté
-- terminada del todo). La fase "oficial" del cliente se calcula sola:
-- avanza a la fase N solo cuando TODOS los objetivos de la fase N-1 están
-- marcados como cumplidos (ver faseAutomatica() en valoracionHelpers.js).
create table if not exists public.objetivos_cliente_fase (
  id text primary key,
  cliente_nombre text not null,
  fase smallint not null check (fase between 1 and 4),
  texto text not null,
  cumplido boolean not null default false,
  cumplido_en date,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

create index if not exists objetivos_cliente_fase_cliente_idx
  on public.objetivos_cliente_fase (cliente_nombre);

alter table public.objetivos_cliente_fase enable row level security;

drop policy if exists "objetivos_cliente_fase_select_all" on public.objetivos_cliente_fase;
create policy "objetivos_cliente_fase_select_all" on public.objetivos_cliente_fase for select using (auth.uid() is not null);
drop policy if exists "objetivos_cliente_fase_insert_all" on public.objetivos_cliente_fase;
create policy "objetivos_cliente_fase_insert_all" on public.objetivos_cliente_fase for insert with check (auth.uid() is not null);
drop policy if exists "objetivos_cliente_fase_update_all" on public.objetivos_cliente_fase;
create policy "objetivos_cliente_fase_update_all" on public.objetivos_cliente_fase for update using (auth.uid() is not null);
drop policy if exists "objetivos_cliente_fase_delete_all" on public.objetivos_cliente_fase;
create policy "objetivos_cliente_fase_delete_all" on public.objetivos_cliente_fase for delete using (auth.uid() is not null);

notify pgrst, 'reload schema';

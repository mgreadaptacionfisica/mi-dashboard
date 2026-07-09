-- Finanzas: ingresos personales, gastos personales y gastos profesionales
-- (estos últimos reciben automáticamente los pagos al equipo desde Equipo.jsx).
create table if not exists public.ingresos_personales (
  id text primary key,
  fecha date not null,
  concepto text default '',
  importe numeric not null default 0,
  notas text default ''
);
alter table public.ingresos_personales enable row level security;
create policy "ingresos_personales_select_all" on public.ingresos_personales for select using (true);
create policy "ingresos_personales_insert_all" on public.ingresos_personales for insert with check (true);
create policy "ingresos_personales_update_all" on public.ingresos_personales for update using (true);
create policy "ingresos_personales_delete_all" on public.ingresos_personales for delete using (true);

create table if not exists public.gastos_personales (
  id text primary key,
  fecha date not null,
  concepto text default '',
  importe numeric not null default 0,
  notas text default ''
);
alter table public.gastos_personales enable row level security;
create policy "gastos_personales_select_all" on public.gastos_personales for select using (true);
create policy "gastos_personales_insert_all" on public.gastos_personales for insert with check (true);
create policy "gastos_personales_update_all" on public.gastos_personales for update using (true);
create policy "gastos_personales_delete_all" on public.gastos_personales for delete using (true);

create table if not exists public.gastos_profesionales (
  id text primary key,
  fecha date not null,
  concepto text default '',
  importe numeric not null default 0,
  categoria text default '',
  notas text default '',
  origen text not null default 'manual' check (origen in ('manual', 'equipo')),
  persona_nombre text,   -- solo si origen = 'equipo'
  mes text               -- 'YYYY-MM', solo si origen = 'equipo'
);
alter table public.gastos_profesionales enable row level security;
create policy "gastos_profesionales_select_all" on public.gastos_profesionales for select using (true);
create policy "gastos_profesionales_insert_all" on public.gastos_profesionales for insert with check (true);
create policy "gastos_profesionales_update_all" on public.gastos_profesionales for update using (true);
create policy "gastos_profesionales_delete_all" on public.gastos_profesionales for delete using (true);
-- Las 3 tablas sin datos: no hay registros todavía en el panel.

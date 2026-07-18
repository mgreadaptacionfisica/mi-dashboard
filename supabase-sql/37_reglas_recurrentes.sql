-- Gastos/ingresos recurrentes (Finanzas): en vez de tener que apuntar el
-- mismo gasto cada mes a mano, Raúl define una regla una sola vez (importe,
-- cada cuántos meses se repite, fecha de inicio y, opcionalmente, fecha
-- fin) y el panel genera solo las filas de cada periodo en la tabla
-- correspondiente (ingresos_empresa / gastos_empresa / ingresos_personales
-- / gastos_personales), enlazadas mediante regla_recurrente_id. La
-- generación es 100% en el cliente (ver utils/recurrenciaHelpers.js), no
-- hay cron en el servidor — se ejecuta un "catch-up" cada vez que Raúl
-- abre el panel, así que si pasan varios meses sin entrar se rellenan
-- todos los periodos pendientes de una vez.

create table if not exists public.reglas_recurrentes (
  id text primary key,
  tabla text not null check (tabla in ('ingresos_empresa', 'gastos_empresa', 'ingresos_personales', 'gastos_personales')),
  concepto text not null,
  importe numeric not null default 0,
  categoria text default '',
  notas text default '',
  fecha_inicio date not null,
  frecuencia_meses smallint not null default 1,
  fecha_fin date,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table public.reglas_recurrentes enable row level security;

drop policy if exists "reglas_recurrentes_admin_only" on public.reglas_recurrentes;
create policy "reglas_recurrentes_admin_only" on public.reglas_recurrentes
  for all
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- Columna de enlace en las 4 tablas de Finanzas: qué regla generó esta fila
-- (null = fila manual, como hasta ahora).
alter table public.ingresos_empresa add column if not exists regla_recurrente_id text;
alter table public.gastos_empresa add column if not exists regla_recurrente_id text;
alter table public.ingresos_personales add column if not exists regla_recurrente_id text;
alter table public.gastos_personales add column if not exists regla_recurrente_id text;

notify pgrst, 'reload schema';

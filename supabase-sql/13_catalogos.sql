-- Catálogos de referencia: servicios y renovaciones (cambian poco, datos reales).
create table if not exists public.servicios (
  id text primary key,
  nombre text not null,
  precio numeric not null default 0,
  meses integer not null default 0
);
alter table public.servicios enable row level security;
create policy "servicios_select_all" on public.servicios for select using (true);
create policy "servicios_insert_all" on public.servicios for insert with check (true);
create policy "servicios_update_all" on public.servicios for update using (true);
create policy "servicios_delete_all" on public.servicios for delete using (true);

insert into public.servicios (id, nombre, precio, meses) values
('readaptate-cuatrimestral', 'PROGRAMA READAPTATE CUATRIMESTRAL', 697, 4),
('readaptate-semestral', 'PROGRAMA READAPTATE SEMESTRAL', 997, 6),
('readaptate-anual', 'PROGRAMA READAPTATE ANUAL', 1797, 12),
('readaptate-cuatrimestral-pp', 'PROGRAMA READAPTATE CUATRIMESTRAL (pronto pago)', 597, 4),
('readaptate-semestral-pp', 'PROGRAMA READAPTATE SEMESTRAL (pronto pago)', 847, 6),
('previene-cuatrimestral', 'PROGRAMA PREVIENE CUATRIMESTRAL (low ticket)', 299, 4),
('sesion-evaluacion', 'SESIÓN EVALUACIÓN', 70, 0),
('reserva-cuatrimestre', 'RESERVA CUATRIMESTRE', 70, 0),
('reserva-semestre', 'RESERVA SEMESTRE', 100, 0)
on conflict (id) do nothing;

create table if not exists public.renovaciones (
  id text primary key,
  nombre text not null,
  precio numeric not null default 0
);
alter table public.renovaciones enable row level security;
create policy "renovaciones_select_all" on public.renovaciones for select using (true);
create policy "renovaciones_insert_all" on public.renovaciones for insert with check (true);
create policy "renovaciones_update_all" on public.renovaciones for update using (true);
create policy "renovaciones_delete_all" on public.renovaciones for delete using (true);

insert into public.renovaciones (id, nombre, precio) values
('previene-premium-mensual', 'RENOVACIÓN PLAN PREVIENE PREMIUM (mes a mes)', 150),
('previene-premium-cuatrimestre', 'RENOVACIÓN PLAN PREVIENE PREMIUM (cuatrimestre)', 497),
('previene-premium-semestre', 'RENOVACIÓN PLAN PREVIENE PREMIUM (semestre)', 697),
('previene-premium-anual', 'RENOVACIÓN PLAN PREVIENE PREMIUM (anual)', 1197),
('previene-cuatrimestre', 'RENOVACIÓN PLAN PREVIENE (cuatrimestre)', 299),
('previene-anual', 'RENOVACIÓN PLAN PREVIENE (anual)', 699)
on conflict (id) do nothing;

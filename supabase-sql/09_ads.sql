-- KPI de Ads: inversión y resultados semanales, notas mensuales, y rendimiento por anuncio.
create table if not exists public.ads_kpi (
  id uuid primary key default gen_random_uuid(),
  mes text not null,        -- 'ENERO'..'DICIEMBRE'
  semana integer not null,  -- 1 a 5
  bienvenidas integer not null default 0,
  conversaciones integer not null default 0,
  agendas integer not null default 0,
  llamadas integer not null default 0,
  canceladas integer not null default 0,
  no_show integer not null default 0,
  ventas integer not null default 0,
  facturado numeric not null default 0,
  cash_cobrado numeric not null default 0,
  inversion numeric not null default 0,
  unique (mes, semana)
);

alter table public.ads_kpi enable row level security;
create policy "ads_kpi_select_all" on public.ads_kpi for select using (true);
create policy "ads_kpi_insert_all" on public.ads_kpi for insert with check (true);
create policy "ads_kpi_update_all" on public.ads_kpi for update using (true);
create policy "ads_kpi_delete_all" on public.ads_kpi for delete using (true);

create table if not exists public.ads_notas_mensuales (
  mes text primary key,
  notas text default ''
);

alter table public.ads_notas_mensuales enable row level security;
create policy "ads_notas_mensuales_select_all" on public.ads_notas_mensuales for select using (true);
create policy "ads_notas_mensuales_insert_all" on public.ads_notas_mensuales for insert with check (true);
create policy "ads_notas_mensuales_update_all" on public.ads_notas_mensuales for update using (true);
create policy "ads_notas_mensuales_delete_all" on public.ads_notas_mensuales for delete using (true);

create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  nombre text default '',
  video text default '',
  llamadas integer not null default 0,
  ventas integer not null default 0
);

alter table public.anuncios enable row level security;
create policy "anuncios_select_all" on public.anuncios for select using (true);
create policy "anuncios_insert_all" on public.anuncios for insert with check (true);
create policy "anuncios_update_all" on public.anuncios for update using (true);
create policy "anuncios_delete_all" on public.anuncios for delete using (true);
-- Las 3 tablas sin datos: las plantillas de Ads llegaron vacías.

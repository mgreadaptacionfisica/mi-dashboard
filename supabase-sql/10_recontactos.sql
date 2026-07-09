-- Recontactos manuales (los que vienen del pipeline de Ventas en etapa
-- "Seguimiento" no están aquí: viven dentro de la propia fila de ventas).
create table if not exists public.recontactos (
  id text primary key,
  nombre text default '',
  canal text default 'WhatsApp',  -- 'WhatsApp' | 'Instagram'
  contacto text default '',
  motivo text default '',
  fecha_contacto date,
  contactado boolean not null default false,
  respondido boolean,  -- null = pendiente
  comprado boolean     -- null = pendiente
);

alter table public.recontactos enable row level security;
create policy "recontactos_select_all" on public.recontactos for select using (true);
create policy "recontactos_insert_all" on public.recontactos for insert with check (true);
create policy "recontactos_update_all" on public.recontactos for update using (true);
create policy "recontactos_delete_all" on public.recontactos for delete using (true);
-- Sin datos: vacío en el panel ahora mismo.

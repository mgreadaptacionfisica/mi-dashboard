-- Clientes. Los 64 registros reales (con las altas/bajas y el estado
-- Activo/No activo que Raúl actualizó en el panel el 10/07/2026) se migran
-- en 04b_clientes_data.sql, recuperados directamente del estado en memoria
-- del navegador (export vía consola), ya que esta tabla nunca llegó a tener
-- persistencia real hasta ahora.
--
-- Cambios respecto al primer borrador de este schema:
--  - id pasa de uuid a texto: los clientes nunca tuvieron id (ni en el CSV
--    original ni en el estado del panel), así que se genera uno estable
--    (`cliente-<nombre-slug>`) al migrar, igual que se hizo con anuncios/
--    miembros_equipo/recontactos.
--  - fecha_inicio/fecha_fin/fecha_renovacion/fecha_primer_pago/
--    fecha_segundo_pago/fecha_tercer_pago pasan de "date" a "text": en toda
--    la app estos campos son texto libre en español ("13 de julio de 2026"),
--    no fechas reales de Postgres, y así los trata también CalendarioAvisos
--    (los interpreta con parseFechaFlexible). Guardarlos como date obligaría
--    a convertir 64 registros de facturación real a mano, con riesgo de
--    error; como texto se guardan tal cual están en el panel.
--  - Se añaden importe_total (numeric) y plazos (jsonb): campos nuevos de la
--    función de "pago en plazos" añadida en esta misma sesión.
create table if not exists public.clientes (
  id text primary key,
  nombre text not null,
  drive text default '',
  email text default '',
  estado text default '',              -- 'ACTIVO' | 'NO ACTIVO'
  fecha_inicio text default '',
  fecha_fin text default '',
  fecha_primer_pago text default '',
  fecha_segundo_pago text default '',
  fecha_tercer_pago text default '',
  forma_pago text default '',
  pago text default '',                -- 'COMPLETO' | '2 PLAZOS' | '3 PLAZOS'
  primer_pago numeric,
  segundo_pago numeric,
  tercer_pago numeric,
  renueva text default 'No',
  forma_renovacion text default '',
  importe_renovacion numeric,
  fecha_renovacion text default '',
  servicio_contratado text default '',
  telefono text default '',
  tipo_cliente text default '',        -- 'HIGH TICKET' | 'LOW TICKET' (dato antiguo, ya no se pide en el formulario)
  trabajadores text[] not null default '{}',
  importe_total numeric,
  plazos jsonb not null default '[]',  -- [{ numero, importe, fecha, pagado, fechaPago }]
  created_at timestamptz not null default now()
);

alter table public.clientes enable row level security;

create policy "clientes_select_all" on public.clientes for select using (true);
create policy "clientes_insert_all" on public.clientes for insert with check (true);
create policy "clientes_update_all" on public.clientes for update using (true);
create policy "clientes_delete_all" on public.clientes for delete using (true);

-- Los INSERTs con los 64 clientes reales están en 04b_clientes_data.sql
-- (se mantienen separados del schema para poder re-ejecutar solo el schema
-- sin duplicar datos si hiciera falta).

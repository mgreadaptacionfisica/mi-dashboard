-- Clientes. Los datos reales vienen de src/data/clientes.js (CSV parseado),
-- que además NO tiene guardado el campo "Trabajadores" (eso solo vive hoy en
-- memoria del navegador cuando se asigna desde la UI). Al migrar los datos
-- reales mañana, habrá que exportar también las asignaciones si Raúl las
-- tiene hechas en su sesión actual, o reasignarlas de nuevo desde el panel
-- una vez migrado.
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  drive text default '',
  email text default '',
  estado text default '',              -- 'ACTIVO' | 'NO ACTIVO'
  fecha_inicio date,
  fecha_fin date,
  fecha_primer_pago date,
  fecha_segundo_pago date,
  fecha_tercer_pago date,
  forma_pago text default '',
  pago text default '',                -- 'COMPLETO' | '2 PLAZOS' | '3 PLAZOS'
  primer_pago numeric,
  segundo_pago numeric,
  tercer_pago numeric,
  renueva text default 'No',
  forma_renovacion text default '',
  importe_renovacion numeric,
  fecha_renovacion date,
  servicio_contratado text default '',
  telefono text default '',
  tipo_cliente text default '',        -- 'HIGH TICKET' | 'LOW TICKET'
  trabajadores text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.clientes enable row level security;

create policy "clientes_select_all" on public.clientes for select using (true);
create policy "clientes_insert_all" on public.clientes for insert with check (true);
create policy "clientes_update_all" on public.clientes for update using (true);
create policy "clientes_delete_all" on public.clientes for delete using (true);

-- Sin INSERTs aquí: los datos reales de clientes (nombres, fechas, pagos)
-- se migran mañana con un script (ver export_data.mjs) para no transcribirlos
-- a mano y arriesgar errores en datos de facturación reales.

-- Pipeline comercial (leads). Actualmente vacío en el panel (src/data/ventas.js = []).
-- Esquema ajustado a la forma real del lead en Ventas.jsx (no solo al borrador inicial).
create table if not exists public.ventas (
  id text primary key,
  nombre text not null,
  email text default '',
  telefono text default '',
  closer text default '',
  etapa text not null default 'agendada', -- agendada | realizada | seguimiento | ganada | perdida
  fecha_agenda date,
  hora_agenda text default '',
  creado_en date,
  pre_llamada jsonb not null default '{"whatsapp": false, "prellamada": false, "recordatorio": false}',
  resultado_llamada text,               -- 'realizada' | 'no_show' | 'cancelada' | 'modificada'
  compra_en_llamada boolean,
  objeciones jsonb not null default '[]',           -- [{ fecha, texto }]
  seguimiento jsonb not null default '{"realizado": false, "contesta": null, "compraTrasSeguimiento": null}',
  notas_seguimiento jsonb not null default '[]',    -- [{ fecha, nota }]
  grabacion_url text default '',
  motivo_perdida text,
  venta jsonb,                          -- { servicio, importe, tipoPago, numPlazos, formaPago, fechaCierre } cuando etapa = 'ganada'
  recontacto jsonb                      -- { canal, contacto, motivo, fechaContacto, contactado, respondido, comprado } si etapa = 'seguimiento'
);

alter table public.ventas enable row level security;

create policy "ventas_select_all" on public.ventas for select using (true);
create policy "ventas_insert_all" on public.ventas for insert with check (true);
create policy "ventas_update_all" on public.ventas for update using (true);
create policy "ventas_delete_all" on public.ventas for delete using (true);
-- Sin datos: el pipeline está vacío ahora mismo en el panel.

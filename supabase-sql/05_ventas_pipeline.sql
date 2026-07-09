-- Pipeline comercial (leads). Actualmente vacío en el panel (src/data/ventas.js = []).
create table if not exists public.ventas (
  id text primary key,
  nombre text not null,
  email text default '',
  telefono text default '',
  etapa text not null default 'agendada', -- agendada | realizada | seguimiento | ganada | perdida
  closer text default '',
  fecha_agenda date,
  hora_agenda text default '',
  creado_en timestamptz not null default now(),
  pre_llamada jsonb not null default '{"whatsapp": false, "prellamada": false, "recordatorio": false}',
  resultado_llamada text,               -- 'realizada' | 'no_show' | 'cancelada' | 'modificada'
  notas text default '',
  venta jsonb,                          -- { servicioId, importe, fechaCierre } cuando etapa = 'ganada'
  recontacto jsonb                      -- datos de recontacto si etapa = 'seguimiento'
);

alter table public.ventas enable row level security;

create policy "ventas_select_all" on public.ventas for select using (true);
create policy "ventas_insert_all" on public.ventas for insert with check (true);
create policy "ventas_update_all" on public.ventas for update using (true);
create policy "ventas_delete_all" on public.ventas for delete using (true);
-- Sin datos: el pipeline está vacío ahora mismo en el panel.

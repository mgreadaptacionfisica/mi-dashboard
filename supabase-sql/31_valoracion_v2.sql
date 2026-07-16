-- Rediseño de Valoración pedido por Raúl: notas separadas (dolor / evaluación
-- inicial), objetivos elegidos de un catálogo (además del texto libre que ya
-- existía), y el catálogo de objetivos por fase en sí (editable desde el
-- panel, igual que SOPs).
alter table public.valoraciones_clientes
  add column if not exists notas_dolor text default '',
  add column if not exists notas_evaluacion_inicial text default '',
  add column if not exists objetivos_seleccionados jsonb default '[]'::jsonb;

-- Catálogo de objetivos por fase (1-4). Cada fila es un objetivo
-- seleccionable al confirmar la fase de una valoración; el técnico puede
-- marcar varios y además escribir texto libre. Mismo patrón de permisos que
-- sops (cualquier persona logueada puede leer/escribir; el botón de editar
-- solo se muestra en el panel a quien tenga rol admin).
create table if not exists public.objetivos_fase (
  id text primary key,
  fase smallint not null check (fase between 1 and 4),
  texto text not null,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

alter table public.objetivos_fase enable row level security;

drop policy if exists "objetivos_fase_select_all" on public.objetivos_fase;
create policy "objetivos_fase_select_all" on public.objetivos_fase for select using (auth.uid() is not null);
drop policy if exists "objetivos_fase_insert_all" on public.objetivos_fase;
create policy "objetivos_fase_insert_all" on public.objetivos_fase for insert with check (auth.uid() is not null);
drop policy if exists "objetivos_fase_update_all" on public.objetivos_fase;
create policy "objetivos_fase_update_all" on public.objetivos_fase for update using (auth.uid() is not null);
drop policy if exists "objetivos_fase_delete_all" on public.objetivos_fase;
create policy "objetivos_fase_delete_all" on public.objetivos_fase for delete using (auth.uid() is not null);

-- Semilla inicial: los objetivos de ejemplo que ya estaban en el SOP
-- "3. Establecer fase y objetivos", para que el catálogo no arranque vacío.
insert into public.objetivos_fase (id, fase, texto, orden) values
('obj-fase1-1', 1, 'Reducir irritabilidad y ganar la movilidad concreta que le falte — solo los ejercicios necesarios, sin saturar.', 1),
('obj-fase2-1', 2, 'Reducir irritabilidad y ganar fuerza.', 1),
('obj-fase2-2', 2, 'Marcar objetivo de carga para pasar a la siguiente fase.', 2),
('obj-fase3-1', 3, 'Objetivo según el deporte, muy concreto (ej: conseguir hacer snatch sin dolor).', 1),
('obj-fase4-1', 4, 'Objetivo de rendimiento, muy concreto (ej: conseguir un snatch con 100kg).', 1)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

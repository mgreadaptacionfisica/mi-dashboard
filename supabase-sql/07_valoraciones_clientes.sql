-- Valoración funcional de clientes (historial abierto).
-- Cada bloque se guarda como jsonb (mapa itemId -> número) porque son
-- muchos campos opcionales y varían según lo que se mida cada sesión.
create table if not exists public.valoraciones_clientes (
  id text primary key,
  cliente_nombre text not null,
  fecha date not null,
  fuerza jsonb not null default '{}',
  dinamometria jsonb not null default '{}',
  pliometria jsonb not null default '{}',
  fuerza_cervical jsonb not null default '{}',
  movilidad_hombro jsonb not null default '{}',
  movilidad_cervical jsonb not null default '{}',
  movilidad_escapular jsonb not null default '{}',
  movilidad_general jsonb not null default '{}',
  spadi jsonb not null default '{}',
  tampa jsonb not null default '{}',
  notas text default ''
);

alter table public.valoraciones_clientes enable row level security;
create policy "valoraciones_clientes_select_all" on public.valoraciones_clientes for select using (true);
create policy "valoraciones_clientes_insert_all" on public.valoraciones_clientes for insert with check (true);
create policy "valoraciones_clientes_update_all" on public.valoraciones_clientes for update using (true);
create policy "valoraciones_clientes_delete_all" on public.valoraciones_clientes for delete using (true);
-- Sin datos: todavía no se ha registrado ninguna valoración real.

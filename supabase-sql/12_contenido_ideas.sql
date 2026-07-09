-- Calendario de contenido (ideas de redes sociales).
create table if not exists public.contenido_ideas (
  id text primary key,
  fecha date,                      -- null = sin programar todavía (Listado de ideas)
  titulo text default '',
  descripcion text default '',
  redes text[] not null default '{}',      -- subconjunto de Instagram/TikTok/Facebook/YouTube
  formato text default '',                  -- Reel/Carrusel/Foto/Vídeo corto/Vídeo largo
  editores text[] not null default '{}',    -- nombres de miembros_equipo (área contenido)
  portada_lista boolean not null default false,
  estado text not null default 'Idea'       -- Idea | Grabado | En edición | Programado | Publicado
);

alter table public.contenido_ideas enable row level security;
create policy "contenido_ideas_select_all" on public.contenido_ideas for select using (true);
create policy "contenido_ideas_insert_all" on public.contenido_ideas for insert with check (true);
create policy "contenido_ideas_update_all" on public.contenido_ideas for update using (true);
create policy "contenido_ideas_delete_all" on public.contenido_ideas for delete using (true);
-- Sin datos: no hay ideas registradas todavía.

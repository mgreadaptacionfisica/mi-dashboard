-- Añade una lista de "cambios/tareas pendientes" con checkbox al
-- comentario semanal de Seguimiento (antes solo era texto libre). Cada
-- ítem: { texto, hecho, hechoEn }. Se guarda por cliente y semana, igual
-- que el resto de "seguimientos" — el comentario de texto libre
-- (columna "comentarios") se mantiene tal cual, esto es un campo nuevo
-- que convive con él.
alter table public.seguimientos
  add column if not exists cambios_pendientes jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';

-- Enlaza el módulo de Valoración con el SOP "3. Establecer fase y
-- objetivos": cada valoración puede llevar ahora la fase (1-4) que el
-- técnico confirma (el panel la sugiere a partir del SPADI y, si es 0, de
-- si hay dolor en gestos del deporte), y el objetivo concreto de esa fase.
-- Al ser el historial de valoraciones abierto (una fila por evaluación),
-- esto da automáticamente un histórico de fases/objetivos con fecha, sin
-- tabla nueva.
alter table public.valoraciones_clientes
  add column if not exists dolor_en_deporte boolean,
  add column if not exists fase smallint,
  add column if not exists objetivo text default '';

notify pgrst, 'reload schema';

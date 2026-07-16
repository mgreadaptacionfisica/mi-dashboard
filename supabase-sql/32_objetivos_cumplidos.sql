-- Permite marcar, al hacer una nueva valoración, qué objetivos de la
-- valoración ANTERIOR se cumplieron de verdad. Sin esto no había forma de
-- comprobar si tocaba subir de fase o si se subió sin haber cumplido los
-- objetivos marcados (que es justo lo que falló con el cliente que se perdió).
alter table public.valoraciones_clientes
  add column if not exists objetivos_cumplidos jsonb default '[]'::jsonb;

notify pgrst, 'reload schema';

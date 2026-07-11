-- La tabla ventas en producción se creó con un esquema más antiguo que el
-- que hay ahora en 05_ventas_pipeline.sql (create table if not exists no
-- añade columnas nuevas a una tabla que ya existía). Resultado: la app
-- intenta guardar un lead nuevo con la columna compra_en_llamada, Postgrest
-- responde "Could not find the 'compra_en_llamada' column of 'ventas' in
-- the schema cache", el insert falla por completo y el lead solo vive en
-- memoria del navegador — de ahí que "desaparezca" al refrescar.
--
-- Este archivo añade (con IF NOT EXISTS, no destructivo) cualquier columna
-- del esquema actual que pudiera faltar en la tabla real, y fuerza a
-- Supabase a refrescar la caché de esquema que usa la API para que el
-- cambio se note al instante sin esperar minutos.
alter table public.ventas
  add column if not exists email text default '',
  add column if not exists telefono text default '',
  add column if not exists closer text default '',
  add column if not exists etapa text not null default 'agendada',
  add column if not exists fecha_agenda date,
  add column if not exists hora_agenda text default '',
  add column if not exists creado_en date,
  add column if not exists pre_llamada jsonb not null default '{"whatsapp": false, "prellamada": false, "recordatorio": false}',
  add column if not exists resultado_llamada text,
  add column if not exists compra_en_llamada boolean,
  add column if not exists objeciones jsonb not null default '[]',
  add column if not exists seguimiento jsonb not null default '{"realizado": false, "contesta": null, "compraTrasSeguimiento": null}',
  add column if not exists notas_seguimiento jsonb not null default '[]',
  add column if not exists grabacion_url text default '',
  add column if not exists motivo_perdida text,
  add column if not exists venta jsonb,
  add column if not exists recontacto jsonb;

notify pgrst, 'reload schema';

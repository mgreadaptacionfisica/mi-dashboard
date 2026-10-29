-- Lo que el cliente escribe en Harbiz al completar un entreno → panel.
--
-- Al terminar una sesión en Harbiz el cliente puede poner un comentario
-- general, el RPE (esfuerzo 1-10), y un comentario en cada ejercicio ("con 5 kg
-- imposible, he bajado", "molestia al subir el brazo"…). Hasta ahora la rutina
-- solo traía el nombre del entreno y el entrenador tenía que abrir Harbiz para
-- leer esto. Ahora la rutina lo trae en `detalle` y el panel lo enseña debajo
-- de la sesión en ⚡ Registro de sesiones, en el modal, en el resumen semanal
-- y en el historial.
--
-- Forma de `detalle` (solo lo que tenga contenido; si no hay nada, null):
--   { "comentario": "Seguimos!!", "rpe": "7", "minutos": 69,
--     "ejercicios": [{ "nombre": "Peso muerto rumano", "comentario": "..." }] }
-- Los pesos y repeticiones NO se traen (de momento): muchos clientes los dejan
-- a 0 y llenarían la rejilla de ruido.
--
-- Los formularios (programForm) nunca llevan detalle: sus respuestas no se leen.
-- Se puede ejecutar más de una vez sin problema.

alter table public.sesiones_harbiz add column if not exists detalle jsonb;

-- La función del robot, ahora aceptando `detalle`. Como la rutina relee ayer y
-- hoy en cada pasada, si el cliente añade un comentario más tarde, la siguiente
-- pasada lo actualiza (gana lo último que llega de Harbiz).
create or replace function public.registrar_sesiones_harbiz(p_clave text, p_sesiones jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
begin
  if not exists (select 1 from public.robot_claves where nombre = 'harbiz' and clave = p_clave) then
    raise exception 'clave no válida';
  end if;

  insert into public.sesiones_harbiz
    (id, harbiz_cliente_id, harbiz_nombre, harbiz_email, fecha, n, tipo, titulo, hecha_en, detalle)
  select
    case when nullif(trim(s.evento_id), '') is not null
      then 'ev-' || trim(s.evento_id)
      else s.harbiz_cliente_id || '-' || s.fecha::text || '-' || coalesce(s.n, 1)::text
    end,
    s.harbiz_cliente_id, s.harbiz_nombre, nullif(lower(trim(s.harbiz_email)), ''),
    s.fecha, coalesce(s.n, 1), s.tipo, nullif(trim(s.titulo), ''), s.hecha_en,
    case when jsonb_typeof(s.detalle) = 'object' then s.detalle end
  from jsonb_to_recordset(p_sesiones) as s(
    evento_id text, harbiz_cliente_id text, harbiz_nombre text, harbiz_email text,
    fecha date, n int, tipo text, titulo text, hecha_en timestamptz, detalle jsonb
  )
  where s.harbiz_cliente_id is not null and s.fecha is not null
  on conflict (id) do update set
    titulo = coalesce(excluded.titulo, public.sesiones_harbiz.titulo),
    hecha_en = coalesce(excluded.hecha_en, public.sesiones_harbiz.hecha_en),
    harbiz_email = coalesce(excluded.harbiz_email, public.sesiones_harbiz.harbiz_email),
    harbiz_nombre = coalesce(excluded.harbiz_nombre, public.sesiones_harbiz.harbiz_nombre),
    detalle = coalesce(excluded.detalle, public.sesiones_harbiz.detalle);

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.registrar_sesiones_harbiz(text, jsonb) from public;
grant execute on function public.registrar_sesiones_harbiz(text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

-- Sesiones de Harbiz: una fila por ENTRENO real (evento del calendario de
-- Harbiz), no por "cliente + día + nº".
--
-- La primera versión (64) sacaba los entrenos del feed de actividad reciente
-- de Harbiz, que por cliente y día solo da el título del ÚLTIMO entreno y un
-- contador. Al probarlo se vio que ese contador no es fiable: a una clienta
-- le contaba 3 entrenos el domingo cuando solo hizo 1 (los otros dos eran del
-- jueves, planificados para el sábado). Así salían en la rejilla "Entreno"
-- sin nombre que no existían.
--
-- Ahora la rutina lee el calendario de cada cliente con actividad: cada
-- entreno completado trae su id, su nombre y el día y la hora REALES en que
-- lo hizo. El id de la fila pasa a ser 'ev-' + id del evento de Harbiz, que
-- además es estable (sirve tal cual para no duplicar).
--
-- Esta migración:
--   1) borra lo importado con el sistema viejo (filas sin 'ev-'),
--   2) quita de la rejilla las sesiones que vinieron de ahí (las que llevan
--      harbizId de una fila vieja), y
--   3) cambia la función del robot para aceptar el id del evento.
-- Se puede ejecutar más de una vez sin problema.

-- 1) y 2): limpieza de lo importado el 26-oct con el sistema viejo.
update public.seguimientos s
set dias = (
  select jsonb_object_agg(
    e.dia,
    e.valor || jsonb_build_object('tareas', coalesce((
      select jsonb_agg(t)
      from jsonb_array_elements(coalesce(e.valor -> 'tareas', '[]'::jsonb)) as t
      where not (t ? 'harbizId' and left(t ->> 'harbizId', 3) <> 'ev-')
    ), '[]'::jsonb))
  )
  from jsonb_each(s.dias) as e(dia, valor)
)
where s.dias::text like '%harbizId%';

delete from public.sesiones_harbiz where left(id, 3) <> 'ev-';

-- 3) La función del robot, ahora con `evento_id`. Si llega, el id es
--    'ev-' + evento_id; si no (por si acaso), el formato viejo.
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
    (id, harbiz_cliente_id, harbiz_nombre, harbiz_email, fecha, n, tipo, titulo, hecha_en)
  select
    case when nullif(trim(s.evento_id), '') is not null
      then 'ev-' || trim(s.evento_id)
      else s.harbiz_cliente_id || '-' || s.fecha::text || '-' || coalesce(s.n, 1)::text
    end,
    s.harbiz_cliente_id, s.harbiz_nombre, nullif(lower(trim(s.harbiz_email)), ''),
    s.fecha, coalesce(s.n, 1), s.tipo, nullif(trim(s.titulo), ''), s.hecha_en
  from jsonb_to_recordset(p_sesiones) as s(
    evento_id text, harbiz_cliente_id text, harbiz_nombre text, harbiz_email text,
    fecha date, n int, tipo text, titulo text, hecha_en timestamptz
  )
  where s.harbiz_cliente_id is not null and s.fecha is not null
  on conflict (id) do update set
    titulo = coalesce(excluded.titulo, public.sesiones_harbiz.titulo),
    hecha_en = coalesce(excluded.hecha_en, public.sesiones_harbiz.hecha_en),
    harbiz_email = coalesce(excluded.harbiz_email, public.sesiones_harbiz.harbiz_email),
    harbiz_nombre = coalesce(excluded.harbiz_nombre, public.sesiones_harbiz.harbiz_nombre);

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.registrar_sesiones_harbiz(text, jsonb) from public;
grant execute on function public.registrar_sesiones_harbiz(text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

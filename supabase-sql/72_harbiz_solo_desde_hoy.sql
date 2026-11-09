-- 📲 El robot "Panel → Harbiz" ya no toca nada que haya pasado.
--
-- Por qué: el ✅ guarda la semana abierta en ⚡ Registro y la propuesta se
-- escribe en la semana SIGUIENTE a esa. Al revisar una semana atrasada, la
-- semana de destino ya había terminado y las notas acababan en sesiones
-- viejas que se quedaron sin hacer, donde el cliente no las va a ver.
--
-- Qué cambia en propuestas_para_harbiz:
--   1. Si la semana de destino ya terminó, la propuesta NO se manda al robot
--      y queda como 'sin_sesion' explicando el motivo. No se mueve sola a
--      esta semana a propósito: los pesos saldrían de datos viejos.
--   2. Si la semana de destino está en curso, `desde` es hoy, para no
--      escribir en días ya pasados de esa misma semana.
--
-- Se hace aquí y no en el panel para que valga también con lo ya aceptado.
-- Se puede ejecutar más de una vez sin problema.

drop function if exists public.propuestas_para_harbiz(text);
create function public.propuestas_para_harbiz(p_clave text)
returns table (
  id text,
  cliente_nombre text,
  harbiz_cliente_id text,
  ejercicio text,
  nota_harbiz text,
  desde date,
  hasta date
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
-- (Lo de arriba va lo primero a propósito: las columnas de salida se llaman
-- como las de la tabla, id, ejercicio…, y sin eso plpgsql no sabe si "id"
-- es la columna o la variable de salida.)
begin
  if not exists (select 1 from public.robot_claves where nombre = 'harbiz' and clave = p_clave) then
    raise exception 'clave no válida';
  end if;

  -- Se cierran aquí para que no se queden "pendiente" para siempre en el
  -- panel. Se calcula desde el jueves porque la clave de semana a veces cae
  -- en domingo (ver semanaMenos() en progresion.js).
  update public.propuestas_progresion p set
    harbiz_estado = 'sin_sesion',
    harbiz_detalle = 'la semana de destino ya había pasado: no se escribe nada',
    harbiz_en = now()
  where p.estado = 'aplicada'
    and p.harbiz_estado = 'pendiente'
    and (date_trunc('week', (p.semana + 3)::timestamp) + interval '13 days')::date < current_date;

  return query
  select
    p.id, p.cliente_nombre, p.harbiz_cliente_id, p.ejercicio, p.nota_harbiz,
    greatest((date_trunc('week', (p.semana + 3)::timestamp) + interval '7 days')::date, current_date),
    (date_trunc('week', (p.semana + 3)::timestamp) + interval '13 days')::date
  from public.propuestas_progresion p
  where p.estado = 'aplicada'
    and p.harbiz_estado = 'pendiente'
    and nullif(trim(p.harbiz_cliente_id), '') is not null
    and nullif(trim(p.nota_harbiz), '') is not null
  order by p.harbiz_cliente_id, p.id;
end;
$$;

revoke all on function public.propuestas_para_harbiz(text) from public;
grant execute on function public.propuestas_para_harbiz(text) to anon, authenticated;

notify pgrst, 'reload schema';

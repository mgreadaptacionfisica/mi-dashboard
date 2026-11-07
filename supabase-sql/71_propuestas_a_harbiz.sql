-- 📲 Las 🤖 propuestas aceptadas se escriben solas en Harbiz.
--
-- Hasta ahora, cuando el fisio daba ✅ a una propuesta, tenía que ir él a
-- Harbiz y cambiar la nota del ejercicio a mano. Ahora el panel deja la
-- propuesta aceptada "pendiente de Harbiz" con el texto para el cliente
-- (`nota_harbiz`), y una rutina en la nube ("Panel → Harbiz", 7:30 y 20:30)
-- la escribe en la NOTA de ese ejercicio en las sesiones sin hacer de la
-- semana siguiente, y apunta aquí cómo ha ido.
--
-- Por qué en la nota del ejercicio: es donde el equipo ya pone la
-- instrucción de la semana ("mantener peso (9kg), mas repeticiones") y donde
-- el cliente la ve justo al hacer el ejercicio. La nota nueva SUSTITUYE a la
-- que hubiera (suelen ser copias viejas de la plantilla); la anterior queda
-- en `harbiz_detalle` por si hay que recuperarla.
--
-- Qué propuestas van: lo decide el panel (TIPOS_A_HARBIZ y
-- HARBIZ_PRUEBA_TRABAJADORES en src/utils/progresion.js). Si no van, estas
-- columnas se quedan a null y todo sigue como antes.
--
-- harbiz_estado:
--   pendiente  → aceptada, la rutina aún no ha pasado
--   escrita    → escrita en Harbiz (harbiz_detalle dice en qué sesiones)
--   sin_sesion → no hay sesión sin hacer de la semana siguiente con ese
--                ejercicio: hay que pasarlo a mano
--   error      → no se pudo (p. ej. el ejercicio va dentro de una
--                superserie): hay que pasarlo a mano
--
-- El robot no es un usuario del panel: lee y marca con dos funciones que
-- piden la clave de robot_claves ('harbiz', la misma de la sincronización
-- de sesiones), igual que registrar_sesiones_harbiz.
--
-- Se puede ejecutar más de una vez sin problema.

alter table public.propuestas_progresion add column if not exists harbiz_cliente_id text;
alter table public.propuestas_progresion add column if not exists nota_harbiz text;
alter table public.propuestas_progresion add column if not exists harbiz_estado text;
alter table public.propuestas_progresion add column if not exists harbiz_detalle text;
alter table public.propuestas_progresion add column if not exists harbiz_en timestamptz;

alter table public.propuestas_progresion drop constraint if exists propuestas_progresion_harbiz_estado_check;
alter table public.propuestas_progresion add constraint propuestas_progresion_harbiz_estado_check
  check (harbiz_estado is null or harbiz_estado in ('pendiente', 'escrita', 'sin_sesion', 'error'));

create index if not exists propuestas_progresion_harbiz_pendiente_idx
  on public.propuestas_progresion (harbiz_estado) where harbiz_estado = 'pendiente';

-- Lo que tiene que escribir el robot. `desde`/`hasta` es la semana
-- SIGUIENTE a la de la propuesta (lunes a domingo). Se calcula desde el
-- jueves porque la clave de semana del panel a veces cae en domingo (ver
-- semanaMenos() en progresion.js): el jueves siempre está dentro.
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

  return query
  select
    p.id, p.cliente_nombre, p.harbiz_cliente_id, p.ejercicio, p.nota_harbiz,
    (date_trunc('week', (p.semana + 3)::timestamp) + interval '7 days')::date,
    (date_trunc('week', (p.semana + 3)::timestamp) + interval '13 days')::date
  from public.propuestas_progresion p
  where p.estado = 'aplicada'
    and p.harbiz_estado = 'pendiente'
    and nullif(trim(p.harbiz_cliente_id), '') is not null
    and nullif(trim(p.nota_harbiz), '') is not null
  order by p.harbiz_cliente_id, p.id;
end;
$$;

-- El robot apunta cómo ha ido: [{ "id": ..., "estado": "escrita" |
-- "sin_sesion" | "error", "detalle": "..." }]. Solo toca filas que siguen
-- aceptadas y pendientes: si mientras tanto el fisio la ha deshecho o
-- descartado, no se pisa.
drop function if exists public.marcar_propuestas_harbiz(text, jsonb);
create function public.marcar_propuestas_harbiz(p_clave text, p_resultados jsonb)
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

  update public.propuestas_progresion p set
    harbiz_estado = r.estado,
    harbiz_detalle = nullif(trim(r.detalle), ''),
    harbiz_en = now()
  from jsonb_to_recordset(p_resultados) as r(id text, estado text, detalle text)
  where p.id = r.id
    and r.estado in ('escrita', 'sin_sesion', 'error')
    and p.estado = 'aplicada'
    and p.harbiz_estado = 'pendiente';

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.propuestas_para_harbiz(text) from public;
grant execute on function public.propuestas_para_harbiz(text) to anon, authenticated;
revoke all on function public.marcar_propuestas_harbiz(text, jsonb) from public;
grant execute on function public.marcar_propuestas_harbiz(text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

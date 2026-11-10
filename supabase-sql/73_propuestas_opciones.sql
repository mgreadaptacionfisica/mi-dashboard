-- 🧭 Las 🤖 propuestas traen OPCIONES y el robot "Panel → Harbiz" ya no
-- escribe solo la nota: también el objetivo y las series.
--
-- Por qué: hasta ahora cada ejercicio traía una sola propuesta ("Sube a
-- 16–17 kg (8-12 repeticiones)") y el rango iba metido en la nota, aunque
-- Harbiz tiene su casilla de objetivo. Raúl quiere (2026-11-10) que el fisio
-- elija entre varias formas de progresar según el ejercicio: subir peso,
-- subir el rango (8-12 → 12-15), bajar el RIR (8-12 (3) → 8-12 (2)), añadir
-- una serie, una indicación propia ("más lento"), cambiar el ejercicio o
-- hablarlo con la persona. Lo que cambia cada opción lo calcula el panel
-- (OPCIONES en src/utils/progresion.js).
--
-- Columnas nuevas en propuestas_progresion:
--   opcion           → la opción elegida (peso, rango, rir, serie, libre,
--                      cambio, hablar, reps, carga). Para ver con el tiempo
--                      cuál elige el equipo y ordenarlas con datos.
--   objetivo_harbiz  → objetivo nuevo del ejercicio en Harbiz (null = no se toca)
--   series_harbiz    → series nuevas (null = no se tocan)
-- `nota_harbiz` ya existía; ahora puede ir vacía si solo cambia el objetivo.
-- Se guardan aunque no vayan al robot (clientes fuera de la prueba), para
-- que el panel diga qué hay que pasar a mano.
--
-- propuestas_para_harbiz devuelve también objetivo_harbiz y series_harbiz y
-- manda al robot lo que tenga ALGO que escribir. Mantiene lo de la 72: no se
-- escribe en semanas ya pasadas ni en días ya pasados.
--
-- Se puede ejecutar más de una vez sin problema.

alter table public.propuestas_progresion add column if not exists opcion text;
alter table public.propuestas_progresion add column if not exists objetivo_harbiz text;
alter table public.propuestas_progresion add column if not exists series_harbiz text;

drop function if exists public.propuestas_para_harbiz(text);
create function public.propuestas_para_harbiz(p_clave text)
returns table (
  id text,
  cliente_nombre text,
  harbiz_cliente_id text,
  ejercicio text,
  nota_harbiz text,
  objetivo_harbiz text,
  series_harbiz text,
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

  -- Igual que en la 72: si la semana de destino ya terminó, se cierra aquí.
  -- Se calcula desde el jueves porque la clave de semana a veces cae en
  -- domingo (ver semanaMenos() en progresion.js).
  update public.propuestas_progresion p set
    harbiz_estado = 'sin_sesion',
    harbiz_detalle = 'la semana de destino ya había pasado: no se escribe nada',
    harbiz_en = now()
  where p.estado = 'aplicada'
    and p.harbiz_estado = 'pendiente'
    and (date_trunc('week', (p.semana + 3)::timestamp) + interval '13 days')::date < current_date;

  return query
  select
    p.id, p.cliente_nombre, p.harbiz_cliente_id, p.ejercicio,
    nullif(trim(p.nota_harbiz), ''),
    nullif(trim(p.objetivo_harbiz), ''),
    nullif(trim(p.series_harbiz), ''),
    greatest((date_trunc('week', (p.semana + 3)::timestamp) + interval '7 days')::date, current_date),
    (date_trunc('week', (p.semana + 3)::timestamp) + interval '13 days')::date
  from public.propuestas_progresion p
  where p.estado = 'aplicada'
    and p.harbiz_estado = 'pendiente'
    and nullif(trim(p.harbiz_cliente_id), '') is not null
    and (nullif(trim(p.nota_harbiz), '') is not null
      or nullif(trim(p.objetivo_harbiz), '') is not null
      or nullif(trim(p.series_harbiz), '') is not null)
  order by p.harbiz_cliente_id, p.id;
end;
$$;

revoke all on function public.propuestas_para_harbiz(text) from public;
grant execute on function public.propuestas_para_harbiz(text) to anon, authenticated;

notify pgrst, 'reload schema';

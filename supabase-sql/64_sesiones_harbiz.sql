-- Entrenos completados en Harbiz → ⚡ Registro de sesiones.
--
-- Una tarea automática (rutina de Claude en la nube, a las 6:00 y a las 18:00)
-- lee en Harbiz los entrenos que han completado los clientes y los deja aquí.
-- El panel, al cargar, los vuelca a la rejilla (seguimientos.dias -> tareas)
-- como sesión SIN revisar: el check lo sigue dando el entrenador cuando la
-- revisa. Ver utils/sesionesHarbiz.js.
--
-- Por qué una tabla aparte y no escribir directamente en `seguimientos`:
-- el panel guarda la semana ENTERA de golpe (upsert de `dias`), así que si un
-- entrenador tenía el panel abierto desde antes de la rutina, su siguiente
-- guardado borraría lo que la rutina hubiese metido. Aquí la sesión queda a
-- salvo y el panel la vuelve a poner si falta. Quitarla con ✕ la marca como
-- `descartada` para que no vuelva.
--
-- El robot NO entra con un usuario del panel (las tablas permisivas le
-- dejarían leer y tocar casi todo): solo puede llamar a la función
-- registrar_sesiones_harbiz() con una clave, que únicamente inserta aquí.

-- 1) Emparejamiento cliente Harbiz ↔ ficha del panel. Se intenta solo por
--    email; esto es para los que hay que emparejar a mano (email distinto o
--    vacío en la ficha). Nunca por nombre: en Harbiz van en mayúsculas y con
--    los dos apellidos, y "parecido" no es "el mismo".
alter table public.clientes add column if not exists harbiz_id text;

-- 2) Las sesiones que trae la rutina.
create table if not exists public.sesiones_harbiz (
  id text primary key,                 -- {harbizClienteId}-{fecha}-{n}
  harbiz_cliente_id text not null,
  harbiz_nombre text,                  -- "NOMBRE APELLIDOS" tal cual en Harbiz
  harbiz_email text,
  fecha date not null,                 -- día del entreno, hora de España
  n int not null default 1,            -- 1, 2… si hizo varios ese día
  tipo text,                           -- workout | cardio | videoSession | liveSession
  titulo text,                         -- nombre del entreno en Harbiz (puede faltar, ver abajo)
  hecha_en timestamptz,                -- hora a la que lo marcó el cliente
  descartada boolean not null default false,
  creado_en timestamptz not null default now()
);

create index if not exists sesiones_harbiz_fecha_idx on public.sesiones_harbiz (fecha desc);

comment on table public.sesiones_harbiz is
  'Entrenos completados en Harbiz que la rutina automática trae para volcarlos a la rejilla de sesiones.';

alter table public.sesiones_harbiz enable row level security;

drop policy if exists "sesiones_harbiz_lectura_equipo" on public.sesiones_harbiz;
create policy "sesiones_harbiz_lectura_equipo" on public.sesiones_harbiz
  for select to authenticated using (auth.uid() is not null);

-- Descartar (✕ en la rejilla) lo hace cualquier entrenador.
drop policy if exists "sesiones_harbiz_descartar_equipo" on public.sesiones_harbiz;
create policy "sesiones_harbiz_descartar_equipo" on public.sesiones_harbiz
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

-- 3) Claves del robot. RLS activado y SIN políticas: desde la API no la lee
--    nadie; solo la función de abajo (security definer) y el SQL Editor.
create table if not exists public.robot_claves (
  nombre text primary key,
  clave text not null
);
alter table public.robot_claves enable row level security;

insert into public.robot_claves (nombre, clave)
values ('harbiz', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (nombre) do nothing;

-- 4) La única puerta del robot. Recibe la lista de sesiones del día:
--    [{ harbiz_cliente_id, harbiz_nombre, harbiz_email, fecha, n, tipo, titulo, hecha_en }]
--    Es idempotente (la rutina pasa dos veces al día y relee el día
--    anterior): si la sesión ya existe no se duplica, solo se completa el
--    título o la hora si antes no se sabían. Harbiz solo da el título del
--    ÚLTIMO entreno de cada día, así que en un día con dos, el primero puede
--    llegar sin título.
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
    s.harbiz_cliente_id || '-' || s.fecha::text || '-' || coalesce(s.n, 1)::text,
    s.harbiz_cliente_id, s.harbiz_nombre, nullif(lower(trim(s.harbiz_email)), ''),
    s.fecha, coalesce(s.n, 1), s.tipo, nullif(trim(s.titulo), ''), s.hecha_en
  from jsonb_to_recordset(p_sesiones) as s(
    harbiz_cliente_id text, harbiz_nombre text, harbiz_email text,
    fecha date, n int, tipo text, titulo text, hecha_en timestamptz
  )
  where s.harbiz_cliente_id is not null and s.fecha is not null
  on conflict (id) do update set
    titulo = coalesce(public.sesiones_harbiz.titulo, excluded.titulo),
    hecha_en = coalesce(public.sesiones_harbiz.hecha_en, excluded.hecha_en),
    harbiz_email = coalesce(excluded.harbiz_email, public.sesiones_harbiz.harbiz_email),
    harbiz_nombre = coalesce(excluded.harbiz_nombre, public.sesiones_harbiz.harbiz_nombre);

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.registrar_sesiones_harbiz(text, jsonb) from public;
grant execute on function public.registrar_sesiones_harbiz(text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

-- Para ver la clave que hay que darle a la rutina (solo desde el SQL Editor):
--   select clave from public.robot_claves where nombre = 'harbiz';

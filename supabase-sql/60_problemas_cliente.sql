-- Problemas del cliente y qué hemos hecho para resolverlos.
--
-- El problema que resuelve (valga la redundancia): hasta ahora, cuando en una
-- sesión pasaba algo —una molestia en el hombro, un ejercicio que no puede
-- hacer, que no llega a la profundidad— se apuntaba como NOTA de esa sesión
-- (dias -> tareas[i].nota) o como "cambio de la semana"
-- (seguimientos.cambios_pendientes). Las dos cosas mueren con la semana: al
-- lunes siguiente la rejilla se vacía y ya no hay forma de ver qué pasó, qué
-- se cambió por ello y si funcionó. Un problema real dura semanas y la
-- solución llega después, así que necesita vivir FUERA de la semana.
--
-- Cómo funciona:
--   - Un problema se abre el día que aparece (normalmente desde el 💬 de una
--     sesión, marcando "esto es un problema") y sigue ABIERTO hasta que se
--     resuelve, aunque pasen semanas.
--   - Cada cosa que se hace para resolverlo se apunta como una ACCIÓN dentro
--     del mismo problema: `acciones` es un jsonb [{ texto, fecha, por }].
--     Es una lista y no un campo "solución" único a propósito: lo normal es
--     probar un cambio, ver que no basta y probar otro; interesa la cadena
--     entera, no solo lo último.
--   - Al resolverlo se guarda la fecha, quién y el `resultado` (cómo acabó).
--
-- Enlazado por NOMBRE (`cliente_nombre`), como el resto del historial del
-- panel — ver la lista de tablas enlazadas por nombre en CLAUDE.md. Al
-- renombrar un cliente hay que arrastrarlo aquí también
-- (src/lib/queries/renombrarCliente.js ya lo hace).
--
-- `id` es texto y lo genera el navegador (ver src/lib/queries/problemasCliente.js):
-- así se puede pintar el problema en pantalla al momento y guardarlo con un
-- upsert idempotente, sin pedir la fila de vuelta.

create table if not exists public.problemas_cliente (
  id text primary key,
  cliente_nombre text not null,
  problema text not null,
  detectado_en date not null default current_date,
  detectado_por text,
  -- De dónde salió: 'sesion' (el 💬 de la rejilla) o 'manual' (apuntado a
  -- mano desde la ficha del cliente). Sirve para saber si el problema se vio
  -- entrenando o lo contó el cliente por otro lado.
  origen text not null default 'manual',
  -- Solo cuando origen = 'sesion': { semana, dia, sesion } para poder decir
  -- "salió el martes en la sesión de tren superior". Es una foto del momento,
  -- no una referencia viva: si luego se borra esa sesión, el problema sigue.
  origen_ref jsonb,
  estado text not null default 'abierto',
  -- [{ texto, fecha, por }] — cada cambio hecho para resolverlo, en orden.
  acciones jsonb not null default '[]'::jsonb,
  resuelto_en date,
  resuelto_por text,
  resultado text,
  creado_en timestamptz not null default now()
);

alter table public.problemas_cliente
  add column if not exists resultado text;

create index if not exists problemas_cliente_cliente_idx
  on public.problemas_cliente (cliente_nombre);

-- Lo que más se consulta: los que siguen abiertos, del más antiguo al más
-- nuevo (un problema que lleva semanas abierto es el que hay que mirar).
create index if not exists problemas_cliente_abiertos_idx
  on public.problemas_cliente (estado, detectado_en);

comment on table public.problemas_cliente is
  'Problemas detectados a un cliente y las acciones/cambios hechos para resolverlos. Vive fuera de la semana: un problema sigue abierto hasta que se resuelve.';
comment on column public.problemas_cliente.acciones is
  'jsonb [{texto, fecha, por}] — cada cambio hecho para resolver el problema, en orden';
comment on column public.problemas_cliente.origen_ref is
  'jsonb {semana, dia, sesion} cuando el problema salió de una sesión concreta';

alter table public.problemas_cliente enable row level security;

-- Permisiva como la mayoría de tablas del panel: el control real es la UI y
-- el rol (un técnico solo ve a sus clientes porque solo se le pintan los
-- suyos). Ver el apartado de RLS en CLAUDE.md.
drop policy if exists "problemas_cliente_equipo" on public.problemas_cliente;
create policy "problemas_cliente_equipo" on public.problemas_cliente
  for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

notify pgrst, 'reload schema';

-- Cuestionario previo del cliente (alimenta la red de determinantes).
--
-- Qué es: las 30 preguntas que el cliente contesta ANTES de la valoración,
-- para que el fisio llegue con la materia prima de la red de determinantes ya
-- recogida. Cada respuesta alimenta un factor del catálogo de
-- src/utils/redDeterminantes.js; el mapeo vive en
-- src/utils/cuestionarioPrevio.js, en la clave `factor` de cada pregunta.
--
-- Se rellena desde la RUTA PÚBLICA /cuestionario, sin login, igual que ya
-- funciona /onboarding. Por eso esta tabla es la única del panel que acepta
-- escritura anónima, y conviene entender bien el compromiso:
--
--   - `anon` puede INSERTAR y nada más. No puede leer, ni modificar, ni
--     borrar. Un cliente que envía su cuestionario no puede ver el de otro,
--     que es lo que importa tratándose de datos de salud.
--   - Cualquiera que tenga la URL puede insertar filas. Es el precio de un
--     formulario público (le pasa igual a cualquier Google Form abierto) y el
--     riesgo real es que alguien meta basura, no que se filtre nada. Si algún
--     día molesta, la salida es exigir un token por cliente en el enlace y
--     comprobarlo en la política.
--   - El equipo (`authenticated`) lee y escribe con normalidad.
--
-- El enlace con el cliente es por NOMBRE (`cliente_nombre`), como el resto del
-- historial del panel — ver la lista de tablas enlazadas por nombre en
-- CLAUDE.md. El nombre llega en el enlace (`/cuestionario?c=Nombre`) para que
-- coincida exacto y no dependa de cómo lo teclee el cliente; si entra sin
-- parámetro, escribe su nombre a mano y puede no cuadrar, así que el panel
-- enseña también los que no casan con ningún cliente.
--
-- `respuestas` es un jsonb { preguntaId: valor }. Valor es string (texto
-- libre y opciones) o número (escalas 0-10). Se guarda plano a propósito: el
-- enunciado de cada pregunta vive en el código, no en la fila, para poder
-- corregir una redacción sin tocar lo ya recogido.

create table if not exists public.cuestionarios_previos (
  id text primary key,
  cliente_nombre text,
  email text,
  respuestas jsonb not null default '{}'::jsonb,
  -- Marca del fisio: "ya he pasado esto a la red de determinantes". Evita
  -- repasar dos veces el mismo cuestionario.
  revisado boolean not null default false,
  enviado_en timestamptz not null default now()
);

create index if not exists cuestionarios_previos_cliente_idx
  on public.cuestionarios_previos (cliente_nombre);

create index if not exists cuestionarios_previos_enviado_idx
  on public.cuestionarios_previos (enviado_en desc);

comment on table public.cuestionarios_previos is
  'Cuestionario previo del cliente (30 preguntas) que alimenta la red de determinantes. Se rellena sin login desde /cuestionario.';
comment on column public.cuestionarios_previos.respuestas is
  'jsonb {preguntaId: valor}; los enunciados viven en src/utils/cuestionarioPrevio.js, no aquí';

alter table public.cuestionarios_previos enable row level security;

-- Escritura anónima: SOLO insert, y sin lectura. Ojo al usarla desde el
-- navegador: un .insert().select() fallaría, porque el select no está
-- permitido para anon. Hay que insertar sin pedir la fila de vuelta.
drop policy if exists "cuestionarios_previos_insert_publico" on public.cuestionarios_previos;
create policy "cuestionarios_previos_insert_publico" on public.cuestionarios_previos
  for insert to anon with check (true);

-- El equipo, como el resto de tablas del panel.
drop policy if exists "cuestionarios_previos_equipo" on public.cuestionarios_previos;
create policy "cuestionarios_previos_equipo" on public.cuestionarios_previos
  for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

notify pgrst, 'reload schema';

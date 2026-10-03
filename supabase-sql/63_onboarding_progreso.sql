-- Progreso del onboarding de cada cliente, para que Raúl sepa quién ha
-- terminado y le toca escribirle / crear el grupo de WhatsApp.
--
-- Antes el progreso solo vivía en el localStorage del móvil del cliente: el
-- panel no sabía nada. Ahora cada vez que el cliente marca o desmarca un paso
-- en /onboarding o /onboarding-premium se INSERTA un evento aquí. Es un
-- registro de eventos (no una fila por cliente que se actualiza) porque así
-- `anon` solo necesita insertar, igual que cuestionarios_previos (59) y
-- contratos_clientes (62): no puede leer ni modificar nada. El estado actual
-- de cada paso es su último evento (lo calcula utils/onboardingEstado.js).
--
-- El contrato NO se registra aquí: su fuente es contratos_clientes.
--
-- Pasos especiales que escribe el panel, no el cliente:
--   'contactado' → Raúl ya le ha escrito / creado el grupo de WhatsApp
--                  (quita el aviso del Dashboard y de Clientes).
--
-- Solo se registra si el enlace trae el nombre (?c=Nombre): sin él no hay
-- con qué enlazarlo a la ficha (el historial va por NOMBRE, ver CLAUDE.md).

create table if not exists public.onboarding_progreso (
  id text primary key,
  cliente_nombre text not null,
  variante text,           -- 'low' | 'premium'
  paso text not null,      -- id del paso (ver PASOS en Onboarding.jsx) o 'contactado'
  hecho boolean not null default true,
  por text,                -- null = el cliente; email si lo marca el equipo
  creado_en timestamptz not null default now()
);

create index if not exists onboarding_progreso_cliente_idx
  on public.onboarding_progreso (cliente_nombre);

create index if not exists onboarding_progreso_creado_idx
  on public.onboarding_progreso (creado_en desc);

comment on table public.onboarding_progreso is
  'Eventos de progreso del onboarding del cliente (marca/desmarca de pasos). El estado de cada paso es su último evento.';

alter table public.onboarding_progreso enable row level security;

drop policy if exists "onboarding_progreso_insert_publico" on public.onboarding_progreso;
create policy "onboarding_progreso_insert_publico" on public.onboarding_progreso
  for insert to anon with check (true);

drop policy if exists "onboarding_progreso_lectura_equipo" on public.onboarding_progreso;
create policy "onboarding_progreso_lectura_equipo" on public.onboarding_progreso
  for select to authenticated using (auth.uid() is not null);

-- Marcar "contactado" (y limpiar, si hiciera falta) es cosa de Raúl.
drop policy if exists "onboarding_progreso_admin" on public.onboarding_progreso;
create policy "onboarding_progreso_admin" on public.onboarding_progreso
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

notify pgrst, 'reload schema';

-- Contratos firmados por el cliente desde el onboarding.
--
-- Qué es: el contrato de prestación de servicios que el cliente rellena y
-- firma (con el dedo o el ratón) dentro del onboarding de high ticket
-- (/onboarding-premium) o suelto en /contrato. Sustituye al PDF rellenable
-- que se mandaba antes por WhatsApp.
--
-- Mismo compromiso que cuestionarios_previos (migración 59), porque se
-- rellena igual, desde una RUTA PÚBLICA sin login:
--
--   - `anon` puede INSERTAR y nada más. No lee, no modifica, no borra: quien
--     firma no puede ver el contrato de otro (llevan DNI, domicilio y firma).
--   - Por la misma razón el navegador NO puede hacer .insert().select().
--   - El equipo (`authenticated`) lo lee. Solo admin lo modifica o borra:
--     un contrato firmado no debería tocarlo nadie más.
--
-- `texto` es una FOTO de las cláusulas tal y como las vio y firmó el cliente
-- (jsonb [{ titulo, parrafos[] }]). Se guarda a propósito aunque las
-- cláusulas vivan en src/utils/contrato.js: si mañana se cambia la redacción,
-- el PDF de un contrato ya firmado tiene que seguir saliendo con lo que se
-- firmó, no con lo nuevo. `version` es solo una etiqueta para localizarlo.
--
-- El enlace con el cliente es por NOMBRE (`cliente_nombre`), como el resto
-- del panel. El nombre llega en el enlace que manda la closer
-- (?c=Nombre) para que coincida exacto con su ficha.

create table if not exists public.contratos_clientes (
  id text primary key,
  cliente_nombre text,
  dni text,
  email text,
  -- Variante del onboarding desde la que se firmó ('premium', 'suelto'...).
  origen text,
  -- Datos del formulario: domicilio, teléfono, duración, importe, forma y
  -- método de pago, autorización de imagen y casillas aceptadas.
  datos jsonb not null default '{}'::jsonb,
  texto jsonb not null default '[]'::jsonb,
  version text,
  -- Firma como imagen PNG en data URL (unos pocos KB).
  firma text,
  user_agent text,
  firmado_en timestamptz not null default now()
);

create index if not exists contratos_clientes_cliente_idx
  on public.contratos_clientes (cliente_nombre);

create index if not exists contratos_clientes_firmado_idx
  on public.contratos_clientes (firmado_en desc);

comment on table public.contratos_clientes is
  'Contratos firmados online por el cliente desde el onboarding (/onboarding-premium o /contrato).';
comment on column public.contratos_clientes.texto is
  'Foto de las cláusulas tal y como se firmaron; el PDF se genera desde aquí, no desde el código actual';

alter table public.contratos_clientes enable row level security;

drop policy if exists "contratos_clientes_insert_publico" on public.contratos_clientes;
create policy "contratos_clientes_insert_publico" on public.contratos_clientes
  for insert to anon with check (true);

drop policy if exists "contratos_clientes_lectura_equipo" on public.contratos_clientes;
create policy "contratos_clientes_lectura_equipo" on public.contratos_clientes
  for select to authenticated using (auth.uid() is not null);

drop policy if exists "contratos_clientes_admin" on public.contratos_clientes;
create policy "contratos_clientes_admin" on public.contratos_clientes
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

notify pgrst, 'reload schema';

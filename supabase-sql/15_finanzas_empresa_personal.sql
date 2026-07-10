-- Reorganización de Finanzas en 4 categorías, a petición de Raúl:
--   - Ingresos empresa / Gastos empresa: se rellenan automáticamente desde
--     Ventas, Clientes (cobros de plazos) y Equipo (pagos al equipo).
--   - Ingresos personales / Gastos personales: los añade Raúl a mano
--     (ej. si se pone una nómina), sin mezclarse con lo de la empresa.
--
-- Antes de esta migración, "ingresos_personales" recibía en realidad el
-- dinero cobrado a clientes (que es ingreso de empresa, no personal) y
-- "gastos_profesionales" ya jugaba el papel de "gastos empresa". Se
-- renombran las tablas para que el nombre refleje lo que de verdad
-- contienen, sin perder ni un registro (ALTER TABLE ... RENAME conserva
-- todas las filas y las políticas RLS ya creadas).
alter table public.ingresos_personales rename to ingresos_empresa;
alter table public.gastos_profesionales rename to gastos_empresa;

-- ingresos_empresa: se añaden las mismas columnas de "origen" que ya tenía
-- gastos_empresa, para poder distinguir en la tabla qué llegó automático
-- (cobro de un plazo de cliente) de lo que se añada a mano (ej. otro
-- ingreso de empresa que no viene de un cliente).
alter table public.ingresos_empresa
  add column if not exists origen text not null default 'manual' check (origen in ('manual', 'cobro_cliente')),
  add column if not exists cliente_id text,
  add column if not exists plazo_numero integer;

-- Tabla nueva: ingresos personales de verdad (solo entradas manuales de
-- Raúl). Al ser 100% manual, se protege igual que gastos_personales: solo
-- con sesión admin iniciada.
create table if not exists public.ingresos_personales (
  id text primary key,
  fecha date not null,
  concepto text default '',
  importe numeric not null default 0,
  notas text default ''
);
alter table public.ingresos_personales enable row level security;
create policy "ingresos_personales_admin_only" on public.ingresos_personales
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Notas sobre las políticas existentes tras el rename (no hace falta
-- tocarlas, Postgres las conserva atadas a la tabla):
--  - ingresos_empresa: select/update/delete solo con sesión (heredado de
--    cuando se llamaba ingresos_personales); insert abierto a propósito,
--    porque Cobros pendientes crea el ingreso sin necesitar login.
--  - gastos_empresa: las 4 operaciones abiertas (heredado de
--    gastos_profesionales), porque Equipo > "Marcar pago" sigue abierto
--    para todo el equipo.

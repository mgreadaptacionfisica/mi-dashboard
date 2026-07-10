-- Ahora que todas las tablas están migradas, se cierra el acceso a las
-- finanzas personales de Raúl. El resto del equipo sigue usando el panel
-- sin login (como hasta ahora); esta migración solo afecta a quién puede
-- ver/editar ingresos_personales y gastos_personales.
--
-- gastos_profesionales se deja tal cual (política abierta): son los pagos
-- al equipo, gestionados también desde Equipo > "Marcar pago", una pantalla
-- que sigue abierta para todo el equipo — no son "finanzas personales" en
-- el mismo sentido que ingresos/gastos personales de Raúl.
--
-- ingresos_personales: el INSERT se deja abierto a propósito. Clientes >
-- Cobros pendientes crea un ingreso automático cuando cualquiera del equipo
-- marca un plazo como cobrado (no solo Raúl), así que esa escritura
-- concreta no puede depender de tener sesión admin. Lo que se protege es
-- poder listar/editar/borrar el libro de ingresos.
drop policy if exists "ingresos_personales_select_all" on public.ingresos_personales;
drop policy if exists "ingresos_personales_update_all" on public.ingresos_personales;
drop policy if exists "ingresos_personales_delete_all" on public.ingresos_personales;

create policy "ingresos_personales_select_admin" on public.ingresos_personales
  for select using (auth.uid() is not null);
create policy "ingresos_personales_update_admin" on public.ingresos_personales
  for update using (auth.uid() is not null);
create policy "ingresos_personales_delete_admin" on public.ingresos_personales
  for delete using (auth.uid() is not null);
-- "ingresos_personales_insert_all" se mantiene tal cual (abierta).

-- gastos_personales: no tiene ningún flujo automático como el de arriba
-- (todo el movimiento se da manualmente desde la pantalla de Finanzas), así
-- que aquí sí se protegen las 4 operaciones.
drop policy if exists "gastos_personales_select_all" on public.gastos_personales;
drop policy if exists "gastos_personales_insert_all" on public.gastos_personales;
drop policy if exists "gastos_personales_update_all" on public.gastos_personales;
drop policy if exists "gastos_personales_delete_all" on public.gastos_personales;

create policy "gastos_personales_admin_only" on public.gastos_personales
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

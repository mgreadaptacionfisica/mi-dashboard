-- Hasta ahora las políticas de Finanzas usaban "auth.uid() is not null"
-- (= "hay alguien logueado") como equivalente a "es Raúl", porque su cuenta
-- era la única que existía. Ahora que cada persona del equipo va a tener su
-- propia cuenta con un rol (closer/tecnico/contenido), ese check ya no
-- sirve: cualquier cuenta logueada (no solo admin) lo pasaría igual. Se
-- sustituye por una comprobación real del rol admin, leído del JWT
-- (auth.jwt() -> 'app_metadata' ->> 'rol').
--
-- Nota: el rol se guarda en app_metadata (no en user_metadata) porque
-- app_metadata no se puede modificar desde el navegador con la clave
-- pública — solo por SQL/Admin API — así que nadie puede auto-asignarse
-- el rol admin cambiando algo en su sesión.

drop policy if exists "ingresos_personales_admin_only" on public.ingresos_personales;
create policy "ingresos_personales_admin_only" on public.ingresos_personales
  for all
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- ingresos_empresa (antes ingresos_personales, ver 15_finanzas_empresa_personal.sql):
-- select/update/delete solo admin. El insert se deja abierto porque
-- Clientes > Cobros pendientes crea el ingreso automático al marcar un
-- plazo como cobrado, y eso lo puede hacer cualquier persona logueada del
-- equipo, no solo Raúl.
drop policy if exists "ingresos_personales_select_admin" on public.ingresos_empresa;
drop policy if exists "ingresos_personales_update_admin" on public.ingresos_empresa;
drop policy if exists "ingresos_personales_delete_admin" on public.ingresos_empresa;
create policy "ingresos_empresa_select_admin" on public.ingresos_empresa
  for select using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "ingresos_empresa_update_admin" on public.ingresos_empresa
  for update using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "ingresos_empresa_delete_admin" on public.ingresos_empresa
  for delete using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

drop policy if exists "gastos_personales_admin_only" on public.gastos_personales;
create policy "gastos_personales_admin_only" on public.gastos_personales
  for all
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- Asigna el rol admin a tu propia cuenta (cámbialo por tu email real).
-- Tras ejecutar esto, cierra sesión y vuelve a entrar para que el rol
-- se refleje (el rol viaja dentro del token de sesión, que no se
-- actualiza solo hasta que se renueva).
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"rol": "admin"}'::jsonb
where email = 'mgreadaptacionfisica@gmail.com';

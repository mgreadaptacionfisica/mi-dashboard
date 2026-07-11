-- RLS por fila en clientes y ventas: hasta ahora, cualquier cuenta logueada
-- veía TODAS las filas de estas dos tablas (política "using (true)"),
-- porque el control de acceso por rol solo filtraba qué SECCIONES del menú
-- ve cada uno (ver SECCIONES_POR_ROL en src/lib/auth.js), no qué FILAS.
-- En cuanto se creen las cuentas reales del equipo (17_roles_equipo.sql
-- sigue con emails de ejemplo a día de hoy — pendiente), un técnico vería
-- los clientes de sus compañeros y un closer vería los leads de los suyos.
--
-- Esta migración solo toca el SELECT de clientes y ventas. INSERT/UPDATE/
-- DELETE se dejan tal cual (abiertas) a propósito, para no romper flujos ya
-- existentes (un técnico marcando su propio seguimiento, un closer moviendo
-- su lead en el pipeline) sin revisarlo antes con Raúl.

-- Función de apoyo: nombre (columna `nombre` de miembros_equipo) de la
-- persona cuyo email coincide (sin distinguir mayúsculas) con el email de
-- la cuenta autenticada. Replica a nivel de base de datos el mismo patrón
-- de "cruzar email de sesión con email de la ficha en Equipo" que ya usan
-- MuroEquipo.jsx y VideosParaEditar.jsx en el frontend.
create or replace function public.mi_nombre_equipo()
returns text
language sql
stable
as $$
  select nombre
  from public.miembros_equipo
  where lower(email) = lower(auth.jwt() ->> 'email')
  limit 1
$$;

-- clientes: admin ve todo; tecnico solo ve las fichas donde aparece en
-- `trabajadores`; closer/contenido no ven nada de esta tabla (ya no la
-- tienen en su sección del menú de todos modos, pero mejor no depender
-- solo de eso).
drop policy if exists "clientes_select_all" on public.clientes;
create policy "clientes_select_rol" on public.clientes for select using (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin'
  or (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'tecnico'
    and public.mi_nombre_equipo() = any (trabajadores)
  )
);

-- ventas: admin ve todo; closer solo ve los leads donde `closer` es su
-- nombre; tecnico/contenido no ven nada de esta tabla.
drop policy if exists "ventas_select_all" on public.ventas;
create policy "ventas_select_rol" on public.ventas for select using (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin'
  or (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'closer'
    and public.mi_nombre_equipo() = closer
  )
);

-- Pendiente (siguiente pasada, sin tocar ahora): seguimientos y
-- contactos_semanales (06_seguimiento_y_contacto.sql) y
-- valoraciones_clientes (07_valoraciones_clientes.sql) son tablas child de
-- clientes y tienen el mismo "using (true)" en su SELECT — un técnico
-- podría ver el seguimiento/valoraciones de clientes que no son suyos. Se
-- deja fuera del alcance de esta migración a propósito (habría que decidir
-- primero cómo relacionar cliente_nombre con trabajadores, y confirmarlo
-- con Raúl) para no ampliar el cambio sin revisarlo con él.

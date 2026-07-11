-- Cierra el acceso público a la base de datos: hasta ahora, casi todas las
-- políticas RLS del proyecto usaban "using (true)" / "with check (true)",
-- es decir, sin comprobar que hubiera una sesión iniciada. La anon key de
-- Supabase no es secreta (viaja en el bundle JS que carga cualquiera que
-- abra la web), así que "using (true)" equivale en la práctica a dejar la
-- tabla abierta a internet sin login: cualquiera con esa key podía leer,
-- insertar, modificar o BORRAR filas de estas tablas sin pasar por la app.
--
-- Esto es el sospechoso número uno de que el pipeline de "ventas" apareciera
-- vacío el 11/07/2026 sin que nadie del equipo borrara nada desde el panel:
-- lo más probable es que algo externo (un escaneo automático buscando
-- proyectos Supabase con RLS abierta, un bot, etc.) encontrara la anon key
-- y mandara un DELETE directo contra la tabla vía su API REST.
--
-- Este archivo exige `auth.uid() is not null` (cualquier cuenta logueada,
-- sin mirar el rol) en las 4 operaciones de cada tabla que seguía abierta.
-- No cambia nada de cómo funciona la app para vosotros: hoy en día TODA la
-- app ya exige login antes de poder ver ninguna sección, así que ningún
-- flujo real se ve afectado. Lo único que deja de funcionar es el acceso
-- anónimo/externo directo a la base de datos, que nunca debió estar abierto.
--
-- clientes y ventas no se tocan aquí en el SELECT (ya se restringió por rol
-- en 22_row_level_rls.sql); este archivo solo cierra su INSERT/UPDATE/DELETE,
-- que 22 dejó abiertos a propósito para no mezclar los dos cambios.

-- sops
drop policy if exists "sops_select_all" on public.sops;
create policy "sops_select_all" on public.sops for select using (auth.uid() is not null);
drop policy if exists "sops_insert_all" on public.sops;
create policy "sops_insert_all" on public.sops for insert with check (auth.uid() is not null);
drop policy if exists "sops_update_all" on public.sops;
create policy "sops_update_all" on public.sops for update using (auth.uid() is not null);
drop policy if exists "sops_delete_all" on public.sops;
create policy "sops_delete_all" on public.sops for delete using (auth.uid() is not null);

-- mensajes_equipo
drop policy if exists "mensajes_equipo_select_all" on public.mensajes_equipo;
create policy "mensajes_equipo_select_all" on public.mensajes_equipo for select using (auth.uid() is not null);
drop policy if exists "mensajes_equipo_insert_all" on public.mensajes_equipo;
create policy "mensajes_equipo_insert_all" on public.mensajes_equipo for insert with check (auth.uid() is not null);
drop policy if exists "mensajes_equipo_update_all" on public.mensajes_equipo;
create policy "mensajes_equipo_update_all" on public.mensajes_equipo for update using (auth.uid() is not null);
drop policy if exists "mensajes_equipo_delete_all" on public.mensajes_equipo;
create policy "mensajes_equipo_delete_all" on public.mensajes_equipo for delete using (auth.uid() is not null);

-- miembros_equipo
drop policy if exists "miembros_equipo_select_all" on public.miembros_equipo;
create policy "miembros_equipo_select_all" on public.miembros_equipo for select using (auth.uid() is not null);
drop policy if exists "miembros_equipo_insert_all" on public.miembros_equipo;
create policy "miembros_equipo_insert_all" on public.miembros_equipo for insert with check (auth.uid() is not null);
drop policy if exists "miembros_equipo_update_all" on public.miembros_equipo;
create policy "miembros_equipo_update_all" on public.miembros_equipo for update using (auth.uid() is not null);
drop policy if exists "miembros_equipo_delete_all" on public.miembros_equipo;
create policy "miembros_equipo_delete_all" on public.miembros_equipo for delete using (auth.uid() is not null);

-- seguimientos
drop policy if exists "seguimientos_select_all" on public.seguimientos;
create policy "seguimientos_select_all" on public.seguimientos for select using (auth.uid() is not null);
drop policy if exists "seguimientos_insert_all" on public.seguimientos;
create policy "seguimientos_insert_all" on public.seguimientos for insert with check (auth.uid() is not null);
drop policy if exists "seguimientos_update_all" on public.seguimientos;
create policy "seguimientos_update_all" on public.seguimientos for update using (auth.uid() is not null);
drop policy if exists "seguimientos_delete_all" on public.seguimientos;
create policy "seguimientos_delete_all" on public.seguimientos for delete using (auth.uid() is not null);

-- contactos_semanales
drop policy if exists "contactos_semanales_select_all" on public.contactos_semanales;
create policy "contactos_semanales_select_all" on public.contactos_semanales for select using (auth.uid() is not null);
drop policy if exists "contactos_semanales_insert_all" on public.contactos_semanales;
create policy "contactos_semanales_insert_all" on public.contactos_semanales for insert with check (auth.uid() is not null);
drop policy if exists "contactos_semanales_update_all" on public.contactos_semanales;
create policy "contactos_semanales_update_all" on public.contactos_semanales for update using (auth.uid() is not null);
drop policy if exists "contactos_semanales_delete_all" on public.contactos_semanales;
create policy "contactos_semanales_delete_all" on public.contactos_semanales for delete using (auth.uid() is not null);

-- valoraciones_clientes
drop policy if exists "valoraciones_clientes_select_all" on public.valoraciones_clientes;
create policy "valoraciones_clientes_select_all" on public.valoraciones_clientes for select using (auth.uid() is not null);
drop policy if exists "valoraciones_clientes_insert_all" on public.valoraciones_clientes;
create policy "valoraciones_clientes_insert_all" on public.valoraciones_clientes for insert with check (auth.uid() is not null);
drop policy if exists "valoraciones_clientes_update_all" on public.valoraciones_clientes;
create policy "valoraciones_clientes_update_all" on public.valoraciones_clientes for update using (auth.uid() is not null);
drop policy if exists "valoraciones_clientes_delete_all" on public.valoraciones_clientes;
create policy "valoraciones_clientes_delete_all" on public.valoraciones_clientes for delete using (auth.uid() is not null);

-- setting_instagram
drop policy if exists "setting_instagram_select_all" on public.setting_instagram;
create policy "setting_instagram_select_all" on public.setting_instagram for select using (auth.uid() is not null);
drop policy if exists "setting_instagram_insert_all" on public.setting_instagram;
create policy "setting_instagram_insert_all" on public.setting_instagram for insert with check (auth.uid() is not null);
drop policy if exists "setting_instagram_update_all" on public.setting_instagram;
create policy "setting_instagram_update_all" on public.setting_instagram for update using (auth.uid() is not null);
drop policy if exists "setting_instagram_delete_all" on public.setting_instagram;
create policy "setting_instagram_delete_all" on public.setting_instagram for delete using (auth.uid() is not null);

-- mensajes_setting
drop policy if exists "mensajes_setting_select_all" on public.mensajes_setting;
create policy "mensajes_setting_select_all" on public.mensajes_setting for select using (auth.uid() is not null);
drop policy if exists "mensajes_setting_insert_all" on public.mensajes_setting;
create policy "mensajes_setting_insert_all" on public.mensajes_setting for insert with check (auth.uid() is not null);
drop policy if exists "mensajes_setting_update_all" on public.mensajes_setting;
create policy "mensajes_setting_update_all" on public.mensajes_setting for update using (auth.uid() is not null);
drop policy if exists "mensajes_setting_delete_all" on public.mensajes_setting;
create policy "mensajes_setting_delete_all" on public.mensajes_setting for delete using (auth.uid() is not null);

-- ads_kpi
drop policy if exists "ads_kpi_select_all" on public.ads_kpi;
create policy "ads_kpi_select_all" on public.ads_kpi for select using (auth.uid() is not null);
drop policy if exists "ads_kpi_insert_all" on public.ads_kpi;
create policy "ads_kpi_insert_all" on public.ads_kpi for insert with check (auth.uid() is not null);
drop policy if exists "ads_kpi_update_all" on public.ads_kpi;
create policy "ads_kpi_update_all" on public.ads_kpi for update using (auth.uid() is not null);
drop policy if exists "ads_kpi_delete_all" on public.ads_kpi;
create policy "ads_kpi_delete_all" on public.ads_kpi for delete using (auth.uid() is not null);

-- ads_notas_mensuales
drop policy if exists "ads_notas_mensuales_select_all" on public.ads_notas_mensuales;
create policy "ads_notas_mensuales_select_all" on public.ads_notas_mensuales for select using (auth.uid() is not null);
drop policy if exists "ads_notas_mensuales_insert_all" on public.ads_notas_mensuales;
create policy "ads_notas_mensuales_insert_all" on public.ads_notas_mensuales for insert with check (auth.uid() is not null);
drop policy if exists "ads_notas_mensuales_update_all" on public.ads_notas_mensuales;
create policy "ads_notas_mensuales_update_all" on public.ads_notas_mensuales for update using (auth.uid() is not null);
drop policy if exists "ads_notas_mensuales_delete_all" on public.ads_notas_mensuales;
create policy "ads_notas_mensuales_delete_all" on public.ads_notas_mensuales for delete using (auth.uid() is not null);

-- anuncios
drop policy if exists "anuncios_select_all" on public.anuncios;
create policy "anuncios_select_all" on public.anuncios for select using (auth.uid() is not null);
drop policy if exists "anuncios_insert_all" on public.anuncios;
create policy "anuncios_insert_all" on public.anuncios for insert with check (auth.uid() is not null);
drop policy if exists "anuncios_update_all" on public.anuncios;
create policy "anuncios_update_all" on public.anuncios for update using (auth.uid() is not null);
drop policy if exists "anuncios_delete_all" on public.anuncios;
create policy "anuncios_delete_all" on public.anuncios for delete using (auth.uid() is not null);

-- recontactos
drop policy if exists "recontactos_select_all" on public.recontactos;
create policy "recontactos_select_all" on public.recontactos for select using (auth.uid() is not null);
drop policy if exists "recontactos_insert_all" on public.recontactos;
create policy "recontactos_insert_all" on public.recontactos for insert with check (auth.uid() is not null);
drop policy if exists "recontactos_update_all" on public.recontactos;
create policy "recontactos_update_all" on public.recontactos for update using (auth.uid() is not null);
drop policy if exists "recontactos_delete_all" on public.recontactos;
create policy "recontactos_delete_all" on public.recontactos for delete using (auth.uid() is not null);

-- ingresos_personales
drop policy if exists "ingresos_personales_select_all" on public.ingresos_personales;
create policy "ingresos_personales_select_all" on public.ingresos_personales for select using (auth.uid() is not null);
drop policy if exists "ingresos_personales_insert_all" on public.ingresos_personales;
create policy "ingresos_personales_insert_all" on public.ingresos_personales for insert with check (auth.uid() is not null);
drop policy if exists "ingresos_personales_update_all" on public.ingresos_personales;
create policy "ingresos_personales_update_all" on public.ingresos_personales for update using (auth.uid() is not null);
drop policy if exists "ingresos_personales_delete_all" on public.ingresos_personales;
create policy "ingresos_personales_delete_all" on public.ingresos_personales for delete using (auth.uid() is not null);

-- gastos_personales
drop policy if exists "gastos_personales_select_all" on public.gastos_personales;
create policy "gastos_personales_select_all" on public.gastos_personales for select using (auth.uid() is not null);
drop policy if exists "gastos_personales_insert_all" on public.gastos_personales;
create policy "gastos_personales_insert_all" on public.gastos_personales for insert with check (auth.uid() is not null);
drop policy if exists "gastos_personales_update_all" on public.gastos_personales;
create policy "gastos_personales_update_all" on public.gastos_personales for update using (auth.uid() is not null);
drop policy if exists "gastos_personales_delete_all" on public.gastos_personales;
create policy "gastos_personales_delete_all" on public.gastos_personales for delete using (auth.uid() is not null);

-- gastos_profesionales
drop policy if exists "gastos_profesionales_select_all" on public.gastos_profesionales;
create policy "gastos_profesionales_select_all" on public.gastos_profesionales for select using (auth.uid() is not null);
drop policy if exists "gastos_profesionales_insert_all" on public.gastos_profesionales;
create policy "gastos_profesionales_insert_all" on public.gastos_profesionales for insert with check (auth.uid() is not null);
drop policy if exists "gastos_profesionales_update_all" on public.gastos_profesionales;
create policy "gastos_profesionales_update_all" on public.gastos_profesionales for update using (auth.uid() is not null);
drop policy if exists "gastos_profesionales_delete_all" on public.gastos_profesionales;
create policy "gastos_profesionales_delete_all" on public.gastos_profesionales for delete using (auth.uid() is not null);

-- contenido_ideas
drop policy if exists "contenido_ideas_select_all" on public.contenido_ideas;
create policy "contenido_ideas_select_all" on public.contenido_ideas for select using (auth.uid() is not null);
drop policy if exists "contenido_ideas_insert_all" on public.contenido_ideas;
create policy "contenido_ideas_insert_all" on public.contenido_ideas for insert with check (auth.uid() is not null);
drop policy if exists "contenido_ideas_update_all" on public.contenido_ideas;
create policy "contenido_ideas_update_all" on public.contenido_ideas for update using (auth.uid() is not null);
drop policy if exists "contenido_ideas_delete_all" on public.contenido_ideas;
create policy "contenido_ideas_delete_all" on public.contenido_ideas for delete using (auth.uid() is not null);

-- servicios
drop policy if exists "servicios_select_all" on public.servicios;
create policy "servicios_select_all" on public.servicios for select using (auth.uid() is not null);
drop policy if exists "servicios_insert_all" on public.servicios;
create policy "servicios_insert_all" on public.servicios for insert with check (auth.uid() is not null);
drop policy if exists "servicios_update_all" on public.servicios;
create policy "servicios_update_all" on public.servicios for update using (auth.uid() is not null);
drop policy if exists "servicios_delete_all" on public.servicios;
create policy "servicios_delete_all" on public.servicios for delete using (auth.uid() is not null);

-- renovaciones
drop policy if exists "renovaciones_select_all" on public.renovaciones;
create policy "renovaciones_select_all" on public.renovaciones for select using (auth.uid() is not null);
drop policy if exists "renovaciones_insert_all" on public.renovaciones;
create policy "renovaciones_insert_all" on public.renovaciones for insert with check (auth.uid() is not null);
drop policy if exists "renovaciones_update_all" on public.renovaciones;
create policy "renovaciones_update_all" on public.renovaciones for update using (auth.uid() is not null);
drop policy if exists "renovaciones_delete_all" on public.renovaciones;
create policy "renovaciones_delete_all" on public.renovaciones for delete using (auth.uid() is not null);

-- clientes y ventas: solo se cierra escritura (el SELECT ya lo controla 22_row_level_rls.sql por rol)
drop policy if exists "clientes_insert_all" on public.clientes;
create policy "clientes_insert_all" on public.clientes for insert with check (auth.uid() is not null);
drop policy if exists "clientes_update_all" on public.clientes;
create policy "clientes_update_all" on public.clientes for update using (auth.uid() is not null);
drop policy if exists "clientes_delete_all" on public.clientes;
create policy "clientes_delete_all" on public.clientes for delete using (auth.uid() is not null);

drop policy if exists "ventas_insert_all" on public.ventas;
create policy "ventas_insert_all" on public.ventas for insert with check (auth.uid() is not null);
drop policy if exists "ventas_update_all" on public.ventas;
create policy "ventas_update_all" on public.ventas for update using (auth.uid() is not null);
drop policy if exists "ventas_delete_all" on public.ventas;
create policy "ventas_delete_all" on public.ventas for delete using (auth.uid() is not null);

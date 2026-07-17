-- "Mis tareas" deja de ser solo de Raúl: ahora cada técnico también tiene
-- su propia lista privada de tareas (ver MisTareas.jsx). Se añade la
-- columna que identifica de quién es cada tarea, se rellenan las tareas ya
-- existentes (todas eran de Raúl hasta ahora) y se sustituye la política
-- "solo admin" por una de verdad a nivel de fila: cada persona solo puede
-- leer/escribir SUS PROPIAS tareas (comparando su email de sesión), no las
-- de los demás. Esto es más estricto que el resto de tablas del panel (que
-- se apoyan en que la interfaz filtra, no en RLS) — aquí sí conviene,
-- porque son notas privadas de cada persona.

alter table public.tareas_personales add column if not exists propietario_email text;

update public.tareas_personales
set propietario_email = 'mgreadaptacionfisica@gmail.com'
where propietario_email is null;

drop policy if exists "tareas_personales_admin_only" on public.tareas_personales;
drop policy if exists "tareas_personales_propietario" on public.tareas_personales;
create policy "tareas_personales_propietario" on public.tareas_personales
  for all
  using (propietario_email = auth.jwt() ->> 'email')
  with check (propietario_email = auth.jwt() ->> 'email');

notify pgrst, 'reload schema';

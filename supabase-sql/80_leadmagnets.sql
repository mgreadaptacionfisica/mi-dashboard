-- Leadmagnets: contactos que llegan desde las páginas públicas
-- (/test-recuperacion, /semaforo-dolor, /autotest-hombro, /plantilla-manguito).
--
-- Por qué una tabla aparte y no directamente `ventas`: el Pipeline empieza en
-- «Agendada» (ya hay llamada) y todo el embudo cuenta desde ahí. Alguien que
-- se descarga un PDF todavía no ha pedido llamada; si entrase en `ventas`
-- descuadraría asistencia y cierre. Aquí queda como lead frío y la closer lo
-- pasa al Pipeline desde Ventas → 🧲 Leadmagnets cuando agenda.
--
-- Las páginas son públicas (sin login), así que el navegador NO puede
-- insertar en la tabla: solo puede llamar a `registrar_leadmagnet`, que
-- valida y limita lo que entra (mismo patrón que registrar_cita_ghl, 66).

create table if not exists public.leadmagnet_leads (
  id bigserial primary key,
  creado_en timestamptz not null default now(),
  leadmagnet text not null,                 -- slug (src/data/leadmagnets.js)
  nombre text not null default '',
  email text not null default '',
  telefono text not null default '',
  respuestas jsonb not null default '{}',   -- { p1: 2, zona: 'Hombro', variante: 'fase2', … }
  puntuacion int,
  resultado text,                           -- verde | amarillo | rojo | variante elegida
  atribucion jsonb,                         -- utm_* y referrer de la URL
  contactado boolean not null default false,
  notas text not null default ''
);

create index if not exists leadmagnet_leads_creado_idx on public.leadmagnet_leads (creado_en desc);

alter table public.leadmagnet_leads enable row level security;

-- Equipo con sesión: ver, marcar contactado / notas y borrar. Sin política de
-- insert: solo entra por la función de abajo.
drop policy if exists "leadmagnet_leads_select" on public.leadmagnet_leads;
create policy "leadmagnet_leads_select" on public.leadmagnet_leads
  for select using (auth.uid() is not null);
drop policy if exists "leadmagnet_leads_update" on public.leadmagnet_leads;
create policy "leadmagnet_leads_update" on public.leadmagnet_leads
  for update using (auth.uid() is not null);
drop policy if exists "leadmagnet_leads_delete" on public.leadmagnet_leads;
create policy "leadmagnet_leads_delete" on public.leadmagnet_leads
  for delete using (auth.uid() is not null);

-- La puerta pública. Recibe:
--   { leadmagnet, nombre, email, telefono, respuestas, puntuacion, resultado, atribucion }
-- - Exige leadmagnet y (email o teléfono); recorta longitudes.
-- - Si la misma persona (email o teléfono) repite el mismo leadmagnet en
--   menos de 1 hora, actualiza su fila en vez de crear otra (doble clic,
--   recarga, repetir el test).
create or replace function public.registrar_leadmagnet(datos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lm text := left(trim(coalesce(datos ->> 'leadmagnet', '')), 60);
  v_nombre text := left(trim(coalesce(datos ->> 'nombre', '')), 120);
  v_email text := left(lower(trim(coalesce(datos ->> 'email', ''))), 160);
  v_tel text := left(trim(coalesce(datos ->> 'telefono', '')), 40);
  v_resp jsonb := case when jsonb_typeof(datos -> 'respuestas') = 'object' then datos -> 'respuestas' else '{}'::jsonb end;
  v_atr jsonb := case when jsonb_typeof(datos -> 'atribucion') = 'object' then datos -> 'atribucion' else null end;
  v_puntos int;
  v_res text := left(nullif(trim(coalesce(datos ->> 'resultado', '')), ''), 40);
  v_id bigint;
begin
  if v_lm !~ '^[a-z0-9-]+$' then
    raise exception 'leadmagnet no válido';
  end if;
  if v_email = '' and v_tel = '' then
    raise exception 'falta email o teléfono';
  end if;
  if length(v_resp::text) > 8000 or length(coalesce(v_atr::text, '')) > 4000 then
    raise exception 'datos demasiado largos';
  end if;
  begin
    v_puntos := (datos ->> 'puntuacion')::int;
  exception when others then
    v_puntos := null;
  end;

  select id into v_id
    from public.leadmagnet_leads
   where leadmagnet = v_lm
     and creado_en > now() - interval '1 hour'
     and ((v_email <> '' and email = v_email) or (v_tel <> '' and telefono = v_tel))
   order by creado_en desc
   limit 1;

  if v_id is not null then
    update public.leadmagnet_leads
       set nombre = coalesce(nullif(v_nombre, ''), nombre),
           email = coalesce(nullif(v_email, ''), email),
           telefono = coalesce(nullif(v_tel, ''), telefono),
           respuestas = v_resp,
           puntuacion = v_puntos,
           resultado = v_res,
           atribucion = coalesce(v_atr, atribucion)
     where id = v_id;
  else
    insert into public.leadmagnet_leads (leadmagnet, nombre, email, telefono, respuestas, puntuacion, resultado, atribucion)
    values (v_lm, v_nombre, v_email, v_tel, v_resp, v_puntos, v_res, v_atr)
    returning id into v_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.registrar_leadmagnet(jsonb) from public;
grant execute on function public.registrar_leadmagnet(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

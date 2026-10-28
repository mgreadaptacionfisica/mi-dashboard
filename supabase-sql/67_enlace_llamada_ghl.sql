-- Enlace de la videollamada de cada cita de GHL en el lead.
--
-- Para qué: el protocolo de llamada del panel (utils/protocoloLlamada.js)
-- tiene plantillas de WhatsApp para el recordatorio y el aviso de 10 minutos
-- que necesitan el enlace de la llamada. Sin esto la closer tenía que buscarlo
-- en GHL y pegarlo a mano. GHL lo manda en el webhook de la cita como el
-- "lugar" (normalmente calendar.address, que es donde pone el enlace de
-- Google Meet o Zoom). En leads creados a mano se puede escribir en la ficha.
--
-- Si después de correr esto los leads nuevos siguen sin enlace, mira en qué
-- campo lo manda tu calendario:
--   select payload -> 'calendar' from public.ghl_eventos order by id desc limit 5;
-- y, si es otro, ponlo en el Custom Data del webhook como
-- enlace = {{appointment.meeting_location}} (o el campo que sea): manda sobre
-- todo lo demás.

alter table public.ventas add column if not exists enlace_llamada text;

-- La función es la de 66_citas_ghl.sql, igual salvo por v_enlace.

create or replace function public.registrar_cita_ghl(jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b jsonb := $1;
  cd jsonb := coalesce($1 -> 'customData', '{}'::jsonb);
  cal jsonb := coalesce($1 -> 'calendar', $1 -> 'appointment', '{}'::jsonb);
  atr jsonb := coalesce($1 -> 'contact' -> 'attributionSource', $1 -> 'attributionSource',
                        $1 -> 'contact' -> 'lastAttributionSource', $1 -> 'lastAttributionSource', '{}'::jsonb);
  v_cita text;
  v_contacto text;
  v_estado text;
  v_nombre text;
  v_email text;
  v_telefono text;
  v_tel9 text;
  v_inicio text;
  v_ts timestamp;
  v_fecha date;
  v_hora text;
  v_closer text;
  v_canal text;
  v_atribucion jsonb;
  v_hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_lead public.ventas%rowtype;
  v_accion text;
  v_lead_id text;
  v_enlace text;
begin
  if not exists (
    select 1 from public.robot_claves
    where nombre = 'ghl' and clave = coalesce(cd ->> 'clave', b ->> 'clave')
  ) then
    raise exception 'clave no válida';
  end if;

  v_cita := nullif(trim(coalesce(cd ->> 'cita_id', cal ->> 'appointmentId', cal ->> 'appointment_id')), '');
  v_contacto := nullif(trim(coalesce(b ->> 'contact_id', b -> 'contact' ->> 'id')), '');
  v_estado := lower(coalesce(cd ->> 'estado', cal ->> 'appoinmentStatus', cal ->> 'appointmentStatus', cal ->> 'status', 'booked'));
  v_nombre := nullif(trim(coalesce(
    cd ->> 'nombre', b ->> 'full_name',
    concat_ws(' ', nullif(b ->> 'first_name', ''), nullif(b ->> 'last_name', ''))
  )), '');
  v_email := nullif(lower(trim(coalesce(b ->> 'email', b -> 'contact' ->> 'email', ''))), '');
  v_telefono := nullif(trim(coalesce(b ->> 'phone', b -> 'contact' ->> 'phone', '')), '');
  -- Los 9 últimos dígitos: "+34 600 00 00 00" y "600000000" son el mismo.
  v_tel9 := nullif(right(regexp_replace(coalesce(v_telefono, ''), '\D', '', 'g'), 9), '');
  v_closer := nullif(trim(coalesce(cd ->> 'closer', '')), '');

  -- Día y hora en hora de España. GHL suele mandar startTime sin zona
  -- ("2026-10-28T10:00:00", ya en la del calendario); si trae Z o desfase,
  -- se convierte. Si el formato no se entiende, el lead entra igual, sin
  -- fecha, y en ghl_eventos queda lo que llegó para corregirlo.
  v_inicio := nullif(trim(coalesce(cal ->> 'startTime', cal ->> 'start_time', '')), '');
  begin
    if v_inicio ~ '(Z|[+-]\d{2}:?\d{2})$' then
      v_ts := v_inicio::timestamptz at time zone 'Europe/Madrid';
    elsif v_inicio is not null then
      v_ts := v_inicio::timestamp;
    end if;
  exception when others then
    v_ts := null;
  end;
  -- Enlace de la videollamada (Meet/Zoom): GHL lo manda como "lugar" de la
  -- cita. Se acepta lo que se fuerce en Custom Data (`enlace`) y si no se
  -- mira en los campos donde suele venir; de cualquiera se saca la primera
  -- URL, porque a veces viene con texto alrededor. Sin URL → null (no se
  -- pisa uno que ya hubiera).
  v_enlace := substring(concat_ws(' ',
    cd ->> 'enlace', cal ->> 'address', cal ->> 'meetingLocation',
    cal ->> 'meeting_location', cal ->> 'location', b ->> 'meeting_location'
  ) from 'https?://[^\s"<>]+');

  v_fecha := coalesce(nullif(cd ->> 'fecha', '')::date, v_ts::date);
  v_hora := coalesce(nullif(cd ->> 'hora', ''), to_char(v_ts, 'HH24:MI'), '');

  v_atribucion := jsonb_strip_nulls(jsonb_build_object(
    'fuente', coalesce(nullif(cd ->> 'utm_source', ''), atr ->> 'utmSource', atr ->> 'source'),
    'medio', coalesce(atr ->> 'utmMedium', atr ->> 'medium'),
    'campana', coalesce(nullif(cd ->> 'utm_campaign', ''), atr ->> 'utmCampaign', atr ->> 'campaign'),
    'contenido', coalesce(nullif(cd ->> 'utm_content', ''), atr ->> 'utmContent'),
    'termino', atr ->> 'utmTerm',
    'anuncio', coalesce(atr ->> 'adName', atr ->> 'adId'),
    'conjunto', atr ->> 'adSetName',
    'fbclid', atr ->> 'fbclid',
    'url', coalesce(atr ->> 'url', atr ->> 'pageUrl'),
    'sesion', atr ->> 'sessionSource',
    'calendario', cal ->> 'calendarName'
  ));
  if v_atribucion = '{}'::jsonb then v_atribucion := null; end if;

  -- Canal del panel ('instagram' | 'whatsapp'): solo si se fuerza o si la
  -- fuente lo dice claro. Facebook Ads no es "instagram" por fuerza.
  v_canal := coalesce(
    nullif(lower(cd ->> 'canal'), ''),
    case when lower(coalesce(v_atribucion ->> 'fuente', '')) ~ '(^ig$|instagram)' then 'instagram' end
  );

  -- ¿Ya está esta cita?
  if v_cita is not null then
    select * into v_lead from public.ventas where ghl_cita_id = v_cita;
  end if;

  if v_estado in ('cancelled', 'canceled', 'cancelada', 'invalid') then
    if v_lead.id is not null and v_lead.etapa = 'agendada' and v_lead.resultado_llamada is null then
      update public.ventas set
        resultado_llamada = 'cancelada',
        historial_llamadas = coalesce(historial_llamadas, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'fecha', coalesce(fecha_agenda::text, ''), 'hora', coalesce(hora_agenda, ''),
          'resultado', 'cancelada', 'registradoEn', now())),
        etapa = 'seguimiento',
        etapa_anterior = 'agendada',
        origen_seguimiento = 'reagendar',
        seguimiento = '{"realizado": false, "contesta": null, "compraTrasSeguimiento": null}'::jsonb,
        recontacto = jsonb_build_object(
          'canal', 'WhatsApp', 'contacto', coalesce(telefono, ''),
          'motivo', 'Cancelada en el calendario de GHL — reagendar',
          'fechaContacto', (v_hoy + 2)::text,
          'contactado', false, 'respondido', null, 'comprado', null)
      where id = v_lead.id;
      v_accion := 'cancelada → seguimiento';
      v_lead_id := v_lead.id;
    else
      v_accion := 'cancelada ignorada (sin lead agendado de esta cita)';
      v_lead_id := v_lead.id;
    end if;

  elsif v_estado in ('booked', 'confirmed', 'rescheduled', 'new', 'reservada', 'confirmada') then
    -- Sin esa cita: buscar a la persona entre los que esperan llamada o
    -- reagendar (nunca por nombre).
    if v_lead.id is null then
      select * into v_lead from public.ventas
      where (etapa = 'agendada' or (etapa = 'seguimiento' and origen_seguimiento = 'reagendar'))
        and (
          (v_contacto is not null and ghl_contacto_id = v_contacto)
          or (v_tel9 is not null and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = v_tel9)
          or (v_email is not null and lower(trim(email)) = v_email)
        )
      order by creado_en desc nulls last
      limit 1;
    end if;

    if v_lead.id is not null and (v_lead.etapa = 'agendada'
        or (v_lead.etapa = 'seguimiento' and v_lead.origen_seguimiento = 'reagendar')) then
      update public.ventas set
        historial_llamadas = case
          when etapa = 'agendada' and resultado_llamada is null and fecha_agenda is not null
               and v_fecha is not null
               and (fecha_agenda is distinct from v_fecha or coalesce(hora_agenda, '') <> v_hora)
          then coalesce(historial_llamadas, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
            'fecha', fecha_agenda::text, 'hora', coalesce(hora_agenda, ''),
            'resultado', 'modificada', 'registradoEn', now()))
          else historial_llamadas end,
        fecha_agenda = coalesce(v_fecha, fecha_agenda),
        hora_agenda = case when v_fecha is not null then v_hora else hora_agenda end,
        etapa = 'agendada',
        resultado_llamada = null,
        origen_seguimiento = null,
        ghl_cita_id = coalesce(v_cita, ghl_cita_id),
        ghl_contacto_id = coalesce(ghl_contacto_id, v_contacto),
        telefono = coalesce(nullif(telefono, ''), v_telefono, ''),
        email = coalesce(nullif(email, ''), v_email, ''),
        closer = coalesce(nullif(closer, ''), v_closer, ''),
        canal_origen = coalesce(canal_origen, v_canal),
        atribucion = coalesce(atribucion, v_atribucion),
        enlace_llamada = coalesce(v_enlace, enlace_llamada)
      where id = v_lead.id;
      v_accion := 'reagendada';
      v_lead_id := v_lead.id;

    elsif v_lead.id is not null and v_lead.etapa in ('realizada', 'seguimiento') then
      v_accion := 'ignorada (ya tuvo su llamada; decide la closer)';
      v_lead_id := v_lead.id;

    else
      -- Nueva (o la persona ya estaba ganada/perdida: es otra oportunidad).
      -- Si la misma cita ya existía cerrada, el id único no deja repetirla.
      if v_lead.id is not null and v_lead.ghl_cita_id = v_cita then
        v_accion := 'ignorada (cita de un lead ya cerrado)';
        v_lead_id := v_lead.id;
      else
        v_lead_id := 'lead-ghl-' || coalesce(v_cita, replace(gen_random_uuid()::text, '-', ''));
        insert into public.ventas (
          id, nombre, email, telefono, closer, etapa, fecha_agenda, hora_agenda, creado_en,
          canal_origen, ghl_contacto_id, ghl_cita_id, atribucion, enlace_llamada
        ) values (
          v_lead_id, coalesce(v_nombre, 'Sin nombre (GHL)'), coalesce(v_email, ''),
          coalesce(v_telefono, ''), coalesce(v_closer, ''), 'agendada', v_fecha, v_hora, v_hoy,
          v_canal, v_contacto, v_cita, v_atribucion, v_enlace
        )
        on conflict (id) do nothing;
        v_accion := 'nuevo lead';
      end if;
    end if;

  else
    v_accion := 'ignorada (estado ' || v_estado || ')';
    v_lead_id := v_lead.id;
  end if;

  insert into public.ghl_eventos (accion, lead_id, payload)
  values (v_accion, v_lead_id, (b #- '{customData,clave}') - 'clave');

  return jsonb_build_object('ok', true, 'accion', v_accion, 'lead_id', v_lead_id);
end;
$$;

revoke all on function public.registrar_cita_ghl(jsonb) from public;
grant execute on function public.registrar_cita_ghl(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

-- Rellena el enlace de las citas que ya habían entrado, con el último evento
-- de cada lead que traiga una URL (los eventos se guardan enteros en
-- ghl_eventos). Solo toca leads sin enlace, así que repetirlo no cambia nada.
update public.ventas v set enlace_llamada = e.enlace
from (
  select distinct on (lead_id) lead_id,
    substring(concat_ws(' ',
      payload -> 'customData' ->> 'enlace',
      coalesce(payload -> 'calendar', payload -> 'appointment') ->> 'address',
      coalesce(payload -> 'calendar', payload -> 'appointment') ->> 'meetingLocation',
      coalesce(payload -> 'calendar', payload -> 'appointment') ->> 'meeting_location',
      coalesce(payload -> 'calendar', payload -> 'appointment') ->> 'location',
      payload ->> 'meeting_location'
    ) from 'https?://[^\s"<>]+') as enlace
  from public.ghl_eventos
  where lead_id is not null
  order by lead_id, id desc
) e
where e.lead_id = v.id and e.enlace is not null
  and coalesce(v.enlace_llamada, '') = '';

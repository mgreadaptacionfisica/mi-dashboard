-- Historial de intentos de llamada de cada lead.
--
-- El problema: hasta ahora un lead solo guardaba UNA llamada — `fecha_agenda`
-- + `resultado_llamada`. Al reagendar se sobrescribe la fecha y se limpia el
-- resultado, así que el intento anterior desaparece: si alguien no se
-- presentó el martes y se le reagendó para la semana siguiente, ese no show
-- dejaba de existir. Para el resumen semanal de Ventas (llamadas tenidas, no
-- shows, cancelaciones de esa semana) eso significa números que se corrigen
-- solos hacia abajo con el tiempo, que es justo lo que no se quiere de un KPI.
--
-- La solución: una lista con cada intento, que solo crece. El "estado actual"
-- de la llamada sigue viviendo donde vivía (`fecha_agenda`, `hora_agenda`,
-- `resultado_llamada`) — esto es el registro histórico, no lo sustituye.
--
-- Cada elemento: { fecha, hora, resultado, registradoEn }
--   - fecha/hora: para cuándo estaba puesta esa llamada (lo que tenía el lead
--     en ese momento), NO cuándo se apuntó el resultado.
--   - resultado: 'realizada' | 'no_show' | 'cancelada' | 'modificada'.
--   - registradoEn: marca de tiempo de cuándo se apuntó (informativa).

alter table public.ventas
  add column if not exists historial_llamadas jsonb not null default '[]'::jsonb;

comment on column public.ventas.historial_llamadas is
  'Lista de intentos de llamada [{fecha, hora, resultado, registradoEn}] — solo crece, no se sobrescribe al reagendar';

-- Relleno de lo que ya hay: a los leads cuya llamada ya tuvo un desenlace se
-- les crea su primer registro con lo que sabemos hoy, para que las semanas
-- pasadas no salgan vacías en el resumen. Solo se puede reconstruir el ÚLTIMO
-- intento (es el único que sobrevivió a los reagendados), así que un lead que
-- se reagendó tres veces aparecerá con uno solo: lo anterior no está guardado
-- en ningún sitio y no hay de dónde sacarlo.
--
-- Idempotente por el `historial_llamadas = '[]'` : si se vuelve a ejecutar,
-- no toca los leads que ya tienen historial.
--
-- El coalesce a 'realizada' cubre los leads antiguos, anteriores a que
-- existiera `resultado_llamada`: si el lead ya pasó de "agendada", la llamada
-- se dio (es el mismo criterio que aplica el panel).
update public.ventas
set historial_llamadas = jsonb_build_array(
  jsonb_build_object(
    'fecha', fecha_agenda::text,
    'hora', coalesce(hora_agenda, ''),
    'resultado', coalesce(resultado_llamada, 'realizada'),
    'registradoEn', null
  )
)
where historial_llamadas = '[]'::jsonb
  and fecha_agenda is not null
  and (
    resultado_llamada is not null
    or etapa in ('realizada', 'seguimiento', 'ganada', 'perdida')
  );

notify pgrst, 'reload schema';

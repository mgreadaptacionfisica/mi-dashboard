-- Respuestas en hilo para el Muro de comunicación: cada mensaje puede
-- opcionalmente ser respuesta directa de otro (respuesta_a_id). Solo un
-- nivel de hilo (no se responde a una respuesta) — mismo criterio que
-- MuroEquipo.jsx. on delete cascade: si se borra el mensaje raíz, sus
-- respuestas se borran solas (evita respuestas huérfanas).
alter table public.mensajes_equipo
  add column if not exists respuesta_a_id text references public.mensajes_equipo(id) on delete cascade;

notify pgrst, 'reload schema';

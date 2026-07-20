-- Arreglo final y completo de "Hilde Niego" -> "Hilde Nieto" (nombre
-- corregido en la ficha del cliente). El intento anterior (48) falló
-- porque, para la semana del 2026-07-19, ya existía una fila con el
-- nombre nuevo en "seguimientos" y en "contactos_semanales" (se creó
-- vacía/con algún dato nuevo al usar la ficha ya con el nombre
-- corregido) — chocaba con la fila antigua de esa misma semana.
-- Este script fusiona esas dos filas conflictivas sin perder datos y
-- luego renombra todo lo demás (que no tiene conflicto).

-- 1) Fusiona la semana en conflicto en "seguimientos": junta las tareas
--    de cada día, el comentario, los cambios pendientes y las revisiones
--    de ambas filas en la fila que se queda (la del nombre nuevo).
update public.seguimientos b
set
  dias = jsonb_build_object(
    'lunes', jsonb_build_object('tareas', coalesce(a.dias->'lunes'->'tareas', '[]'::jsonb) || coalesce(b.dias->'lunes'->'tareas', '[]'::jsonb)),
    'martes', jsonb_build_object('tareas', coalesce(a.dias->'martes'->'tareas', '[]'::jsonb) || coalesce(b.dias->'martes'->'tareas', '[]'::jsonb)),
    'miercoles', jsonb_build_object('tareas', coalesce(a.dias->'miercoles'->'tareas', '[]'::jsonb) || coalesce(b.dias->'miercoles'->'tareas', '[]'::jsonb)),
    'jueves', jsonb_build_object('tareas', coalesce(a.dias->'jueves'->'tareas', '[]'::jsonb) || coalesce(b.dias->'jueves'->'tareas', '[]'::jsonb)),
    'viernes', jsonb_build_object('tareas', coalesce(a.dias->'viernes'->'tareas', '[]'::jsonb) || coalesce(b.dias->'viernes'->'tareas', '[]'::jsonb)),
    'sabado', jsonb_build_object('tareas', coalesce(a.dias->'sabado'->'tareas', '[]'::jsonb) || coalesce(b.dias->'sabado'->'tareas', '[]'::jsonb)),
    'domingo', jsonb_build_object('tareas', coalesce(a.dias->'domingo'->'tareas', '[]'::jsonb) || coalesce(b.dias->'domingo'->'tareas', '[]'::jsonb))
  ),
  comentarios = case when coalesce(a.comentarios, '') <> '' then a.comentarios else b.comentarios end,
  cambios_pendientes = coalesce(a.cambios_pendientes, '[]'::jsonb) || coalesce(b.cambios_pendientes, '[]'::jsonb),
  revisiones = coalesce(a.revisiones, '[]'::jsonb) || coalesce(b.revisiones, '[]'::jsonb)
from public.seguimientos a
where a.cliente_nombre = 'Hilde Niego' and a.semana = '2026-07-19'
  and b.cliente_nombre = 'Hilde Nieto' and b.semana = '2026-07-19';

delete from public.seguimientos
where cliente_nombre = 'Hilde Niego' and semana = '2026-07-19';

-- 2) Fusiona la semana en conflicto en "contactos_semanales": para cada
--    punto (inicio/mitad/fin) se queda el que esté marcado como hecho.
update public.contactos_semanales b
set
  inicio = case when coalesce((a.inicio->>'hecho')::boolean, false) then a.inicio else b.inicio end,
  mitad  = case when coalesce((a.mitad->>'hecho')::boolean, false) then a.mitad else b.mitad end,
  fin    = case when coalesce((a.fin->>'hecho')::boolean, false) then a.fin else b.fin end
from public.contactos_semanales a
where a.cliente_nombre = 'Hilde Niego' and a.semana = '2026-07-19'
  and b.cliente_nombre = 'Hilde Nieto' and b.semana = '2026-07-19';

delete from public.contactos_semanales
where cliente_nombre = 'Hilde Niego' and semana = '2026-07-19';

-- 3) Ahora que no quedan conflictos, renombra todo lo demás.
update public.seguimientos
  set cliente_nombre = 'Hilde Nieto' where cliente_nombre = 'Hilde Niego';
update public.contactos_semanales
  set cliente_nombre = 'Hilde Nieto' where cliente_nombre = 'Hilde Niego';
update public.valoraciones_clientes
  set cliente_nombre = 'Hilde Nieto' where cliente_nombre = 'Hilde Niego';
update public.objetivos_cliente_fase
  set cliente_nombre = 'Hilde Nieto' where cliente_nombre = 'Hilde Niego';
update public.revisiones_semanales_cliente
  set cliente_nombre = 'Hilde Nieto' where cliente_nombre = 'Hilde Niego';

notify pgrst, 'reload schema';

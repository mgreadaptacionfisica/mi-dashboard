-- 76 · Qué explicar al cliente la semana que viene (Raúl, 2026-11-15)
--
-- Al cerrar la semana de un cliente, el fisio apunta qué le tiene que
-- explicar a la semana siguiente: los cambios de la rutina y por qué ("te
-- he subido el press porque llegaste a 12 en todas", "esta semana bajamos
-- el volumen por la molestia"…). Antes se apuntaba en otro sitio y se
-- perdía. Se guarda en la semana que se cierra y el panel lo enseña en la
-- SIGUIENTE: en el 🤝 contacto de inicio de semana y arriba de su ficha.
--
-- Es distinto del comentario semanal (`comentarios`), que es para Raúl.

alter table public.seguimientos add column if not exists para_cliente text;

notify pgrst, 'reload schema';

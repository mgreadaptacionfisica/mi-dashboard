-- Bug encontrado: la ficha de Raúl como entrenador ("Raúl Morales", área
-- tecnico) se creó con email vacío (ver 03_miembros_equipo.sql). La vista
-- ClientesEquipo.jsx identifica "quién ha iniciado sesión" cruzando el email
-- de login contra team.tecnico[].email — con email vacío ese cruce nunca
-- puede coincidir, así que la ficha de Raúl como entrenador nunca se
-- encontraba y su vista de equipo salía vacía aunque sí tiene clientes
-- asignados como "Raúl Morales" en clientes.trabajadores.
update public.miembros_equipo
set email = 'mgreadaptacionfisica@gmail.com'
where id = 'team-tecnico-raul';

notify pgrst, 'reload schema';

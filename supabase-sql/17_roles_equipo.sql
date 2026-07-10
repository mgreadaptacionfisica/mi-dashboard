-- Plantilla para dar rol a cada persona del equipo, DESPUÉS de crear su
-- cuenta en Authentication > Users > Add user (con "Auto Confirm User"
-- marcado). Sustituye los emails de ejemplo por los reales y ejecuta solo
-- las líneas de las personas a las que ya les hayas creado la cuenta —
-- puedes ir añadiendo el resto más adelante, según vayas dando acceso.
--
-- Roles válidos: 'admin' | 'closer' | 'tecnico' | 'contenido'.
-- Después de ejecutar esto, cada persona tiene que cerrar sesión y volver
-- a entrar (si ya había iniciado sesión antes) para que el rol nuevo se
-- refleje en el panel.

-- Javier González (técnico)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"rol": "tecnico"}'::jsonb
where email = 'javier@ejemplo.com';

-- Pedro Álamo (técnico)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"rol": "tecnico"}'::jsonb
where email = 'pedro@ejemplo.com';

-- Juan García (closer)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"rol": "closer"}'::jsonb
where email = 'juan@ejemplo.com';

-- Rocío Agüero (contenido)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"rol": "contenido"}'::jsonb
where email = 'rocio@ejemplo.com';

-- Para comprobar qué rol tiene cada cuenta ya creada:
-- select email, raw_app_meta_data ->> 'rol' as rol from auth.users;

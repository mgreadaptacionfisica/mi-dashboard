-- Corrección real (el 47 usaba el nombre viejo equivocado "Hilge Nieto";
-- comprobando los datos en Supabase, el nombre que realmente quedó
-- grabado es "Hilde Niego" — la G y la T están cambiadas de sitio).
-- Deja todas las tablas con el nombre correcto: "Hilde Nieto".
update public.valoraciones_clientes
  set cliente_nombre = 'Hilde Nieto'
  where cliente_nombre = 'Hilde Niego';

update public.objetivos_cliente_fase
  set cliente_nombre = 'Hilde Nieto'
  where cliente_nombre = 'Hilde Niego';

update public.seguimientos
  set cliente_nombre = 'Hilde Nieto'
  where cliente_nombre = 'Hilde Niego';

update public.contactos_semanales
  set cliente_nombre = 'Hilde Nieto'
  where cliente_nombre = 'Hilde Niego';

update public.revisiones_semanales_cliente
  set cliente_nombre = 'Hilde Nieto'
  where cliente_nombre = 'Hilde Niego';

notify pgrst, 'reload schema';

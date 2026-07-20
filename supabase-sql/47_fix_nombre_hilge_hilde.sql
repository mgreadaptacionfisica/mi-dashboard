-- Corrige el nombre "Hilge Nieto" -> "Hilde Nieto" en todas las tablas que
-- guardan el historial del cliente enlazado por nombre (no por id): al
-- corregir el nombre en la ficha del cliente, el resto de tablas se quedó
-- con el nombre viejo y dejó de encajar (valoración/fases parecían haber
-- desaparecido, pero seguían ahí bajo el nombre anterior).
update public.seguimientos
  set cliente_nombre = 'Hilde Nieto'
  where cliente_nombre = 'Hilge Nieto';

update public.contactos_semanales
  set cliente_nombre = 'Hilde Nieto'
  where cliente_nombre = 'Hilge Nieto';

update public.valoraciones_clientes
  set cliente_nombre = 'Hilde Nieto'
  where cliente_nombre = 'Hilge Nieto';

update public.objetivos_cliente_fase
  set cliente_nombre = 'Hilde Nieto'
  where cliente_nombre = 'Hilge Nieto';

update public.revisiones_semanales_cliente
  set cliente_nombre = 'Hilde Nieto'
  where cliente_nombre = 'Hilge Nieto';

notify pgrst, 'reload schema';

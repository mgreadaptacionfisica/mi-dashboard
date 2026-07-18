-- Se quita el catálogo compartido de objetivos por fase de la interfaz
-- (a petición de Raúl: cada cliente tiene un objetivo distinto, no tenía
-- sentido que el mismo catálogo apareciera al cambiar de cliente). El
-- objetivo pasa a ser 100% texto libre por valoración (columna "objetivo",
-- que ya existía).
--
-- Se añade una columna nueva para poder confirmar si el objetivo (texto
-- libre) de la valoración anterior se cumplió, y así seguir avisando si
-- se sube de fase sin confirmarlo — sustituye al mecanismo anterior
-- basado en los checkboxes del catálogo (objetivos_cumplidos).
--
-- No se borra nada: la tabla objetivos_fase y las columnas
-- objetivos_seleccionados/objetivos_cumplidos se quedan tal cual para que
-- las valoraciones antiguas que ya las usaban se seguán viendo bien en el
-- historial. Simplemente ya no se rellenan desde el formulario.
alter table public.valoraciones_clientes
  add column if not exists objetivo_anterior_confirmado boolean default false;

notify pgrst, 'reload schema';

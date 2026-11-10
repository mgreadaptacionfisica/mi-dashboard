-- 🎯 Objetivos automáticos por fase: la valoración guarda peso corporal,
-- sexo y deporte.
--
-- Por qué: los objetivos de Fase 2 son las referencias de fuerza en % de
-- peso corporal (p. ej. press vertical unilateral 15 % mujeres / 20 %
-- hombres), y para pasarlas a kilos hace falta el peso y el sexo de la
-- persona, que hasta ahora no se guardaban en ningún sitio. El deporte
-- decide los objetivos de Fase 3 (DEPORTES en
-- src/utils/objetivosAutomaticos.js).
--
-- Van en la valoración y no en la ficha del cliente porque el peso cambia
-- con el tiempo y quien los apunta es el fisio al valorar. El panel usa el
-- último que se haya apuntado y lo arrastra a la valoración siguiente.
--
-- Se puede ejecutar más de una vez sin problema.

alter table public.valoraciones_clientes add column if not exists peso_corporal numeric;
alter table public.valoraciones_clientes add column if not exists sexo text;
alter table public.valoraciones_clientes add column if not exists deporte text;

alter table public.valoraciones_clientes drop constraint if exists valoraciones_clientes_sexo_check;
alter table public.valoraciones_clientes add constraint valoraciones_clientes_sexo_check
  check (sexo is null or sexo in ('mujer', 'hombre'));

notify pgrst, 'reload schema';

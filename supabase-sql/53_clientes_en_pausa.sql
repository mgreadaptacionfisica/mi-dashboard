-- Estado "EN PAUSA" para clientes.
--
-- Hasta ahora un cliente solo podía estar 'ACTIVO' o 'NO ACTIVO', y eso deja
-- fuera un caso real y frecuente: gente que ya ha comprado pero TODAVÍA NO ha
-- empezado (o que para temporalmente y volverá). Marcarlos como ACTIVO ensucia
-- el seguimiento (aparecen en la rejilla del equipo técnico sin nada que
-- registrar) y marcarlos NO ACTIVO los da por perdidos y desasigna al técnico.
--
-- Solución: un tercer estado 'EN PAUSA' + una fecha en la que hay que
-- retomarlos (avisar al cliente / darle de alta). La columna `estado` es
-- texto libre, así que no hace falta tocar ningún check ni enum: solo se
-- añaden los dos campos de la pausa.
--
--  - pausa_hasta:  fecha ISO (AAAA-MM-DD) en la que toca retomar al cliente.
--                  Se muestra en el listado, salta como aviso en el Dashboard
--                  cuando llega el día y aparece en el Calendario de avisos.
--  - pausa_motivo: texto libre opcional ("aún no ha empezado", "lesionado",
--                  "de viaje"...), para que el equipo sepa por qué está parado.
--
-- Se guardan como TEXT, igual que el resto de fechas de esta tabla (ver el
-- comentario de 04_clientes.sql): en todo el panel las fechas de cliente son
-- texto y se interpretan con parseFechaFlexible.

alter table public.clientes add column if not exists pausa_hasta text default '';
alter table public.clientes add column if not exists pausa_motivo text default '';

comment on column public.clientes.estado is 'ACTIVO | EN PAUSA | NO ACTIVO';
comment on column public.clientes.pausa_hasta is 'Fecha (ISO) en la que hay que retomar al cliente en pausa';
comment on column public.clientes.pausa_motivo is 'Por qué está en pausa (texto libre, opcional)';

notify pgrst, 'reload schema';

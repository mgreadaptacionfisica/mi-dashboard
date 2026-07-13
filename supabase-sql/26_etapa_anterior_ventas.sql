-- Guarda en qué etapa estaba el lead justo antes del último cambio, para
-- poder ofrecer un botón "Volver a la etapa anterior" en el detalle del
-- lead (por si se marca "llamada realizada", "compró"/"no compró", etc.
-- por error). Se rellena solo desde Ventas.jsx cada vez que el lead avanza
-- de etapa; no hace falta backfill porque los leads ya existentes
-- simplemente no tendrán botón de "volver atrás" hasta su próximo cambio.
alter table public.ventas add column if not exists etapa_anterior text;

notify pgrst, 'reload schema';

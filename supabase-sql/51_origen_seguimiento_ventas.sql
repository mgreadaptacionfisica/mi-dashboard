-- Al marcar una llamada agendada como "no realizada" (cancelada, no show,
-- modificada), ahora se puede elegir entre reagendar en el momento o pasar
-- el lead a la etapa "seguimiento" con un aviso de recontacto (columna
-- `recontacto`, ya existente) para intentarlo en unos días. Esta columna
-- distingue ese "seguimiento por cancelación" del seguimiento normal
-- post-llamada (cuando la persona no compró en la propia llamada), para
-- mostrar el paso siguiente correcto en Ventas.jsx ("¿Reagenda?" en vez de
-- "¿Compra?").
alter table public.ventas add column if not exists origen_seguimiento text;

notify pgrst, 'reload schema';

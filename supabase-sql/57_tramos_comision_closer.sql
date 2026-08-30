-- 57. Comisión por tramos para los closers.
--
-- Hasta ahora cada closer tenía un porcentaje único (`comision`) que se
-- aplicaba a todo lo que facturaba en el mes. Raúl quiere poder premiar el
-- volumen: por ejemplo, hasta la venta 9 el 10% y de la 10 en adelante el 12%.
--
-- Se guarda como jsonb con la forma:
--   [{"desde": 1, "porcentaje": 10}, {"desde": 10, "porcentaje": 12}]
-- donde "desde" es el número de venta DEL MES en el que empieza ese tramo.
-- Los tramos son marginales (solo de la venta 10 en adelante se paga al 12%;
-- las 9 primeras siguen al 10%), y el contador se reinicia cada mes.
--
-- La columna `comision` se mantiene: quien no tenga tramos sigue cobrando su
-- porcentaje plano de siempre. Si hay tramos, mandan los tramos.

alter table if exists public.miembros_equipo
  add column if not exists tramos_comision jsonb;

comment on column public.miembros_equipo.tramos_comision is
  'Tramos de comisión del closer por nº de ventas del mes: [{"desde":1,"porcentaje":10},{"desde":10,"porcentaje":12}]. Marginales. Si está vacío se usa la columna comision (% plano).';

notify pgrst, 'reload schema';

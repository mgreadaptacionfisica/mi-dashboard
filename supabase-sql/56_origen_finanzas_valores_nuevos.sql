-- Arreglo: al guardar un gasto de comisión de pasarela (o una fila generada
-- por una regla recurrente) Supabase rechazaba el insert con
--   new row for relation "gastos_empresa" violates check constraint
--   "gastos_profesionales_origen_check"
--
-- Por qué: la columna "origen" nació en la migración 11 (cuando la tabla se
-- llamaba gastos_profesionales) aceptando solo 'manual' y 'equipo'. Después
-- se añadieron dos orígenes automáticos más en el frontend y nadie amplió el
-- check, que además conserva el nombre viejo porque ALTER TABLE ... RENAME
-- no renombra las constraints:
--   - 'comision_pasarela' -> src/utils/comisionesHelpers.js (comisión que se
--     apunta como gasto junto al ingreso de cada cobro)
--   - 'recurrente'        -> src/utils/recurrenciaHelpers.js (migración 37)
--
-- Lo mismo le pasa a ingresos_empresa: su check (migración 15) solo permite
-- 'manual' y 'cobro_cliente', pero las reglas recurrentes también escriben
-- ahí con origen 'recurrente'. Se amplían los dos a la vez para que no salte
-- el mismo error al primer ingreso recurrente que se genere.
--
-- Idempotente: se borran los checks (con el nombre viejo y con el nuevo, por
-- si en algún entorno se recreó la tabla ya renombrada) y se vuelven a crear.

alter table public.gastos_empresa
  drop constraint if exists gastos_profesionales_origen_check,
  drop constraint if exists gastos_empresa_origen_check;

alter table public.gastos_empresa
  add constraint gastos_empresa_origen_check
  check (origen in ('manual', 'equipo', 'comision_pasarela', 'recurrente'));

alter table public.ingresos_empresa
  drop constraint if exists ingresos_personales_origen_check,
  drop constraint if exists ingresos_empresa_origen_check;

alter table public.ingresos_empresa
  add constraint ingresos_empresa_origen_check
  check (origen in ('manual', 'cobro_cliente', 'recurrente'));

notify pgrst, 'reload schema';

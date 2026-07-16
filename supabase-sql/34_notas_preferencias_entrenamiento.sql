-- Tercera nota de Valoración: preferencias de entrenamiento (días
-- disponibles, material del que dispone, gustos con los ejercicios). Es
-- información logística/de preferencia, no clínica, que el SOP "4.
-- Preparación del programa" pide revisar antes de armar el programa —
-- antes no vivía en ningún sitio estructurado del panel.
alter table public.valoraciones_clientes
  add column if not exists notas_preferencias_entrenamiento text default '';

notify pgrst, 'reload schema';

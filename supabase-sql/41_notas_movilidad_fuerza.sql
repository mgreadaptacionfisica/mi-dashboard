-- Dos notas más de Valoración: comentario libre para lo que se detecte
-- durante la evaluación de movilidad (cabeza adelantada, hombro
-- adelantado, escoliosis, etc.) y comentario libre para lo detectado en
-- la evaluación de fuerza. Igual que las 3 notas anteriores
-- (notas_dolor, notas_evaluacion_inicial, notas_preferencias_entrenamiento):
-- campo de texto opcional, sin estructura fija.
alter table public.valoraciones_clientes
  add column if not exists notas_movilidad text default '';

alter table public.valoraciones_clientes
  add column if not exists notas_fuerza text default '';

notify pgrst, 'reload schema';

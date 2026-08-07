-- Diagnóstico diferencial de hombro dentro de la valoración funcional.
--
-- El protocolo interno (public/rcsrp-5-valoracion-clinica.pdf) plantea el
-- RCSRP como diagnóstico POR DESCARTE: se van descartando cervical, hombro
-- rígido, inestabilidad, articulación AC y tendinopatía proximal del bíceps,
-- y lo que queda es RCSRP. Cada test se anota como 'positivo' o 'negativo'
-- (la ausencia de clave = sin evaluar, que no es lo mismo que negativo).
--
-- Se guarda como jsonb en la propia valoración, no en una tabla aparte, por
-- dos motivos: va fechado junto al resto de la valoración (se puede repetir
-- en una revisión posterior si el cuadro cambia) y sigue el mismo patrón que
-- los demás bloques (fuerza, movilidad_hombro, spadi...), que ya son jsonb.
--
-- Forma del jsonb:
--   {
--     "cervical":      { "spurling": "negativo", "neurodinamia": "positivo" },
--     "hombroRigido":  { "romPasivoLimitado": "negativo" },
--     ...
--   }
-- Los ids de paso y de test están en src/utils/diagnosticoDiferencial.js.

alter table public.valoraciones_clientes
  add column if not exists diagnostico_diferencial jsonb not null default '{}'::jsonb;

comment on column public.valoraciones_clientes.diagnostico_diferencial is
  'Diagnóstico diferencial de hombro (RCSRP por descarte). { pasoId: { testId: positivo|negativo } }. Ver src/utils/diagnosticoDiferencial.js';

-- Las filas antiguas se quedan con '{}' por el default, que es exactamente
-- lo que el frontend interpreta como "sin evaluar" — no hay que migrar nada.

notify pgrst, 'reload schema';

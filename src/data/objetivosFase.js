// Catálogo de objetivos por fase (ver supabase-sql/31_valoracion_v2.sql).
// Fallback estático por si Supabase no responde — se usa solo si la tabla
// remota "objetivos_fase" no está disponible.
//
// { id, fase: 1|2|3|4, texto: '', orden: number }
const objetivosFase = [
  { id: 'obj-fase1-1', fase: 1, texto: 'Reducir irritabilidad y ganar la movilidad concreta que le falte — solo los ejercicios necesarios, sin saturar.', orden: 1 },
  { id: 'obj-fase2-1', fase: 2, texto: 'Reducir irritabilidad y ganar fuerza.', orden: 1 },
  { id: 'obj-fase2-2', fase: 2, texto: 'Marcar objetivo de carga para pasar a la siguiente fase.', orden: 2 },
  { id: 'obj-fase3-1', fase: 3, texto: 'Objetivo según el deporte, muy concreto (ej: conseguir hacer snatch sin dolor).', orden: 1 },
  { id: 'obj-fase4-1', fase: 4, texto: 'Objetivo de rendimiento, muy concreto (ej: conseguir un snatch con 100kg).', orden: 1 },
]

export default objetivosFase

// Valoraciones funcionales de clientes (migrado completo del Excel "VALORACIÓN Y SEGUIMIENTO",
// ampliado después con el rediseño de julio 2026: fuerza con peso+reps, semáforos de
// movilidad, notas separadas y objetivos por fase). A diferencia del Excel original
// (3 fechas fijas por ítem), aquí el historial es abierto: se añade una valoración
// nueva cada vez que se reevalúa al cliente, sin límite.
//
// { id, clienteNombre, fecha: 'YYYY-MM-DD',
//   fuerza: { [itemId]: number | { peso: number, reps: number } },  // ver ITEMS_FUERZA (pesoReps)
//   pliometria: { [itemId]: number }, fuerzaCervical: { [itemId]: number },
//   movilidadHombro: { [itemId]: { color: 'verde'|'amarillo'|'rojo' } },
//   movilidadCervical: { [itemId]: { color } }, movilidadEscapular: { [itemId]: { color } },
//   movilidadGeneral: { [itemId]: { color, dominancia?: 'cadera'|'rodilla', patron?: 'flexion'|'extension' } },
//   spadi: { 1: number, ..., 13: number }, tampa: { 1: number, ..., 11: number },
//   notasDolor: '' (pegado del formulario externo de dolor),
//   notasEvaluacionInicial: '',
//   notasPreferenciasEntrenamiento: '' (días disponibles, material, gustos — se arrastra automáticamente de la valoración anterior al crear una nueva),
//   notasMovilidad: '' (comentario libre bajo el bloque Movilidad general: cabeza adelantada, hombro adelantado, escoliosis, etc.),
//   notasFuerza: '' (comentario libre bajo el bloque Fuerza),
//   dolorEnDeporte: true|false|null (solo relevante si SPADI=0, distingue fase 3 de fase 4),
//   fase: 1|2|3|4|null (confirmada por el técnico; el panel la sugiere a partir del SPADI),
//   objetivo: '' (texto libre adicional),
//   objetivosSeleccionados: ['obj-fase1-1', ...] (ids del catálogo objetivos_fase, marcados como META en esta valoración),
//   objetivosCumplidos: ['obj-fase1-1', ...] (subconjunto de los objetivosSeleccionados de la valoración ANTERIOR que se marcan como cumplidos al hacer esta valoración nueva) }
//
// Nota: la columna "dinamometria" existe todavía en Supabase (datos históricos)
// pero ya no se usa desde el panel — el bloque se eliminó.
// Ver src/utils/valoracionHelpers.js para el listado completo de ítems por bloque,
// los índices de simetría (pares Dx/Izq) y el cálculo de totales SPADI/TAMPA.
const valoracionesClientes = []

export default valoracionesClientes

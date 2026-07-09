// Valoraciones funcionales de clientes (migrado completo del Excel "VALORACIÓN Y SEGUIMIENTO").
// A diferencia del Excel original (3 fechas fijas por ítem), aquí el historial es abierto:
// se añade una valoración nueva cada vez que se reevalúa al cliente, sin límite.
//
// { id, clienteNombre, fecha: 'YYYY-MM-DD',
//   fuerza: { [itemId]: number }, dinamometria: { [itemId]: number }, pliometria: { [itemId]: number },
//   fuerzaCervical: { [itemId]: number }, movilidadHombro: { [itemId]: number },
//   movilidadCervical: { [itemId]: number }, movilidadEscapular: { [itemId]: number },
//   movilidadGeneral: { [itemId]: number },
//   spadi: { 1: number, ..., 13: number }, tampa: { 1: number, ..., 11: number },
//   notas: '' }
// Ver src/utils/valoracionHelpers.js para el listado completo de ítems por bloque,
// los índices de simetría (pares Dx/Izq) y el cálculo de totales SPADI/TAMPA.
const valoracionesClientes = []

export default valoracionesClientes

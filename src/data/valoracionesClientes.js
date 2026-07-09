// Valoraciones funcionales de clientes (migrado del Excel "VALORACIÓN Y SEGUIMIENTO").
// A diferencia del Excel original (3 fechas fijas por ítem), aquí el historial es abierto:
// se añade una valoración nueva cada vez que se reevalúa al cliente, sin límite.
//
// { id, clienteNombre, fecha: 'YYYY-MM-DD',
//   fuerza: { [itemId]: number }, movilidadHombro: { [itemId]: number },
//   spadi: { 1: number, ..., 13: number }, tampa: { 1: number, ..., 11: number },
//   notas: '' }
const valoracionesClientes = []

export default valoracionesClientes

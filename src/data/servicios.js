// Catálogo real de programas/servicios de MG Readaptación Física.
// Se usa en el formulario de venta (Ventas.jsx) para auto-rellenar precio y
// calcular la fecha de fin del programa (meses de duración).
const SERVICIOS = [
  { id: 'readaptate-cuatrimestral', nombre: 'PROGRAMA READAPTATE CUATRIMESTRAL', precio: 697, meses: 4 },
  { id: 'readaptate-semestral', nombre: 'PROGRAMA READAPTATE SEMESTRAL', precio: 997, meses: 6 },
  { id: 'readaptate-anual', nombre: 'PROGRAMA READAPTATE ANUAL', precio: 1797, meses: 12 },
  { id: 'previene-cuatrimestral', nombre: 'PROGRAMA PREVIENE CUATRIMESTRAL (low ticket)', precio: 397, meses: 4 },
  { id: 'sesion-evaluacion', nombre: 'SESIÓN EVALUACIÓN', precio: 70, meses: 0 },
  { id: 'reserva-cuatrimestre', nombre: 'RESERVA CUATRIMESTRE', precio: 70, meses: 0 },
  { id: 'reserva-semestre', nombre: 'RESERVA SEMESTRE', precio: 100, meses: 0 },
]

export default SERVICIOS

// Utilidades para la valoración funcional de clientes (migrado del Excel
// "VALORACIÓN Y SEGUIMIENTO"). Empezamos por lo esencial: test de fuerza,
// movilidad de hombro, y los cuestionarios validados SPADI y TAMPA.
// El resto de bloques del Excel (dinamometría, pliometría, fuerza cervical,
// movilidad cervical/escapular/general, simetrías) se pueden añadir después.

export const ITEMS_FUERZA = [
  { id: 'posteriorShoulderEnduranceIzq', label: 'Posterior shoulder endurance test Izq', unidad: 's' },
  { id: 'posteriorShoulderEnduranceDx', label: 'Posterior shoulder endurance test Dx', unidad: 's' },
  { id: 'amrapRemoInvertido90', label: 'AMRAP remo invertido 90º', unidad: 'reps' },
  { id: 'amrapFlexiones', label: 'AMRAP flexiones', unidad: 'reps' },
  { id: 'reMancuernaIzq10RM', label: 'Rotación externa con mancuerna Izq (10RM)', unidad: 'kg' },
  { id: 'reMancuernaDx10RM', label: 'Rotación externa con mancuerna Dcho (10RM)', unidad: 'kg' },
  { id: 'elevacionesLateralesIzq10RM', label: 'Elevaciones laterales Izq (10RM)', unidad: 'kg' },
  { id: 'elevacionesLateralesDx10RM', label: 'Elevaciones laterales Dx (10RM)', unidad: 'kg' },
  { id: 'pressVerticalUnilateralIzq10RM', label: 'Press vertical unilateral Izq (10RM)', unidad: 'kg' },
  { id: 'pressVerticalUnilateralDx10RM', label: 'Press vertical unilateral Dcho (10RM)', unidad: 'kg' },
  { id: 'pressMilitar5RM', label: '5RM Press militar', unidad: 'kg' },
]

// Valores de referencia (hoja "VALORES DE REFERENCIA" del Excel original).
// Solo se incluyen los ítems que tienen equivalente directo en ITEMS_FUERZA.
export const REFERENCIA_FUERZA = {
  posteriorShoulderEnduranceIzq: { mujeres: '45s', hombres: '45s' },
  posteriorShoulderEnduranceDx: { mujeres: '45s', hombres: '45s' },
  amrapRemoInvertido90: { mujeres: '13 reps', hombres: '19 reps' },
  amrapFlexiones: { mujeres: '10 reps', hombres: '30 reps' },
  elevacionesLateralesIzq10RM: { mujeres: '10%BW', hombres: '20%BW' },
  elevacionesLateralesDx10RM: { mujeres: '10%BW', hombres: '20%BW' },
  pressVerticalUnilateralIzq10RM: { mujeres: '15%BW', hombres: '20%BW' },
  pressVerticalUnilateralDx10RM: { mujeres: '15%BW', hombres: '20%BW' },
  pressMilitar5RM: { mujeres: '50%BW', hombres: '80%BW' },
  reMancuernaIzq10RM: { mujeres: '10%BW', hombres: '10%BW' },
  reMancuernaDx10RM: { mujeres: '10%BW', hombres: '10%BW' },
}

export const ITEMS_MOVILIDAD_HOMBRO = [
  { id: 'flexionHombroDx', label: 'Flexión hombro derecho' },
  { id: 'flexionHombroIzq', label: 'Flexión hombro izquierdo' },
  { id: 'reDesdeAbdDx', label: 'RE desde ABD derecho' },
  { id: 'reDesdeAbdIzq', label: 'RE desde ABD izquierdo' },
  { id: 'riDesdeAbdDx', label: 'RI desde ABD derecho' },
  { id: 'riDesdeAbdIzq', label: 'RI desde ABD izquierdo' },
  { id: 'extensionHombroDx', label: 'Extensión hombro derecho' },
  { id: 'extensionHombroIzq', label: 'Extensión hombro izquierdo' },
  { id: 'abduccionHombroDx', label: 'Abducción hombro derecho' },
  { id: 'abduccionHombroIzq', label: 'Abducción hombro izquierdo' },
  { id: 'abdHorizontalDx', label: 'ABD horizontal derecho' },
  { id: 'abdHorizontalIzq', label: 'ABD horizontal izquierdo' },
  { id: 'addHorizontalDx', label: 'ADD horizontal derecho' },
  { id: 'addHorizontalIzq', label: 'ADD horizontal izquierdo' },
]

// SPADI: 13 ítems, cada uno se puntúa de 0 a 10 (0 = sin dolor/sin dificultad,
// 10 = peor dolor posible / imposible sin ayuda). Total = (suma / 13) * 10 → 0-100.
// El cuestionario completo (enunciados de cada ítem) está en:
// https://drive.google.com/file/d/1TEIN5xHLOPuvU8mhqOZVUkeSbfLapYBs/view?usp=share_link
export const SPADI_ITEMS = Array.from({ length: 13 }, (_, i) => i + 1)
export const SPADI_ENLACE = 'https://drive.google.com/file/d/1TEIN5xHLOPuvU8mhqOZVUkeSbfLapYBs/view?usp=share_link'

// TAMPA (escala de kinesiofobia): 11 ítems, cada uno de 1 a 4. Total = suma directa (11-44).
// >37 puntos suele indicar kinesiofobia alta/severa.
export const TAMPA_ITEMS = Array.from({ length: 11 }, (_, i) => i + 1)
export const TAMPA_INTERPRETACION = 'Mínimo 11 (sin kinesiofobia) — Máximo 44 (miedo extremo al movimiento). Por encima de 37 suele indicar un nivel alto/severo de kinesiofobia.'

export function valoracionVacia() {
  return {
    fuerza: {},
    movilidadHombro: {},
    spadi: {},
    tampa: {},
    notas: '',
  }
}

export function spadiTotal(spadi) {
  if (!spadi) return null
  const valores = SPADI_ITEMS.map((n) => spadi[n]).filter((v) => v !== undefined && v !== null && v !== '')
  if (valores.length === 0) return null
  const suma = valores.reduce((acc, v) => acc + Number(v), 0)
  return Math.round(((suma / valores.length) * 10) * 10) / 10 // promedio de los rellenados * 10, redondeado a 1 decimal
}

export function tampaTotal(tampa) {
  if (!tampa) return null
  const valores = TAMPA_ITEMS.map((n) => tampa[n]).filter((v) => v !== undefined && v !== null && v !== '')
  if (valores.length === 0) return null
  return valores.reduce((acc, v) => acc + Number(v), 0)
}

// % de mejoría entre el primer y el último valor numérico registrado para un ítem,
// a lo largo de todas las valoraciones (ordenadas por fecha) de un cliente.
export function mejoraPct(primero, ultimo) {
  if (primero === null || primero === undefined || primero === '' || Number(primero) === 0) return null
  if (ultimo === null || ultimo === undefined || ultimo === '') return null
  return Math.round(((Number(ultimo) / Number(primero) - 1) * 100) * 10) / 10
}

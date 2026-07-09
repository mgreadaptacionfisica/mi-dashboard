// Utilidades para la valoración funcional de clientes (migrado completo del Excel
// "VALORACIÓN Y SEGUIMIENTO"): fuerza, dinamometría, pliometría, fuerza cervical,
// movilidad de hombro/cervical/escapular/general, y los cuestionarios SPADI y TAMPA.

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

export const ITEMS_DINAMOMETRIA = [
  { id: 'dinReDx0', label: 'Rotación externa 0º Dx', unidad: 'N' },
  { id: 'dinReIzq0', label: 'Rotación externa 0º Izq', unidad: 'N' },
  { id: 'dinReDx9090', label: 'Rotación externa 90/90 Dx', unidad: 'N' },
  { id: 'dinReIzq9090', label: 'Rotación externa 90/90 Izq', unidad: 'N' },
  { id: 'dinRiDx0', label: 'Rotación interna 0º Dx', unidad: 'N' },
  { id: 'dinRiIzq0', label: 'Rotación interna 0º Izq', unidad: 'N' },
  { id: 'dinRiDx9090', label: 'Rotación interna 90/90 Dx', unidad: 'N' },
  { id: 'dinRiIzq9090', label: 'Rotación interna 90/90 Izq', unidad: 'N' },
  { id: 'dinAbdDx0', label: 'Abducción 0º Dx', unidad: 'N' },
  { id: 'dinAbdIzq0', label: 'Abducción 0º Izq', unidad: 'N' },
  { id: 'dinAbdHorDx90', label: 'Abducción horizontal 90º Dx', unidad: 'N' },
  { id: 'dinAbdHorIzq90', label: 'Abducción horizontal 90º Izq', unidad: 'N' },
  { id: 'dinScaptionDx', label: 'Scaption Dx', unidad: 'N' },
  { id: 'dinScaptionIzq', label: 'Scaption Izq', unidad: 'N' },
]

// Valores de referencia en N x peso corporal (BW). Se muestran como texto informativo.
export const REFERENCIA_DINAMOMETRIA = {
  dinReDx0: { mujeres: '1,3xBW', hombres: '1,5xBW' },
  dinReIzq0: { mujeres: '1,3xBW', hombres: '1,5xBW' },
  dinReDx9090: { mujeres: '0,9xBW', hombres: '1xBW' },
  dinReIzq9090: { mujeres: '0,9xBW', hombres: '1xBW' },
  dinRiDx0: { mujeres: '1,5xBW', hombres: '1,7xBW' },
  dinRiIzq0: { mujeres: '1,5xBW', hombres: '1,7xBW' },
  dinRiDx9090: { mujeres: '1,1xBW', hombres: '1,4xBW' },
  dinRiIzq9090: { mujeres: '1,1xBW', hombres: '1,4xBW' },
  dinAbdDx0: { mujeres: '1,7xBW', hombres: '2,2xBW' },
  dinAbdIzq0: { mujeres: '1,7xBW', hombres: '2,2xBW' },
  dinAbdHorDx90: { mujeres: '1,6xBW', hombres: '1,8xBW' },
  dinAbdHorIzq90: { mujeres: '1,6xBW', hombres: '1,8xBW' },
  dinScaptionDx: { mujeres: '1,8xBW', hombres: '2,2xBW' },
  dinScaptionIzq: { mujeres: '1,8xBW', hombres: '2,2xBW' },
}

export const ITEMS_PLIOMETRIA = [
  { id: 'plioLanzBilateral', label: 'Lanzamiento bilateral sentado', unidad: 'cm' },
  { id: 'plioLanzOverhead', label: 'Lanzamiento overhead sentado', unidad: 'cm' },
  { id: 'plioLanzUniIzq', label: 'Lanzamiento unilateral sentado Izq', unidad: 'cm' },
  { id: 'plioLanzUniDx', label: 'Lanzamiento unilateral sentado Dcho', unidad: 'cm' },
  { id: 'plioOneArmHopIzq', label: 'One arm hop test Izq', unidad: 's' },
  { id: 'plioOneArmHopDx', label: 'One arm hop test Dcha', unidad: 's' },
  { id: 'plioCkcuest', label: 'CKCUEST', unidad: 'reps' },
]

export const REFERENCIA_PLIOMETRIA = {
  plioLanzUniIzq: { mujeres: '350cm (1kg)', hombres: '350cm (3kg)' },
  plioLanzUniDx: { mujeres: '350cm (1kg)', hombres: '350cm (3kg)' },
  plioOneArmHopIzq: { mujeres: '3-5s', hombres: '7s' },
  plioOneArmHopDx: { mujeres: '3-5s', hombres: '7s' },
  plioCkcuest: { mujeres: '20 reps', hombres: '30 reps' },
}

export const ITEMS_FUERZA_CERVICAL = [
  { id: 'cervFlexionProfundaIso', label: 'Flexión profunda ISO', unidad: 's' },
  { id: 'cervLateralizacionAmrap', label: 'Lateralización AMRAP', unidad: 'reps' },
  { id: 'cervSorensenModificado', label: 'Sorensen modificado', unidad: 's' },
]

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

export const ITEMS_MOVILIDAD_CERVICAL = [
  { id: 'movCervFlexion', label: 'Flexión cervical' },
  { id: 'movCervExtension', label: 'Extensión cervical' },
  { id: 'movCervLateralDx', label: 'Lateralización cervical derecha' },
  { id: 'movCervLateralIzq', label: 'Lateralización cervical izquierda' },
  { id: 'movCervRotacionDx', label: 'Rotación cervical derecha' },
  { id: 'movCervRotacionIzq', label: 'Rotación cervical izquierda' },
]

export const ITEMS_MOVILIDAD_ESCAPULAR = [
  { id: 'movEscRetraccionDx', label: 'Retracción escapular derecha', unidad: '' },
  { id: 'movEscRetraccionIzq', label: 'Retracción escapular izquierda', unidad: '' },
  { id: 'movEscProtraccionDx', label: 'Protracción escapular derecha', unidad: '' },
  { id: 'movEscProtraccionIzq', label: 'Protracción escapular izquierda', unidad: '' },
  { id: 'movEscDepresionDx', label: 'Depresión escapular derecha', unidad: '' },
  { id: 'movEscDepresionIzq', label: 'Depresión escapular izquierda', unidad: '' },
]

export const ITEMS_MOVILIDAD_GENERAL = [
  { id: 'movGenSentadilla', label: 'Sentadilla', unidad: '' },
  { id: 'movGenSentadillaOH', label: 'Sentadilla OH', unidad: '' },
  { id: 'movGenRotacionTroncoIzq', label: 'Rotación tronco izquierda', unidad: '' },
  { id: 'movGenRotacionTroncoDx', label: 'Rotación tronco derecha', unidad: '' },
  { id: 'movGenToeTouch', label: 'Toe Touch', unidad: 'cm' },
  { id: 'movGenVisagraCadera', label: 'Visagra de cadera', unidad: '' },
]

// Configuración genérica para renderizar el formulario/evolución/historial
// sin repetir JSX por cada bloque. "unidadGrados" marca los bloques de movilidad
// (todos en grados salvo que el ítem tenga su propia unidad, ej. Toe Touch en cm).
export const BLOQUES = [
  { id: 'fuerza', label: 'Fuerza', items: ITEMS_FUERZA, referencia: REFERENCIA_FUERZA },
  { id: 'dinamometria', label: 'Dinamometría', items: ITEMS_DINAMOMETRIA, referencia: REFERENCIA_DINAMOMETRIA },
  { id: 'pliometria', label: 'Pliometría', items: ITEMS_PLIOMETRIA, referencia: REFERENCIA_PLIOMETRIA },
  { id: 'fuerzaCervical', label: 'Fuerza cervical', items: ITEMS_FUERZA_CERVICAL },
  { id: 'movilidadHombro', label: 'Movilidad de hombro', items: ITEMS_MOVILIDAD_HOMBRO, unidadGrados: true },
  { id: 'movilidadCervical', label: 'Movilidad cervical', items: ITEMS_MOVILIDAD_CERVICAL, unidadGrados: true },
  { id: 'movilidadEscapular', label: 'Movilidad escapular', items: ITEMS_MOVILIDAD_ESCAPULAR, unidadGrados: false },
  { id: 'movilidadGeneral', label: 'Movilidad general', items: ITEMS_MOVILIDAD_GENERAL, unidadGrados: false },
]

// Pares Dx/Izq para calcular el índice de simetría (min/max * 100) sobre la
// valoración más reciente que tenga ambos lados registrados. Umbral sano: >90%.
export const SIMETRIA_PARES = [
  { bloque: 'dinamometria', label: 'Dinamometría — Rotación externa 0º', dxId: 'dinReDx0', izqId: 'dinReIzq0' },
  { bloque: 'dinamometria', label: 'Dinamometría — Rotación externa 90/90', dxId: 'dinReDx9090', izqId: 'dinReIzq9090' },
  { bloque: 'dinamometria', label: 'Dinamometría — Rotación interna 0º', dxId: 'dinRiDx0', izqId: 'dinRiIzq0' },
  { bloque: 'dinamometria', label: 'Dinamometría — Rotación interna 90/90', dxId: 'dinRiDx9090', izqId: 'dinRiIzq9090' },
  { bloque: 'dinamometria', label: 'Dinamometría — Abducción 0º', dxId: 'dinAbdDx0', izqId: 'dinAbdIzq0' },
  { bloque: 'dinamometria', label: 'Dinamometría — Abducción horizontal 90º', dxId: 'dinAbdHorDx90', izqId: 'dinAbdHorIzq90' },
  { bloque: 'dinamometria', label: 'Dinamometría — Scaption', dxId: 'dinScaptionDx', izqId: 'dinScaptionIzq' },
  { bloque: 'pliometria', label: 'Pliometría — Lanzamiento unilateral sentado', dxId: 'plioLanzUniDx', izqId: 'plioLanzUniIzq' },
  { bloque: 'pliometria', label: 'Pliometría — One arm hop test', dxId: 'plioOneArmHopDx', izqId: 'plioOneArmHopIzq' },
]

export function indiceSimetria(dx, izq) {
  const d = Number(dx)
  const i = Number(izq)
  if (!d || !i) return null
  const menor = Math.min(d, i)
  const mayor = Math.max(d, i)
  return Math.round((menor / mayor) * 1000) / 10 // %, 1 decimal
}

// SPADI: 13 ítems, cada uno se puntúa de 0 a 10 (0 = sin dolor/sin dificultad,
// 10 = peor dolor posible / imposible sin ayuda). Total = (media de los rellenados) * 10 → 0-100.
// El cuestionario completo (enunciados de cada ítem) está en:
// https://drive.google.com/file/d/1TEIN5xHLOPuvU8mhqOZVUkeSbfLapYBs/view?usp=share_link
export const SPADI_ITEMS = Array.from({ length: 13 }, (_, i) => i + 1)
export const SPADI_ENLACE = 'https://drive.google.com/file/d/1TEIN5xHLOPuvU8mhqOZVUkeSbfLapYBs/view?usp=share_link'

// TAMPA (escala de kinesiofobia): 11 ítems, cada uno de 1 a 4. Total = suma directa (11-44).
// >37 puntos suele indicar kinesiofobia alta/severa.
export const TAMPA_ITEMS = Array.from({ length: 11 }, (_, i) => i + 1)
export const TAMPA_INTERPRETACION = 'Mínimo 11 (sin kinesiofobia) — Máximo 44 (miedo extremo al movimiento). Por encima de 37 suele indicar un nivel alto/severo de kinesiofobia.'

export function valoracionVacia() {
  const base = { spadi: {}, tampa: {}, notas: '' }
  BLOQUES.forEach((b) => { base[b.id] = {} })
  return base
}

export function spadiTotal(spadi) {
  if (!spadi) return null
  const valores = SPADI_ITEMS.map((n) => spadi[n]).filter((v) => v !== undefined && v !== null && v !== '')
  if (valores.length === 0) return null
  const suma = valores.reduce((acc, v) => acc + Number(v), 0)
  return Math.round(((suma / valores.length) * 10) * 10) / 10
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

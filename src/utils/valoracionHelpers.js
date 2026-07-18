// Utilidades para la valoración funcional de clientes (migrado completo del Excel
// "VALORACIÓN Y SEGUIMIENTO", y ampliado después con el rediseño pedido por Raúl):
// fuerza (con peso+reps en los ejercicios de carga), pliometría, fuerza cervical,
// movilidad de hombro/cervical/escapular/general por semáforo, y los
// cuestionarios SPADI y TAMPA. La dinamometría se eliminó (no se usa).

// Ítems "pesoReps: true" guardan { peso: number, reps: number } en vez de un
// número suelto — antes se anotaba un RM fijo (ej. "10RM"), ahora se registra
// el peso Y las repeticiones reales de esa sesión.
export const ITEMS_FUERZA = [
  { id: 'posteriorShoulderEnduranceIzq', label: 'Posterior shoulder endurance test Izq', unidad: 's' },
  { id: 'posteriorShoulderEnduranceDx', label: 'Posterior shoulder endurance test Dx', unidad: 's' },
  { id: 'amrapRemoInvertido90', label: 'AMRAP remo invertido 90º', unidad: 'reps' },
  { id: 'amrapFlexiones', label: 'AMRAP flexiones', unidad: 'reps' },
  { id: 'reMancuernaIzq', label: 'Rotación externa con mancuerna Izq', pesoReps: true },
  { id: 'reMancuernaDx', label: 'Rotación externa con mancuerna Dcho', pesoReps: true },
  { id: 'elevacionesLateralesIzq', label: 'Elevaciones laterales Izq', pesoReps: true },
  { id: 'elevacionesLateralesDx', label: 'Elevaciones laterales Dx', pesoReps: true },
  { id: 'pressVerticalUnilateralIzq', label: 'Press vertical unilateral Izq', pesoReps: true },
  { id: 'pressVerticalUnilateralDx', label: 'Press vertical unilateral Dcho', pesoReps: true },
  {
    id: 'pressMilitar',
    label: 'Press militar',
    pesoReps: true,
    nota: 'Evaluar solo cuando el press vertical unilateral ya no muestre asimetría (índice de simetría >90%, ver más abajo).',
  },
]

// Valores de referencia en % de peso corporal (BW). Se muestran como texto
// informativo junto al campo "peso" de cada ejercicio.
export const REFERENCIA_FUERZA = {
  posteriorShoulderEnduranceIzq: { mujeres: '45s', hombres: '45s' },
  posteriorShoulderEnduranceDx: { mujeres: '45s', hombres: '45s' },
  amrapRemoInvertido90: { mujeres: '13 reps', hombres: '19 reps' },
  amrapFlexiones: { mujeres: '10 reps', hombres: '30 reps' },
  elevacionesLateralesIzq: { mujeres: '10%BW', hombres: '20%BW' },
  elevacionesLateralesDx: { mujeres: '10%BW', hombres: '20%BW' },
  pressVerticalUnilateralIzq: { mujeres: '15%BW', hombres: '20%BW' },
  pressVerticalUnilateralDx: { mujeres: '15%BW', hombres: '20%BW' },
  pressMilitar: { mujeres: '50%BW', hombres: '80%BW' },
  reMancuernaIzq: { mujeres: '10%BW', hombres: '10%BW' },
  reMancuernaDx: { mujeres: '10%BW', hombres: '10%BW' },
}

// Referencia de fuerza PROGRESIVA por fase (solo Press militar, que es el
// ejercicio que se usa como termómetro de fuerza a lo largo de las 4 fases
// — ver SOP "4. Preparación del programa"). El valor de REFERENCIA_FUERZA
// de arriba es el objetivo final (Fase 4); esto muestra el objetivo
// intermedio según en qué fase esté el cliente ahora mismo.
export const REFERENCIA_FUERZA_POR_FASE = {
  pressMilitar: {
    1: '15-20% BW (press militar unilateral)',
    2: '20-30% BW (press militar unilateral)',
    3: '30-50% BW (RM, bilateral)',
    4: '50-80% BW (RM, bilateral)',
  },
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

// 'reDesdeAbdDx/Izq' + 'riDesdeAbdDx/Izq' se fusionaron en un único
// 'rotacionAbdDx/Izq' (a petición de Raúl, dejaban de tener sentido
// separados) y 'riDesdeFlexionDx/Izq' pasó a llamarse 'rotacionFleDx/Izq'.
// Los datos ya guardados con los ids antiguos siguen en la base de datos
// (es JSON, no se borra nada) pero no se muestran en el formulario nuevo.
// 'rotacionExternaDx/Izq' y 'rotacionInternaDx/Izq' son ítems nuevos,
// distintos de los de arriba: se miden en reposo (0° de abducción), no en
// ABD ni en flexión.
export const ITEMS_MOVILIDAD_HOMBRO = [
  { id: 'flexionHombroDx', label: 'Flexión hombro derecho' },
  { id: 'flexionHombroIzq', label: 'Flexión hombro izquierdo' },
  { id: 'rotacionAbdDx', label: 'Rotación ABD derecho' },
  { id: 'rotacionAbdIzq', label: 'Rotación ABD izquierdo' },
  { id: 'rotacionFleDx', label: 'Rotación FLE derecho' },
  { id: 'rotacionFleIzq', label: 'Rotación FLE izquierdo' },
  {
    id: 'rotacionExternaDx',
    label: 'Rotación externa derecho',
    nota: 'En reposo, codo pegado al cuerpo (0° de abducción).',
  },
  {
    id: 'rotacionExternaIzq',
    label: 'Rotación externa izquierdo',
    nota: 'En reposo, codo pegado al cuerpo (0° de abducción).',
  },
  {
    id: 'rotacionInternaDx',
    label: 'Rotación interna derecho',
    nota: 'En reposo, codo pegado al cuerpo (0° de abducción).',
  },
  {
    id: 'rotacionInternaIzq',
    label: 'Rotación interna izquierdo',
    nota: 'En reposo, codo pegado al cuerpo (0° de abducción).',
  },
  { id: 'extensionHombroDx', label: 'Extensión hombro derecho' },
  { id: 'extensionHombroIzq', label: 'Extensión hombro izquierdo' },
  { id: 'abduccionHombroDx', label: 'Abducción hombro derecho' },
  { id: 'abduccionHombroIzq', label: 'Abducción hombro izquierdo' },
  { id: 'abdHorizontalDx', label: 'ABD horizontal derecho' },
  { id: 'abdHorizontalIzq', label: 'ABD horizontal izquierdo' },
  { id: 'addHorizontalDx', label: 'ADD horizontal derecho' },
  { id: 'addHorizontalIzq', label: 'ADD horizontal izquierdo' },
  {
    id: 'shoulderTestDx',
    label: 'Shoulder test (brazo derecho arriba)',
    nota: 'Apley scratch test: un brazo por arriba y por detrás del cuello, el otro por detrás de la espalda desde abajo, intentando tocarse los dedos. Aquí es el brazo derecho el que va por arriba.',
  },
  {
    id: 'shoulderTestIzq',
    label: 'Shoulder test (brazo izquierdo arriba)',
    nota: 'Mismo test que el anterior, pero con el brazo izquierdo por arriba.',
  },
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
  { id: 'movEscRetraccionDx', label: 'Retracción escapular derecha' },
  { id: 'movEscRetraccionIzq', label: 'Retracción escapular izquierda' },
  { id: 'movEscProtraccionDx', label: 'Protracción escapular derecha' },
  { id: 'movEscProtraccionIzq', label: 'Protracción escapular izquierda' },
  { id: 'movEscDepresionDx', label: 'Depresión escapular derecha' },
  { id: 'movEscDepresionIzq', label: 'Depresión escapular izquierda' },
]

// "extra" marca los ítems de Movilidad general que llevan un desplegable
// adicional además del semáforo de color:
// - dominancia: Sentadilla y Sentadilla OH (cadera/rodilla)
// - patronLumbar: Toe Touch (más susceptible de flexión o extensión lumbar)
export const ITEMS_MOVILIDAD_GENERAL = [
  { id: 'movGenSentadilla', label: 'Sentadilla', extra: 'dominancia' },
  { id: 'movGenSentadillaOH', label: 'Sentadilla OH', extra: 'dominancia' },
  { id: 'movGenRotacionTroncoIzq', label: 'Rotación tronco izquierda' },
  { id: 'movGenRotacionTroncoDx', label: 'Rotación tronco derecha' },
  { id: 'movGenToeTouch', label: 'Toe Touch', extra: 'patronLumbar' },
  { id: 'movGenVisagraCadera', label: 'Visagra de cadera' },
]

// Semáforo de movilidad: verde = movilidad completa; amarillo = completa
// pero con dolor, o incompleta pero en rango aceptable (a partir de la
// mitad, hay que explicárselo al cliente); rojo = prácticamente nula, o no
// se puede hacer el test (por dolor, etc).
export const SEMAFORO_OPCIONES = [
  { valor: 'verde', emoji: '🟢', label: 'Verde', descripcion: 'Movilidad completa' },
  { valor: 'amarillo', emoji: '🟡', label: 'Amarillo', descripcion: 'Completa con dolor, o incompleta pero en rango aceptable (a partir de la mitad)' },
  { valor: 'rojo', emoji: '🔴', label: 'Rojo', descripcion: 'Prácticamente nula, o no se puede evaluar por dolor' },
]

export const DOMINANCIA_OPCIONES = [
  { valor: 'cadera', label: 'Dominante de cadera' },
  { valor: 'rodilla', label: 'Dominante de rodilla' },
]

export const PATRON_LUMBAR_OPCIONES = [
  { valor: 'flexion', label: 'Más susceptible de flexión lumbar' },
  { valor: 'extension', label: 'Más susceptible de extensión lumbar' },
]

export function semaforoInfo(valor) {
  return SEMAFORO_OPCIONES.find((s) => s.valor === valor) || null
}

// Compara dos valores de semáforo (primera vs última valoración) y devuelve
// un indicador simple de si ha mejorado, empeorado o se mantiene igual.
const ORDEN_SEMAFORO = { rojo: 0, amarillo: 1, verde: 2 }
export function compararSemaforo(colorPrimero, colorUltimo) {
  if (!colorPrimero || !colorUltimo) return null
  const a = ORDEN_SEMAFORO[colorPrimero]
  const b = ORDEN_SEMAFORO[colorUltimo]
  if (a === undefined || b === undefined) return null
  if (b > a) return 'mejora'
  if (b < a) return 'empeora'
  return 'igual'
}

// Configuración genérica para renderizar el formulario/evolución/historial
// sin repetir JSX por cada bloque. "esSemaforo" marca los bloques de
// movilidad, que se registran por color en vez de en grados.
export const BLOQUES = [
  { id: 'fuerza', label: 'Fuerza', items: ITEMS_FUERZA, referencia: REFERENCIA_FUERZA },
  { id: 'pliometria', label: 'Pliometría', items: ITEMS_PLIOMETRIA, referencia: REFERENCIA_PLIOMETRIA, nota: 'Se introduce en la transición Fase 2 → Fase 3: empieza con pliometría básica (horizontal, sin contramovimiento) hacia el final de la Fase 2, como preparación para la Fase 3. No hace falta rellenarlo antes.' },
  { id: 'fuerzaCervical', label: 'Fuerza cervical', items: ITEMS_FUERZA_CERVICAL },
  { id: 'movilidadHombro', label: 'Movilidad de hombro', items: ITEMS_MOVILIDAD_HOMBRO, esSemaforo: true },
  { id: 'movilidadCervical', label: 'Movilidad cervical', items: ITEMS_MOVILIDAD_CERVICAL, esSemaforo: true },
  { id: 'movilidadEscapular', label: 'Movilidad escapular', items: ITEMS_MOVILIDAD_ESCAPULAR, esSemaforo: true },
  { id: 'movilidadGeneral', label: 'Movilidad general', items: ITEMS_MOVILIDAD_GENERAL, esSemaforo: true },
]

// Pares Dx/Izq para calcular el índice de simetría (min/max * 100) sobre la
// valoración más reciente que tenga ambos lados registrados. Umbral sano: >90%.
// "pesoReps: true" indica que hay que comparar el campo .peso de cada lado.
export const SIMETRIA_PARES = [
  { bloque: 'pliometria', label: 'Pliometría — Lanzamiento unilateral sentado', dxId: 'plioLanzUniDx', izqId: 'plioLanzUniIzq' },
  { bloque: 'pliometria', label: 'Pliometría — One arm hop test', dxId: 'plioOneArmHopDx', izqId: 'plioOneArmHopIzq' },
  { bloque: 'fuerza', label: 'Fuerza — Press vertical unilateral (peso)', dxId: 'pressVerticalUnilateralDx', izqId: 'pressVerticalUnilateralIzq', pesoReps: true },
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

// Fases y objetivos (SOP "3. Establecer fase y objetivos"): permite calcular
// una fase sugerida a partir del SPADI de la valoración (dato objetivo) y,
// cuando el SPADI es 0, de si hay dolor en gestos del propio deporte
// (fases 3 y 4 comparten SPADI 0 y solo se distinguen por esa pregunta).
// El técnico siempre puede confirmar o cambiar la fase sugerida a mano —
// esto es una ayuda, no reemplaza el criterio clínico.
export const FASES = [
  {
    numero: 1,
    titulo: 'Fase 1',
    criterio: 'Irritabilidad alta-moderada, SPADI ≥10 (dolor entre sesiones)',
    objetivoEjemplo: 'Reducir irritabilidad y ganar la movilidad concreta que le falte — solo los ejercicios necesarios, sin saturar.',
  },
  {
    numero: 2,
    titulo: 'Fase 2',
    criterio: 'Irritabilidad baja, SPADI 1-9 (molestia solo en sesión, sin dolor entre sesiones)',
    objetivoEjemplo: 'Reducir irritabilidad y ganar fuerza. Marcar objetivo de carga para pasar a la siguiente fase.',
  },
  {
    numero: 3,
    titulo: 'Fase 3',
    criterio: 'SPADI 0, dolor solo ante gestos de su deporte',
    objetivoEjemplo: 'Objetivo según el deporte, muy concreto (ej: conseguir hacer snatch sin dolor).',
  },
  {
    numero: 4,
    titulo: 'Fase 4',
    criterio: 'SPADI 0, sin dolor en su deporte',
    objetivoEjemplo: 'Objetivo de rendimiento, muy concreto (ej: conseguir un snatch con 100kg).',
  },
]

export function faseInfo(numero) {
  return FASES.find((f) => f.numero === Number(numero)) || null
}

// Calcula la fase sugerida solo a partir de datos objetivos: el SPADI de la
// valoración actual y, si el SPADI es 0, la respuesta a "¿dolor en gestos de
// su deporte?" (dolorEnDeporte: true/false). Devuelve null si faltan datos
// para decidir (sin SPADI, o SPADI=0 sin haber respondido esa pregunta).
export function calcularFaseSugerida(spadi, dolorEnDeporte) {
  if (spadi === null || spadi === undefined || spadi === '') return null
  const valor = Number(spadi)
  if (valor === 0) {
    if (dolorEnDeporte === true) return 3
    if (dolorEnDeporte === false) return 4
    return null
  }
  if (valor < 10) return 2
  return 1
}

// Última fase confirmada de un cliente (la valoración con fase más
// reciente por fecha, no necesariamente la última valoración registrada si
// esa todavía no tiene fase confirmada). Se usa en ClientesEquipo.jsx
// (columna Fase) y SeguimientoCliente.jsx (recordatorio de objetivo).
export function ultimaFaseCliente(valoraciones, clienteNombre) {
  const conFase = (valoraciones || [])
    .filter((v) => v.clienteNombre === clienteNombre && v.fase)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
  return conFase.length ? conFase[conFase.length - 1] : null
}

// Texto combinado del objetivo de una valoración: los objetivos elegidos
// del catálogo (resueltos por id contra objetivosFase) + el texto libre.
export function objetivoCombinado(valoracion, objetivosFase = []) {
  const deCatalogo = (valoracion?.objetivosSeleccionados || [])
    .map((id) => objetivosFase.find((o) => o.id === id)?.texto)
    .filter(Boolean)
  const partes = [...deCatalogo]
  if (valoracion?.objetivo) partes.push(valoracion.objetivo)
  return partes.join(' · ')
}

export function valoracionVacia() {
  const base = {
    spadi: {},
    tampa: {},
    notasDolor: '',
    notasEvaluacionInicial: '',
    notasPreferenciasEntrenamiento: '',
    dolorEnDeporte: null,
    fase: null,
    objetivo: '',
    objetivosSeleccionados: [],
    objetivosCumplidos: [],
  }
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

// 🎯 Objetivos AUTOMÁTICOS por fase (Raúl, 2026-11-10).
//
// Por qué existe: hasta ahora cada objetivo de "Fases y objetivos" se
// escribía y se marcaba a mano, cliente por cliente. Pero los de las fases
// 1 y 2 salen siempre de lo mismo, la valoración, así que ahora se calculan
// solos y se marcan solos con la última medición:
//   - Fase 1: la movilidad (todo lo que no esté en verde tiene que llegar a
//     verde) + SPADI por debajo de 10.
//   - Fase 2: la fuerza, con la referencia en % de peso corporal pasada a
//     kilos según SU peso y sexo (~10RM), los tests en segundos/reps, la
//     simetría entre lados (>90 %) y SPADI 0.
//   - Fase 3: el press militar (RM) y, más adelante, lo que exija su deporte
//     (DEPORTES, se rellena deporte por deporte).
//   - Fase 4: las marcas que pida la persona, a mano (y el 80 % del press
//     militar en hombres).
// No se guardan: se recalculan cada vez desde valoraciones_clientes. Los
// objetivos escritos a mano (objetivos_cliente_fase) siguen existiendo
// como "objetivos personales" y cuentan igual para avanzar de fase.
//
// Se mira la ÚLTIMA medición de CADA ítem, no la última valoración entera,
// porque una valoración se puede hacer a trozos en días distintos (ver
// ValoracionCliente). El SPADI no se manda a todo el mundo: sin SPADI no
// hay objetivo de SPADI.

import {
  ITEMS_FUERZA,
  REFERENCIA_FUERZA,
  BLOQUES,
  semaforoInfo,
  spadiTotal,
  indiceSimetria,
} from './valoracionHelpers'

export const SEXOS = [
  { valor: 'mujer', label: 'Mujer' },
  { valor: 'hombre', label: 'Hombre' },
]

// Deporte del cliente: decide los objetivos de Fase 3. Las exigencias de
// cada uno se rellenan con Raúl, deporte por deporte (`exigencias` vacías
// = todavía sin definir). Añadir deportes es seguro; no cambiar los ids
// ya guardados en valoraciones_clientes.deporte.
export const DEPORTES = [
  { id: 'gym', label: 'Gimnasio / musculación', exigencias: [] },
  { id: 'crossfit', label: 'CrossFit', exigencias: [] },
  { id: 'padel', label: 'Pádel', exigencias: [] },
  { id: 'contacto', label: 'Deportes de contacto', exigencias: [] },
  { id: 'calistenia', label: 'Calistenia', exigencias: [] },
  { id: 'escalada', label: 'Escalada', exigencias: [] },
  { id: 'otro', label: 'Otro', exigencias: [] },
  { id: 'ninguno', label: 'No hace deporte', exigencias: [] },
]
export const deporteInfo = (id) => DEPORTES.find((d) => d.id === id) || null

export const REGLAS_OBJETIVOS = {
  // Fase 1: SPADI por debajo de esto (mismo corte que faseTopeSpadi).
  SPADI_FASE1: 10,
  // Simetría entre lados para dar por cumplida la fuerza.
  SIMETRIA_MIN: 90,
  // Las referencias de fuerza en %BW son a ~10RM (Raúl). Lo apuntado
  // (peso × reps) se pasa a su 10RM estimado con Epley, así que 12 reps con
  // un poco menos de peso o 8 con un poco más también cuentan.
  REPS_REFERENCIA: 10,
  // Redondeo del objetivo en kilos (mancuernas de 0,5 en 0,5 kg).
  PASO_KG: 0.5,
  // Press militar (RM bilateral): no entra en Fase 2. En Fase 3 hasta el
  // 50 % BW y en Fase 4 la referencia final de su sexo (50 % mujeres, 80 %
  // hombres; ver REFERENCIA_FUERZA_POR_FASE).
  PRESS_MILITAR_FASE3: 0.5,
}

// Pares de lados que tienen que estar simétricos en Fase 2.
const PARES_FUERZA = [
  ['pressVerticalUnilateralIzq', 'pressVerticalUnilateralDx', 'Press vertical unilateral'],
  ['reMancuernaIzq', 'reMancuernaDx', 'Rotación externa con mancuerna'],
  ['elevacionesLateralesIzq', 'elevacionesLateralesDx', 'Elevaciones laterales'],
  ['posteriorShoulderEnduranceIzq', 'posteriorShoulderEnduranceDx', 'Posterior shoulder endurance'],
]

const fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',')
const vacio = (v) => v === undefined || v === null || v === ''
const redondeaKg = (kg) => Math.round(kg / REGLAS_OBJETIVOS.PASO_KG) * REGLAS_OBJETIVOS.PASO_KG

// Valoraciones del cliente de la más vieja a la más nueva.
function delCliente(valoraciones, clienteNombre) {
  return (valoraciones || [])
    .filter((v) => v.clienteNombre === clienteNombre)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
}

// Última medición de un ítem: { valor, fecha } o null.
function ultimo(historial, bloque, item) {
  for (let i = historial.length - 1; i >= 0; i -= 1) {
    const v = historial[i][bloque]?.[item]
    if (vacio(v)) continue
    if (typeof v === 'object' && vacio(v.peso)) continue
    return { valor: v, fecha: historial[i].fecha }
  }
  return null
}

// Peso corporal, sexo y deporte: el último que se haya apuntado.
export function datosCliente(valoraciones, clienteNombre) {
  const h = delCliente(valoraciones, clienteNombre)
  const ultimoDe = (campo) => [...h].reverse().find((v) => !vacio(v[campo]))?.[campo] ?? null
  return { pesoCorporal: ultimoDe('pesoCorporal'), sexo: ultimoDe('sexo'), deporte: ultimoDe('deporte') }
}

// "10%BW" → 0.1. null si la referencia no es de peso corporal.
function pctBW(ref) {
  const m = String(ref || '').match(/([\d.,]+)\s*%\s*BW/i)
  return m ? Number(m[1].replace(',', '.')) / 100 : null
}
// "45s" / "13 reps" → 45 / 13.
function numeroRef(ref) {
  const m = String(ref || '').match(/([\d.,]+)/)
  return m ? Number(m[1].replace(',', '.')) : null
}

// Peso que se movería a `repsObjetivo` reps (Epley): 1RM = kg·(1 + reps/30).
export function pesoEquivalente(kg, reps, repsObjetivo) {
  if (!(kg > 0) || !(reps > 0)) return null
  return (kg * (1 + reps / 30)) / (1 + repsObjetivo / 30)
}

// Objetivo de fuerza en kg para un ítem pesoReps: { kg, pct } o null si
// falta el peso corporal, el sexo o la referencia.
export function objetivoKg(itemId, datos, pctForzado = null) {
  const ref = REFERENCIA_FUERZA[itemId]
  if (!ref || !(Number(datos?.pesoCorporal) > 0) || !datos?.sexo) return null
  const pct = pctForzado ?? pctBW(datos.sexo === 'mujer' ? ref.mujeres : ref.hombres)
  if (pct === null) return null
  return { kg: redondeaKg(pct * Number(datos.pesoCorporal)), pct }
}

// Objetivo de un ítem de fuerza pesoReps a `reps` reps.
function objetivoPesoReps({ id, fase, etiqueta, medicion, objetivo, reps }) {
  const texto = `${etiqueta}: ${fmt(objetivo.kg)} kg${reps === 1 ? ' (RM)' : ` × ${reps}`} (${Math.round(objetivo.pct * 100)} % BW)`
  if (!medicion) return { id, fase, texto, cumplido: false, detalle: 'sin medir' }
  const kg = Number(medicion.valor.peso)
  const r = Number(medicion.valor.reps) || reps
  const equivalente = pesoEquivalente(kg, r, reps)
  const cumplido = equivalente !== null && equivalente >= objetivo.kg - 0.01
  return {
    id, fase, texto, cumplido,
    detalle: `último: ${fmt(kg)} kg × ${r}${r !== reps && equivalente ? ` (≈ ${fmt(equivalente)} kg a ${reps === 1 ? 'RM' : `${reps} reps`})` : ''}`,
  }
}

// Todos los objetivos automáticos de un cliente:
// [{ id, fase, texto, cumplido, detalle, auto: true }].
export function objetivosAutomaticos(valoraciones, clienteNombre) {
  const h = delCliente(valoraciones, clienteNombre)
  if (h.length === 0) return []
  const datos = datosCliente(valoraciones, clienteNombre)
  const out = []
  const add = (o) => out.push({ ...o, auto: true })

  // SPADI: el último que haya (no a todo el mundo se le pasa).
  const conSpadi = [...h].reverse().find((v) => spadiTotal(v.spadi) !== null)
  const spadi = conSpadi ? spadiTotal(conSpadi.spadi) : null

  // ── Fase 1: movilidad. Cada test que alguna vez NO estuvo en verde es un
  // objetivo (llegar a verde); los que siempre estuvieron en verde ya los
  // cumple y no se listan uno a uno.
  let medidos = 0
  BLOQUES.filter((b) => b.esSemaforo).forEach((b) => {
    b.items.forEach((it) => {
      const colores = h.map((v) => v[b.id]?.[it.id]?.color ?? v[b.id]?.[it.id]).filter((c) => typeof c === 'string' && semaforoInfo(c))
      if (colores.length === 0) return
      medidos += 1
      if (colores.every((c) => c === 'verde')) return
      const actual = colores[colores.length - 1]
      add({
        id: `auto-mov-${it.id}`, fase: 1, texto: `${it.label} en verde`,
        cumplido: actual === 'verde', detalle: `ahora: ${semaforoInfo(actual).emoji} ${semaforoInfo(actual).label.toLowerCase()}`,
      })
    })
  })
  if (medidos === 0) add({ id: 'auto-mov-sin', fase: 1, texto: 'Valorar la movilidad', cumplido: false, detalle: 'sin tests de movilidad todavía' })
  else if (!out.some((o) => o.fase === 1)) add({ id: 'auto-mov-ok', fase: 1, texto: 'Movilidad en verde', cumplido: true, detalle: `${medidos} tests en verde` })
  if (spadi !== null) {
    add({
      id: 'auto-spadi-1', fase: 1, texto: `SPADI por debajo de ${REGLAS_OBJETIVOS.SPADI_FASE1}`,
      cumplido: spadi < REGLAS_OBJETIVOS.SPADI_FASE1, detalle: `último: ${fmt(spadi)}`,
    })
  }

  // ── Fase 2: fuerza (sin el press militar, que va en las fases 3 y 4).
  const conDatos = Number(datos.pesoCorporal) > 0 && datos.sexo
  if (!conDatos) {
    add({ id: 'auto-fuerza-datos', fase: 2, texto: 'Apuntar peso corporal y sexo en la valoración', cumplido: false, detalle: 'hacen falta para pasar las referencias a kilos' })
  }
  ITEMS_FUERZA.filter((it) => it.id !== 'pressMilitar').forEach((it) => {
    const ref = REFERENCIA_FUERZA[it.id]
    if (!ref) return
    const medicion = ultimo(h, 'fuerza', it.id)
    if (it.pesoReps) {
      const objetivo = objetivoKg(it.id, datos)
      if (!objetivo) return
      add(objetivoPesoReps({ id: `auto-f-${it.id}`, fase: 2, etiqueta: it.label, medicion, objetivo, reps: REGLAS_OBJETIVOS.REPS_REFERENCIA }))
      return
    }
    // Segundos o reps: hace falta el sexo para la referencia (el peso no).
    if (!datos.sexo) return
    const meta = numeroRef(datos.sexo === 'mujer' ? ref.mujeres : ref.hombres)
    if (meta === null) return
    const valor = medicion ? Number(medicion.valor) : null
    add({
      id: `auto-f-${it.id}`, fase: 2, texto: `${it.label}: ${fmt(meta)} ${it.unidad}`,
      cumplido: valor !== null && valor >= meta, detalle: valor !== null ? `último: ${fmt(valor)} ${it.unidad}` : 'sin medir',
    })
  })
  PARES_FUERZA.forEach(([izq, dx, etiqueta]) => {
    const a = ultimo(h, 'fuerza', izq)
    const b = ultimo(h, 'fuerza', dx)
    if (!a && !b) return
    const valor = (m) => (m ? (typeof m.valor === 'object' ? m.valor.peso : m.valor) : null)
    const indice = indiceSimetria(valor(b), valor(a))
    add({
      id: `auto-sim-${dx}`, fase: 2, texto: `${etiqueta}: simetría > ${REGLAS_OBJETIVOS.SIMETRIA_MIN} %`,
      cumplido: indice !== null && indice > REGLAS_OBJETIVOS.SIMETRIA_MIN,
      detalle: indice !== null ? `ahora: ${fmt(indice)} %` : 'falta medir los dos lados',
    })
  })
  if (spadi !== null) {
    add({ id: 'auto-spadi-2', fase: 2, texto: 'SPADI 0', cumplido: spadi === 0, detalle: `último: ${fmt(spadi)}` })
  }

  // ── Fase 3 y 4: press militar (RM). En mujeres la referencia final ya es
  // el 50 %, así que no tienen objetivo de press militar en Fase 4.
  if (conDatos) {
    const medicion = ultimo(h, 'fuerza', 'pressMilitar')
    const final = objetivoKg('pressMilitar', datos)
    const f3 = objetivoKg('pressMilitar', datos, Math.min(REGLAS_OBJETIVOS.PRESS_MILITAR_FASE3, final?.pct ?? 1))
    if (f3) add(objetivoPesoReps({ id: 'auto-pm-3', fase: 3, etiqueta: 'Press militar', medicion, objetivo: f3, reps: 1 }))
    if (final && final.pct > f3.pct) add(objetivoPesoReps({ id: 'auto-pm-4', fase: 4, etiqueta: 'Press militar', medicion, objetivo: final, reps: 1 }))
  }

  // Fase 3: lo que exija su deporte (cuando esté definido en DEPORTES).
  const deporte = deporteInfo(datos.deporte)
  ;(deporte?.exigencias || []).forEach((e) => {
    const o = e.evaluar ? e.evaluar(h, datos) : { cumplido: false, detalle: '' }
    add({ id: `auto-dep-${deporte.id}-${e.id}`, fase: 3, texto: e.texto, ...o })
  })

  return out
}

// Automáticos + los escritos a mano (objetivos_cliente_fase) de un cliente,
// que es con lo que se calcula la fase (faseAutomatica).
export function objetivosDelClienteCompletos(objetivosClienteFase, valoraciones, clienteNombre) {
  const manuales = (objetivosClienteFase || []).filter((o) => o.clienteNombre === clienteNombre)
  return [...objetivosAutomaticos(valoraciones, clienteNombre), ...manuales]
}

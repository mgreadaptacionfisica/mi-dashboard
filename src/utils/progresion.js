// 🤖 Propuestas de progresión: qué cambiar la semana que viene en cada
// ejercicio, a partir de lo que el cliente apuntó en Harbiz.
//
// Por qué existe: lo que más tiempo le cuesta al equipo es revisar cada
// sesión y decidir, ejercicio a ejercicio, si se progresa, se mantiene o se
// regresa. Las reglas son las de Raúl (acordadas el 2026-11-07, probadas con
// datos reales de 4 clientes) y viven TODAS aquí, con los números arriba en
// REGLAS, para poder pulirlas cambiando una línea.
//
// Reparto de trabajo, a propósito:
// - El ROBOT de Harbiz solo lee y traduce: copia reps, kilos y objetivo de
//   cada ejercicio y, como lee el comentario entero, le pone una
//   `valoracion` ('sin' | 'molestia' | 'dolor' | 'nota') y una `clase`
//   ('fuerza' | 'movilidad'). Llega en `detalle.registro` de sesiones_harbiz.
// - El PANEL decide con estas reglas. Así el robot no se inventa nada,
//   decide siempre igual y la regla se ve y se cambia en el código.
// - El FISIO responde (aplicada / descartada con motivo) y, de momento,
//   pasa él el cambio a Harbiz. Las respuestas van a propuestas_progresion
//   (migración 70) y son la base para pulir las reglas.
//
// El dolor NO se cuantifica (decisión de Raúl: "a veces mejor no
// cuantificar"): el robot interpreta el texto y aquí solo se usa la
// categoría. El RPE tampoco se usa: los clientes no lo saben manejar.

import { semanaYDiaDeFecha, clienteDeHarbiz } from './sesionesHarbiz'

export const REGLAS = {
  // Subida de carga cuando toca progresar: entre el 10 y el 15 %, y se
  // propone como rango ("16–17 kg"), que es como lo pauta Raúl.
  SUBIDA_MIN: 0.10,
  SUBIDA_MAX: 0.15,
  // Por debajo de este peso se redondea de medio en medio kilo (mancuernas
  // pequeñas: 7,5 → 8–8,5); por encima, a kilos enteros (15 → 16–17).
  KG_PASO_FINO: 10,
  // "Cerca del tope": a cuántas reps del tope del rango, y cuántas semanas
  // seguidas así cuentan como progresar aunque no llegue del todo.
  MARGEN_CERCA: 1,
  SEMANAS_CERCA: 2,
  // Movilidad: no tiene propuestas de carga. Solo avisa si hay molestia o
  // dolor, y de que toca cambiarla cuando lleva estas semanas igual.
  MOVILIDAD_SEMANAS_PRONTO: 3,
  MOVILIDAD_SEMANAS_CAMBIAR: 4,
  // Opción "subir el rango" (Raúl, 2026-11-10): el rango nuevo empieza en
  // el tope del anterior y sube esto (8-12 → 12-15, 6-8 → 8-11).
  RANGO_SUBE: 3,
  // Opción "subir peso y bajar el rango" (Raúl, 2026-11-10): lo contrario,
  // el rango nuevo termina en el inicio del anterior y baja esto (8-12 →
  // 5-8, 12-15 → 9-12). El peso sube lo mismo que en "subir peso" (10–15 %).
  // No se ofrece si el rango nuevo empezaría por debajo de REPS_MIN (son
  // sobre todo hombros en readaptación); si hace falta, a mano.
  RANGO_BAJA: 3,
  REPS_MIN: 5,
  // Opción "más cerca del fallo": el RIR (el número entre paréntesis del
  // objetivo, "8-12 (3)") baja de uno en uno y nunca por debajo de esto.
  // Si el objetivo no trae RIR, la opción no sale.
  RIR_MIN: 1,
}

// Tipos de propuesta, en el orden en que se enseñan (lo urgente primero).
export const TIPOS = {
  dolor: { emoji: '🔴', titulo: 'Al fisio: dolor', ayuda: 'El robot lee dolor en el comentario. No se propone carga: decide el fisio.' },
  molestia: { emoji: '🟡', titulo: 'Misma carga: molestia', ayuda: 'Cualquier molestia → misma carga, y preguntar si sigue.' },
  subir: { emoji: '🟢', titulo: 'Subir carga', ayuda: 'Llega al tope del rango (o lleva 2 semanas cerca) y sin molestias.' },
  propioPeso: { emoji: '🟢', titulo: 'Propio peso: progresar', ayuda: 'Llega al tope sin carga: subir reps o un ejercicio más difícil (criterio del fisio).' },
  reps: { emoji: '🔵', titulo: 'Mantener carga: más reps', ayuda: 'Acaba de subir de peso y aún no llega al tope: se mantiene el peso nuevo y se buscan más reps (doble progresión).' },
  igual: { emoji: '⚪', titulo: '2 semanas igual', ayuda: 'Mismas reps y misma carga dos semanas: hablar con la persona. Siempre tiene que haber progresión.' },
  movilidad: { emoji: '🔁', titulo: 'Cambiar la movilidad', ayuda: 'La movilidad lleva semanas igual.' },
  nota: { emoji: '📝', titulo: 'Notas del cliente', ayuda: 'Sustituciones, máquina distinta, peso que no había… Ese día el dato no es comparable.' },
}
export const ORDEN_TIPOS = ['dolor', 'molestia', 'subir', 'propioPeso', 'reps', 'igual', 'movilidad', 'nota']

// 🧭 OPCIONES (2026-11-10). Cada propuesta de un ejercicio trae varias
// formas de progresar y el fisio elige la que le cuadra a ESE ejercicio (no
// es lo mismo un press que un ejercicio de control): "esto depende mucho
// del ejercicio", y eso no lo sabe la regla. La primera de la lista es la
// que se recomienda; de momento, subir peso siempre que se pueda. Se guarda
// cuál se eligió (`opcion` en propuestas_progresion, migración 73) para ver
// más adelante qué elige el equipo y ordenarlas con datos.
// Cada opción dice qué cambia en Harbiz: `objetivo` (la casilla de reps,
// con el RIR entre paréntesis), `series` y la `nota` para el cliente. El
// peso no tiene casilla en Harbiz, por eso los kilos van en la nota.
// `manual`: no se escribe nada en Harbiz (lo hace o lo habla el fisio).
export const OPCIONES = {
  peso: { emoji: '🏋️', titulo: 'Subir peso, mismo rango' },
  pesoRango: { emoji: '⬇️', titulo: 'Subir peso y bajar el rango' },
  reps: { emoji: '🔁', titulo: 'Mismo peso, buscar más repeticiones' },
  carga: { emoji: '🟡', titulo: 'Misma carga' },
  rango: { emoji: '📈', titulo: 'Mismo peso, subir el rango' },
  rir: { emoji: '🎯', titulo: 'Más cerca del fallo (baja el RIR)' },
  serie: { emoji: '➕', titulo: 'Añadir una serie' },
  libre: { emoji: '✍️', titulo: 'Mismo ejercicio, con una indicación mía' },
  cambio: { emoji: '🔄', titulo: 'Cambio de ejercicio (lo cambio yo en Harbiz)', manual: true },
  hablar: { emoji: '🗣️', titulo: 'Lo hablo con la persona', manual: true },
}

// 📲 Escribir en Harbiz lo aceptado (prueba desde el 2026-11-08). Cuando el
// fisio elige una opción y da ✅, lo que cambia esa opción (nota, objetivo,
// series) se escribe en ese ejercicio en las sesiones de la semana
// siguiente (rutina en la nube "Panel → Harbiz", migraciones 71-73). Las
// propuestas sin opciones (movilidad, comentario general de la sesión) no
// van: no son de un ejercicio concreto.
// De momento solo con los clientes de estos trabajadores: para comprobar
// que funciona antes de abrirlo al equipo, se amplía añadiendo nombres.
export const HARBIZ_PRUEBA_TRABAJADORES = ['Raúl Morales']

// Si el robot no trajo `clase` (sesiones viejas), se deduce del nombre. Es
// solo un respaldo: en cuanto un ejercicio lleva carga, es de fuerza.
const PATRON_MOVILIDAD = /estiramiento|movilidad|moviliza|gato|camello|rotaci[oó]n|respira|asistid|isom[eé]tric|anteversi|retroversi|90.?90|expansi[oó]n|estabilidad|^test /i

const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

// "8-12 (3)" → { lo: 8, hi: 12 }; "10reps" → { lo: 10, hi: 10 }. Los
// segundos ('30"', '20seg') y los ciclos de respiración no son un rango de
// reps: null.
export function rangoDeObjetivo(objetivo) {
  const t = String(objetivo || '').trim()
  if (!t || /["”]|seg|ciclo|min/i.test(t)) return null
  let m = t.match(/^(\d+)\s*-\s*(\d+)/)
  if (m) return { lo: Number(m[1]), hi: Number(m[2]) }
  // Reps fijas ("10", "10reps"): hacer 10 de 10 es CUMPLIR, no llegar al
  // tope de un rango. Se marca `fijo` para que solo cuente superarlas.
  m = t.match(/^(\d+)\s*(?:reps?)?$/i)
  if (m) return { lo: Number(m[1]), hi: Number(m[1]), fijo: true }
  return null
}

const fmtKg = (kg) => String(kg).replace('.', ',')

// "8-12 (3)" → "12-15 (3)"; "10reps" → "10-13". Conserva lo que va detrás
// del rango (el RIR). null si el objetivo no es de reps.
export function objetivoSubeRango(objetivo) {
  const t = String(objetivo || '').trim()
  const r = rangoDeObjetivo(t)
  if (!r) return null
  const m = t.match(/^\d+\s*(?:-\s*\d+)?\s*(?:reps?)?/i)
  const resto = t.slice(m[0].length).trim()
  return `${r.hi}-${r.hi + REGLAS.RANGO_SUBE}${resto ? ` ${resto}` : ''}`
}

// "8-12 (3)" → "5-8 (3)"; "10" → "7-10". null si el rango nuevo
// empezaría por debajo de REGLAS.REPS_MIN o el objetivo no es de reps.
export function objetivoBajaRango(objetivo) {
  const t = String(objetivo || '').trim()
  const r = rangoDeObjetivo(t)
  if (!r) return null
  const lo = r.lo - REGLAS.RANGO_BAJA
  if (lo < REGLAS.REPS_MIN) return null
  const m = t.match(/^\d+\s*(?:-\s*\d+)?\s*(?:reps?)?/i)
  const resto = t.slice(m[0].length).trim()
  return `${lo}-${r.lo}${resto ? ` ${resto}` : ''}`
}

// "8-12 (3)" → { objetivo: "8-12 (2)", rir: 2 }. null si no trae RIR o ya
// está en el mínimo.
export function objetivoBajaRir(objetivo) {
  const t = String(objetivo || '').trim()
  if (!rangoDeObjetivo(t)) return null
  const m = t.match(/\((\d+)\)/)
  if (!m) return null
  const rir = Number(m[1]) - 1
  if (rir < REGLAS.RIR_MIN) return null
  return { objetivo: t.replace(m[0], `(${rir})`), rir }
}

// Las opciones de un ejercicio, en el orden de `claves`. Las que no se
// pueden calcular (subir peso sin carga, RIR sin paréntesis…) no salen.
// `notas` trae las frases ya hechas de las opciones que vienen de la regla
// de siempre (reps, carga) y el peso nuevo.
function construirOpciones(claves, u, notas = {}) {
  const kg = u.kgMax
  const mantener = kg > 0 ? `Mantén el peso (${fmtKg(kg)} kg)` : ''
  const con = (txt) => (mantener ? `${mantener} y ${txt}.` : `${txt.charAt(0).toUpperCase()}${txt.slice(1)}.`)
  const objetivoActual = u.objetivo || ''
  const seriesActual = u.series.length ? String(u.series.length) : ''
  const out = []
  claves.forEach((clave) => {
    const o = { clave, ...OPCIONES[clave], nota: '', objetivo: null, series: null, objetivoActual, seriesActual }
    if (clave === 'peso') {
      if (!(kg > 0)) return
      o.nota = `Sube a ${notas.peso || rangoCargaNueva(kg).texto}.`
    } else if (clave === 'pesoRango') {
      const obj = objetivoBajaRango(objetivoActual)
      if (!(kg > 0) || !obj) return
      o.objetivo = obj
      o.nota = `Sube a ${notas.peso || rangoCargaNueva(kg).texto}.`
    } else if (clave === 'reps' || clave === 'carga') {
      if (!notas[clave]) return
      o.nota = notas[clave]
    } else if (clave === 'rango') {
      const obj = objetivoSubeRango(objetivoActual)
      if (!obj) return
      o.objetivo = obj
      o.nota = mantener ? `${mantener}.` : 'Mismo ejercicio, con más repeticiones.'
    } else if (clave === 'rir') {
      const x = objetivoBajaRir(objetivoActual)
      if (!x) return
      o.objetivo = x.objetivo
      o.nota = con(`quédate a ${x.rir} repetici${x.rir === 1 ? 'ón' : 'ones'} del fallo`)
    } else if (clave === 'serie') {
      if (!seriesActual) return
      o.series = String(u.series.length + 1)
      o.nota = con('añade una serie')
    } else if (clave === 'libre') {
      // Lo escribe el fisio: más lento, más rango de movimiento… El
      // objetivo sale relleno con el de ahora por si también lo quiere tocar.
      o.libre = true
      o.objetivo = objetivoActual || null
    }
    out.push(o)
  })
  return out
}

// Rango de la carga nueva: +10 % redondeado hacia abajo y +15 % redondeado
// al paso más cercano, siempre por encima de la carga actual.
export function rangoCargaNueva(kg) {
  const paso = kg < REGLAS.KG_PASO_FINO ? 0.5 : 1
  let lo = Math.floor((kg * (1 + REGLAS.SUBIDA_MIN)) / paso) * paso
  let hi = Math.round((kg * (1 + REGLAS.SUBIDA_MAX)) / paso) * paso
  if (lo <= kg) lo = kg + paso
  if (hi < lo) hi = lo
  return { lo, hi, texto: lo === hi ? `${fmtKg(lo)} kg` : `${fmtKg(lo)}–${fmtKg(hi)} kg` }
}

// Semana anterior a una dada, con la misma clave que la rejilla. Ojo: según
// la zona horaria esa clave puede caer en domingo (ver formatRangoSemana), y
// restar 7 días a un domingo da el domingo de la semana de ANTES de la
// anterior. Por eso se va al jueves (mitad de semana, siempre dentro) y se
// resta desde ahí.
function semanaMenos(semanaISO, n = 1) {
  const d = new Date(`${semanaISO}T12:00:00`)
  d.setDate(d.getDate() + 3 - 7 * n)
  return semanaYDiaDeFecha(d.toISOString().slice(0, 10)).semana
}

// Lo que apuntó el cliente en cada ejercicio, ejercicio por ejercicio y con
// su semana. Solo sesiones de Harbiz con `detalle.registro` (el robot lo
// manda desde el 2026-11-07; las anteriores no lo tienen y no cuentan).
export function historialEjercicios(sesionesDelCliente) {
  const porEjercicio = new Map()
  ;(sesionesDelCliente || []).forEach((s) => {
    if (s.descartada) return
    const registro = s.detalle?.registro
    if (!Array.isArray(registro)) return
    const { semana } = semanaYDiaDeFecha(s.fecha)
    registro.forEach((e) => {
      const nombre = String(e?.nombre || '').trim()
      if (!nombre) return
      const series = (Array.isArray(e.series) ? e.series : []).map((x) => ({ reps: num(x?.reps), kg: num(x?.kg) }))
      const clave = nombre.toLowerCase()
      if (!porEjercicio.has(clave)) porEjercicio.set(clave, { nombre, apariciones: [] })
      porEjercicio.get(clave).apariciones.push({
        sesionId: s.id,
        semana,
        fecha: s.fecha,
        hechaEn: s.hechaEn || '',
        rango: rangoDeObjetivo(e.objetivo),
        objetivo: String(e.objetivo || '').trim(),
        series,
        kgMax: Math.max(0, ...series.map((x) => x.kg)),
        comentario: String(e.comentario || '').trim(),
        valoracion: ['sin', 'molestia', 'dolor', 'nota'].includes(e.valoracion) ? e.valoracion : null,
        clase: e.clase === 'fuerza' || e.clase === 'movilidad' ? e.clase : null,
      })
    })
  })
  porEjercicio.forEach((v) => v.apariciones.sort((a, b) => (a.fecha + a.hechaEn).localeCompare(b.fecha + b.hechaEn)))
  return porEjercicio
}

const repsValidas = (ap) => ap.series.map((x) => x.reps).filter((r) => r > 0)

// Semanas seguidas (contando la actual hacia atrás) en las que aparece.
function semanasSeguidas(apariciones, semana) {
  const semanas = new Set(apariciones.map((a) => a.semana))
  let n = 0
  let s = semana
  while (semanas.has(s)) { n += 1; s = semanaMenos(s) }
  return n
}

// Propuestas de UN cliente para la semana que viene, mirando lo que hizo en
// `semana` (lunes ISO) y la anterior. Devuelve:
//   { nivel: 'rojo' | 'ambar' | 'verde' | 'sin-datos', propuestas: [...] }
// Cada propuesta: { id, tipo, ejercicio, texto, cita, sesionId, opciones }. El id es
// estable (cliente|semana|tipo|ejercicio) para casarla con su respuesta
// guardada. `sesionId` es la sesión de Harbiz de la que sale (la ÚLTIMA de la
// semana con ese ejercicio): es donde se enseña en ⚡ Registro, porque la
// propuesta se hace al revisar cada sesión, no toda junta el viernes. Si el
// ejercicio se repite el jueves, la propuesta "se muda" a la sesión del
// jueves; como el id no lleva la sesión, si ya se respondió el lunes sale
// respondida, y solo vuelve a pendiente si lo del jueves cambia el tipo
// (p. ej. el lunes tocaba subir y el jueves aparece una molestia).
export function propuestasCliente(clienteNombre, sesionesDelCliente, semana) {
  const historial = historialEjercicios(sesionesDelCliente)
  const anterior = semanaMenos(semana)
  const propuestas = []
  const movilidad = { cambiar: [], pronto: [] }
  // `clave` solo hace falta cuando el nombre no basta para que el id sea
  // único (dos sesiones el mismo día con comentario general).
  // `opciones` (ver OPCIONES): entre qué elige el fisio. Las notas de cada
  // opción son lo que leería el CLIENTE en Harbiz: en segunda persona y sin
  // la explicación de la regla, que es para el fisio.
  const nueva = (tipo, ejercicio, texto, cita = '', clave = ejercicio, sesionId = null, opciones = null) => propuestas.push({
    id: `${clienteNombre}|${semana}|${tipo}|${clave.toLowerCase()}`,
    tipo, ejercicio, texto, cita, sesionId, opciones,
  })

  historial.forEach(({ nombre, apariciones }) => {
    const esta = apariciones.filter((a) => a.semana === semana)
    if (esta.length === 0) return
    const u = esta[esta.length - 1]
    // Todas las propuestas de este ejercicio cuelgan de su última sesión.
    const propone = (tipo, texto, cita = '', claves = null, notas = {}) => nueva(tipo, nombre, texto, cita, nombre, u.sesionId, claves ? construirOpciones(claves, u, notas) : null)
    const previa = apariciones.filter((a) => a.semana === anterior)
    const p = previa[previa.length - 1] || null
    const valoraciones = esta.map((a) => a.valoracion)
    // La cita es el último comentario que importa de la semana.
    const conCita = (tipos) => [...esta].reverse().find((a) => tipos.includes(a.valoracion) && a.comentario)?.comentario || ''
    const conCarga = apariciones.some((a) => a.kgMax > 0)
    const clase = conCarga ? 'fuerza' : (u.clase || (PATRON_MOVILIDAD.test(nombre) ? 'movilidad' : 'fuerza'))

    if (valoraciones.includes('nota')) propone('nota', '', conCita(['nota']))

    // Dolor: siempre al fisio, sea fuerza o movilidad.
    if (valoraciones.includes('dolor')) {
      propone('dolor', 'Dolor: decide el fisio (cambio de ejercicio, rango o carga).', conCita(['dolor']), ['libre', 'cambio', 'hablar'])
      return
    }

    if (clase === 'movilidad') {
      if (valoraciones.includes('molestia')) {
        propone('molestia', 'Movilidad con molestia: revisar.', conCita(['molestia']), ['libre', 'cambio', 'hablar'])
        return
      }
      const n = semanasSeguidas(apariciones, semana)
      const m = { nombre, semanas: n, ultima: u }
      if (n >= REGLAS.MOVILIDAD_SEMANAS_CAMBIAR) movilidad.cambiar.push(m)
      else if (n >= REGLAS.MOVILIDAD_SEMANAS_PRONTO) movilidad.pronto.push(m)
      return
    }

    // Fuerza con molestia: misma carga, y si ya venía de la semana pasada,
    // toca preguntar.
    if (valoraciones.includes('molestia')) {
      const sigue = previa.some((a) => a.valoracion === 'molestia')
      const carga = u.kgMax > 0 ? ` (${fmtKg(u.kgMax)} kg)` : ''
      propone('molestia',
        sigue ? `Misma carga${carga}. 2ª semana con molestia: preguntar cómo va.` : `Misma carga${carga}. Preguntar si sigue la semana que viene.`,
        conCita(['molestia']), ['carga', 'libre', 'cambio', 'hablar'],
        { carga: `${u.kgMax > 0 ? `Mantén el peso (${fmtKg(u.kgMax)} kg).` : 'Mantén la misma carga.'} Si sigues notando molestia, cuéntanoslo en el comentario.` })
      return
    }

    const reps = repsValidas(u)
    if (!u.rango || reps.length === 0) return
    const { hi, fijo } = u.rango
    // Con reps fijas solo progresa si las supera; con rango, al llegar al
    // tope o al estar 2 semanas a MARGEN_CERCA de él.
    const llegaAlTope = fijo ? reps.every((r) => r > hi) : reps.every((r) => r >= hi)
    const cerca = (ap) => ap && ap.rango && !ap.rango.fijo && repsValidas(ap).length > 0 && repsValidas(ap).every((r) => r >= ap.rango.hi - REGLAS.MARGEN_CERCA)
    // SEMANAS_CERCA = 2: esta semana y la anterior.
    const dosSemanasCerca = !fijo && cerca(u) && cerca(p)
    const rango = fijo ? `${hi} reps` : `${u.rango.lo}-${u.rango.hi}`
    const hecho = `${reps.join('/')}${u.kgMax > 0 ? ` × ${fmtKg(u.kgMax)} kg` : ''}`

    if (llegaAlTope || dosSemanasCerca) {
      const motivo = llegaAlTope ? `llega al tope de ${rango}` : `2 semanas cerca del tope de ${rango}`
      if (u.kgMax > 0) {
        const nuevo = rangoCargaNueva(u.kgMax).texto
        // Ya no se repite el rango en la nota ("(8-12 repeticiones)"): está
        // en su casilla de Harbiz, y si cambia es con la opción "rango".
        propone('subir', `${fmtKg(u.kgMax)} kg → ${nuevo} (${motivo}: ${hecho})`, '',
          ['peso', 'pesoRango', 'rango', 'rir', 'serie', 'libre', 'cambio'], { peso: nuevo })
      }
      else propone('propioPeso', `Sin carga, ${motivo} (${hecho}): subir reps o ejercicio más difícil.`, '',
        ['rango', 'rir', 'serie', 'libre', 'cambio'])
      return
    }

    // Doble progresión (caso de Alicia, 2026-11-07): se le propuso subir,
    // subió de peso y, como es normal, las reps bajan del tope. Sin esta
    // regla el ejercicio se quedaba sin propuesta. Lo que toca es mantener
    // el peso nuevo y buscar reps hasta el tope; al llegar, ya saldrá
    // "subir" otra vez. Se compara con la aparición anterior que tenga
    // carga, sea de la semana pasada o de antes en esta misma semana (si
    // el lunes hizo 15 y el jueves 16, la subida es del jueves).
    const antes = [...apariciones].filter((a) => (a.fecha + a.hechaEn) < (u.fecha + u.hechaEn) && a.kgMax > 0).pop()
    if (antes && u.kgMax > antes.kgMax) {
      const objetivo = fijo ? `cumplir las ${hi} reps` : `llegar a ${hi} reps en todas las series`
      propone('reps', `Subió de ${fmtKg(antes.kgMax)} a ${fmtKg(u.kgMax)} kg (${hecho}): mantener ${fmtKg(u.kgMax)} kg y ${objetivo}.`, '',
        ['reps', 'rir', 'serie', 'libre', 'cambio'],
        { reps: fijo
          ? `Mantén el peso (${fmtKg(u.kgMax)} kg) y completa las ${hi} repeticiones en todas las series.`
          : `Mantén el peso (${fmtKg(u.kgMax)} kg) y busca más repeticiones, hasta ${hi} en todas las series.` })
      return
    }

    const igual = p && JSON.stringify(p.series) === JSON.stringify(u.series)
    // Siempre tiene que haber progresión: aquí salen todas las formas de
    // progresar, y "hablarlo" como una más.
    if (igual) propone('igual', `${hecho} dos semanas seguidas: hablar con la persona.`, '',
      ['peso', 'pesoRango', 'rango', 'rir', 'serie', 'libre', 'cambio', 'hablar'])
  })

  // Hay clientes que no comentan por ejercicio sino al final de la sesión
  // ("un poco de molestia en el hombro"). El robot valora también ese
  // comentario (`detalle.valoracion`); si habla de molestia o dolor, sale
  // como una línea más para que no se pierda, aunque no se sepa de qué
  // ejercicio es.
  ;(sesionesDelCliente || []).forEach((s) => {
    if (s.descartada || semanaYDiaDeFecha(s.fecha).semana !== semana) return
    const v = s.detalle?.valoracion
    const texto = String(s.detalle?.comentario || '').trim()
    if ((v !== 'dolor' && v !== 'molestia') || !texto) return
    const dia = new Date(`${s.fecha}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })
    nueva(v, `Sesión del ${dia}`, v === 'dolor' ? 'Comentario general con dolor: decide el fisio.' : 'Comentario general con molestia: preguntar a qué ejercicio se refiere.', texto, `sesion ${s.id}`, s.id)
  })

  // La movilidad va agrupada en UNA línea por cliente (petición de Raúl):
  // once líneas de "lleva 4 semanas" no se leen.
  // La línea agrupada cuelga de la última sesión de la semana con movilidad.
  const ultimaSesion = (lista) => [...lista].sort((a, b) => (a.ultima.fecha + a.ultima.hechaEn).localeCompare(b.ultima.fecha + b.ultima.hechaEn)).pop()?.ultima.sesionId || null
  if (movilidad.cambiar.length > 0) {
    const maxSem = Math.max(...movilidad.cambiar.map((m) => m.semanas))
    nueva('movilidad', 'movilidad',
      `La movilidad lleva ${maxSem >= 6 ? '6+' : maxSem} semanas igual: toca cambiarla (${movilidad.cambiar.length} ejercicio${movilidad.cambiar.length === 1 ? '' : 's'}).`,
      movilidad.cambiar.map((m) => m.nombre).join(' · '), 'movilidad', ultimaSesion(movilidad.cambiar))
  } else if (movilidad.pronto.length > 0) {
    nueva('movilidad', 'movilidad',
      `La movilidad lleva ${REGLAS.MOVILIDAD_SEMANAS_PRONTO} semanas: cambiarla la semana que viene (${movilidad.pronto.length} ejercicio${movilidad.pronto.length === 1 ? '' : 's'}).`,
      movilidad.pronto.map((m) => m.nombre).join(' · '), 'movilidad', ultimaSesion(movilidad.pronto))
  }

  propuestas.sort((a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo))
  const hayDatos = [...historial.values()].some((h) => h.apariciones.some((a) => a.semana === semana))
  let nivel = 'sin-datos'
  if (hayDatos) {
    if (propuestas.some((x) => x.tipo === 'dolor')) nivel = 'rojo'
    else if (propuestas.some((x) => x.tipo !== 'nota')) nivel = 'ambar'
    else nivel = 'verde'
  }
  return { nivel, propuestas }
}

// Sesiones de Harbiz de un cliente del panel (mismo emparejamiento que el
// volcado: Harbiz ID o email, nunca por nombre).
export function sesionesHarbizDeCliente(cliente, sesionesHarbiz, clientes) {
  return (sesionesHarbiz || []).filter((s) => clienteDeHarbiz(clientes, s.harbizClienteId, s.harbizEmail)?.Nombre === cliente.Nombre)
}

// Una propuesta está "pendiente" si nadie le ha respondido todavía. Las
// notas del cliente son informativas: no se responden.
export function esRespondible(propuesta) {
  return propuesta.tipo !== 'nota'
}

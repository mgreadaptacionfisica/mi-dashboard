// Del cuestionario inicial a la red de determinantes: qué factores proponer y
// con qué gravedad (0-100). Es una PROPUESTA que el fisio ajusta en el editor,
// no una red hecha:
//
//   - Solo se proponen factores que salen de respuestas PUNTUABLES (escalas y
//     opciones). Las respuestas de texto libre (creencias, trabajo, qué le han
//     dicho otros…) no se pueden puntuar sin leerlas: se quedan al lado,
//     agrupadas por factor, para que el fisio decida si añadirlas.
//   - Por debajo de UMBRAL no se propone el factor: un estrés de 2/10 no es un
//     determinante y solo metería ruido en una red que tiene que quedarse
//     entre 7 y 15 nodos.
//   - Las flechas (qué causa qué y en qué proporción) NO se tocan. Es el
//     juicio clínico de la red, y la causalidad que da el cliente ya se enseña
//     en "Su propia lectura".
//
// En hombro, el dolor y la kinesiofobia los mandan el SPADI y el TAMPA de la
// propia valoración (gravedadesSugeridas()); la intensidad 0-10 de aquí solo
// se usa si no hay SPADI (resto de zonas).

import { anadirNodo, fijarGravedad, fijarDiana, tieneNodo, dianasDe } from './redDeterminantes'

const UMBRAL = 30

const escala = (v) => {
  const n = Number(v)
  return v === '' || v === null || v === undefined || Number.isNaN(n) ? null : Math.round(n * 10)
}
const invertida = (v) => {
  const e = escala(v)
  return e === null ? null : 100 - e
}
const deOpcion = (mapa) => (v) => (v in mapa ? mapa[v] : null)

// Cada factor: de qué respuestas sale su gravedad. Si salen varias (sueño),
// se queda la media de las que haya.
const REGLAS = {
  dolor: [(r) => escala(r.intensidad)],
  irritabilidad: [(r) => deOpcion({ Minutos: 20, 'Un par de horas': 45, 'El resto del día': 70, 'Al día siguiente sigue igual': 90 })(r.irritabilidad)],
  sueno: [
    (r) => invertida(r.suenoCalidad),
    (r) => deOpcion({ Nunca: 0, 'Alguna noche': 35, 'Casi todas': 70, Todas: 90 })(r.suenoDespierta),
  ],
  catastrofismo: [(r) => escala(r.catastrofismo)],
  hipervigilancia: [(r) => escala(r.hipervigilancia)],
  estres: [(r) => escala(r.estres)],
  animoBajo: [(r) => invertida(r.animo)],
  autoeficacia: [(r) => invertida(r.autoeficacia)],
  apoyoEntorno: [(r) => deOpcion({ 'Lo complican': 60 })(r.apoyo)],
  situacionLaboral: [(r) => deOpcion({ 'De baja': 60, 'Incapacidad en trámite': 80, 'Proceso legal abierto': 80 })(r.laboral)],
  turnosViajes: [(r) => deOpcion({ 'Turnos rotativos': 50, 'Turnos de noche': 70, 'Viajo mucho': 50 })(r.turnos)],
}

// { factorId: gravedad } con los que pasan el umbral.
export function gravedadesDesdeCuestionario(respuestas) {
  const r = respuestas || {}
  const out = {}
  Object.entries(REGLAS).forEach(([factor, fuentes]) => {
    const valores = fuentes.map((f) => f(r)).filter((v) => v !== null)
    if (valores.length === 0) return
    const g = Math.round(valores.reduce((t, v) => t + v, 0) / valores.length / 5) * 5
    if (g >= UMBRAL) out[factor] = g
  })
  return out
}

// Añade a la red los factores propuestos. No pisa nada de lo que ya haya
// hecho el fisio: un factor que ya está conserva su gravedad. Las gravedades
// del SPADI/TAMPA (`sugeridasValoracion`) mandan sobre las del cuestionario.
// Si no hay problema diana y entra el dolor, se marca el dolor como diana,
// que es lo normal (se puede cambiar con un clic).
export function aplicarCuestionarioARed(red, respuestas, sugeridasValoracion = {}) {
  const propuesta = { ...gravedadesDesdeCuestionario(respuestas), ...sugeridasValoracion }
  let nueva = red
  let anadidos = 0
  Object.entries(propuesta).forEach(([factor, g]) => {
    if (tieneNodo(nueva, factor)) return
    nueva = fijarGravedad(anadirNodo(nueva, factor), factor, g)
    anadidos += 1
  })
  if (dianasDe(nueva).length === 0 && tieneNodo(nueva, 'dolor')) nueva = fijarDiana(nueva, 'dolor')
  return { red: nueva, anadidos }
}

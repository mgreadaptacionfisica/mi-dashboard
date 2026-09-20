// Problemas del cliente y qué hemos hecho para resolverlos.
// (tabla `problemas_cliente`, ver supabase-sql/60_problemas_cliente.sql)
//
// Por qué existe esto aparte de las notas de sesión y de los "cambios de la
// semana": esas dos cosas viven DENTRO de una semana y desaparecen de la
// vista al llegar el lunes. Un problema real no funciona así — una molestia
// en el hombro aparece un martes, el cambio se hace el jueves, y hasta tres
// semanas después no sabes si ha funcionado. Un problema, por tanto:
//   1. se abre el día que aparece,
//   2. va acumulando ACCIONES (cada cambio que hacemos por él, con su fecha),
//   3. y se cierra cuando se resuelve, diciendo cómo acabó.
// Así queda, por cliente, la cadena entera "le pasó esto → hicimos esto →
// acabó así", que es lo que hay que poder leer meses después.



// Un problema abierto que lleva más de una semana sin que se haya hecho
// NADA por él es lo que de verdad hay que reclamar: no es que no se haya
// resuelto (eso lleva su tiempo), es que no se ha intentado nada.
export const DIAS_SIN_ACCION_AVISO = 7

// Fecha de hoy en ISO y en horario LOCAL. Ojo: toISOString() pasa a UTC y
// desde España devolvería el día anterior a partir de las 22:00, que es
// justo cuando un entrenador remata el día y apunta lo que ha pasado.
export function hoyISO() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Id generado en el navegador (ver la nota en lib/queries/problemasCliente.js):
// permite pintar el problema al momento y guardarlo con un upsert idempotente.
export function nuevoProblemaId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `prob-${crypto.randomUUID()}`
  return `prob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function crearProblema({ clienteNombre, problema, por = '', origen = 'manual', origenRef = null }) {
  return {
    id: nuevoProblemaId(),
    clienteNombre,
    problema: (problema || '').trim(),
    detectadoEn: hoyISO(),
    detectadoPor: por || '',
    origen,
    origenRef,
    estado: 'abierto',
    acciones: [],
    resueltoEn: null,
    resueltoPor: '',
    resultado: '',
  }
}

// Una acción es un cambio que hemos hecho POR este problema. Se añade al
// final: el orden cronológico es la mitad de la información (qué probamos
// primero y qué hizo falta después).
export function anadirAccion(problema, { texto, por = '' }) {
  const limpio = (texto || '').trim()
  if (!limpio) return problema
  return { ...problema, acciones: [...(problema.acciones || []), { texto: limpio, fecha: hoyISO(), por }] }
}

export function editarAccion(problema, indice, texto) {
  const limpio = (texto || '').trim()
  if (!limpio) return problema
  return { ...problema, acciones: (problema.acciones || []).map((a, i) => (i === indice ? { ...a, texto: limpio } : a)) }
}

export function quitarAccion(problema, indice) {
  return { ...problema, acciones: (problema.acciones || []).filter((_, i) => i !== indice) }
}

export function resolverProblema(problema, { resultado = '', por = '' } = {}) {
  return { ...problema, estado: 'resuelto', resueltoEn: hoyISO(), resueltoPor: por, resultado: (resultado || '').trim() }
}

// Reabrir siempre se puede (el problema vuelve): se limpia el cierre pero se
// conservan las acciones, que son justo lo que hay que mirar para no repetir
// lo que ya no funcionó.
export function reabrirProblema(problema) {
  return { ...problema, estado: 'abierto', resueltoEn: null, resueltoPor: '', resultado: '' }
}

export function esAbierto(p) {
  return (p?.estado || 'abierto') !== 'resuelto'
}

// Días que lleva (o llevó) abierto un problema.
export function diasAbierto(problema, desdeISO = hoyISO()) {
  const inicio = problema?.detectadoEn
  if (!inicio) return 0
  const fin = esAbierto(problema) ? desdeISO : (problema.resueltoEn || desdeISO)
  const dias = Math.round((new Date(`${fin}T00:00:00`) - new Date(`${inicio}T00:00:00`)) / 86400000)
  return dias < 0 ? 0 : dias
}

// Fecha de lo último que se hizo por el problema (o la de detección si no se
// ha hecho nada todavía).
export function ultimaAccionISO(problema) {
  const acciones = problema?.acciones || []
  if (acciones.length === 0) return problema?.detectadoEn || null
  return acciones[acciones.length - 1].fecha || problema?.detectadoEn || null
}

// Días sin tocar un problema abierto: lo que dispara el aviso de Pendientes.
export function diasSinAccion(problema, desdeISO = hoyISO()) {
  const ultima = ultimaAccionISO(problema)
  if (!ultima) return 0
  const dias = Math.round((new Date(`${desdeISO}T00:00:00`) - new Date(`${ultima}T00:00:00`)) / 86400000)
  return dias < 0 ? 0 : dias
}

// Los problemas de un cliente, separados y ya ordenados para leerlos:
// abiertos primero y, dentro, el más antiguo arriba (el que más tiempo lleva
// sin resolver es el que más quema); los resueltos, del más reciente al más
// viejo.
export function problemasDeCliente(problemas = [], clienteNombre) {
  const mios = problemas.filter((p) => p.clienteNombre === clienteNombre)
  const abiertos = mios.filter(esAbierto).sort((a, b) => (a.detectadoEn || '').localeCompare(b.detectadoEn || ''))
  const resueltos = mios.filter((p) => !esAbierto(p)).sort((a, b) => (b.resueltoEn || '').localeCompare(a.resueltoEn || ''))
  return { abiertos, resueltos, todos: mios }
}

export function contarAbiertos(problemas = [], clienteNombre) {
  return problemas.filter((p) => p.clienteNombre === clienteNombre && esAbierto(p)).length
}

// ¿Esta sesión concreta tiene un problema colgando? Se usa para pintar el 🚨
// en la celda de la rejilla. Se busca por (semana, día, índice de la sesión),
// que es lo que se guardó en origenRef al abrirlo desde el 💬.
export function problemaDeSesion(problemas = [], clienteNombre, semana, dia, indice) {
  return problemas.find((p) => (
    p.clienteNombre === clienteNombre &&
    p.origen === 'sesion' &&
    p.origenRef?.semana === semana &&
    p.origenRef?.dia === dia &&
    p.origenRef?.indice === indice
  )) || null
}

// Problemas que se abrieron o se resolvieron dentro de una semana concreta
// (lunes ISO). Para el resumen semanal y los 📝 Resúmenes del admin.
//
// Ojo con la clave de semana: se genera con toISOString() y desde España cae
// en DOMINGO, un día antes del lunes real (está explicado a fondo en
// formatRangoSemana(), en seguimientoHelpers.js). Aquí comparamos contra
// fechas de calendario de verdad, así que hay que corregir el desfase o
// tanto el domingo de la semana anterior como el de esta caerían mal.
function rangoRealSemana(semanaISO) {
  const inicio = new Date(`${semanaISO}T00:00:00`)
  if (inicio.getDay() === 0) inicio.setDate(inicio.getDate() + 1)
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 6)
  const p = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { desde: p(inicio), hasta: p(fin) }
}

export function problemasDeSemana(problemas = [], clienteNombre, semanaISO) {
  const { desde, hasta } = rangoRealSemana(semanaISO)
  const enRango = (iso) => Boolean(iso) && iso >= desde && iso <= hasta
  const mios = problemas.filter((p) => p.clienteNombre === clienteNombre)
  return {
    nuevos: mios.filter((p) => enRango(p.detectadoEn)),
    resueltos: mios.filter((p) => !esAbierto(p) && enRango(p.resueltoEn)),
    // Acciones apuntadas esta semana, vengan del problema que vengan: es lo
    // que el trabajador ha hecho de verdad estos días.
    acciones: mios.flatMap((p) => (p.acciones || [])
      .filter((a) => enRango(a.fecha))
      .map((a) => ({ ...a, problema: p.problema, problemaId: p.id }))),
    // Abiertos con algo que decir: los que siguen colgando a día de hoy.
    abiertos: mios.filter(esAbierto),
  }
}

// Problemas detectados esta semana a los que todavía no se les ha hecho
// NADA. Es la condición que bloquea el cierre de semana: si esta semana ha
// aparecido un problema, la semana no se cierra sin decir qué se ha hecho
// (o sin resolverlo).
export function problemasSinAccionDeSemana(problemas = [], clienteNombre, semanaISO) {
  const { nuevos } = problemasDeSemana(problemas, clienteNombre, semanaISO)
  return nuevos.filter((p) => esAbierto(p) && (p.acciones || []).length === 0)
}

// Texto corto de "de dónde salió", para pintarlo debajo del problema.
export function textoOrigen(problema, etiquetaDia) {
  if (problema?.origen !== 'sesion' || !problema.origenRef) return 'Apuntado a mano'
  const { sesion } = problema.origenRef
  const dia = etiquetaDia || problema.origenRef.dia || ''
  return `Salió en la sesión${sesion ? ` "${sesion}"` : ''}${dia ? ` del ${dia.toLowerCase()}` : ''}`
}

// Entradas del problema para el 📜 Historial del cliente: la apertura, cada
// acción y el cierre, cada una con su fecha real. Las devuelve sueltas para
// que historialCliente() las reparta en la semana que le toque a cada una.
export function entradasHistorialProblemas(problemas = [], clienteNombre) {
  const entradas = []
  problemas.filter((p) => p.clienteNombre === clienteNombre).forEach((p) => {
    entradas.push({
      tipo: 'problema',
      fechaISO: p.detectadoEn,
      titulo: '🚨 Problema detectado',
      texto: p.problema,
      por: p.detectadoPor,
    })
    ;(p.acciones || []).forEach((a) => {
      entradas.push({
        tipo: 'accion',
        fechaISO: a.fecha,
        titulo: '🔧 Qué hicimos',
        texto: `${a.texto}${p.problema ? ` (por: ${p.problema})` : ''}`,
        por: a.por,
      })
    })
    if (!esAbierto(p) && p.resueltoEn) {
      entradas.push({
        tipo: 'resuelto',
        fechaISO: p.resueltoEn,
        titulo: '✅ Problema resuelto',
        texto: `${p.problema}${p.resultado ? ` — ${p.resultado}` : ''}`,
        por: p.resueltoPor,
      })
    }
  })
  return entradas
}


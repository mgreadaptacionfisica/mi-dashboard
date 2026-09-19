// Embudo de ventas (pestaña "🩺 Embudo" de Ventas y % de cierre del Pipeline).
//
// La idea, a petición de Raúl: saber a golpe de vista EN QUÉ PASO se pierde la
// venta. Para eso cada paso se mide solo sobre la gente que llegó a ese paso:
//
//   Agendan ──► Se presentan ──► Compran en la llamada
//                                   └─► (si no) Seguimiento ──► Compran después
//
// El error que había antes: la tasa de cierre era ganadas ÷ (ganadas +
// perdidas), y "perdidas" incluía a quien ni se presentó (no show / cancelación
// que no quiso reagendar). Eso castigaba al closer por algo que pasa ANTES de
// la llamada y mezclaba dos problemas distintos: uno de agenda/pre-llamada y
// otro de venta. Ahora:
//   - % asistencia = se presentaron ÷ (se presentaron + no se presentaron)
//   - % cierre     = compraron ÷ se presentaron   (estándar del sector: "close
//                    rate on shows")
// y los no shows solo afectan a la asistencia.
//
// Todo va por LEAD (persona), no por intento de llamada: si alguien falla el
// martes y viene el jueves, es una persona que se presentó (y se cuenta aparte
// como "rescatada"). El resumen semanal, en cambio, cuenta intentos porque
// responde a otra pregunta ("¿cuántas llamadas hubo esta semana?").

// Referencias de mercado para venta high-ticket por llamada (servicios /
// coaching), usadas para el semáforo. Asistencia: 70–80 % se considera buena y
// por debajo del 60 % hay un problema claro. Cierre sobre llamadas hechas: lo
// típico está entre el 20 y el 35 %. Seguimiento y rescate no tienen una
// referencia pública fiable: son orientativas y así se indica en pantalla.
export const REFERENCIAS = {
  asistencia: { bien: 70, regular: 60, texto: 'Bueno ≥70 % · flojo <60 %' },
  cierre: { bien: 25, regular: 15, texto: 'Bueno ≥25 % · flojo <15 % (típico 20–35 %)' },
  seguimiento: { bien: 20, regular: 10, texto: 'Orientativo: bueno ≥20 %' },
  rescate: { bien: 40, regular: 20, texto: 'Orientativo: bueno ≥40 %' },
}

// Por debajo de esto un porcentaje no dice nada (2 de 3 = 67 %), así que no se
// colorea ni entra en el diagnóstico.
export const MUESTRA_MINIMA = 5

const ETAPAS_TRAS_LLAMADA = ['realizada', 'seguimiento', 'ganada', 'perdida']
const MOTIVO_NO_REAGENDA = 'No quiso reagendar tras cancelación'

// ¿Llegó a tener la llamada con el closer? Es la pregunta clave de todo el
// embudo. La fuente buena es el historial de intentos (migración 54); para los
// leads antiguos que no lo tienen se deduce de la etapa, con dos excepciones
// que SÍ se pueden distinguir: el seguimiento que viene de un no show
// ("pendiente de reagendar") y la pérdida marcada directamente desde
// "Agendada" o por no querer reagendar.
export function tuvoLlamada(lead) {
  const historial = lead.historialLlamadas || []
  if (historial.some((e) => e.resultado === 'realizada')) return true
  if (lead.resultadoLlamada === 'realizada') return true
  if (lead.compraEnLlamada === true || lead.compraEnLlamada === false) return true
  if (historial.length > 0 || lead.resultadoLlamada) return false
  if (!ETAPAS_TRAS_LLAMADA.includes(lead.etapa)) return false
  if (lead.etapa === 'seguimiento' && lead.origenSeguimiento === 'reagendar') return false
  if (lead.etapa === 'perdida' && (lead.etapaAnterior === 'agendada' || lead.motivoPerdida === MOTIVO_NO_REAGENDA)) return false
  return true
}

// ¿Falló alguna vez la cita (no show o cancelación)? Las "modificadas" no
// cuentan: son cambios de hora pactados, no plantones.
export function falloAlgunaCita(lead) {
  const historial = lead.historialLlamadas || []
  return historial.some((e) => e.resultado === 'no_show' || e.resultado === 'cancelada')
    || ['no_show', 'cancelada'].includes(lead.resultadoLlamada)
}

// Situación del lead respecto a la llamada:
//   'asistio'     → tuvo la llamada.
//   'pendiente'   → aún puede tenerla: agendada, o en seguimiento para
//                   reagendar. No cuenta ni a favor ni en contra.
//   'no_asistio'  → se cerró (ganada/perdida) sin haber tenido la llamada.
export function estadoAsistencia(lead) {
  if (tuvoLlamada(lead)) return 'asistio'
  if (lead.etapa === 'agendada' || lead.etapa === 'seguimiento') return 'pendiente'
  return 'no_asistio'
}

// Fecha que manda para meter al lead en un periodo: la de su PRIMERA llamada
// (la primera que tuvo puesta). Así cada persona entra una sola vez en el
// embudo, en el mes en que agendó, y lo que le pase después (reagendar,
// comprar a las tres semanas) se le sigue apuntando a ese mismo mes. Es un
// análisis por "cohorte", el que sirve para comparar un mes con otro.
export function fechaEntrada(lead) {
  const fechas = [
    ...(lead.historialLlamadas || []).map((e) => e.fecha),
    lead.fechaAgenda,
  ].filter(Boolean).sort()
  return fechas[0] || lead.creadoEn || ''
}

const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : null)
const importe = (l) => Number(l.venta?.importe) || 0

// Color del semáforo para un % frente a su referencia. Con poca muestra no se
// juzga ('gris').
export function semaforo(valor, clave, muestra) {
  if (valor === null || muestra < MUESTRA_MINIMA) return 'gris'
  const ref = REFERENCIAS[clave]
  if (valor >= ref.bien) return 'verde'
  if (valor >= ref.regular) return 'ambar'
  return 'rojo'
}

// Todos los números del embudo para una lista de leads. No filtra por fecha:
// eso lo hace quien llama (ver filtrarPorPeriodo).
export function calcularEmbudo(leads) {
  const conEstado = leads.map((l) => ({ lead: l, estado: estadoAsistencia(l) }))
  const asistieron = conEstado.filter((x) => x.estado === 'asistio').map((x) => x.lead)
  const noAsistieron = conEstado.filter((x) => x.estado === 'no_asistio').map((x) => x.lead)
  const pendientesDeLlamada = conEstado.filter((x) => x.estado === 'pendiente').map((x) => x.lead)

  // Rescate: de los que dieron plantón alguna vez, cuántos acabaron teniendo
  // la llamada. Dice si el seguimiento de no shows funciona.
  const fallaron = leads.filter(falloAlgunaCita)
  const fallaronYResueltos = fallaron.filter((l) => estadoAsistencia(l) !== 'pendiente')
  const rescatados = fallaron.filter(tuvoLlamada)

  // Venta: solo entre los que tuvieron la llamada.
  const ganadasConLlamada = asistieron.filter((l) => l.etapa === 'ganada')
  // Una venta sin la marca de "compró en la llamada" (leads antiguos, de antes
  // de que existiera) se da por cerrada en la llamada: es lo habitual, y solo
  // se marca `false` explícitamente cuando pasó por "No compró".
  const compraronEnLlamada = ganadasConLlamada.filter((l) => l.compraEnLlamada !== false)
  // Llamada hecha pero sin apuntar si compró o no: es un hueco de datos, no
  // una venta perdida, y se avisa aparte.
  const sinDecision = asistieron.filter((l) => l.etapa === 'realizada')
  // Pasaron a seguimiento = tuvieron la llamada y no compraron en ella (se
  // marcó "No compró", o se perdió / sigue en seguimiento sin haber comprado).
  const aSeguimiento = asistieron.filter((l) => l.compraEnLlamada === false
    || (['seguimiento', 'perdida'].includes(l.etapa) && l.compraEnLlamada !== true))
  const ganadasTrasSeguimiento = aSeguimiento.filter((l) => l.etapa === 'ganada')
  const perdidasTrasSeguimiento = aSeguimiento.filter((l) => l.etapa === 'perdida')
  const abiertosEnSeguimiento = aSeguimiento.filter((l) => l.etapa === 'seguimiento')
  const decididosSeguimiento = ganadasTrasSeguimiento.length + perdidasTrasSeguimiento.length

  // Ventas sin llamada (p. ej. un no show que compró por WhatsApp): suman
  // dinero, pero no entran en el % de cierre porque no hubo llamada que cerrar.
  const ganadasSinLlamada = leads.filter((l) => l.etapa === 'ganada' && !tuvoLlamada(l))
  const todasGanadas = leads.filter((l) => l.etapa === 'ganada')
  const vendido = todasGanadas.reduce((t, l) => t + importe(l), 0)

  // Pérdidas separadas por DÓNDE se perdieron, que es lo que de verdad
  // interesa: antes de la llamada (agenda) o después (venta).
  const perdidas = leads.filter((l) => l.etapa === 'perdida')
  const perdidasSinLlamada = perdidas.filter((l) => !tuvoLlamada(l))
  const perdidasConLlamada = perdidas.filter(tuvoLlamada)
  const agruparMotivos = (lista) => {
    const mapa = new Map()
    lista.forEach((l) => {
      const motivo = (l.motivoPerdida || 'Sin motivo especificado').trim()
      const clave = motivo.toLowerCase()
      const actual = mapa.get(clave) || { motivo, total: 0 }
      actual.total += 1
      mapa.set(clave, actual)
    })
    return [...mapa.values()].sort((a, b) => b.total - a.total)
  }

  // Objeciones más repetidas entre los que tuvieron llamada y no compraron en
  // ella. Son texto libre, así que se agrupan por texto exacto (sin
  // mayúsculas): sirve para ver las que se repiten tal cual.
  const objeciones = new Map()
  aSeguimiento.forEach((l) => (l.objeciones || []).forEach((o) => {
    const texto = (o.texto || '').trim()
    if (!texto) return
    const clave = texto.toLowerCase()
    const actual = objeciones.get(clave) || { texto, total: 0 }
    actual.total += 1
    objeciones.set(clave, actual)
  }))

  // Checklist pre-llamada (WhatsApp + prellamada + recordatorio) frente a la
  // asistencia: si los que lo tienen completo vienen bastante más, el
  // problema de no shows es de proceso, no de los leads.
  const resueltos = conEstado.filter((x) => x.estado !== 'pendiente')
  const checklistCompleto = (l) => Boolean(l.preLlamada?.whatsapp && l.preLlamada?.prellamada && l.preLlamada?.recordatorio)
  const conChecklist = resueltos.filter((x) => checklistCompleto(x.lead))
  const sinChecklist = resueltos.filter((x) => !checklistCompleto(x.lead))

  const resueltosAsistencia = asistieron.length + noAsistieron.length

  return {
    agendados: leads.length,
    asistieron: asistieron.length,
    noAsistieron: noAsistieron.length,
    pendientesDeLlamada: pendientesDeLlamada.length,
    resueltosAsistencia,
    tasaAsistencia: pct(asistieron.length, resueltosAsistencia),

    fallaron: fallaron.length,
    fallaronResueltos: fallaronYResueltos.length,
    rescatados: rescatados.length,
    tasaRescate: pct(rescatados.length, fallaronYResueltos.length),

    ganadasConLlamada: ganadasConLlamada.length,
    compraronEnLlamada: compraronEnLlamada.length,
    tasaCierre: pct(ganadasConLlamada.length, asistieron.length),
    tasaCierreEnLlamada: pct(compraronEnLlamada.length, asistieron.length),
    sinDecision: sinDecision.length,

    aSeguimiento: aSeguimiento.length,
    ganadasTrasSeguimiento: ganadasTrasSeguimiento.length,
    perdidasTrasSeguimiento: perdidasTrasSeguimiento.length,
    abiertosEnSeguimiento: abiertosEnSeguimiento.length,
    decididosSeguimiento,
    tasaSeguimiento: pct(ganadasTrasSeguimiento.length, decididosSeguimiento),

    ganadas: todasGanadas.length,
    ganadasSinLlamada: ganadasSinLlamada.length,
    vendido,
    ticketMedio: todasGanadas.length > 0 ? vendido / todasGanadas.length : null,
    // € por llamada hecha: junta asistencia y cierre y ticket en un solo
    // número. Es el que dice cuánto vale cada hueco de agenda de un closer.
    eurosPorLlamada: asistieron.length > 0 ? vendido / asistieron.length : null,

    perdidasSinLlamada: perdidasSinLlamada.length,
    perdidasConLlamada: perdidasConLlamada.length,
    motivosSinLlamada: agruparMotivos(perdidasSinLlamada),
    motivosConLlamada: agruparMotivos(perdidasConLlamada),
    objeciones: [...objeciones.values()].sort((a, b) => b.total - a.total),

    checklist: {
      con: { total: conChecklist.length, tasa: pct(conChecklist.filter((x) => x.estado === 'asistio').length, conChecklist.length) },
      sin: { total: sinChecklist.length, tasa: pct(sinChecklist.filter((x) => x.estado === 'asistio').length, sinChecklist.length) },
    },
  }
}

// Diagnóstico: de los pasos que tienen muestra suficiente, cuál está más por
// debajo de su referencia. Se ordena por "cuánto le falta en proporción" (un
// 50 % de asistencia sobre 70 es peor que un 20 % de cierre sobre 25) para
// señalar UN cuello de botella principal y no una lista de todo.
const PASOS_DIAGNOSTICO = [
  {
    clave: 'asistencia', campo: 'tasaAsistencia', muestra: 'resueltosAsistencia',
    titulo: 'La gente no se presenta a la llamada',
    donde: 'antes de la llamada (agenda y pre-llamada)',
    revisar: [
      'Que se haga siempre el checklist pre-llamada: WhatsApp, prellamada y recordatorio el mismo día.',
      'Cuántos días pasan entre que agendan y la llamada: cuanto más lejos, más plantones (lo ideal son 24–72 h).',
      'Que el lead llegue cualificado y sepa para qué es la llamada: si agenda "por curiosidad", falla.',
      'Reagendar en el momento a quien falla (mira el % de rescate).',
    ],
  },
  {
    clave: 'cierre', campo: 'tasaCierre', muestra: 'asistieron',
    titulo: 'Se tienen las llamadas pero no se cierra',
    donde: 'en la propia llamada',
    revisar: [
      'Las objeciones que más se repiten (abajo): son la lista de lo que hay que trabajar en el guion.',
      'Escuchar grabaciones de llamadas perdidas frente a ganadas del mismo closer.',
      'Si el problema es de un solo closer (tabla por closer) o de todos (entonces es la oferta o el lead).',
      'Si el lead llega sin cualificar: mucha asistencia con poco cierre suele ser gente que no puede pagarlo.',
    ],
  },
  {
    clave: 'seguimiento', campo: 'tasaSeguimiento', muestra: 'decididosSeguimiento',
    titulo: 'El seguimiento no recupera ventas',
    donde: 'después de la llamada (seguimiento)',
    revisar: [
      'Que cada lead en seguimiento tenga fecha de recontacto (pestaña 🔁 Recontactar) y se cumpla.',
      'Que el seguimiento ataque la objeción concreta que puso en la llamada, no un "¿qué tal, lo has pensado?".',
      'Poner un límite de tiempo: un seguimiento de más de 2–3 semanas rara vez cierra.',
    ],
  },
]

export function diagnosticar(embudo) {
  const evaluados = PASOS_DIAGNOSTICO
    .map((p) => {
      const valor = embudo[p.campo]
      const muestra = embudo[p.muestra]
      return { ...p, valor, muestra, color: semaforo(valor, p.clave, muestra), ratio: valor === null ? null : valor / REFERENCIAS[p.clave].bien }
    })
  const conDatos = evaluados.filter((p) => p.color !== 'gris')
  const flojos = conDatos.filter((p) => p.color !== 'verde').sort((a, b) => a.ratio - b.ratio)
  return {
    principal: flojos[0] || null,
    secundarios: flojos.slice(1),
    sinDatos: conDatos.length === 0,
    pasos: evaluados,
  }
}

// Periodos del selector. 'desde' en ISO local (no toISOString, que en España
// devolvería el día anterior de madrugada).
const dosDigitos = (n) => String(n).padStart(2, '0')
const isoLocal = (d) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`

export const PERIODOS = [
  { id: 'mes', label: 'Este mes' },
  { id: 'mesPasado', label: 'Mes pasado' },
  { id: '90', label: 'Últimos 90 días' },
  { id: 'todo', label: 'Todo' },
]

export function rangoPeriodo(id, hoy = new Date()) {
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  if (id === 'mes') return { desde: isoLocal(new Date(y, m, 1)), hasta: isoLocal(new Date(y, m + 1, 0)) }
  if (id === 'mesPasado') return { desde: isoLocal(new Date(y, m - 1, 1)), hasta: isoLocal(new Date(y, m, 0)) }
  if (id === '90') {
    const desde = new Date(hoy)
    desde.setDate(desde.getDate() - 89)
    return { desde: isoLocal(desde), hasta: isoLocal(hoy) }
  }
  return { desde: '', hasta: '' }
}

// Periodo anterior de la misma longitud, para la comparativa ("vs mes
// pasado", "vs los 90 días anteriores"). 'todo' no tiene anterior.
export function rangoAnterior(id, hoy = new Date()) {
  if (id === 'mes') return rangoPeriodo('mesPasado', hoy)
  if (id === 'mesPasado') {
    const y = hoy.getFullYear()
    const m = hoy.getMonth()
    return { desde: isoLocal(new Date(y, m - 2, 1)), hasta: isoLocal(new Date(y, m - 1, 0)) }
  }
  if (id === '90') {
    const hasta = new Date(hoy)
    hasta.setDate(hasta.getDate() - 90)
    const desde = new Date(hasta)
    desde.setDate(desde.getDate() - 89)
    return { desde: isoLocal(desde), hasta: isoLocal(hasta) }
  }
  return null
}

export function filtrarPorPeriodo(leads, { desde, hasta }) {
  if (!desde && !hasta) return leads
  return leads.filter((l) => {
    const f = fechaEntrada(l)
    return Boolean(f) && f >= desde && f <= hasta
  })
}

// Huecos de datos que falsean el embudo, independientes del periodo: llamadas
// que ya pasaron y siguen en "Agendada" sin resultado, y llamadas hechas sin
// apuntar si compró. Mientras estén así, no cuentan en ningún porcentaje.
export function huecosDeDatos(leads, hoyISO) {
  return {
    sinResultado: leads.filter((l) => l.etapa === 'agendada' && l.fechaAgenda && l.fechaAgenda < hoyISO),
    sinDecision: leads.filter((l) => l.etapa === 'realizada'),
  }
}

// Entrenos completados en Harbiz → ⚡ Registro de sesiones.
// (tabla `sesiones_harbiz`, ver supabase-sql/64_sesiones_harbiz.sql)
//
// La rutina automática deja en `sesiones_harbiz` lo que cada cliente ha
// marcado como hecho en Harbiz. Al cargar, el panel lo vuelca a la rejilla
// como una sesión más SIN revisar (revisado: false): ya no hay que
// apuntarla a mano, pero el check sigue siendo del entrenador, que es quien
// la revisa. Así Pendientes y el cierre de semana siguen funcionando igual.
//
// Cada sesión volcada guarda `harbizId` (el id de su fila en sesiones_harbiz)
// y eso es lo que evita duplicarla: el volcado se repite en cada carga, y si
// alguien con el panel abierto desde antes guardó la semana sin ella (el
// panel guarda la semana entera de golpe), simplemente vuelve a aparecer.
// La única forma de que no vuelva es quitarla con ✕, que la marca
// `descartada`.

import { mondayOf, toISO, semanaVacia, diaVacio } from './seguimientoHelpers'
import { normalizaNombre } from './cuestionarioPrevio'

// getDay() → id de día de la rejilla (0 = domingo).
const DIA_POR_GETDAY = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

// Mismo tope que la rejilla: como mucho 3 sesiones por día.
const MAX_SESIONES_DIA = 3

// Semana y día de la rejilla en que cae una fecha 'YYYY-MM-DD'. La semana se
// calcula con las MISMAS funciones que usa la rejilla (mondayOf + toISO), con
// su rareza de zona horaria incluida (ver formatRangoSemana), para que la
// clave coincida con la que ya hay guardada. Mediodía para no cruzar de día
// por el cambio de hora.
export function semanaYDiaDeFecha(fecha) {
  const d = new Date(`${fecha}T12:00:00`)
  return { semana: toISO(mondayOf(d)), diaId: DIA_POR_GETDAY[d.getDay()] }
}

// Cliente del panel al que corresponde una sesión de Harbiz: primero el
// emparejamiento a mano ('Harbiz ID'), luego el email. Nunca por nombre.
export function clienteDeHarbiz(clientes, harbizClienteId, harbizEmail) {
  const lista = clientes || []
  const porId = lista.find((c) => c['Harbiz ID'] && c['Harbiz ID'] === harbizClienteId)
  if (porId) return porId
  const email = String(harbizEmail || '').trim().toLowerCase()
  if (!email) return null
  return lista.find((c) => String(c.Email || '').trim().toLowerCase() === email) || null
}

// Texto del chip. Harbiz solo da el título del último entreno de cada día,
// así que si hizo dos el primero puede venir sin nombre.
export function textoSesionHarbiz(sesion) {
  if (sesion.titulo) return sesion.titulo
  return sesion.tipo === 'cardio' ? 'Cardio' : 'Entreno'
}

// Hora "18:34" a la que el cliente lo marcó como hecho, en hora de aquí.
export function horaSesionHarbiz(hechaEn) {
  if (!hechaEn) return ''
  const d = new Date(hechaEn)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

// Mete en los seguimientos las sesiones de Harbiz que aún no están.
// Devuelve la lista completa ya fusionada y, aparte, solo los registros que
// han cambiado (para guardarlos). Solo clientes ACTIVOS: los que están EN
// PAUSA no salen en la rejilla.
export function volcarSesionesHarbiz(sesiones, clientes, seguimientos) {
  const resultado = [...(seguimientos || [])]
  const cambiados = new Map()

  const pendientes = (sesiones || [])
    .filter((s) => !s.descartada)
    .sort((a, b) => (a.fecha === b.fecha ? a.n - b.n : a.fecha < b.fecha ? -1 : 1))

  pendientes.forEach((sesion) => {
    const cliente = clienteDeHarbiz(clientes, sesion.harbizClienteId, sesion.harbizEmail)
    if (!cliente || cliente['Estado del cliente'] !== 'ACTIVO') return
    const { semana, diaId } = semanaYDiaDeFecha(sesion.fecha)
    const clave = `${cliente.Nombre}|${semana}`

    const idx = resultado.findIndex((s) => s.clienteNombre === cliente.Nombre && s.semana === semana)
    const actual = idx >= 0
      ? resultado[idx]
      : { clienteNombre: cliente.Nombre, semana, dias: semanaVacia(), comentarios: '', cambiosPendientes: [], revisiones: [] }
    const tareas = actual.dias?.[diaId]?.tareas || diaVacio().tareas

    const yaEsta = tareas.findIndex((t) => t.harbizId === sesion.id)
    let nuevasTareas = null
    if (yaEsta >= 0) {
      // Llegó primero sin título y ahora ya se sabe: se completa, salvo que
      // alguien lo haya cambiado a mano.
      const t = tareas[yaEsta]
      if (t.harbizSinTitulo && sesion.titulo) {
        nuevasTareas = tareas.map((x, i) => (i === yaEsta ? { ...x, texto: sesion.titulo, harbizSinTitulo: false } : x))
      }
    } else if (tareas.length < MAX_SESIONES_DIA) {
      nuevasTareas = [...tareas, {
        texto: textoSesionHarbiz(sesion),
        revisado: false,
        revisadoEn: null,
        harbizId: sesion.id,
        harbizHechaEn: sesion.hechaEn || null,
        harbizSinTitulo: !sesion.titulo,
      }]
    }
    if (!nuevasTareas) return

    const actualizado = { ...actual, dias: { ...(actual.dias || semanaVacia()), [diaId]: { tareas: nuevasTareas } } }
    if (idx >= 0) resultado[idx] = actualizado
    else resultado.push(actualizado)
    cambiados.set(clave, actualizado)
  })

  return { seguimientos: resultado, cambiados: [...cambiados.values()] }
}

// Clientes de Harbiz con entrenos recientes que no casan con ninguna ficha
// (ni por 'Harbiz ID' ni por email). Salen en Clientes para emparejarlos a
// mano una vez; después ya entran solos.
export function harbizSinEmparejar(sesiones, clientes) {
  const porCliente = new Map()
  ;(sesiones || []).forEach((s) => {
    if (clienteDeHarbiz(clientes, s.harbizClienteId, s.harbizEmail)) return
    const previo = porCliente.get(s.harbizClienteId)
    if (previo) {
      previo.sesiones += 1
      if (s.fecha > previo.ultima) previo.ultima = s.fecha
      if (!previo.email && s.harbizEmail) previo.email = s.harbizEmail
    } else {
      porCliente.set(s.harbizClienteId, {
        harbizClienteId: s.harbizClienteId,
        nombre: s.harbizNombre,
        email: s.harbizEmail,
        sesiones: 1,
        ultima: s.fecha,
      })
    }
  })
  return [...porCliente.values()].sort((a, b) => (a.ultima < b.ultima ? 1 : -1))
}

// Propuesta de emparejamiento por nombre, SOLO como sugerencia para el botón
// (lo confirma una persona): la ficha cuyas palabras del nombre están todas
// en el nombre de Harbiz ("Pedro Cabreira" ⊂ "PEDRO CABREIRA FERNÁNDEZ").
// Si encaja más de una, no se sugiere ninguna.
export function sugerenciaPorNombre(harbizNombre, clientes) {
  const palabrasHarbiz = new Set(normalizaNombre(harbizNombre).split(' ').filter(Boolean))
  if (palabrasHarbiz.size === 0) return null
  const candidatos = (clientes || []).filter((c) => {
    if (c['Harbiz ID']) return false
    const palabras = normalizaNombre(c.Nombre).split(' ').filter(Boolean)
    return palabras.length >= 2 && palabras.every((p) => palabrasHarbiz.has(p))
  })
  return candidatos.length === 1 ? candidatos[0] : null
}

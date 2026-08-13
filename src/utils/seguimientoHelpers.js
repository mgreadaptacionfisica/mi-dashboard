// Utilidades compartidas para el seguimiento semanal de clientes,
// usadas tanto desde Clientes.jsx (ficha del cliente) como desde
// Equipo.jsx (resumen por profesional).

import { parseFechaFlexible } from './fechasEsp'

export const BLOQUES_SESION = ['DIA', 'A/1', 'B/2', 'C/3', 'D/4', 'E/5', 'F/6', 'Cardio', 'Entrenamiento', 'Evaluación', 'Semanal', 'Mensual', 'Otra']

export const DIAS_SEMANA = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
]

export function mondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function toISO(date) {
  return date.toISOString().slice(0, 10)
}

export function semanaActualISO() {
  return toISO(mondayOf(new Date()))
}

// Lunes de la semana anterior a un lunes ISO dado (para avisar de semanas
// que quedaron sin cerrar cuando ya se ha pasado a la semana nueva).
export function semanaAnteriorISO(mondayISO) {
  const d = new Date(`${mondayISO}T00:00:00`)
  d.setDate(d.getDate() - 7)
  return toISO(d)
}

// Texto "3 ago – 9 ago" de una semana, a partir de su clave.
//
// OJO con la clave: se genera con toISO() (toISOString), que pasa la hora a
// UTC. Desde España, que va por delante de UTC, las 00:00 del lunes son las
// 22:00 del domingo en UTC, así que la clave que se guarda cae en DOMINGO,
// un día antes del lunes real. No es un problema de datos —todo el panel usa
// la misma función para leer y para escribir, así que todos hablan de la
// misma semana—, pero el texto sí tiene que enseñar la semana de verdad:
// de lunes a domingo. Por eso, si la clave cae en domingo, se empieza a
// contar desde el día siguiente. Cambiar la clave en sí obligaría a migrar
// todo el histórico ya guardado (seguimientos, contactos, revisiones), y no
// aporta nada mientras solo se consulte desde aquí.
export function formatRangoSemana(mondayISO) {
  const inicio = new Date(`${mondayISO}T00:00:00`)
  if (inicio.getDay() === 0) inicio.setDate(inicio.getDate() + 1)
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 6)
  const fmt = (d) => `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })}`
  return `${fmt(inicio)} – ${fmt(fin)}`
}

export function diaVacio() {
  return { tareas: [] }
}

export function semanaVacia() {
  const dias = {}
  DIAS_SEMANA.forEach((d) => { dias[d.id] = diaVacio() })
  return dias
}

// Progreso de una semana concreta (registro puede ser undefined si no existe aún).
export function progresoSemana(registro) {
  if (!registro) return { total: 0, revisadas: 0, porcentaje: null }
  let total = 0
  let revisadas = 0
  DIAS_SEMANA.forEach((d) => {
    const tareas = registro.dias?.[d.id]?.tareas || []
    total += tareas.length
    revisadas += tareas.filter((t) => t.revisado).length
  })
  return { total, revisadas, porcentaje: total > 0 ? Math.round((revisadas / total) * 100) : null }
}

// Resumen del "check final" semanal, POR CLIENTE (a petición de Raúl): de
// una lista de clientes ya filtrada (los propios de un técnico, o todos
// para el admin), cuenta cuántos tienen marcado a mano el check de
// "semana revisada" (revisiones_semanales_cliente) para una semana
// concreta. El check es manual — lo marca el técnico/admin desde el modal
// de Seguimiento de cada cliente cuando ya está todo revisado, hechos los
// cambios oportunos, y preparada la semana siguiente. No se calcula solo a
// partir de las tareas: sirve justo para llevar la cuenta de cuántos
// clientes le faltan por repasar y cerrar antes de terminar la semana.
export function resumenRevisionesSemana(clientes, revisiones, semanaISO) {
  const total = clientes.length
  const revisados = clientes.filter((c) =>
    revisiones.some((r) => r.clienteNombre === c.Nombre && r.semana === semanaISO && r.revisado)
  ).length
  return { total, revisados }
}

// Los 3 puntos de contacto semanal con el cliente por parte del técnico.
// "hint" es lo que se le debe preguntar/decir al cliente en ese mensaje.
export const PUNTOS_CONTACTO = [
  {
    id: 'inicio',
    label: 'Inicio de semana',
    dia: 'Lunes',
    hint: 'Preguntarle qué tal ha ido el fin de semana y cómo empezamos la semana.',
  },
  {
    id: 'mitad',
    label: 'Mitad de semana',
    dia: 'Miércoles o jueves',
    hint: 'Preguntarle cómo va la semana.',
  },
  {
    id: 'fin',
    label: 'Fin de semana',
    dia: 'Viernes o sábado',
    hint: 'Preguntarle qué tal ha ido la semana en general, si hay algo que revisar de cara al fin de semana o la semana que viene, y desearle buen fin de semana.',
  },
]

export function contactoVacio() {
  return {
    inicio: { hecho: false, fecha: null, comentario: '' },
    mitad: { hecho: false, fecha: null, comentario: '' },
    fin: { hecho: false, fecha: null, comentario: '' },
  }
}

// Progreso de contacto semanal (0-3) para un registro concreto (puede ser undefined).
export function progresoContacto(registro) {
  if (!registro) return { total: 3, hechos: 0, porcentaje: 0 }
  const hechos = PUNTOS_CONTACTO.filter((p) => registro[p.id]?.hecho).length
  return { total: 3, hechos, porcentaje: Math.round((hechos / 3) * 100) }
}

// ————————————————————————————————————————————————————————————————
// Panel "Pendientes" (pestaña de admin en Seguimiento y Valoración)
// ————————————————————————————————————————————————————————————————
// Reúne en una sola lista TODO lo que queda por hacer de cada cliente
// (sesiones sin marcar, cambios sin hacer, semanas sin cerrar y contacto
// semanal incompleto), para verlo de un vistazo sin entrar cliente por
// cliente. A petición de Raúl: control de admin, no una herramienta más.
//
// Cada pendiente lleva un nivel, y la diferencia importa:
//   - 'atrasado': viene de semanas que YA han terminado. Es lo que de verdad
//     se ha escapado y hay que recuperar → es lo que cuenta el badge rojo.
//   - 'semana': es de la semana en curso; todavía hay tiempo de hacerlo, así
//     que informa pero no alarma.
// La semana EN CURSO no genera aviso de "sin cerrar": es lo normal hasta el
// domingo y ya se ve en el banner de la rejilla y en el ⏳ de cada cliente.
export const SEMANAS_PENDIENTES_ATRAS = 6

// Claves de las N semanas anteriores a una dada, de la más antigua a la más
// reciente. La fecha se formatea en horario LOCAL a propósito: toISO()
// (toISOString) desplazaría un día más y saldrían claves de semana que no
// cuadran con las que ya hay guardadas en la base de datos.
export function semanasPreviasISO(semanaISO, n = SEMANAS_PENDIENTES_ATRAS) {
  const dosDigitos = (x) => String(x).padStart(2, '0')
  const semanas = []
  for (let i = n; i >= 1; i -= 1) {
    const d = new Date(`${semanaISO}T00:00:00`)
    d.setDate(d.getDate() - 7 * i)
    semanas.push(`${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`)
  }
  return semanas
}

// Todo lo pendiente de UN cliente. Devuelve { cliente, items, atrasado }.
// Cada item es { tipo, nivel, semana, cantidad, texto }, y el tipo es lo que
// decide a dónde te lleva al pulsarlo en el panel.
export function pendientesDeCliente(cliente, { seguimientos = [], revisionesSemanales = [], contactos = [], semanaActual, semanasAtras = SEMANAS_PENDIENTES_ATRAS }) {
  const nombre = cliente.Nombre
  const items = []

  // A un cliente que acaba de empezar no se le reclama nada de antes de su
  // alta: si no, todo cliente nuevo aparecería con semanas "sin cerrar" que
  // nunca llegaron a existir. Sin fecha de inicio no se filtra nada.
  const inicio = parseFechaFlexible(cliente['Fecha inicio'])
  const yaEraCliente = (semana) => !inicio || inicio <= semana

  const segDe = (semana) => seguimientos.find((s) => s.clienteNombre === nombre && s.semana === semana)
  const contactoDe = (semana) => contactos.find((c) => c.clienteNombre === nombre && c.semana === semana)
  const cerrada = (semana) => revisionesSemanales.some((r) => r.clienteNombre === nombre && r.semana === semana && r.revisado)
  const plural = (n, singular, pluralTxt) => `${n} ${n === 1 ? singular : pluralTxt}`

  // 1) Semanas ya terminadas que quedaron abiertas (lo grave).
  const previas = semanasPreviasISO(semanaActual, semanasAtras)
  for (const semana of previas) {
    if (!yaEraCliente(semana)) continue
    const seg = segDe(semana)
    const progreso = progresoSemana(seg)
    const cambios = seg?.cambiosPendientes || []
    // Solo se reclama una semana pasada si tuvo algo de actividad: una semana
    // completamente vacía suele ser una semana en la que ese cliente no
    // entrenaba (vacaciones, parón...), no un olvido del entrenador.
    const tuvoActividad = progreso.total > 0 || cambios.length > 0
    if (!tuvoActividad || cerrada(semana)) continue

    const rango = formatRangoSemana(semana)
    items.push({ tipo: 'semana', nivel: 'atrasado', semana, cantidad: 1, texto: `Semana del ${rango} sin cerrar` })

    const sinMarcar = progreso.total - progreso.revisadas
    if (sinMarcar > 0) {
      items.push({ tipo: 'sesiones', nivel: 'atrasado', semana, cantidad: sinMarcar, texto: `${plural(sinMarcar, 'sesión', 'sesiones')} sin marcar · ${rango}` })
    }
    const cambiosSinHacer = cambios.filter((c) => !c.hecho).length
    if (cambiosSinHacer > 0) {
      items.push({ tipo: 'cambios', nivel: 'atrasado', semana, cantidad: cambiosSinHacer, texto: `${plural(cambiosSinHacer, 'cambio', 'cambios')} sin hacer · ${rango}` })
    }
  }

  // 2) Contacto semanal de la semana pasada: se mira SOLO la inmediatamente
  // anterior. Más atrás no se recupera un contacto y solo sería ruido.
  const semanaAnterior = previas[previas.length - 1]
  if (semanaAnterior && yaEraCliente(semanaAnterior)) {
    const progreso = progresoContacto(contactoDe(semanaAnterior))
    if (progreso.hechos < progreso.total) {
      items.push({ tipo: 'contacto', nivel: 'atrasado', semana: semanaAnterior, cantidad: progreso.total - progreso.hechos, texto: `Contacto de la semana pasada ${progreso.hechos}/${progreso.total}` })
    }
  }

  // 3) La semana en curso: informa de lo que aún se puede hacer a tiempo.
  const segActual = segDe(semanaActual)
  const progresoActual = progresoSemana(segActual)
  if (progresoActual.total === 0) {
    items.push({ tipo: 'sin-registro', nivel: 'semana', semana: semanaActual, cantidad: 1, texto: 'Sin ninguna sesión registrada esta semana' })
  } else {
    const sinMarcar = progresoActual.total - progresoActual.revisadas
    if (sinMarcar > 0) {
      items.push({ tipo: 'sesiones', nivel: 'semana', semana: semanaActual, cantidad: sinMarcar, texto: `${plural(sinMarcar, 'sesión', 'sesiones')} sin marcar esta semana` })
    }
  }
  const cambiosActual = (segActual?.cambiosPendientes || []).filter((c) => !c.hecho).length
  if (cambiosActual > 0) {
    items.push({ tipo: 'cambios', nivel: 'semana', semana: semanaActual, cantidad: cambiosActual, texto: `${plural(cambiosActual, 'cambio', 'cambios')} sin hacer esta semana` })
  }
  const contactoActual = progresoContacto(contactoDe(semanaActual))
  if (contactoActual.hechos < contactoActual.total) {
    items.push({ tipo: 'contacto', nivel: 'semana', semana: semanaActual, cantidad: contactoActual.total - contactoActual.hechos, texto: `Contacto de esta semana ${contactoActual.hechos}/${contactoActual.total}` })
  }

  return { cliente, items, atrasado: items.some((i) => i.nivel === 'atrasado') }
}

// Totales del panel: lo de arriba del todo, para saber el tamaño del problema
// antes de mirar cliente por cliente.
export function resumenPendientes(pendientes = []) {
  const total = { clientes: pendientes.length, clientesAtrasados: 0, semanasSinCerrar: 0, sesiones: 0, cambios: 0, contactos: 0 }
  for (const p of pendientes) {
    if (p.atrasado) total.clientesAtrasados += 1
    for (const item of p.items) {
      if (item.tipo === 'semana') total.semanasSinCerrar += 1
      if (item.tipo === 'sesiones') total.sesiones += item.cantidad
      if (item.tipo === 'cambios') total.cambios += item.cantidad
      if (item.tipo === 'contacto') total.contactos += item.cantidad
    }
  }
  return total
}

// Última vez que se marcó como revisada cualquier tarea de un cliente,
// mirando todas las semanas guardadas (no solo la actual).
export function ultimaRevisionCliente(seguimientos, clienteNombre) {
  let ultima = null
  seguimientos
    .filter((s) => s.clienteNombre === clienteNombre)
    .forEach((registro) => {
      DIAS_SEMANA.forEach((d) => {
        const tareas = registro.dias?.[d.id]?.tareas || []
        tareas.forEach((t) => {
          if (t.revisado && t.revisadoEn && (!ultima || t.revisadoEn > ultima)) {
            ultima = t.revisadoEn
          }
        })
      })
    })
  return ultima
}

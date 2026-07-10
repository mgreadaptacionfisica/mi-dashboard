// Utilidades compartidas para el seguimiento semanal de clientes,
// usadas tanto desde Clientes.jsx (ficha del cliente) como desde
// Equipo.jsx (resumen por profesional).

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

export function formatRangoSemana(mondayISO) {
  const inicio = new Date(`${mondayISO}T00:00:00`)
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

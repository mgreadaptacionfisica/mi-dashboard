import { supabase } from '../supabaseClient'
import { avisaErrorGuardado } from '../avisosGuardado'

// Entrenos completados en Harbiz que trae la rutina automática (migración 64).
// Aquí solo se leen y se descartan: insertar es cosa del robot, a través de
// la función registrar_sesiones_harbiz().
function fromRow(row) {
  return {
    id: row.id,
    harbizClienteId: row.harbiz_cliente_id,
    harbizNombre: row.harbiz_nombre || '',
    harbizEmail: row.harbiz_email || '',
    fecha: row.fecha,
    n: row.n || 1,
    tipo: row.tipo || '',
    titulo: row.titulo || '',
    hechaEn: row.hecha_en || null,
    descartada: row.descartada === true,
  }
}

// Solo las últimas semanas: la rejilla deja ir hacia atrás para terminar una
// semana, pero lo que tenga más de esto ya está cerrado o no se va a mirar.
const DIAS_ATRAS = 42

export async function fetchSesionesHarbiz() {
  if (!supabase) return null
  const desde = new Date()
  desde.setDate(desde.getDate() - DIAS_ATRAS)
  const { data, error } = await supabase
    .from('sesiones_harbiz')
    .select('*')
    .gte('fecha', desde.toISOString().slice(0, 10))
    .order('fecha', { ascending: true })
  if (error) {
    console.error('[sesionesHarbiz] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

// ✕ en la rejilla sobre una sesión de Harbiz: sin esto el panel la volvería
// a poner en la próxima carga.
export async function descartarSesionHarbizRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('sesiones_harbiz').update({ descartada: true }).eq('id', id)
  if (error) avisaErrorGuardado('[sesionesHarbiz] descartar error:', error)
}

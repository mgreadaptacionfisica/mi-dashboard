import { supabase } from '../supabaseClient'
import { leerTodo } from './leerTodo'
import { avisaErrorGuardado } from '../avisosGuardado'

// Respuestas del fisio a las 🤖 propuestas de progresión (migración 70). Las
// propuestas no se guardan (las calcula utils/progresion.js); solo si se
// aplicaron o se descartaron, y por qué.
function fromRow(row) {
  return {
    id: row.id,
    clienteNombre: row.cliente_nombre,
    semana: row.semana,
    ejercicio: row.ejercicio,
    tipo: row.tipo,
    texto: row.texto || '',
    estado: row.estado,
    motivo: row.motivo || '',
    respondidoPor: row.respondido_por || '',
    respondidoEn: row.respondido_en || null,
    // 📲 Escritura en Harbiz (migración 71). Todo null si no va a Harbiz.
    harbizClienteId: row.harbiz_cliente_id || '',
    notaHarbiz: row.nota_harbiz || '',
    harbizEstado: row.harbiz_estado || null,
    harbizDetalle: row.harbiz_detalle || '',
    harbizEn: row.harbiz_en || null,
  }
}

function toRow(r) {
  const fila = {
    id: r.id,
    cliente_nombre: r.clienteNombre,
    semana: r.semana,
    ejercicio: r.ejercicio,
    tipo: r.tipo,
    texto: r.texto || '',
    estado: r.estado,
    motivo: r.motivo || null,
    respondido_por: r.respondidoPor || null,
    respondido_en: r.respondidoEn || new Date().toISOString(),
  }
  // 📲 Solo si va a Harbiz (migración 71). Fuera de ese caso las columnas no
  // se mandan, para que el resto del equipo pueda responder aunque la
  // migración aún no esté ejecutada. Después solo las toca el robot
  // (marcar_propuestas_harbiz). Para volver a responder hay que deshacer,
  // que borra la fila, así que no quedan restos de una escritura anterior.
  if (r.harbizEstado) {
    Object.assign(fila, {
      harbiz_cliente_id: r.harbizClienteId || null,
      nota_harbiz: r.notaHarbiz || null,
      harbiz_estado: r.harbizEstado,
      harbiz_detalle: null,
      harbiz_en: null,
    })
  }
  return fila
}

// Solo las últimas semanas, igual que sesiones_harbiz: las propuestas se
// calculan con esas sesiones, y una respuesta más vieja no casa con nada.
const DIAS_ATRAS = 42

export async function fetchPropuestasProgresion() {
  if (!supabase) return null
  const desde = new Date()
  desde.setDate(desde.getDate() - DIAS_ATRAS)
  const { data, error } = await leerTodo('propuestas_progresion', (q) => q
    .gte('semana', desde.toISOString().slice(0, 10)))
  if (error) {
    console.error('[propuestasProgresion] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function upsertRespuestaPropuestaRemote(respuesta) {
  if (!supabase) return
  const { error } = await supabase.from('propuestas_progresion').upsert(toRow(respuesta), { onConflict: 'id' })
  if (error) avisaErrorGuardado('[propuestasProgresion] upsert error:', error)
}

// "Deshacer": la propuesta vuelve a quedar pendiente.
export async function deleteRespuestaPropuestaRemote(id) {
  if (!supabase) return
  const { error } = await supabase.from('propuestas_progresion').delete().eq('id', id)
  if (error) avisaErrorGuardado('[propuestasProgresion] delete error:', error)
}

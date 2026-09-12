import { supabase } from '../supabaseClient'
import { avisaErrorGuardado } from '../avisosGuardado'

function fromRow(row) {
  return {
    id: row.id,
    clienteNombre: row.cliente_nombre || '',
    email: row.email || '',
    respuestas: row.respuestas || {},
    revisado: row.revisado || false,
    enviadoEn: row.enviado_en,
  }
}

export async function fetchCuestionariosPrevios() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('cuestionarios_previos')
    .select('*')
    .order('enviado_en', { ascending: false })
  if (error) {
    console.error('[cuestionariosPrevios] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

// Envío desde la ruta PÚBLICA /cuestionario, sin login.
//
// Dos cosas que no se pueden cambiar sin romperlo:
//
//   1. NO se encadena .select(). El rol `anon` tiene permiso de insert pero
//      no de select (migración 59), así que pedir la fila de vuelta haría
//      fallar la llamada entera aunque la fila se hubiera guardado bien.
//   2. Devuelve el error en vez de tragárselo. El cliente está rellenando 15
//      minutos de formulario: si falla el envío tiene que verlo y poder
//      reintentar, no quedarse con un "gracias" falso. Mismo criterio que la
//      valoración (ver insertValoracionRemote).
export async function enviarCuestionarioPublico(cuestionario) {
  if (!supabase) return { message: 'No hay conexión con la base de datos.' }
  const { error } = await supabase.from('cuestionarios_previos').insert({
    id: cuestionario.id,
    cliente_nombre: cuestionario.clienteNombre || null,
    email: cuestionario.email || null,
    respuestas: cuestionario.respuestas || {},
  })
  if (error) {
    console.error('[cuestionariosPrevios] insert público error:', error.message)
    return error
  }
  return null
}

// Marca de "ya lo he pasado a la red de determinantes". Solo el equipo.
export async function marcarCuestionarioRevisado(id, revisado) {
  if (!supabase || !id) return
  const { error } = await supabase
    .from('cuestionarios_previos')
    .update({ revisado })
    .eq('id', id)
  if (error) avisaErrorGuardado('[cuestionariosPrevios] update error:', error)
}

// Reasigna un cuestionario a otro cliente. Hace falta porque el enlace con el
// cliente es por nombre: si alguien entra sin el parámetro `c` y lo teclea
// distinto ("Jose" en vez de "José"), el cuestionario queda huérfano y hay que
// poder engancharlo a mano desde el panel.
export async function reasignarCuestionario(id, clienteNombre) {
  if (!supabase || !id) return
  const { error } = await supabase
    .from('cuestionarios_previos')
    .update({ cliente_nombre: clienteNombre || null })
    .eq('id', id)
  if (error) avisaErrorGuardado('[cuestionariosPrevios] reasignar error:', error)
}

export async function deleteCuestionarioPrevio(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('cuestionarios_previos').delete().eq('id', id)
  if (error) avisaErrorGuardado('[cuestionariosPrevios] delete error:', error)
}

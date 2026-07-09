import { supabase } from '../supabaseClient'

function fromRow(row) {
  return {
    id: row.id,
    autor: row.autor,
    texto: row.texto,
    menciones: row.menciones || [],
    fecha: row.fecha,
  }
}

function toRow(msg) {
  return {
    id: msg.id,
    autor: msg.autor,
    texto: msg.texto,
    menciones: msg.menciones || [],
    fecha: msg.fecha,
  }
}

export async function fetchMensajesEquipo() {
  if (!supabase) return null
  const { data, error } = await supabase.from('mensajes_equipo').select('*').order('fecha', { ascending: false })
  if (error) {
    console.error('[mensajesEquipo] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertMensajeRemote(msg) {
  if (!supabase) return
  const { error } = await supabase.from('mensajes_equipo').insert(toRow(msg))
  if (error) console.error('[mensajesEquipo] insert error:', error.message)
}

export async function deleteMensajeRemote(id) {
  if (!supabase) return
  const { error } = await supabase.from('mensajes_equipo').delete().eq('id', id)
  if (error) console.error('[mensajesEquipo] delete error:', error.message)
}

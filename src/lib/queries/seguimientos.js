import { supabase } from '../supabaseClient'

function fromRow(row) {
  return {
    clienteNombre: row.cliente_nombre,
    semana: row.semana,
    dias: row.dias || {},
    comentarios: row.comentarios || '',
    cambiosPendientes: row.cambios_pendientes || [],
    revisiones: row.revisiones || [],
  }
}

function toRow(registro) {
  return {
    cliente_nombre: registro.clienteNombre,
    semana: registro.semana,
    dias: registro.dias || {},
    comentarios: registro.comentarios || '',
    cambios_pendientes: registro.cambiosPendientes || [],
    revisiones: registro.revisiones || [],
  }
}

export async function fetchSeguimientos() {
  if (!supabase) return null
  const { data, error } = await supabase.from('seguimientos').select('*')
  if (error) {
    console.error('[seguimientos] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

// Un registro de seguimiento se identifica por (clienteNombre, semana), no
// por id (no se maneja un id propio en el front). Se hace upsert con el
// registro completo ya fusionado (dias + comentarios + revisiones), igual
// que construye el estado local SeguimientoCliente.jsx / Equipo.jsx.
export async function upsertSeguimientoRemote(registro) {
  if (!supabase) return
  const { error } = await supabase
    .from('seguimientos')
    .upsert(toRow(registro), { onConflict: 'cliente_nombre,semana' })
  if (error) console.error('[seguimientos] upsert error:', error.message)
}

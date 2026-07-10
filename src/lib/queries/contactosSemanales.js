import { supabase } from '../supabaseClient'

const PUNTO_VACIO = { hecho: false, fecha: null, comentario: '' }

function fromRow(row) {
  return {
    clienteNombre: row.cliente_nombre,
    semana: row.semana,
    inicio: row.inicio || PUNTO_VACIO,
    mitad: row.mitad || PUNTO_VACIO,
    fin: row.fin || PUNTO_VACIO,
  }
}

function toRow(registro) {
  return {
    cliente_nombre: registro.clienteNombre,
    semana: registro.semana,
    inicio: registro.inicio || PUNTO_VACIO,
    mitad: registro.mitad || PUNTO_VACIO,
    fin: registro.fin || PUNTO_VACIO,
  }
}

export async function fetchContactosSemanales() {
  if (!supabase) return null
  const { data, error } = await supabase.from('contactos_semanales').select('*')
  if (error) {
    console.error('[contactosSemanales] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

// Igual que seguimientos: se identifica por (clienteNombre, semana), no por
// id, y se envía siempre el registro completo ya fusionado.
export async function upsertContactoSemanalRemote(registro) {
  if (!supabase) return
  const { error } = await supabase
    .from('contactos_semanales')
    .upsert(toRow(registro), { onConflict: 'cliente_nombre,semana' })
  if (error) console.error('[contactosSemanales] upsert error:', error.message)
}

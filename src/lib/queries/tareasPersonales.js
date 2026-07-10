import { supabase } from '../supabaseClient'

// "Mis tareas": lista de tareas personales de Raúl, con fecha opcional y
// checkbox de hecha/pendiente. Tabla admin-only (ver
// supabase-sql/18_tareas_personales.sql), sin fallback a datos estáticos
// porque es una tabla nueva sin historial previo.
function fromRow(row) {
  return {
    id: row.id,
    texto: row.texto || '',
    fecha: row.fecha || null,
    hecha: !!row.hecha,
  }
}

function toRow(entrada) {
  const row = {}
  if ('id' in entrada) row.id = entrada.id
  if ('texto' in entrada) row.texto = entrada.texto
  if ('fecha' in entrada) row.fecha = entrada.fecha || null
  if ('hecha' in entrada) row.hecha = entrada.hecha
  return row
}

export async function fetchTareasPersonales() {
  if (!supabase) return null
  const { data, error } = await supabase.from('tareas_personales').select('*')
  if (error) {
    console.error('[tareasPersonales] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertTareaRemote(entrada) {
  if (!supabase) return
  const { error } = await supabase.from('tareas_personales').insert(toRow(entrada))
  if (error) console.error('[tareasPersonales] insert error:', error.message)
}

export async function updateTareaRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('tareas_personales').update(row).eq('id', id)
  if (error) console.error('[tareasPersonales] update error:', error.message)
}

export async function deleteTareaRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('tareas_personales').delete().eq('id', id)
  if (error) console.error('[tareasPersonales] delete error:', error.message)
}

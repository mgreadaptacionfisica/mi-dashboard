import { supabase } from '../supabaseClient'

// "Mis tareas": lista de tareas personales, con fecha opcional y checkbox
// de hecha/pendiente. Al principio era solo de Raúl (admin); ahora también
// la usa cada técnico para sus propias tareas privadas — se distinguen por
// propietario_email (ver supabase-sql/36_tareas_personales_propietario.sql),
// y el filtrado por dueño se hace en MisTareas.jsx (mismo patrón de "cruzar
// email de sesión" que ClientesEquipo/MuroEquipo). No hay fallback a datos
// estáticos porque es una tabla nueva sin historial previo relevante.
function fromRow(row) {
  return {
    id: row.id,
    texto: row.texto || '',
    fecha: row.fecha || null,
    hecha: !!row.hecha,
    propietarioEmail: row.propietario_email || null,
  }
}

function toRow(entrada) {
  const row = {}
  if ('id' in entrada) row.id = entrada.id
  if ('texto' in entrada) row.texto = entrada.texto
  if ('fecha' in entrada) row.fecha = entrada.fecha || null
  if ('hecha' in entrada) row.hecha = entrada.hecha
  if ('propietarioEmail' in entrada) row.propietario_email = entrada.propietarioEmail || null
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

import { supabase } from '../supabaseClient'

// "Proyectos": organización de proyectos del admin (ver
// supabase-sql/55_proyectos.sql). Cada proyecto es la cabecera; los pasos
// viven en su propia tabla (ver proyectoPasos.js) porque son muchos por
// proyecto y se marcan/desmarcan de uno en uno.
//
// Ojo: aquí NO hay campo de avance. El % se calcula en la UI a partir de
// los pasos hechos, así que no se guarda ni se sincroniza nada.
function fromRow(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    descripcion: row.descripcion || '',
    fechaObjetivo: row.fecha_objetivo || null,
    prioridad: row.prioridad || 'media',
    estado: row.estado || 'planificado',
    ambito: row.ambito || 'profesional',
    createdAt: row.created_at || null,
  }
}

function toRow(entrada) {
  const row = {}
  if ('id' in entrada) row.id = entrada.id
  if ('nombre' in entrada) row.nombre = entrada.nombre
  if ('descripcion' in entrada) row.descripcion = entrada.descripcion || null
  if ('fechaObjetivo' in entrada) row.fecha_objetivo = entrada.fechaObjetivo || null
  if ('prioridad' in entrada) row.prioridad = entrada.prioridad
  if ('estado' in entrada) row.estado = entrada.estado
  if ('ambito' in entrada) row.ambito = entrada.ambito
  return row
}

export async function fetchProyectos() {
  if (!supabase) return null
  const { data, error } = await supabase.from('proyectos').select('*').order('created_at', { ascending: true })
  if (error) {
    console.error('[proyectos] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertProyectoRemote(entrada) {
  if (!supabase) return
  const { error } = await supabase.from('proyectos').insert(toRow(entrada))
  if (error) console.error('[proyectos] insert error:', error.message)
}

export async function updateProyectoRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('proyectos').update(row).eq('id', id)
  if (error) console.error('[proyectos] update error:', error.message)
}

// Los pasos se van con el proyecto por el `on delete cascade` de la
// migración, así que aquí no hace falta borrarlos a mano (aunque la UI sí
// los quita de su estado local para que la pantalla quede coherente).
export async function deleteProyectoRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('proyectos').delete().eq('id', id)
  if (error) console.error('[proyectos] delete error:', error.message)
}

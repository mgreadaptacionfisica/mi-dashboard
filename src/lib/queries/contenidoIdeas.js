import { supabase } from '../supabaseClient'

function fromRow(row) {
  return {
    id: row.id,
    fecha: row.fecha || '',
    titulo: row.titulo || '',
    descripcion: row.descripcion || '',
    redes: row.redes || [],
    formato: row.formato || '',
    editores: row.editores || [],
    portadaLista: row.portada_lista,
    estado: row.estado || 'Idea',
  }
}

// Mapa camelCase -> columna, para poder actualizar solo un campo (ej.
// asignarFecha) sin reenviar la idea completa.
const CAMPO_A_COLUMNA = {
  fecha: 'fecha',
  titulo: 'titulo',
  descripcion: 'descripcion',
  redes: 'redes',
  formato: 'formato',
  editores: 'editores',
  portadaLista: 'portada_lista',
  estado: 'estado',
}

function toColumns(idea) {
  const row = {}
  Object.entries(idea).forEach(([key, value]) => {
    const columna = CAMPO_A_COLUMNA[key]
    if (columna) row[columna] = value === '' && key === 'fecha' ? null : value
  })
  return row
}

export async function fetchContenidoIdeas() {
  if (!supabase) return null
  const { data, error } = await supabase.from('contenido_ideas').select('*')
  if (error) {
    console.error('[contenidoIdeas] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertIdeaRemote(idea) {
  if (!supabase) return
  const row = { id: idea.id, ...toColumns(idea) }
  const { error } = await supabase.from('contenido_ideas').insert(row)
  if (error) console.error('[contenidoIdeas] insert error:', error.message)
}

export async function updateIdeaRemote(id, patch) {
  if (!supabase || !id) return
  const row = toColumns(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('contenido_ideas').update(row).eq('id', id)
  if (error) console.error('[contenidoIdeas] update error:', error.message)
}

export async function deleteIdeaRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('contenido_ideas').delete().eq('id', id)
  if (error) console.error('[contenidoIdeas] delete error:', error.message)
}
